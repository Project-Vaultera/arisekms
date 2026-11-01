import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { KnowledgeStatus } from '../entities/knowledge-document.entity';

export class ReviewKnowledgeInput {
  @ApiProperty({ enum: [KnowledgeStatus.APPROVED, KnowledgeStatus.REJECTED] })
  @IsIn([KnowledgeStatus.APPROVED, KnowledgeStatus.REJECTED])
  status: KnowledgeStatus.APPROVED | KnowledgeStatus.REJECTED;

  @ApiPropertyOptional({ description: 'Required when rejecting.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateKnowledgeInput {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'Manual' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  category: string;
}

export class UpdateKnowledgeInput {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}
