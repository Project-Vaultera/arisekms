import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { CertificateStatus } from '../entities/certificate.entity';

export class CreateCertificateInput {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  memberName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  course: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuer?: string;

  @ApiProperty()
  @IsDateString()
  dateIssued: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  credentialId?: string;
}

export class UpdateCertificateInput {
  @ApiPropertyOptional({ enum: CertificateStatus })
  @IsOptional()
  @IsEnum(CertificateStatus)
  status?: CertificateStatus;
}
