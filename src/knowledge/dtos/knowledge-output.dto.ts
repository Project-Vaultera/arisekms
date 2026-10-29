import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { AuthorOutput } from '../../article/dtos/author-output.dto';
import { KnowledgeCategory } from '../entities/knowledge-document.entity';

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
  @ApiProperty({ enum: KnowledgeCategory })
  category: KnowledgeCategory;

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
