import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from '../doctors/doctor.entity';

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  RESCHEDULED = 'RESCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum ConsultationType {
  ONLINE_VIDEO = 'online_video',
  ONLINE_VOICE = 'online_voice',
  ONLINE_CHAT = 'online_chat',
  PHYSICAL = 'physical',
}

@Entity('appointments')
@Index(['doctorId', 'startAt'], {
  unique: true,
  where: "status != 'CANCELLED'",
})
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  doctorId: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorId' })
  doctor?: Doctor;

  @Index()
  @Column('int', { nullable: true })
  clinicId?: number | null;

  @Index()
  @Column('int', { nullable: true })
  serviceId?: number | null;

  /** The human owner who booked (User.id) */
  @Index()
  @Column()
  patientId: number;

  /**
   * The animal being treated (Animal.id). Nullable for backward compatibility
   * with rows booked before this field existed — new bookings should always
   * set it, since the doctor-app UI treats the animal as "the patient."
   */
  @Index()
  @Column('int', { nullable: true })
  animalId?: number | null;

  @Column('timestamptz')
  startAt: Date;

  @Column('timestamptz')
  endAt: Date;

  @Column('int')
  durationMinutes: number;

  @Column('float', { default: 0 })
  price: number;

  @Column({ default: 'pending' })
  paymentStatus: string; // pending, paid, failed, refunded

  @Column({ nullable: true })
  paymentTransactionId?: string;

  @Column('text', { nullable: true })
  prescription?: string; // prescription notes or file URL

  @Column('text', { nullable: true })
  notes?: string;

  @Index()
  @Column({ type: 'enum', enum: ConsultationType, nullable: true })
  consultationType?: ConsultationType | null;

  @Column('text', { nullable: true })
  reasonForConsultation?: string;

  @Column('text', { array: true, nullable: true })
  symptoms?: string[];

  @Column('int', { nullable: true })
  followUpId?: number | null;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.CONFIRMED,
  })
  status: AppointmentStatus;

  @Column({ default: false })
  reminder24hSent: boolean;

  @Column({ default: false })
  reminder1hSent: boolean;

  @Column('timestamptz', { nullable: true })
  cancelledAt?: Date | null;

  @Column('int', { nullable: true })
  cancelledByUserId?: number | null;

  /** Free-text cancellation reason (replaces the old CancellationReason enum) */
  @Column('text', { nullable: true })
  cancellationReason?: string | null;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cancellationFee: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  refundAmount: number;

  /** FK -> wallet_transactions.id */
  @Column({ nullable: true })
  walletTransactionId?: string;

  @Column('text', { nullable: true })
  consultationNotes?: string;

  @Column({ type: 'date', nullable: true })
  followUpDate?: Date;

  @Column('timestamptz', { nullable: true })
  originalStartAt?: Date | null;

  @Column('timestamptz', { nullable: true })
  rescheduledAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
