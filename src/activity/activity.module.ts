import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtAuthStrategy } from '../auth/strategies/jwt-auth.strategy';
import { CompanyModule } from '../company/company.module';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from '../user/user.module';
import { ActivityController } from './controllers/activity.controller';
import { Activity } from './entities/activity.entity';
import { ActivityRepository } from './repositories/activity.repository';
import { ActivityService } from './services/activity.service';
import { ActivityAclService } from './services/activity-acl.service';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([Activity]), UserModule, CompanyModule],
  providers: [ActivityService, JwtAuthStrategy, ActivityAclService, ActivityRepository],
  controllers: [ActivityController],
  exports: [ActivityService],
})
export class ActivityModule {}
