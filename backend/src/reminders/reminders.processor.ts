import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import { In, Repository } from 'typeorm';
import {
  Appointment,
  AppointmentStatus,
} from '../appointments/appointment.entity';
import {
  MedicalEvent,
  MedicalEventStatus,
  MedicalEventType,
} from '../medical-events/medical-event.entity';
import {
  VideoSession,
  VideoSessionStatus,
} from '../video-call/video-call.entity';
import { Doctor } from '../doctors/doctor.entity';
import { User } from '../users/user.entity';
import { ChatGateway } from '../chat/chat.gateway';
import { CALL_GRACE_PERIOD_MS } from '../common/call-gate';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

interface ReminderWindow {
  label: '24h' | '1h';
  flagColumn: 'reminder24hSent' | 'reminder1hSent';
  fromMs: number;
  toMs: number;
}

const WINDOWS: ReminderWindow[] = [
  {
    label: '24h',
    flagColumn: 'reminder24hSent',
    fromMs: 23.5 * 60 * 60 * 1000,
    toMs: 24.5 * 60 * 60 * 1000,
  },
  {
    label: '1h',
    flagColumn: 'reminder1hSent',
    fromMs: 0.75 * 60 * 60 * 1000,
    toMs: 1.25 * 60 * 60 * 1000,
  },
];

/** Max consultation/call session length (matches the client-side 30 min auto-end). */
const SESSION_MAX_DURATION_MS = 30 * 60 * 1000;

@Processor('reminders-queue')
export class RemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(RemindersProcessor.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MedicalEvent)
    private readonly medicalEventRepository: Repository<MedicalEvent>,
    @InjectRepository(VideoSession)
    private readonly videoSessionRepository: Repository<VideoSession>,
    @InjectQueue('mail-queue')
    private readonly mailQueue: Queue,
    private readonly chatGateway: ChatGateway,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'scan-appointments') {
      for (const window of WINDOWS) {
        await this.scanWindow(window);
      }
      return;
    }

    if (job.name === 'complete-past-sessions') {
      await this.completePastSessions();
    }
  }

  /**
   * Auto-completion sweep (runs every 60s):
   * 1. Appointments whose slot has passed become COMPLETED — but only when no
   *    consultation is still ONGOING (an active session keeps the appointment
   *    open until the consultation itself ends).
   * 2. ONGOING consultations older than 30 min from their start become COMPLETED.
   * 3. ACTIVE call sessions started more than 30 min ago become ENDED
   *    (safety net when a client dies instead of ending the call cleanly).
   */
  private async completePastSessions(): Promise<void> {
    // Keep appointments joinable for the full call-gate grace window (+30 min
    // after endAt) before auto-completing — the gate allows joins inside that
    // window, and completing earlier makes late joins fail with
    // "not in a joinable state".
    const completionCutoff = new Date(Date.now() - CALL_GRACE_PERIOD_MS);
    // TypeORM's raw .query() returns [rows, rowCount] for UPDATE/DELETE on Postgres.
    const completedRaw: unknown = await this.appointmentRepository.query(
      `UPDATE appointments a
            SET status = 'COMPLETED'
          WHERE a.status IN ('CONFIRMED', 'RESCHEDULED')
            AND a."endAt" < :cutoff
            AND NOT EXISTS (
              SELECT 1 FROM medical_events m
              WHERE m."appointmentId" = a.id
                AND m.type = 'CONSULTATION'
                AND m.status = 'ONGOING'
            )
          RETURNING a.id`,
      { cutoff: completionCutoff },
    );
    const completedAppointments: { id: number }[] =
      Array.isArray(completedRaw) && Array.isArray(completedRaw[0])
        ? (completedRaw[0] as { id: number }[])
        : (completedRaw as { id: number }[]);

    const closedConsultations = await this.completeStaleConsultations();

    const endedSessions = await this.videoSessionRepository
      .createQueryBuilder()
      .update(VideoSession)
      .set({
        status: VideoSessionStatus.ENDED,
        endedAt: new Date(),
      })
      .where('status = :status', { status: VideoSessionStatus.ACTIVE })
      .andWhere('"startedAt" < :cutoff', {
        cutoff: new Date(Date.now() - SESSION_MAX_DURATION_MS),
      })
      .execute();

    if (
      completedAppointments.length > 0 ||
      closedConsultations > 0 ||
      (endedSessions.affected ?? 0) > 0
    ) {
      this.logger.log(
        `Session-completion scan: ${completedAppointments.length} appointment(s) completed, ` +
          `${closedConsultations} consultation(s) closed, ` +
          `${endedSessions.affected ?? 0} call session(s) ended`,
      );
    }
  }

  private async completeStaleConsultations(): Promise<number> {
    const ongoing = await this.medicalEventRepository.find({
      where: {
        type: MedicalEventType.CONSULTATION,
        status: MedicalEventStatus.ONGOING,
      },
    });

    const cutoff = Date.now() - SESSION_MAX_DURATION_MS;
    const stale = ongoing.filter((event) => {
      const rawStartedAt = event.data?.startedAt;
      const startedAt =
        typeof rawStartedAt === 'string' ? Date.parse(rawStartedAt) : NaN;
      const startedMs = Number.isNaN(startedAt)
        ? event.createdAt.getTime()
        : startedAt;
      return startedMs <= cutoff;
    });
    if (stale.length === 0) {
      return 0;
    }

    await this.medicalEventRepository.update(
      { id: In(stale.map((event) => event.id)) },
      { status: MedicalEventStatus.COMPLETED },
    );
    return stale.length;
  }

  private async scanWindow(window: ReminderWindow): Promise<void> {
    const now = Date.now();
    const from = new Date(now + window.fromMs);
    const to = new Date(now + window.toMs);

    // Atomic UPDATE...RETURNING is what prevents duplicate sends across overlapping scan ticks,
    // not just the once-per-tick guarantee of the repeatable job itself.
    const result = await this.appointmentRepository
      .createQueryBuilder()
      .update(Appointment)
      .set({ [window.flagColumn]: true })
      .where('status = :status', { status: AppointmentStatus.CONFIRMED })
      .andWhere(`"${window.flagColumn}" = false`)
      .andWhere('"startAt" BETWEEN :from AND :to', { from, to })
      .returning('*')
      .execute();

    const dueAppointments = result.raw as Appointment[];
    for (const appointment of dueAppointments) {
      await this.dispatchReminder(appointment, window.label);
    }

    if (dueAppointments.length > 0) {
      this.logger.log(
        `Dispatched ${dueAppointments.length} ${window.label} reminder(s)`,
      );
    }
  }

  private async dispatchReminder(
    appointment: Appointment,
    windowLabel: '24h' | '1h',
  ): Promise<void> {
    const [patient, doctor] = await Promise.all([
      this.userRepository.findOneBy({ id: appointment.patientId }),
      this.doctorRepository.findOneBy({ id: appointment.doctorId }),
    ]);

    if (patient?.email) {
      try {
        await this.mailQueue.add('send-appointment-reminder', {
          email: patient.email,
          doctorName: doctor?.name || 'your doctor',
          date: appointment.startAt.toDateString(),
          time: appointment.startAt.toLocaleTimeString(),
          windowLabel,
        });
      } catch (err) {
        this.logger.warn('Failed to queue appointment reminder email', err);
      }
    }

    this.chatGateway.notifyUser(appointment.patientId, 'appointmentReminder', {
      appointmentId: appointment.id,
      startAt: appointment.startAt,
      windowLabel,
    });
    await this.notificationsService.createNotification(
      appointment.patientId,
      'Appointment reminder',
      `Your appointment with ${doctor?.name || 'your doctor'} is in ${windowLabel}.`,
      NotificationType.REMINDER,
      'Appointment',
      String(appointment.id),
    );

    if (doctor?.userId) {
      this.chatGateway.notifyUser(doctor.userId, 'appointmentReminder', {
        appointmentId: appointment.id,
        startAt: appointment.startAt,
        windowLabel,
      });
      await this.notificationsService.createNotification(
        doctor.userId,
        'Appointment reminder',
        `Your appointment with ${patient?.name || 'your patient'} is in ${windowLabel}.`,
        NotificationType.REMINDER,
        'Appointment',
        String(appointment.id),
      );
    }
  }
}
