import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { AuthorOutput } from '../../article/dtos/author-output.dto';
import { KnowledgeStatus } from '../entities/knowledge-document.entity';

export class KnowledgeOutput {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  title: string;

  @Expose()
  @ApiProperty()
  description: string;

  @Expose()
  @ApiProperty({ example: 'Manual' })
  category: string;

  @Expose()
  @ApiProperty()
  kind: string;

  @Expose()
  @ApiProperty()
  originalName: string;

  @Expose()
  @ApiProperty()
  mimeType: string;

  @Expose()
  @ApiProperty()
  size: number;

  @Expose()
  @ApiProperty({ enum: KnowledgeStatus })
  status: KnowledgeStatus;

  @Expose()
  @ApiProperty({ nullable: true })
  rejectReason: string | null;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;

  @Expose()
  @Type(() => AuthorOutput)
  @ApiProperty()
  author: AuthorOutput;
}
