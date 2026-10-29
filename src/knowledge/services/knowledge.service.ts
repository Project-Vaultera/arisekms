import { Injectable, UnauthorizedException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { createReadStream } from 'fs';
import { basename, join } from 'path';

import { Action } from '../../shared/acl/action.constant';
import { Actor } from '../../shared/acl/actor.constant';
import { persistUpload,UPLOADS_DIR } from '../../shared/files/file-storage';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/user.service';
import { CreateKnowledgeInput, UpdateKnowledgeInput } from '../dtos/knowledge-input.dto';
import { KnowledgeOutput } from '../dtos/knowledge-output.dto';
import { KnowledgeDocument } from '../entities/knowledge-document.entity';
import { KnowledgeRepository } from '../repositories/knowledge.repository';
import { KnowledgeAclService } from './knowledge-acl.service';

@Injectable()
export class KnowledgeService {
  constructor(
    private repository: KnowledgeRepository,
    private userService: UserService,
    private aclService: KnowledgeAclService,
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
    const doc = plainToClass(KnowledgeDocument, {
      title: input.title,
      description: input.description,
      category: input.category,
      kind: 'PDF',
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
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

    this.logger.log(ctx, `calling ${KnowledgeRepository.name}.findAndCount`);
    const [documents, count] = await this.repository.findAndCount({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });

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

    const updated: KnowledgeDocument = { ...doc, ...input };

    this.logger.log(ctx, `calling ${KnowledgeRepository.name}.save`);
    const saved = await this.repository.save(updated);

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
