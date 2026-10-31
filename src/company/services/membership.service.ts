import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { createReadStream } from 'fs';
import { basename, join } from 'path';

import { ROLE } from '../../auth/constants/role.constant';
import { Actor } from '../../shared/acl/actor.constant';
import {
  persistUpload,
  UPLOADS_DIR,
} from '../../shared/files/file-storage';
import { AppLogger } from '../../shared/logger/logger.service';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/user.service';
import {
  COMPANY_SECTORS,
  MembershipContactInput,
  ReviewMembershipInput,
  UpdateMembershipProfileInput,
} from '../dtos/membership-input.dto';
import { MembershipProfileOutput } from '../dtos/membership-output.dto';
import { Company, MembershipStatus } from '../entities/company.entity';
import { MembershipContact } from '../entities/membership-contact.entity';
import {
  MembershipDocKind,
  MembershipDocument,
} from '../entities/membership-document.entity';
import { CompanyRepository } from '../repositories/company.repository';
import { MembershipContactRepository } from '../repositories/membership-contact.repository';
import { MembershipDocumentRepository } from '../repositories/membership-document.repository';
import { CompanyAclService } from './company-acl.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function required(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

@Injectable()
export class MembershipService {
  constructor(
    private companyRepository: CompanyRepository,
    private contactRepository: MembershipContactRepository,
    private documentRepository: MembershipDocumentRepository,
    private userService: UserService,
    private aclService: CompanyAclService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(MembershipService.name);
  }

  private isAdmin(actor: Actor): boolean {
    return actor.roles?.includes(ROLE.ADMIN) ?? false;
  }

  private toOutput(company: Company): MembershipProfileOutput {
    return plainToClass(MembershipProfileOutput, company, {
      excludeExtraneousValues: true,
    });
  }

  private async loadCompany(id: number): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id: Number(id) },
      relations: { members: true, contacts: true, documents: true },
    });
    if (!company) {
      // Keep the cross-tenant contract: outsiders see 401, not 404 details.
      throw new UnauthorizedException();
    }
    return company;
  }

  private assertMemberOrAdmin(actor: Actor, company: Company): void {
    if (this.isAdmin(actor)) {
      return;
    }
    const isMember = company.members.some((m) => m.id === actor.id);
    const canRead = this.aclService.forActor(actor).canDoAction('read' as never, company);
    if (!isMember || !canRead) {
      throw new UnauthorizedException();
    }
  }

  private snapshotAddress(company: Company, contact: MembershipContact): void {
    contact.street = company.street;
    contact.city = company.city;
    contact.province = company.province;
    contact.zip = company.zip;
    contact.country = company.country;
  }

  async getProfile(
    @ReqContext() ctx: RequestContext,
    companyId: number,
  ): Promise<MembershipProfileOutput> {
    this.logger.log(ctx, `${this.getProfile.name} was called`);
    const actor: Actor = ctx.user!;
    const company = await this.loadCompany(companyId);
    this.assertMemberOrAdmin(actor, company);
    return this.toOutput(company);
  }

  async listSubmissions(
    @ReqContext() ctx: RequestContext,
  ): Promise<MembershipProfileOutput[]> {
    this.logger.log(ctx, `${this.listSubmissions.name} was called`);
    const actor: Actor = ctx.user!;
    if (!this.isAdmin(actor)) {
      throw new UnauthorizedException();
    }
    const companies = await this.companyRepository.find({
      where: { status: MembershipStatus.SUBMITTED },
      relations: { members: true, contacts: true, documents: true },
      order: { updatedAt: 'DESC' },
    });
    return companies.map((c) => this.toOutput(c));
  }

  async updateProfile(
    @ReqContext() ctx: RequestContext,
    companyId: number,
    input: UpdateMembershipProfileInput,
  ): Promise<MembershipProfileOutput> {
    this.logger.log(ctx, `${this.updateProfile.name} was called`);
    const actor: Actor = ctx.user!;
    const company = await this.loadCompany(companyId);
    this.assertMemberOrAdmin(actor, company);

    if (!this.isAdmin(actor) && company.status === MembershipStatus.SUBMITTED) {
      throw new UnauthorizedException();
    }

    const patch = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined),
    ) as Partial<Company>;
    if (typeof patch.name === 'string') {
      patch.name = patch.name.trim();
      if (!patch.name) {
        throw new BadRequestException('Company name is required');
      }
      const clash = await this.companyRepository.findOne({ where: { name: patch.name } });
      if (clash && clash.id !== company.id) {
        throw new BadRequestException('Company name already taken');
      }
    }
    Object.assign(company, patch);

    // Member edits to an approved profile reopen the review cycle.
    if (!this.isAdmin(actor) && company.status === MembershipStatus.APPROVED) {
      company.status = MembershipStatus.DRAFT;
      company.rejectReason = null;
    }

    const saved = await this.companyRepository.save(company);
    return this.toOutput(await this.loadCompany(saved.id));
  }

  private validateForSubmit(company: Company): string[] {
    const errors: string[] = [];
    const need = (value: unknown, label: string) => {
      if (!required(value)) {
        errors.push(label);
      }
    };

    need(company.legalRepName, 'Legal representative name');
    need(company.legalRepTitle, 'Legal representative title');
    need(company.applicantCountry, 'Country of applicant');
    need(company.registeredCountry, 'Country of registration');
    need(company.sector, 'Industry sector');
    if (required(company.sector) && !(COMPANY_SECTORS as readonly string[]).includes(String(company.sector))) {
      errors.push('Industry sector (pick one of the listed sectors)');
    }
    need(company.street, 'Registered street');
    need(company.zip, 'Post / ZIP code');
    need(company.website, 'Website');
    // Fax is optional (dropped the old Frappe-required rule); if provided it
    // must still look like a phone number — checked client-side.
    need(company.staffCount, 'Total number of staff');
    need(company.annualRevenue, 'Annual revenue');
    if (company.unGlobalCompact === null || company.unGlobalCompact === undefined) {
      errors.push('UN Global Impact membership answer');
    }
    if (company.otherUnAgency && !required(company.whichAgency)) {
      errors.push('UN agency name');
    }
    need(company.businessOverview, 'Business overview');
    need(company.geographicFocus, 'Geographic focus');

    const hasProof = (company.documents ?? []).some(
      (d) => d.kind === MembershipDocKind.REGISTRATION_PROOF,
    );
    if (!hasProof && !required(company.noAttachmentExplanation)) {
      errors.push('Legal registration proof or an explanation why none was attached');
    }

    const primary = (company.contacts ?? []).find((c) => c.isPrimary);
    if (!primary) {
      errors.push('Primary contact');
    } else {
      need(primary.firstName, 'Primary contact first name');
      need(primary.lastName, 'Primary contact last name');
      if (!required(primary.email) || !EMAIL_RE.test(String(primary.email))) {
        errors.push('Primary contact email');
      }
      need(primary.phone, 'Primary contact phone');
      if (!primary.sameAsRegistered) {
        need(primary.country, 'Primary contact country');
        need(primary.city, 'Primary contact city');
        need(primary.street, 'Primary contact street');
        need(primary.zip, 'Primary contact post / ZIP code');
      }
    }

    for (const c of company.contacts ?? []) {
      if (c.isPrimary) {
        continue;
      }
      if (!required(c.firstName) || !required(c.lastName)) {
        errors.push(`Additional contact #${c.id}: first and last name`);
      }
      if (!required(c.email) || !EMAIL_RE.test(String(c.email))) {
        errors.push(`Additional contact #${c.id}: valid email`);
      }
      if (c.phone && String(c.phone).trim().length < 5) {
        errors.push(`Additional contact #${c.id}: valid phone`);
      }
      if (!required(c.contactType)) {
        errors.push(`Additional contact #${c.id}: contact type`);
      }
    }
    return errors;
  }

  async submitProfile(
    @ReqContext() ctx: RequestContext,
    companyId: number,
  ): Promise<MembershipProfileOutput> {
    this.logger.log(ctx, `${this.submitProfile.name} was called`);
    const actor: Actor = ctx.user!;
    const company = await this.loadCompany(companyId);
    this.assertMemberOrAdmin(actor, company);

    if (
      !this.isAdmin(actor) &&
      ![MembershipStatus.DRAFT, MembershipStatus.REJECTED].includes(company.status)
    ) {
      throw new UnauthorizedException();
    }

    const errors = this.validateForSubmit(company);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Missing or invalid: ${errors.join('; ')}`,
      );
    }

    // Snapshot registered address into contacts that opted in.
    for (const contact of company.contacts ?? []) {
      if (contact.sameAsRegistered) {
        this.snapshotAddress(company, contact);
        await this.contactRepository.save(contact);
      }
    }

    company.status = MembershipStatus.SUBMITTED;
    company.rejectReason = null;
    const saved = await this.companyRepository.save(company);
    return this.toOutput(await this.loadCompany(saved.id));
  }

  async reviewProfile(
    @ReqContext() ctx: RequestContext,
    companyId: number,
    input: ReviewMembershipInput,
  ): Promise<MembershipProfileOutput> {
    this.logger.log(ctx, `${this.reviewProfile.name} was called`);
    const actor: Actor = ctx.user!;
    if (!this.isAdmin(actor)) {
      throw new UnauthorizedException();
    }
    // loadCompany throws 401 for unknown ids; admins get real 404 here.
    const company = await this.companyRepository
      .findOne({
        where: { id: companyId },
        relations: { members: true, contacts: true, documents: true },
      })
      .then((c) => {
        if (!c) {
          throw new BadRequestException('Unknown company');
        }
        return c;
      });

    if (input.status === MembershipStatus.REJECTED) {
      if (!required(input.reason)) {
        throw new BadRequestException('A reject reason is required');
      }
      company.status = MembershipStatus.REJECTED;
      company.rejectReason = String(input.reason).trim();
    } else {
      company.status = MembershipStatus.APPROVED;
      company.rejectReason = null;
    }
    const saved = await this.companyRepository.save(company);
    return this.toOutput(await this.loadCompany(saved.id));
  }

  async createContact(
    @ReqContext() ctx: RequestContext,
    companyId: number,
    input: MembershipContactInput,
  ): Promise<MembershipProfileOutput> {
    this.logger.log(ctx, `${this.createContact.name} was called`);
    const actor: Actor = ctx.user!;
    const company = await this.loadCompany(companyId);
    this.assertMemberOrAdmin(actor, company);
    if (!this.isAdmin(actor) && company.status === MembershipStatus.SUBMITTED) {
      throw new UnauthorizedException();
    }

    const contact = plainToClass(MembershipContact, {
      ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
      company,
    });
    if (input.email && !EMAIL_RE.test(input.email)) {
      throw new BadRequestException('Invalid email');
    }
    if (contact.sameAsRegistered) {
      this.snapshotAddress(company, contact);
    }
    const saved = await this.contactRepository.save(contact);
    if (saved.isPrimary) {
      await this.contactRepository
        .createQueryBuilder()
        .update(MembershipContact)
        .set({ isPrimary: false })
        .where('"companyId" = :companyId AND id != :id', { companyId, id: saved.id })
        .execute();
    }
    if (!this.isAdmin(actor) && company.status === MembershipStatus.APPROVED) {
      company.status = MembershipStatus.DRAFT;
      company.rejectReason = null;
      await this.companyRepository.save(company);
    }
    return this.toOutput(await this.loadCompany(companyId));
  }

  async updateContact(
    @ReqContext() ctx: RequestContext,
    companyId: number,
    contactId: number,
    input: MembershipContactInput,
  ): Promise<MembershipProfileOutput> {
    this.logger.log(ctx, `${this.updateContact.name} was called`);
    const actor: Actor = ctx.user!;
    const company = await this.loadCompany(companyId);
    this.assertMemberOrAdmin(actor, company);
    if (!this.isAdmin(actor) && company.status === MembershipStatus.SUBMITTED) {
      throw new UnauthorizedException();
    }

    const contact = await this.contactRepository.getById(Number(contactId));
    if (contact.company.id !== Number(companyId)) {
      throw new UnauthorizedException();
    }
    if (input.email && !EMAIL_RE.test(input.email)) {
      throw new BadRequestException('Invalid email');
    }
    Object.assign(
      contact,
      Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
    );
    if (contact.sameAsRegistered) {
      this.snapshotAddress(company, contact);
    }
    await this.contactRepository.save(contact);
    if (contact.isPrimary) {
      await this.contactRepository
        .createQueryBuilder()
        .update(MembershipContact)
        .set({ isPrimary: false })
        .where('"companyId" = :companyId AND id != :id', { companyId, id: contact.id })
        .execute();
    }
    if (!this.isAdmin(actor) && company.status === MembershipStatus.APPROVED) {
      company.status = MembershipStatus.DRAFT;
      company.rejectReason = null;
      await this.companyRepository.save(company);
    }
    return this.toOutput(await this.loadCompany(companyId));
  }

  async deleteContact(
    @ReqContext() ctx: RequestContext,
    companyId: number,
    contactId: number,
  ): Promise<MembershipProfileOutput> {
    this.logger.log(ctx, `${this.deleteContact.name} was called`);
    const actor: Actor = ctx.user!;
    const company = await this.loadCompany(companyId);
    this.assertMemberOrAdmin(actor, company);
    if (!this.isAdmin(actor) && company.status === MembershipStatus.SUBMITTED) {
      throw new UnauthorizedException();
    }
    const contact = await this.contactRepository.getById(Number(contactId));
    if (contact.company.id !== Number(companyId)) {
      throw new UnauthorizedException();
    }
    await this.contactRepository.remove(contact);
    if (!this.isAdmin(actor) && company.status === MembershipStatus.APPROVED) {
      company.status = MembershipStatus.DRAFT;
      company.rejectReason = null;
      await this.companyRepository.save(company);
    }
    return this.toOutput(await this.loadCompany(companyId));
  }

  async uploadDocument(
    @ReqContext() ctx: RequestContext,
    companyId: number,
    kind: MembershipDocKind,
    file: Express.Multer.File,
  ): Promise<MembershipProfileOutput> {
    this.logger.log(ctx, `${this.uploadDocument.name} was called`);
    const actor: Actor = ctx.user!;
    const company = await this.loadCompany(companyId);
    this.assertMemberOrAdmin(actor, company);
    if (!this.isAdmin(actor) && company.status === MembershipStatus.SUBMITTED) {
      throw new UnauthorizedException();
    }

    const storedName = persistUpload(file);
    const doc = plainToClass(MembershipDocument, {
      company,
      kind,
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
    });
    await this.documentRepository.save(doc);
    return this.toOutput(await this.loadCompany(companyId));
  }

  async deleteDocument(
    @ReqContext() ctx: RequestContext,
    companyId: number,
    docId: number,
  ): Promise<MembershipProfileOutput> {
    this.logger.log(ctx, `${this.deleteDocument.name} was called`);
    const actor: Actor = ctx.user!;
    const company = await this.loadCompany(companyId);
    this.assertMemberOrAdmin(actor, company);
    if (!this.isAdmin(actor) && company.status === MembershipStatus.SUBMITTED) {
      throw new UnauthorizedException();
    }
    const doc = await this.documentRepository.getById(Number(docId));
    if (doc.company.id !== Number(companyId)) {
      throw new UnauthorizedException();
    }
    await this.documentRepository.remove(doc);
    return this.toOutput(await this.loadCompany(companyId));
  }

  async getDocumentFile(
    @ReqContext() ctx: RequestContext,
    companyId: number,
    docId: number,
  ): Promise<{ stream: ReturnType<typeof createReadStream>; filename: string; mimeType: string }> {
    const actor: Actor = ctx.user!;
    const company = await this.loadCompany(companyId);
    this.assertMemberOrAdmin(actor, company);
    const doc = await this.documentRepository.getById(Number(docId));
    if (doc.company.id !== Number(companyId)) {
      throw new UnauthorizedException();
    }
    return {
      stream: createReadStream(join(process.cwd(), UPLOADS_DIR, basename(doc.storedName))),
      filename: doc.originalName,
      mimeType: doc.mimeType,
    };
  }

  private assertWritable(actor: Actor, company: Company): void {
    if (!this.isAdmin(actor) && company.status === MembershipStatus.SUBMITTED) {
      throw new UnauthorizedException();
    }
  }

  async uploadLogo(
    @ReqContext() ctx: RequestContext,
    companyId: number,
    file: Express.Multer.File,
  ): Promise<MembershipProfileOutput> {
    this.logger.log(ctx, `${this.uploadLogo.name} was called`);
    const actor: Actor = ctx.user!;
    const company = await this.loadCompany(companyId);
    this.assertMemberOrAdmin(actor, company);
    this.assertWritable(actor, company);

    company.logoStoredName = persistUpload(file);
    company.logoOriginalName = file.originalname;
    const saved = await this.companyRepository.save(company);
    return this.toOutput(await this.loadCompany(saved.id));
  }

  async getLogoFile(
    @ReqContext() ctx: RequestContext,
    companyId: number,
  ): Promise<{ stream: ReturnType<typeof createReadStream>; filename: string; mimeType: string }> {
    const actor: Actor = ctx.user!;
    const company = await this.loadCompany(companyId);
    this.assertMemberOrAdmin(actor, company);
    if (!company.logoStoredName) {
      throw new NotFoundException();
    }
    return {
      stream: createReadStream(join(process.cwd(), UPLOADS_DIR, basename(company.logoStoredName))),
      filename: company.logoOriginalName ?? 'logo',
      mimeType: 'image/png',
    };
  }

  /**
   * Member-scoped roster management. Members of the company may add (by exact
   * username) and remove members, except themselves — leaving a company stays
   * an admin action. Admins bypass every check.
   */
  async addRosterMember(
    @ReqContext() ctx: RequestContext,
    companyId: number,
    username: string,
  ): Promise<MembershipProfileOutput> {
    this.logger.log(ctx, `${this.addRosterMember.name} was called`);
    const actor: Actor = ctx.user!;
    const company = await this.loadCompany(companyId);
    this.assertMemberOrAdmin(actor, company);
    this.assertWritable(actor, company);

    const candidate = await this.userService.findByUsername(ctx, username.trim());
    if (!candidate || !candidate.id) {
      throw new NotFoundException('User not found');
    }

    if (!company.members.some((m) => m.id === candidate.id)) {
      company.members.push({ id: candidate.id } as User);
      await this.companyRepository.save(company);
    }
    return this.toOutput(await this.loadCompany(companyId));
  }

  async removeRosterMember(
    @ReqContext() ctx: RequestContext,
    companyId: number,
    userId: number,
  ): Promise<MembershipProfileOutput> {
    this.logger.log(ctx, `${this.removeRosterMember.name} was called`);
    const actor: Actor = ctx.user!;
    const company = await this.loadCompany(companyId);
    this.assertMemberOrAdmin(actor, company);
    this.assertWritable(actor, company);

    const targetId = Number(userId);
    if (!this.isAdmin(actor) && targetId === actor.id) {
      throw new ForbiddenException('You cannot remove yourself; ask an admin.');
    }

    await this.companyRepository
      .createQueryBuilder()
      .relation(Company, 'members')
      .of(companyId)
      .remove(targetId);
    return this.toOutput(await this.loadCompany(companyId));
  }
}
