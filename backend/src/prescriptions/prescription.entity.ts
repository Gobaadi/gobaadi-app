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

export interface Medicine {
  name: string;
  dosage?: string;
  quantity?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  notes?: string;
}

@Entity('prescriptions')
export class Prescription {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  appointmentId: number;

  @Index()
  @Column()
  doctorId: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorId' })
  doctor?: Doctor;

  /** Animal.id (the patient) */
  @Index()
  @Column()
  animalId: number;

  /** User.id (the owner) */
  @Index()
  @Column()
  ownerId: number;

  @Column('jsonb', { nullable: true })
  medicines?: Medicine[];

  @Column({ nullable: true })
  attachmentUrl?: string;

  @Column('timestamptz', { nullable: true })
  sentAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
