import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../user/entities/user.entity';

export enum CertificateStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  memberName: string;

  @Column({ length: 200 })
  course: string;

  @Column({ length: 200, default: 'IBM SkillsBuild' })
  issuer: string;

  @Column({ type: 'date' })
  dateIssued: Date;

  @Column({ length: 100, nullable: true })
  credentialId: string;

  @Column({ type: 'enum', enum: CertificateStatus, default: CertificateStatus.PENDING })
  status: CertificateStatus;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  submittedBy: User;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
