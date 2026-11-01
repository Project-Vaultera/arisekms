import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { TicketStatus } from '../entities/support-ticket.entity';

export const TICKET_CATEGORIES = [
  'Report submission',
  'Knowledge Products',
  'Membership',
  'SkillsBuild',
  'Account access',
  'Other',
] as const;

export const TICKET_PRIORITIES = ['Low', 'Medium', 'High'] as const;

export class CreateTicketInput {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ enum: TICKET_CATEGORIES })
  @IsIn([...TICKET_CATEGORIES])
  category: string;

  @ApiProperty({ enum: TICKET_PRIORITIES })
  @IsIn([...TICKET_PRIORITIES])
  priority: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  description: string;
}

export class UpdateTicketInput {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
