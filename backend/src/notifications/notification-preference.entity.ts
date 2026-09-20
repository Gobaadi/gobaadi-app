import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  userId: number;

  @Column({ default: true })
  appointmentReminders: boolean;

  @Column({ default: true })
  promotionalOffers: boolean;

  @Column({ default: true })
  chatMessages: boolean;

  @Column({ default: true })
  prescriptionUpdates: boolean;

  @Column({ default: true })
  labResults: boolean;

  @Column({ default: true })
  vaccinationReminders: boolean;

  @Column({ default: true })
  systemUpdates: boolean;

  @Column({ default: true })
  weatherAlerts: boolean;

  @Column({ default: true })
  taskReminders: boolean;

  @Column({ default: true })
  followUpReminders: boolean;

  @Column({ default: true })
  hygieneReminders: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
