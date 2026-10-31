import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Company } from '../../company/entities/company.entity';
import { User } from '../../user/entities/user.entity';

export enum ActivityType {
  INTERNATIONAL_RESPONSE = 'international-response',
  YOUTH = 'youth',
  TECHNICAL_ASSISTANCE = 'technical-assistance',
  F2F_TRAINING = 'f2f-training',
  SKILLSBUILD = 'skillsbuild',
  COLLABORATION = 'collaboration',
  OTHER = 'other',
}

export enum ActivityStatus {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'enum', enum: ActivityType, default: ActivityType.OTHER })
  activityType: ActivityType;

  @Column({ type: 'varchar', length: 120, nullable: true })
  targetAudience: string | null;

  @Column({ type: 'enum', enum: ActivityStatus, default: ActivityStatus.SUBMITTED })
  status: ActivityStatus;

  @Column({ type: 'date', nullable: true })
  happenedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  youthCount: number | null;

  @Column({ type: 'int', nullable: true })
  trainedCount: number | null;

  @Column({ type: 'boolean', default: false })
  isInternational: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  company: Company | null;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  createdBy: User;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
