import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { createReadStream } from 'fs';
import { basename, join } from 'path';
import { In } from 'typeorm';

import { isPrivileged } from '../../auth/constants/role.constant';
import { CompanyService } from '../../company/services/company.service';
import { Action } from '../../shared/acl/action.constant';
import { Actor } from '../../shared/acl/actor.constant';
import { clampPagination } from '../../shared/dtos/pagination-params.dto';
import { persistUpload, removeUploadFile, UPLOADS_DIR } from '../../shared/files/file-storage';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/user.service';
import { CreateReportInput, UpdateReportInput } from '../dtos/report-input.dto';
import { ReportOutput } from '../dtos/report-output.dto';
import { Report } from '../entities/report.entity';
import { ReportRepository } from '../repositories/report.repository';
import { ReportAclService } from './report-acl.service';

@Injectable()
export class ReportService {
  constructor(
    private repository: ReportRepository,
    private userService: UserService,
    private companyService: CompanyService,
    private aclService: ReportAclService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ReportService.name);
  }

  async createReport(
    ctx: RequestContext,
    input: CreateReportInput,
    file: Express.Multer.File,
  ): Promise<ReportOutput> {
    this.logger.log(ctx, `${this.createReport.name} was called`);

    const actor: Actor = ctx.user!;
    if (!(await this.companyService.hasApprovedCompany(actor))) {
      throw new ForbiddenException(
        'Your membership application must be approved before submitting reports.',
      );
    }
    const storedName = persistUpload(file);
    const report = plainToClass(Report, {
      category: input.category,
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
    });

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Create, report);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.getUserById(ctx, actor.id);
    report.author = plainToClass(User, user);

    this.logger.log(ctx, `calling ${ReportRepository.name}.save`);
    const saved = await this.repository.save(report);

    return plainToClass(ReportOutput, saved, { excludeExtraneousValues: true });
  }

  async getReports(
    ctx: RequestContext,
    limit: number,
    offset: number,
  ): Promise<{ reports: ReportOutput[]; count: number }> {
    this.logger.log(ctx, `${this.getReports.name} was called`);

    const actor: Actor = ctx.user!;
    const isAllowed = this.aclService.forActor(actor).canDoAction(Action.List);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    // Company isolation: members see rows from users sharing ≥1 company
    // (self included); admins see everything.
    const memberIds = await this.companyService.getCompanyMemberUserIds(actor);
    const where = memberIds ? { author: { id: In(memberIds) } } : {};

    this.logger.log(ctx, `calling ${ReportRepository.name}.findAndCount`);
    const [reports, count] = await this.repository.findAndCount({
      where,
      take: clampPagination(limit, offset).take,
      skip: clampPagination(limit, offset).skip,
      order: { createdAt: 'DESC' },
    });

    return {
      reports: plainToClass(ReportOutput, reports, { excludeExtraneousValues: true }),
      count,
    };
  }

  async getReportById(ctx: RequestContext, id: number): Promise<ReportOutput> {
    this.logger.log(ctx, `${this.getReportById.name} was called`);

    const actor: Actor = ctx.user!;
    const report = await this.repository.getById(id);
    await this.assertCompanyAccess(actor, report.author.id);

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Read, report);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    return plainToClass(ReportOutput, report, { excludeExtraneousValues: true });
  }

  async updateReport(
    ctx: RequestContext,
    reportId: number,
    input: UpdateReportInput,
  ): Promise<ReportOutput> {
    this.logger.log(ctx, `${this.updateReport.name} was called`);

    const report = await this.repository.getById(reportId);
    const actor: Actor = ctx.user!;

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Update, report);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    // Only staff decide approval; members' status input is dropped.
    const patch = isPrivileged(actor.roles) ? input : {};
    const updated: Report = { ...report, ...patch };

    this.logger.log(ctx, `calling ${ReportRepository.name}.save`);
    const saved = await this.repository.save(updated);

    return plainToClass(ReportOutput, saved, { excludeExtraneousValues: true });
  }

  async deleteReport(ctx: RequestContext, id: number): Promise<void> {
    this.logger.log(ctx, `${this.deleteReport.name} was called`);

    const report = await this.repository.getById(id);
    const actor: Actor = ctx.user!;

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Delete, report);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    this.logger.log(ctx, `calling ${ReportRepository.name}.remove`);
    await this.repository.remove(report);
    removeUploadFile(report.storedName);
  }

  async getReportFile(
    ctx: RequestContext,
    id: number,
  ): Promise<{ stream: ReturnType<typeof createReadStream>; filename: string; mimeType: string }> {
    const report = await this.repository.getById(id);
    const actor: Actor = ctx.user!;
    await this.assertCompanyAccess(actor, report.author.id);

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Read, report);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    return {
      stream: createReadStream(join(process.cwd(), UPLOADS_DIR, basename(report.storedName))),
      filename: report.originalName,
      mimeType: report.mimeType,
    };
  }

  private async assertCompanyAccess(actor: Actor, authorId: number): Promise<void> {
    const memberIds = await this.companyService.getCompanyMemberUserIds(actor);
    if (memberIds && !memberIds.includes(authorId)) {
      throw new UnauthorizedException();
    }
  }
}
