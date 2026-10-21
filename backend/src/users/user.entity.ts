import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  /** Farm-owner account (rebranded from legacy 'user'). */
  USER = 'farm_owner',
  DOCTOR = 'doctor',
  CLINIC = 'clinic',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true, where: '"phone" IS NOT NULL' })
  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ nullable: true })
  name?: string;

  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true, select: false })
  password?: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ nullable: true })
  profilePhoto?: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({ nullable: true })
  bloodGroup?: string;

  @Column({ type: 'text', nullable: true })
  allergies?: string;

  @Column({ nullable: true })
  emergencyContactName?: string;

  @Column({ nullable: true })
  emergencyContactPhone?: string;

  @Column({ default: 'en' })
  language: string;

  @Column({ default: false })
  isDoctorVerified: boolean;

  @Column('simple-array', { nullable: true })
  verificationDocuments?: string[];

  @Index({ unique: true, where: '"googleId" IS NOT NULL' })
  @Column({ nullable: true })
  googleId?: string;

  @Index({ unique: true, where: '"facebookId" IS NOT NULL' })
  @Column({ nullable: true })
  facebookId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
