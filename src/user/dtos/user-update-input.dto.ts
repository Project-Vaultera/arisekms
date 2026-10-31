import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

import { ROLE } from '../../auth/constants/role.constant';
import { GENDER_OPTIONS } from './user-output.dto';

export class UpdateUserInput {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(100)
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @Length(6, 100)
  @IsString()
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAccountDisabled?: boolean;

  @ApiPropertyOptional({ enum: ROLE, description: 'Exactly one role per user.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @IsEnum(ROLE, { each: true })
  roles?: ROLE[];

  @ApiPropertyOptional({ enum: GENDER_OPTIONS })
  @IsOptional()
  @IsIn([...GENDER_OPTIONS])
  gender?: string;
}
