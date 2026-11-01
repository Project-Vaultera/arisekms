import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { createReadStream } from 'fs';
import { basename, join } from 'path';

import { AuditTimelineEntry } from '../../audit/dtos/audit-timeline-output.dto';
import { AuditService } from '../../audit/services/audit.service';
import { isPrivileged } from '../../auth/constants/role.constant';
import { Action } from '../../shared/acl/action.constant';
import { Actor } from '../../shared/acl/actor.constant';
import { clampPagination } from '../../shared/dtos/pagination-params.dto';
import { persistUpload, removeUploadFile, UPLOADS_DIR } from '../../shared/files/file-storage';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/user.service';
import { CreateKnowledgeInput, ReviewKnowledgeInput, UpdateKnowledgeInput } from '../dtos/knowledge-input.dto';
import { KnowledgeOutput } from '../dtos/knowledge-output.dto';
import { KnowledgeDocument, KnowledgeStatus } from '../entities/knowledge-document.entity';
import { KnowledgeRepository } from '../repositories/knowledge.repository';
import { KnowledgeAclService } from './knowledge-acl.service';

function kindFor(file: Express.Multer.File): string {
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  if (file.mimetype === 'application/pdf' || ext === 'pdf') return 'PDF';
  if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  )
    return 'DOCX';
  if (file.mimetype === 'application/msword' || ext === 'doc') return 'DOC';
  if (file.mimetype === 'image/png' || ext === 'png') return 'PNG';
  if (file.mimetype === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') return 'JPG';
  return (ext ?? 'FILE').toUpperCase().slice(0, 10);
}

@Injectable()
export class KnowledgeService {
  constructor(
    private repository: KnowledgeRepository,
    private userService: UserService,
    private aclService: KnowledgeAclService,
    private auditService: AuditService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(KnowledgeService.name);
  }

  async createDocument(
    ctx: RequestContext,
    input: CreateKnowledgeInput,
    file: Express.Multer.File,
  ): Promise<KnowledgeOutput> {
    this.logger.log(ctx, `${this.createDocument.name} was called`);

    const actor: Actor = ctx.user!;
    const storedName = persistUpload(file);
    // Staff uploads skip the queue; member uploads land as submitted.
    const autoApproved = isPrivileged(actor.roles ?? []);
    const doc = plainToClass(KnowledgeDocument, {
      title: input.title,
      description: input.description,
      category: input.category,
      kind: kindFor(file),
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      status: autoApproved ? KnowledgeStatus.APPROVED : KnowledgeStatus.SUBMITTED,
      rejectReason: null,
    });

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Create, doc);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.getUserById(ctx, actor.id);
    doc.author = plainToClass(User, user);

    this.logger.log(ctx, `calling ${KnowledgeRepository.name}.save`);
    const saved = await this.repository.save(doc);

    await this.auditService.record(ctx, 'KNOWLEDGE_UPLOADED', 'knowledge', String(saved.id), {
      title: saved.title,
      category: saved.category,
      status: saved.status,
    });

    return plainToClass(KnowledgeOutput, saved, { excludeExtraneousValues: true });
  }

  async getDocuments(
    ctx: RequestContext,
    limit: number,
    offset: number,
  ): Promise<{ documents: KnowledgeOutput[]; count: number }> {
    this.logger.log(ctx, `${this.getDocuments.name} was called`);

    const actor: Actor = ctx.user!;
    const isAllowed = this.aclService.forActor(actor).canDoAction(Action.List);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    const { take, skip } = clampPagination(limit, offset);

    // Reviewers see everything; everyone else sees approved docs plus their own.
    if (isPrivileged(actor.roles ?? [])) {
      this.logger.log(ctx, `calling ${KnowledgeRepository.name}.findAndCount`);
      const [documents, count] = await this.repository.findAndCount({
        take,
        skip,
        order: { createdAt: 'DESC' },
      });

      return {
        documents: plainToClass(KnowledgeOutput, documents, { excludeExtraneousValues: true }),
        count,
      };
    }

    const [documents, count] = await this.repository
      .createQueryBuilder('doc')
      .leftJoin('doc.author', 'author')
      .where('doc.status = :approved', { approved: KnowledgeStatus.APPROVED })
      .orWhere('author.id = :uid', { uid: actor.id })
      .orderBy('doc.createdAt', 'DESC')
      .take(take)
      .skip(skip)
      .getManyAndCount();

    return {
      documents: plainToClass(KnowledgeOutput, documents, { excludeExtraneousValues: true }),
      count,
    };
  }

  async getDocumentById(ctx: RequestContext, id: number): Promise<KnowledgeOutput> {
    this.logger.log(ctx, `${this.getDocumentById.name} was called`);

    const actor: Actor = ctx.user!;
    const doc = await this.repository.getById(id);

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Read, doc);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    return plainToClass(KnowledgeOutput, doc, { excludeExtraneousValues: true });
  }

  async updateDocument(
    ctx: RequestContext,
    documentId: number,
    input: UpdateKnowledgeInput,
    file?: Express.Multer.File,
  ): Promise<KnowledgeOutput> {
    this.logger.log(ctx, `${this.updateDocument.name} was called`);

    const doc = await this.repository.getById(documentId);
    const actor: Actor = ctx.user!;

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Update, doc);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    // Whitelist merge (never spread raw input: absent keys arrive undefined).
    const updated: KnowledgeDocument = {
      ...doc,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
    };

    if (file) {
      removeUploadFile(doc.storedName);
      updated.storedName = persistUpload(file);
      updated.originalName = file.originalname;
      updated.mimeType = file.mimetype;
      updated.size = file.size;
      updated.kind = kindFor(file);
    }

    // Editing a rejected doc resubmits it; the decision stays in the audit trail.
    const resubmitted = doc.status === KnowledgeStatus.REJECTED;
    if (resubmitted) {
      updated.status = KnowledgeStatus.SUBMITTED;
      updated.rejectReason = null;
    }

    this.logger.log(ctx, `calling ${KnowledgeRepository.name}.save`);
    const saved = await this.repository.save(updated);

    await this.auditService.record(
      ctx,
      resubmitted ? 'KNOWLEDGE_RESUBMITTED' : 'KNOWLEDGE_EDITED',
      'knowledge',
      String(saved.id),
      { title: saved.title, replacedFile: !!file },
    );

    return plainToClass(KnowledgeOutput, saved, { excludeExtraneousValues: true });
  }

  async deleteDocument(ctx: RequestContext, id: number): Promise<void> {
    this.logger.log(ctx, `${this.deleteDocument.name} was called`);

    const doc = await this.repository.getById(id);
    const actor: Actor = ctx.user!;

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Delete, doc);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    this.logger.log(ctx, `calling ${KnowledgeRepository.name}.remove`);
    await this.repository.remove(doc);
    removeUploadFile(doc.storedName);

    await this.auditService.record(ctx, 'KNOWLEDGE_DELETED', 'knowledge', String(id), {
      title: doc.title,
    });
  }

  async reviewDocument(
    ctx: RequestContext,
    id: number,
    input: ReviewKnowledgeInput,
  ): Promise<KnowledgeOutput> {
    this.logger.log(ctx, `${this.reviewDocument.name} was called`);

    const doc = await this.repository.getById(id);
    if (doc.status !== KnowledgeStatus.SUBMITTED) {
      throw new ConflictException('Document has already been decided.');
    }
    if (input.status === KnowledgeStatus.REJECTED && !input.reason?.trim()) {
      throw new BadRequestException('A reason is required to reject.');
    }

    const approved = input.status === KnowledgeStatus.APPROVED;
    const updated: KnowledgeDocument = {
      ...doc,
      status: input.status,
      rejectReason: approved ? null : (input.reason as string).trim(),
    };

    this.logger.log(ctx, `calling ${KnowledgeRepository.name}.save`);
    const saved = await this.repository.save(updated);

    await this.auditService.record(
      ctx,
      approved ? 'KNOWLEDGE_APPROVED' : 'KNOWLEDGE_REJECTED',
      'knowledge',
      String(saved.id),
      approved ? { title: saved.title } : { title: saved.title, reason: saved.rejectReason },
    );

    return plainToClass(KnowledgeOutput, saved, { excludeExtraneousValues: true });
  }

  async getHistory(ctx: RequestContext, id: number): Promise<AuditTimelineEntry[]> {
    this.logger.log(ctx, `${this.getHistory.name} was called`);

    // History follows the same visibility as the document itself: authors see
    // their own trail, reviewers see everything, nobody else sees anything.
    const doc = await this.repository.getById(id);
    const actor: Actor = ctx.user!;
    if (!this.aclService.forActor(actor).canDoAction(Action.Read, doc)) {
      throw new UnauthorizedException();
    }

    return this.auditService.timeline('knowledge', String(id), [
      'KNOWLEDGE_UPLOADED',
      'KNOWLEDGE_EDITED',
      'KNOWLEDGE_RESUBMITTED',
      'KNOWLEDGE_APPROVED',
      'KNOWLEDGE_REJECTED',
    ]);
  }

  async getDocumentFile(
    ctx: RequestContext,
    id: number,
  ): Promise<{ stream: ReturnType<typeof createReadStream>; filename: string; mimeType: string }> {
    const doc = await this.repository.getById(id);
    const actor: Actor = ctx.user!;

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Read, doc);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    return {
      stream: createReadStream(join(process.cwd(), UPLOADS_DIR, basename(doc.storedName))),
      filename: doc.originalName,
      mimeType: doc.mimeType,
    };
  }
}
