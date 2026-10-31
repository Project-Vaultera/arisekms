import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Company } from './company.entity';

export enum MembershipDocKind {
  REGISTRATION_PROOF = 'registration_proof',
  SUPPORTING = 'supporting',
}

@Entity('membership_documents')
export class MembershipDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Company, (c) => c.documents, { onDelete: 'CASCADE' })
  company: Company;

  @Column({ type: 'enum', enum: MembershipDocKind })
  kind: MembershipDocKind;

  @Column({ length: 260 })
  originalName: string;

  @Column({ length: 260 })
  storedName: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column()
  size: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
