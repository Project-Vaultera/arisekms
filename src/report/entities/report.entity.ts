import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../user/entities/user.entity';

export enum ReportCategory {
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  GOOD_PRACTICES = 'good-practices',
  SUCCESS_STORIES = 'success-stories',
}

export enum ReportStatus {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ReportCategory })
  category: ReportCategory;

  @Column({ length: 260 })
  originalName: string;

  @Column({ length: 260 })
  storedName: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column()
  size: number;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.SUBMITTED,
  })
  status: ReportStatus;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  author: User;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
