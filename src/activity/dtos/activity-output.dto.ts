import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { AuthorOutput } from '../../article/dtos/author-output.dto';
import { ActivityStatus, ActivityType } from '../entities/activity.entity';

export class ActivityOutput {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  title: string;

  @Expose()
  @ApiProperty({ enum: ActivityType })
  activityType: ActivityType;

  @Expose()
  @ApiPropertyOptional()
  targetAudience: string | null;

  @Expose()
  @ApiProperty({ enum: ActivityStatus })
  status: ActivityStatus;

  @Expose()
  @ApiPropertyOptional()
  happenedAt: Date | null;

  @Expose()
  @ApiPropertyOptional()
  youthCount: number | null;

  @Expose()
  @ApiPropertyOptional()
  trainedCount: number | null;

  @Expose()
  @ApiProperty()
  isInternational: boolean;

  @Expose()
  @ApiPropertyOptional()
  companyId: number | null;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;

  @Expose()
  @Type(() => AuthorOutput)
  @ApiProperty()
  createdBy: AuthorOutput;
}
