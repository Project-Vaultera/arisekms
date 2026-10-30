import { Injectable, UnauthorizedException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { In } from 'typeorm';

import { ROLE } from '../../auth/constants/role.constant';
import { Action } from '../../shared/acl/action.constant';
import { Actor } from '../../shared/acl/actor.constant';
import { AppLogger } from '../../shared/logger/logger.service';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/user.service';
import {
  AddCompanyMemberInput,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../dtos/company-input.dto';
import { CompanyOutput } from '../dtos/company-output.dto';
import { Company } from '../entities/company.entity';
import { CompanyRepository } from '../repositories/company.repository';
import { CompanyAclService } from './company-acl.service';

@Injectable()
export class CompanyService {
  constructor(
    private repository: CompanyRepository,
    private userService: UserService,
    private aclService: CompanyAclService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(CompanyService.name);
  }

  private isAdmin(actor: Actor): boolean {
    return actor.roles?.includes(ROLE.ADMIN) ?? false;
  }

  private toOutput(company: Company): CompanyOutput {
    return plainToClass(CompanyOutput, company, {
      excludeExtraneousValues: true,
    });
  }

  async createCompany(
    @ReqContext() ctx: RequestContext,
    input: CreateCompanyInput,
  ): Promise<CompanyOutput> {
    this.logger.log(ctx, `${this.createCompany.name} was called`);

    const actor: Actor = ctx.user!;
    const isAllowed = this.aclService.forActor(actor).canDoAction(Action.Create);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    const company = plainToClass(Company, { name: input.name.trim(), members: [] });
    const saved = await this.repository.save(company);

    return this.toOutput({ ...saved, members: [] });
  }

  async getCompanies(ctx: RequestContext): Promise<CompanyOutput[]> {
    this.logger.log(ctx, `${this.getCompanies.name} was called`);

    const actor: Actor = ctx.user!;
    const isAllowed = this.aclService.forActor(actor).canDoAction(Action.List);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    // Admins see every company; members only see their own.
    // Two-step load: filtering on the members relation would also filter the
    // loaded members, so resolve ids first, then load full rows.
    const companies = this.isAdmin(actor)
      ? await this.repository.find({ relations: { members: true }, order: { name: 'ASC' } })
      : await this.findCompaniesWithMembers(await this.findOwnCompanyIds(actor.id));

    return companies.map((c) => this.toOutput(c));
  }

  private async findOwnCompanyIds(userId: number): Promise<number[]> {
    const rows = await this.repository
      .createQueryBuilder('company')
      .innerJoin('company.members', 'member', 'member.id = :userId', { userId })
      .select('company.id', 'id')
      .getRawMany<{ id: number }>();
    return rows.map((r) => r.id);
  }

  private async findCompaniesWithMembers(ids: number[]): Promise<Company[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.repository.find({
      where: { id: In(ids) },
      relations: { members: true },
      order: { name: 'ASC' },
    });
  }

  async getCompanyById(ctx: RequestContext, id: number): Promise<CompanyOutput> {
    this.logger.log(ctx, `${this.getCompanyById.name} was called`);

    const actor: Actor = ctx.user!;
    const company = await this.repository.getById(id);

    const isAllowed = this.aclService.forActor(actor).canDoAction(Action.Read, company);
    if (!isAllowed || (!this.isAdmin(actor) && !company.members.some((m) => m.id === actor.id))) {
      throw new UnauthorizedException();
    }

    return this.toOutput(company);
  }

  async updateCompany(
    ctx: RequestContext,
    id: number,
    input: UpdateCompanyInput,
  ): Promise<CompanyOutput> {
    this.logger.log(ctx, `${this.updateCompany.name} was called`);

    const actor: Actor = ctx.user!;
    const company = await this.repository.getById(id);

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Update, company);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    if (input.name !== undefined) {
      company.name = input.name.trim();
    }
    const saved = await this.repository.save(company);

    return this.toOutput(saved);
  }

  async deleteCompany(ctx: RequestContext, id: number): Promise<void> {
    this.logger.log(ctx, `${this.deleteCompany.name} was called`);

    const actor: Actor = ctx.user!;
    const company = await this.repository.getById(id);

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Delete, company);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    await this.repository.remove(company);
  }

  async addMember(
    ctx: RequestContext,
    id: number,
    input: AddCompanyMemberInput,
  ): Promise<CompanyOutput> {
    this.logger.log(ctx, `${this.addMember.name} was called`);

    const actor: Actor = ctx.user!;
    const company = await this.repository.getById(id);

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Update, company);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    // Throws NotFound when the user does not exist.
    await this.userService.getUserById(ctx, input.userId);

    if (!company.members.some((m) => m.id === input.userId)) {
      company.members.push({ id: input.userId } as User);
      await this.repository.save(company);
    }

    return this.toOutput(await this.repository.getById(id));
  }

  async removeMember(ctx: RequestContext, id: number, userId: number): Promise<CompanyOutput> {    this.logger.log(ctx, `${this.removeMember.name} was called`);

    const actor: Actor = ctx.user!;
    const company = await this.repository.getById(id);
    // Route params arrive as strings; coerce for id comparison.
    const targetId = Number(userId);

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Update, company);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    const before = company.members.length;
    company.members = company.members.filter((m) => m.id !== targetId);
    if (company.members.length !== before) {
      // Junction rows are removed explicitly: ManyToMany save() only inserts.
      await this.repository
        .createQueryBuilder()
        .relation(Company, 'members')
        .of(id)
        .remove(targetId);
    }

    return this.toOutput(await this.repository.getById(id));
  }

  /**
   * Replace a company's membership with exactly the given user ids.
   * Used by seeding; admin-only like the other write paths.
   */
  async setMembers(ctx: RequestContext, id: number, userIds: number[]): Promise<CompanyOutput> {
    this.logger.log(ctx, `${this.setMembers.name} was called`);

    const actor: Actor = ctx.user!;
    const company = await this.repository.getById(id);

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Update, company);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    const current = company.members.map((m) => m.id);
    await this.repository
      .createQueryBuilder()
      .relation(Company, 'members')
      .of(id)
      .remove(current);

    for (const userId of [...new Set(userIds)]) {
      await this.addMember(ctx, id, { userId });
    }

    return this.toOutput(await this.repository.getById(id));
  }

  /**
   * User ids visible to the actor: everyone sharing ≥1 company, plus the
   * actor (so company-less members keep today's self-only view).
   * Returns null for admins (unscoped).
   */
  async getCompanyMemberUserIds(actor: Actor): Promise<number[] | null> {
    if (this.isAdmin(actor)) {
      return null;
    }

    const companies = await this.findCompaniesWithMembers(
      await this.findOwnCompanyIds(actor.id),
    );

    const ids = new Set<number>([actor.id]);
    for (const company of companies) {
      for (const member of company.members ?? []) {
        ids.add(member.id);
      }
    }

    return [...ids];
  }
}
