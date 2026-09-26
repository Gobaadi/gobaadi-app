import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum NotificationType {
  ORDER = 'order',
  BOOKING = 'booking',
  PAYMENT = 'payment',
  DELIVERY = 'delivery',
  REMINDER = 'reminder',
  AI_READY = 'ai_ready',
  PRESCRIPTION_READY = 'prescription_ready',
  PROMOTION = 'promotion',
  SYSTEM = 'system',
  MESSAGE = 'message',
  REFERRAL = 'referral',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column('int')
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column()
  title: string;

  @Column('text')
  body: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({ nullable: true })
  referenceType?: string; // e.g. 'Order', 'Appointment', 'AiDiagnosis'

  @Column({ nullable: true })
  referenceId?: string; // e.g. Order ID, Appointment ID

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  occurrence?: string;

  @Column({ nullable: true })
  time?: string;

  @CreateDateColumn()
  createdAt: Date;
}
