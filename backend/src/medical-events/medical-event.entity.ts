import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MedicalEventType {
  CONSULTATION = 'CONSULTATION',
  TREATMENT = 'TREATMENT',
  VACCINATION = 'VACCINATION',
  LAB_TEST = 'LAB_TEST',
}

export enum MedicalEventStatus {
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
}

@Entity('medical_events')
export class MedicalEvent {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Patient owner (User.id) — the human who booked the appointment.
   * Consultations are keyed patient user <-> doctor, never by animal.
   */
  @Index()
  @Column()
  patientId: number;

  @Index()
  @Column()
  appointmentId: number;

  @Index()
  @Column()
  doctorId: number;

  @Column({ type: 'enum', enum: MedicalEventType })
  type: MedicalEventType;

  @Column({
    type: 'enum',
    enum: MedicalEventStatus,
    default: MedicalEventStatus.ONGOING,
  })
  status: MedicalEventStatus;

  /**
   * Free-form structured content — shape varies per `type` (assessment/
   * diagnosis/treatment-plan for CONSULTATION, medicine/dosage/administration
   * for VACCINATION or TREATMENT, sample/report summary for LAB_TEST). Kept
   * as jsonb rather than one entity per type to avoid overbuilding before
   * the exact per-type fields are confirmed with product/design.
   */
  @Column('jsonb')
  data: Record<string, unknown>;

  @Column('timestamptz', { nullable: true })
  nextFollowUpAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
