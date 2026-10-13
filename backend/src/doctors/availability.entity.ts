import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Doctor } from './doctor.entity';

@Entity('doctor_availability')
@Index(['doctorId', 'dayOfWeek'])
@Index(['doctorId', 'specificDate'])
export class Availability {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  doctorId: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorId' })
  doctor?: Doctor;

  /** 0 = Sunday .. 6 = Saturday. Used for recurring weekly availability. */
  @Column('int', { nullable: true })
  dayOfWeek: number;

  /** 'HH:mm' 24-hour format */
  @Column()
  startTime: string;

  /** 'HH:mm' 24-hour format */
  @Column()
  endTime: string;

  @Column('int', { default: 30 })
  slotDurationMinutes: number;

  @Column('int', { default: 10 })
  bufferMinutes: number;

  /** true = recurring weekly rule is active; false = disabled */
  @Column({ default: true })
  isActive: boolean;

  /** null = recurring weekly row; set = one-off override for that specific date */
  @Column({ type: 'date', nullable: true })
  specificDate?: Date;

  /** false = doctor blocked this specific date/slot */
  @Column({ default: true })
  isAvailable: boolean;

  /** Specific time slots for this date override, e.g. ['09:00-09:30','10:00-10:30'] */
  @Column('simple-array', { nullable: true })
  overrideSlots?: string[];
}
