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

export enum TimeOffReason {
  VACATION = 'vacation',
  SICK_LEAVE = 'sick_leave',
  CONFERENCE_TRAINING = 'conference_training',
  EMERGENCY = 'emergency',
  OTHER = 'other',
}

@Entity('doctor_time_off')
export class DoctorTimeOff {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  doctorId: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorId' })
  doctor?: Doctor;

  @Column('date')
  startDate: string;

  @Column('date')
  endDate: string;

  @Column({ type: 'enum', enum: TimeOffReason })
  reason: TimeOffReason;

  @Column('text', { nullable: true })
  note?: string;

  @CreateDateColumn()
  createdAt: Date;
}
