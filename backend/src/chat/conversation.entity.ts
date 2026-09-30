import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Doctor } from '../doctors/doctor.entity';
import { User } from '../users/user.entity';

@Entity('conversations')
@Index(['doctorId', 'patientId'], { unique: true })
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  doctorId: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorId' })
  doctor?: Doctor;

  @Column('int', { nullable: true })
  doctorUserId?: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorUserId' })
  doctorUser?: User;

  @Index()
  @Column()
  patientId: number;

  @Column('int', { nullable: true })
  appointmentId?: number | null;

  @Column('timestamptz', { nullable: true })
  lastMessageAt?: Date | null;

  @Column('text', { nullable: true })
  lastMessageText?: string | null;

  @Column('int', { default: 0 })
  unreadCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
