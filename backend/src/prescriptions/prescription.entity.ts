import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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
