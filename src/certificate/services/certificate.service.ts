import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { In } from 'typeorm';

import { CompanyService } from '../../company/services/company.service';
import { Action } from '../../shared/acl/action.constant';
import { Actor } from '../../shared/acl/actor.constant';
import { clampPagination } from '../../shared/dtos/pagination-params.dto';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/user.service';
import { CreateCertificateInput, UpdateCertificateInput } from '../dtos/certificate-input.dto';
import { CertificateOutput } from '../dtos/certificate-output.dto';
import { LeaderboardEntryOutput } from '../dtos/leaderboard-output.dto';
import { Certificate, CertificateStatus } from '../entities/certificate.entity';
import { CertificateRepository } from '../repositories/certificate.repository';
import { CertificateAclService } from './certificate-acl.service';

// shortcut: points are derived (100 per verified certificate) until a real
// scoring model lands; then replace this aggregation with scored totals.
export const POINTS_PER_VERIFIED_CERTIFICATE = 100;

@Injectable()
export class CertificateService {
  constructor(
    private repository: CertificateRepository,
    private userService: UserService,
    private companyService: CompanyService,
    private aclService: CertificateAclService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(CertificateService.name);
  }

  async createCertificate(
    ctx: RequestContext,
    input: CreateCertificateInput,
  ): Promise<CertificateOutput> {
    this.logger.log(ctx, `${this.createCertificate.name} was called`);

    const actor: Actor = ctx.user!;
    if (!(await this.companyService.hasApprovedCompany(actor))) {
      throw new ForbiddenException(
        'Your membership application must be approved before recording certificates.',
      );
    }
    const certificate = plainToClass(Certificate, input);

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Create, certificate);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.getUserById(ctx, actor.id);
    certificate.submittedBy = plainToClass(User, user);

    this.logger.log(ctx, `calling ${CertificateRepository.name}.save`);
    const saved = await this.repository.save(certificate);

    return plainToClass(CertificateOutput, saved, { excludeExtraneousValues: true });
  }

  async getCertificates(
    ctx: RequestContext,
    limit: number,
    offset: number,
  ): Promise<{ certificates: CertificateOutput[]; count: number }> {
    this.logger.log(ctx, `${this.getCertificates.name} was called`);

    const actor: Actor = ctx.user!;
    const isAllowed = this.aclService.forActor(actor).canDoAction(Action.List);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    // Company isolation: members see rows from users sharing ≥1 company
    // (self included); admins see everything.
    const memberIds = await this.companyService.getCompanyMemberUserIds(actor);
    const where = memberIds ? { submittedBy: { id: In(memberIds) } } : {};

    this.logger.log(ctx, `calling ${CertificateRepository.name}.findAndCount`);
    const [certificates, count] = await this.repository.findAndCount({
      where,
      take: clampPagination(limit, offset).take,
      skip: clampPagination(limit, offset).skip,
      order: { createdAt: 'DESC' },
    });

    return {
      certificates: plainToClass(CertificateOutput, certificates, { excludeExtraneousValues: true }),
      count,
    };
  }

  async getCertificateById(ctx: RequestContext, id: number): Promise<CertificateOutput> {
    this.logger.log(ctx, `${this.getCertificateById.name} was called`);

    const actor: Actor = ctx.user!;
    const certificate = await this.repository.getById(id);
    await this.assertCompanyAccess(actor, certificate.submittedBy.id);

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Read, certificate);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    return plainToClass(CertificateOutput, certificate, { excludeExtraneousValues: true });
  }

  async getLeaderboard(ctx: RequestContext): Promise<LeaderboardEntryOutput[]> {
    this.logger.log(ctx, `${this.getLeaderboard.name} was called`);

    const actor: Actor = ctx.user!;
    const isAllowed = this.aclService.forActor(actor).canDoAction(Action.List);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    // Company isolation: members rank only their companies' verified rows.
    const memberIds = await this.companyService.getCompanyMemberUserIds(actor);
    const qb = this.repository
      .createQueryBuilder('certificate')
      .select('certificate.memberName', 'memberName')
      .addSelect('COUNT(*)', 'certificates')
      .where('certificate.status = :status', { status: CertificateStatus.VERIFIED });
    if (memberIds) {
      qb.innerJoin('certificate.submittedBy', 'submitter').andWhere(
        'submitter.id IN (:...memberIds)',
        { memberIds },
      );
    }
    const rows = await qb
      .groupBy('certificate.memberName')
      .orderBy('certificates', 'DESC')
      .addOrderBy('certificate.memberName', 'ASC')
      .getRawMany<{ memberName: string; certificates: string }>();

    return rows.map((row) => ({
      memberName: row.memberName,
      certificates: Number(row.certificates),
      points: Number(row.certificates) * POINTS_PER_VERIFIED_CERTIFICATE,
    }));
  }

  async updateCertificate(
    ctx: RequestContext,
    certificateId: number,
    input: UpdateCertificateInput,
  ): Promise<CertificateOutput> {
    this.logger.log(ctx, `${this.updateCertificate.name} was called`);

    const certificate = await this.repository.getById(certificateId);
    const actor: Actor = ctx.user!;

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Update, certificate);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    // Only admins verify; members cannot change status (USER has no Update grant).
    const updated: Certificate = { ...certificate, ...input };

    this.logger.log(ctx, `calling ${CertificateRepository.name}.save`);
    const saved = await this.repository.save(updated);

    return plainToClass(CertificateOutput, saved, { excludeExtraneousValues: true });
  }

  async deleteCertificate(ctx: RequestContext, id: number): Promise<void> {
    this.logger.log(ctx, `${this.deleteCertificate.name} was called`);

    const certificate = await this.repository.getById(id);
    const actor: Actor = ctx.user!;

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Delete, certificate);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    this.logger.log(ctx, `calling ${CertificateRepository.name}.remove`);
    await this.repository.remove(certificate);
  }

  private async assertCompanyAccess(actor: Actor, authorId: number): Promise<void> {
    const memberIds = await this.companyService.getCompanyMemberUserIds(actor);
    if (memberIds && !memberIds.includes(authorId)) {
      throw new UnauthorizedException();
    }
  }
}
