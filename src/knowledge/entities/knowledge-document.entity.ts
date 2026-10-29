import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../user/entities/user.entity';

export enum KnowledgeCategory {
  ECE = 'ECE',
  MANUAL = 'Manual',
  POLICIES = 'Policies',
  TERMS = 'Terms',
}

@Entity('knowledge_documents')
export class KnowledgeDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 2000, nullable: true })
  description: string;

  @Column({ type: 'enum', enum: KnowledgeCategory })
  category: KnowledgeCategory;

  @Column({ length: 10, default: 'PDF' })
  kind: string;

  @Column({ length: 260 })
  originalName: string;

  @Column({ length: 260 })
  storedName: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column()
  size: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'SET NULL', nullable: true })
  author: User;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
