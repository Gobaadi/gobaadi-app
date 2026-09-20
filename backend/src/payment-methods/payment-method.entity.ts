import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

export enum PaymentMethodType {
  BKASH = 'bkash',
  MOBILE_BANKING = 'mobile_banking',
  CARD = 'card',
  CASH = 'cash',
}

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  userId: number;

  @Column({ type: 'enum', enum: PaymentMethodType })
  type: PaymentMethodType;

  @Column({ nullable: true })
  maskedNumber?: string;

  @Column({ nullable: true })
  provider?: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verificationOtp?: string;

  @CreateDateColumn()
  createdAt: Date;
}
