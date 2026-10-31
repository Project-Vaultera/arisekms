import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { AuthorOutput } from '../../article/dtos/author-output.dto';
import { ReportCategory, ReportStatus } from '../entities/report.entity';

export class ReportOutput {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty({ enum: ReportCategory })
  category: ReportCategory;

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
  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus;

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
