import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { MembershipStatus } from '../entities/company.entity';
import { MembershipDocKind } from '../entities/membership-document.entity';

export const CONTACT_TYPE_OPTIONS = [
  'Primary',
  'Billing',
  'Technical',
  'Authorized Representative',
  'Other',
];

export class UpdateMembershipProfileInput {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) legalRepName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) legalRepTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) applicantCountry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) registeredCountry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() noAttachmentExplanation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) sector?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) region?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTradeAssociation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBusinessAssociation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) exchangeSymbol?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentCompanyDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) street?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) province?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) zip?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) fax?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) staffCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) annualRevenue?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() unGlobalCompact?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() otherUnAgency?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) whichAgency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() otherOrgs?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() affiliationDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessOverview?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() geographicFocus?: string;
}

export class MembershipContactInput {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) middleName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) position?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) contactType?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sameAsRegistered?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) province?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) street?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) zip?: string;
}

export class ReviewMembershipInput {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn([MembershipStatus.APPROVED, MembershipStatus.REJECTED])
  status: MembershipStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UploadMembershipDocInput {
  @ApiProperty({ enum: MembershipDocKind })
  @IsEnum(MembershipDocKind)
  kind: MembershipDocKind;
}

export class AddRosterMemberInput {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username: string;
}
