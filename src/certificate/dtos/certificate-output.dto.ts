import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { AuthorOutput } from '../../article/dtos/author-output.dto';
import { CertificateStatus } from '../entities/certificate.entity';

export class CertificateOutput {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  memberName: string;

  @Expose()
  @ApiProperty()
  course: string;

  @Expose()
  @ApiProperty()
  issuer: string;

  @Expose()
  @ApiProperty()
  dateIssued: Date;

  @Expose()
  @ApiProperty()
  credentialId: string;

  @Expose()
  @ApiProperty({ enum: CertificateStatus })
  status: CertificateStatus;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;

  @Expose()
  @Type(() => AuthorOutput)
  @ApiProperty()
  submittedBy: AuthorOutput;
}
