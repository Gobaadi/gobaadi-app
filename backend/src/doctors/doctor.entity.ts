import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  ManyToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Clinic } from '../clinics/clinic.entity';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column('int', { nullable: true })
  userId?: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column()
  name: string;

  @Index()
  @Column()
  specialty: string;

  @Column()
  experience: string;

  @Column('float', { default: 4.8 })
  rating: number;

  @Column()
  avatar: string;

  @Column('text')
  bio: string;

  @Column('text', { array: true, default: '{}' })
  qualifications: string[];

  @Column('text', { array: true, default: '{}' })
  specializations: string[];

  @Column('text', { array: true, default: '{}' })
  credentialDocuments: string[];

  @Column('jsonb', { default: '[]' })
  experiences: Array<{
    title: string;
    organization: string;
    duration: string;
    description?: string;
  }>;

  @Column('jsonb', { nullable: true })
  credentialPeriod?: {
    startMonth?: string;
    startYear?: string;
    endMonth?: string;
    endYear?: string;
    isCurrentlyStudying?: boolean;
  } | null;

  @Column({ nullable: true })
  licenseNumber?: string;

  @Column({ nullable: true })
  location?: string;

  @Column('float', { default: 500 })
  consultationFee: number;

  @Column({ default: false })
  isVerified: boolean;

  @ManyToMany(() => Clinic, (clinic) => clinic.doctors)
  clinics: Clinic[];
}
