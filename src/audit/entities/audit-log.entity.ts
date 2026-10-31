import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../user/entities/user.entity';

// Single-tenant trail: no organization column (cf. gamsys audit_logs).
@Entity('audit_logs')
@Index(['action'])
@Index(['entityType'])
@Index(['createdAt'])
@Index(['outcome'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_audit_logs_actorId')
  @Column({ type: 'int', nullable: true })
  actorId?: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorId' })
  actor?: User | null;

  @Column({ length: 80 })
  action: string;

  @Column({ length: 80 })
  entityType: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  entityId?: string | null;

  // Outcome of the audited request: 'success' (<400) or 'error' (>=400).
  @Column({ type: 'int', nullable: true })
  statusCode?: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  outcome?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
