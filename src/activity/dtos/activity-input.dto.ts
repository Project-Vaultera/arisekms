import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { ActivityStatus, ActivityType } from '../entities/activity.entity';

export const TARGET_AUDIENCES = [
  'Barangay Officials',
  'Community Emergency Response Team (ERT)',
  'General Public',
  'LGU Staff / Government Personnel',
  'School Faculty & Students',
  'Youth Groups',
] as const;

export class CreateActivityInput {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @ApiPropertyOptional({ enum: TARGET_AUDIENCES })
  @IsOptional()
  @IsIn([...TARGET_AUDIENCES])
  targetAudience?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  happenedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  youthCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  trainedCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isInternational?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  companyId?: number;
}

export class UpdateActivityInput {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: ActivityType })
  @IsOptional()
  @IsEnum(ActivityType)
  activityType?: ActivityType;

  @ApiPropertyOptional({ enum: TARGET_AUDIENCES })
  @IsOptional()
  @IsIn([...TARGET_AUDIENCES])
  targetAudience?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  happenedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  youthCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  trainedCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isInternational?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ActivityStatus })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;
}
