import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

import { GENDER_OPTIONS } from './user-output.dto';

// Self-service profile update: name + email + gender only. Username, roles, and
// account flags are deliberately absent so members cannot escalate.
export class UpdateMyProfileInput {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({ enum: GENDER_OPTIONS })
  @IsOptional()
  @IsIn([...GENDER_OPTIONS])
  gender?: string;

  @ApiPropertyOptional({ description: 'New password (6-100 chars). Requires currentPassword. Bumps tokenVersion so all devices sign out.' })
  @IsOptional()
  @IsString()
  @Length(6, 100)
  password?: string;

  @ApiPropertyOptional({ description: 'Current password, required when setting a new password.' })
  @IsOptional()
  @IsString()
  currentPassword?: string;
}
