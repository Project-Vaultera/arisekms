import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { In } from 'typeorm';

import { ROLE } from '../../auth/constants/role.constant';
import { CompanyService } from '../../company/services/company.service';
import { Action } from '../../shared/acl/action.constant';
import { Actor } from '../../shared/acl/actor.constant';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/user.service';
import { CreateActivityInput, UpdateActivityInput } from '../dtos/activity-input.dto';
import { ActivityOutput } from '../dtos/activity-output.dto';
import { Activity } from '../entities/activity.entity';
import { ActivityRepository } from '../repositories/activity.repository';
import { ActivityAclService } from './activity-acl.service';

function toOutput(row: Activity): ActivityOutput {
  const out = plainToClass(ActivityOutput, row, { excludeExtraneousValues: true });
  (out as ActivityOutput).companyId = row.company?.id ?? null;
  return out;
}

@Injectable()
export class ActivityService {
  constructor(
    private repository: ActivityRepository,
    private userService: UserService,
    private companyService: CompanyService,
    private aclService: ActivityAclService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ActivityService.name);
  }

  async createActivity(ctx: RequestContext, input: CreateActivityInput): Promise<ActivityOutput> {
    this.logger.log(ctx, `${this.createActivity.name} was called`);

    const actor: Actor = ctx.user!;
    if (!(await this.companyService.hasApprovedCompany(actor))) {
      throw new ForbiddenException(
        'Your membership application must be approved before logging activities.',
      );
    }
    const activity = plainToClass(Activity, {
      title: input.title,
      activityType: input.activityType,
      targetAudience: input.targetAudience ?? null,
      happenedAt: input.happenedAt ?? null,
      youthCount: input.youthCount ?? null,
      trainedCount: input.trainedCount ?? null,
      isInternational: input.isInternational ?? false,
      notes: input.notes ?? null,
    });
    if (input.companyId) {
      const company = await this.companyService.getCompanyById(ctx, input.companyId);
      Object.assign(activity, { company });
    }

    const isAllowed = this.aclService.forActor(actor).canDoAction(Action.Create, activity);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.getUserById(ctx, actor.id);
    activity.createdBy = plainToClass(User, user);

    const saved = await this.repository.save(activity);
    return toOutput(saved);
  }

  async getActivities(
    ctx: RequestContext,
    limit: number,
    offset: number,
  ): Promise<{ activities: ActivityOutput[]; count: number }> {
    this.logger.log(ctx, `${this.getActivities.name} was called`);

    const actor: Actor = ctx.user!;
    const isAllowed = this.aclService.forActor(actor).canDoAction(Action.List);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    const memberIds = await this.companyService.getCompanyMemberUserIds(actor);
    const where = memberIds ? { createdBy: { id: In(memberIds) } } : {};

    const [activities, count] = await this.repository.findAndCount({
      where,
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
      relations: { company: true },
    });

    return { activities: activities.map(toOutput), count };
  }

  async getActivityById(ctx: RequestContext, id: number): Promise<ActivityOutput> {
    const actor: Actor = ctx.user!;
    const activity = await this.repository.getById(id);
    await this.assertCompanyAccess(actor, activity.createdBy.id);

    const isAllowed = this.aclService.forActor(actor).canDoAction(Action.Read, activity);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }
    return toOutput(activity);
  }

  async updateActivity(
    ctx: RequestContext,
    activityId: number,
    input: UpdateActivityInput,
  ): Promise<ActivityOutput> {
    const activity = await this.repository.getById(activityId);
    const actor: Actor = ctx.user!;

    const isAllowed = this.aclService.forActor(actor).canDoAction(Action.Update, activity);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    // Only admins decide approval; members' status input is dropped.
    const patch = actor.roles?.includes(ROLE.ADMIN) ? { ...input } : { ...input, status: undefined };
    if (patch.status === undefined) delete (patch as Partial<Activity>).status;
    const updated: Activity = { ...activity, ...patch } as Activity;
    if (input.happenedAt !== undefined) updated.happenedAt = input.happenedAt as unknown as Date;

    const saved = await this.repository.save(updated);
    return toOutput(saved);
  }

  async deleteActivity(ctx: RequestContext, id: number): Promise<void> {
    const activity = await this.repository.getById(id);
    const actor: Actor = ctx.user!;

    const isAllowed = this.aclService.forActor(actor).canDoAction(Action.Delete, activity);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }
    await this.repository.remove(activity);
  }

  private async assertCompanyAccess(actor: Actor, authorId: number): Promise<void> {
    const memberIds = await this.companyService.getCompanyMemberUserIds(actor);
    if (memberIds && !memberIds.includes(authorId)) {
      throw new UnauthorizedException();
    }
  }
}
