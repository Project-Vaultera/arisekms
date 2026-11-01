import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { MembershipStatus } from '../entities/company.entity';

export class CompanyMemberOutput {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiProperty()
  name: string;
}

export class CompanyOutput {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @Type(() => CompanyMemberOutput)
  @ApiProperty({ type: [CompanyMemberOutput] })
  members: CompanyMemberOutput[];

  @Expose()
  @ApiProperty({ enum: MembershipStatus })
  status: MembershipStatus;

  @Expose()
  @ApiPropertyOptional()
  sector?: string | null;

  @Expose()
  @ApiPropertyOptional()
  region?: string | null;

  @Expose()
  @ApiPropertyOptional()
  legalRepName?: string | null;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;
}
