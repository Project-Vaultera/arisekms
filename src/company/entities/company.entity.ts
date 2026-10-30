import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../user/entities/user.entity';
import { MembershipContact } from './membership-contact.entity';
import { MembershipDocument } from './membership-document.entity';

export enum MembershipStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('companies')
@Unique('company_name', ['name'])
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @ManyToMany(() => User, { cascade: false })
  @JoinTable({
    name: 'user_companies',
    joinColumn: { name: 'company_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: User[];

  // A. Company identity
  @Column({ type: 'varchar', length: 200, nullable: true })
  legalRepName: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  legalRepTitle: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  applicantCountry: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  registeredCountry: string | null;

  // B. Legal registration
  @Column({ type: 'text', nullable: true })
  noAttachmentExplanation: string | null;

  // C. Classification
  @Column({ type: 'varchar', length: 200, nullable: true })
  sector: string | null;

  @Column({ type: 'boolean', nullable: true })
  isTradeAssociation: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  isBusinessAssociation: boolean | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  exchangeSymbol: string | null;

  @Column({ type: 'text', nullable: true })
  parentCompanyDetails: string | null;

  // D. Registered business address
  @Column({ type: 'varchar', length: 300, nullable: true })
  street: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  province: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  zip: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  phone: string | null;

  // E. Size + financials
  @Column({ type: 'varchar', length: 300, nullable: true })
  website: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  fax: string | null;

  @Column({ type: 'int', nullable: true })
  staffCount: number | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  annualRevenue: string | null;

  // Tab 4 — UN + CSR affiliations ("UN Global Impact" keeps Frappe wording in UI)
  @Column({ type: 'boolean', nullable: true })
  unGlobalCompact: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  otherUnAgency: boolean | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  whichAgency: string | null;

  @Column({ type: 'text', nullable: true })
  otherOrgs: string | null;

  @Column({ type: 'text', nullable: true })
  affiliationDetails: string | null;

  // Tab 5 — other company information
  @Column({ type: 'text', nullable: true })
  businessOverview: string | null;

  @Column({ type: 'text', nullable: true })
  geographicFocus: string | null;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.DRAFT,
  })
  status: MembershipStatus;

  @Column({ type: 'text', nullable: true })
  rejectReason: string | null;

  @OneToMany(() => MembershipContact, (c) => c.company)
  contacts: MembershipContact[];

  @OneToMany(() => MembershipDocument, (d) => d.company)
  documents: MembershipDocument[];

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
