import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Company } from './company.entity';

@Entity('membership_contacts')
export class MembershipContact {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Company, (c) => c.contacts, { onDelete: 'CASCADE' })
  company: Company;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ type: 'varchar', length: 60, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  middleName: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  position: string | null;

  @Column({ type: 'varchar', length: 260, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  contactType: string | null;

  @Column({ default: false })
  sameAsRegistered: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  province: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  street: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  zip: string | null;
}
