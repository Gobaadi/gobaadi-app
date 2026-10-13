import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum VideoSessionStatus {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

@Entity('video_sessions')
export class VideoSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  appointmentId: number;

  @Column()
  channelName: string;

  @Column({
    type: 'enum',
    enum: VideoSessionStatus,
    default: VideoSessionStatus.WAITING,
  })
  status: VideoSessionStatus;

  @Column('int', { nullable: true })
  doctorUserId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorUserId' })
  doctorUser?: User;

  @Column('int', { nullable: true })
  patientId: number | null;

  @Column('timestamptz', { nullable: true })
  startedAt: Date | null;

  @Column('timestamptz', { nullable: true })
  endedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
