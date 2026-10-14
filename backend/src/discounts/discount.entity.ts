import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('discounts')
export class Discount {
  @PrimaryGeneratedColumn()
  id: number;

  /** Promo code - letters/numbers (any script), max 10 chars, case-insensitive */
  @Index({ unique: true })
  @Column({ length: 10 })
  code: string;

  /** Discount percent (0-100) */
  @Column('float')
  percent: number;

  /** When this code becomes valid */
  @Column({ type: 'date', nullable: true })
  validFrom?: Date;

  /** When this code expires */
  @Column({ type: 'date', nullable: true })
  validTo?: Date;

  /** Max number of times this code can be used (null = unlimited) */
  @Column('int', { nullable: true })
  usageLimit?: number;

  /** Current number of times this code has been used */
  @Column('int', { default: 0 })
  usageCount: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
