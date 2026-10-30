import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { MembershipStatus } from '../entities/company.entity';
import { MembershipDocKind } from '../entities/membership-document.entity';
import { CompanyMemberOutput } from './company-output.dto';

export class MembershipContactOutput {
  @Expose() @ApiProperty() id: number;
  @Expose() @ApiProperty() isPrimary: boolean;
  @Expose() @ApiPropertyOptional() title: string | null;
  @Expose() @ApiPropertyOptional() firstName: string | null;
  @Expose() @ApiPropertyOptional() middleName: string | null;
  @Expose() @ApiPropertyOptional() lastName: string | null;
  @Expose() @ApiPropertyOptional() position: string | null;
  @Expose() @ApiPropertyOptional() email: string | null;
  @Expose() @ApiPropertyOptional() phone: string | null;
  @Expose() @ApiPropertyOptional() contactType: string | null;
  @Expose() @ApiProperty() sameAsRegistered: boolean;
  @Expose() @ApiPropertyOptional() country: string | null;
  @Expose() @ApiPropertyOptional() province: string | null;
  @Expose() @ApiPropertyOptional() city: string | null;
  @Expose() @ApiPropertyOptional() street: string | null;
  @Expose() @ApiPropertyOptional() zip: string | null;
}

export class MembershipDocumentOutput {
  @Expose() @ApiProperty() id: number;
  @Expose() @ApiProperty({ enum: MembershipDocKind }) kind: MembershipDocKind;
  @Expose() @ApiProperty() originalName: string;
  @Expose() @ApiProperty() mimeType: string;
  @Expose() @ApiProperty() size: number;
  @Expose() @ApiProperty() createdAt: Date;
}

export class MembershipProfileOutput {
  @Expose() @ApiProperty() id: number;
  @Expose() @ApiProperty() name: string;
  @Expose() @Type(() => CompanyMemberOutput) @ApiProperty({ type: [CompanyMemberOutput] }) members: CompanyMemberOutput[];
  @Expose() @ApiPropertyOptional() legalRepName: string | null;
  @Expose() @ApiPropertyOptional() legalRepTitle: string | null;
  @Expose() @ApiPropertyOptional() applicantCountry: string | null;
  @Expose() @ApiPropertyOptional() registeredCountry: string | null;
  @Expose() @ApiPropertyOptional() noAttachmentExplanation: string | null;
  @Expose() @ApiPropertyOptional() sector: string | null;
  @Expose() @ApiPropertyOptional() region?: string | null;
  @Expose() @ApiPropertyOptional() isTradeAssociation: boolean | null;
  @Expose() @ApiPropertyOptional() isBusinessAssociation: boolean | null;
  @Expose() @ApiPropertyOptional() exchangeSymbol: string | null;
  @Expose() @ApiPropertyOptional() parentCompanyDetails: string | null;
  @Expose() @ApiPropertyOptional() street: string | null;
  @Expose() @ApiPropertyOptional() city: string | null;
  @Expose() @ApiPropertyOptional() province: string | null;
  @Expose() @ApiPropertyOptional() zip: string | null;
  @Expose() @ApiPropertyOptional() country: string | null;
  @Expose() @ApiPropertyOptional() phone: string | null;
  @Expose() @ApiPropertyOptional() website: string | null;
  @Expose() @ApiPropertyOptional() fax: string | null;
  @Expose() @ApiPropertyOptional() staffCount: number | null;
  @Expose() @ApiPropertyOptional() annualRevenue: string | null;
  @Expose() @ApiPropertyOptional() unGlobalCompact: boolean | null;
  @Expose() @ApiPropertyOptional() otherUnAgency: boolean | null;
  @Expose() @ApiPropertyOptional() whichAgency: string | null;
  @Expose() @ApiPropertyOptional() otherOrgs: string | null;
  @Expose() @ApiPropertyOptional() affiliationDetails: string | null;
  @Expose() @ApiPropertyOptional() businessOverview: string | null;
  @Expose() @ApiPropertyOptional() geographicFocus: string | null;
  @Expose() @ApiProperty({ enum: MembershipStatus }) status: MembershipStatus;
  @Expose() @ApiPropertyOptional() rejectReason: string | null;
  @Expose() @Type(() => MembershipContactOutput) @ApiProperty({ type: [MembershipContactOutput] }) contacts: MembershipContactOutput[];
  @Expose() @Type(() => MembershipDocumentOutput) @ApiProperty({ type: [MembershipDocumentOutput] }) documents: MembershipDocumentOutput[];
  @Expose() @ApiProperty() createdAt: Date;
  @Expose() @ApiProperty() updatedAt: Date;
}
