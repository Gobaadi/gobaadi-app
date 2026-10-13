import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { VideoSession, VideoSessionStatus } from './video-call.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Doctor } from '../doctors/doctor.entity';
import {
  MedicalEvent,
  MedicalEventStatus,
  MedicalEventType,
} from '../medical-events/medical-event.entity';
import { assertCanCall, ConsultationGateState } from '../common/call-gate';

@Injectable()
export class VideoCallService {
  constructor(
    @InjectRepository(VideoSession)
    private readonly sessionRepo: Repository<VideoSession>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(MedicalEvent)
    private readonly medicalEventRepo: Repository<MedicalEvent>,
  ) {}

  private async consultationGateState(
    appointmentId: number,
  ): Promise<ConsultationGateState> {
    const consultation = await this.medicalEventRepo.findOne({
      where: { appointmentId, type: MedicalEventType.CONSULTATION },
      order: { createdAt: 'DESC' },
    });
    if (!consultation) return 'none';
    return consultation.status === MedicalEventStatus.ONGOING
      ? 'ONGOING'
      : 'COMPLETED';
  }

  /**
   * Appointment.doctorId is a Doctor.id (profile), while callers send
   * User.id — resolve the profile before comparing, matching the
   * getOwnedAppointment pattern used by AppointmentsService.
   */
  private async assertParticipant(
    appointment: Appointment,
    userId: number,
  ): Promise<void> {
    if (appointment.patientId === userId) return;
    const doctor = await this.doctorRepo.findOneBy({
      id: appointment.doctorId,
    });
    if (doctor?.userId === userId) return;
    throw new ForbiddenException('You are not part of this consultation');
  }

  private async resolveDoctorUserId(
    appointment: Appointment,
  ): Promise<number | null> {
    const doctor = await this.doctorRepo.findOneBy({
      id: appointment.doctorId,
    });
    return doctor?.userId ?? null;
  }

  private findLatestSession(
    appointmentId: number,
  ): Promise<VideoSession | null> {
    return this.sessionRepo.findOne({
      where: { appointmentId },
      order: { createdAt: 'DESC' },
    });
  }

  generateRtcToken(
    channelName: string,
    uid: number,
    role: 'publisher' | 'subscriber' = 'publisher',
  ): string {
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      throw new BadRequestException('Agora credentials not configured');
    }

    const tokenExpire = 86400;
    const privilegeExpire = 86400;
    const agoraRole =
      role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    return RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      agoraRole,
      tokenExpire,
      privilegeExpire,
    );
  }

  async createSession(
    appointmentId: number,
    userId: number,
  ): Promise<VideoSession> {
    const appointment = await this.appointmentRepo.findOneBy({
      id: appointmentId,
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    await this.assertParticipant(appointment, userId);
    assertCanCall(appointment, {
      consultationState: await this.consultationGateState(appointmentId),
    });

    return this.getOrCreateSession(appointmentId);
  }

  async joinSession(
    appointmentId: number,
    userId: number,
  ): Promise<{ token: string; channelName: string; appId: string }> {
    const appointment = await this.appointmentRepo.findOneBy({
      id: appointmentId,
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    await this.assertParticipant(appointment, userId);
    assertCanCall(appointment, {
      consultationState: await this.consultationGateState(appointmentId),
    });

    let session = await this.findLatestSession(appointmentId);
    if (!session) {
      session = await this.createWaitingSession(appointment);
    } else if (session.status === VideoSessionStatus.ENDED) {
      session = await this.reuseSession(session);
    }

    if (session.status === VideoSessionStatus.WAITING) {
      session.status = VideoSessionStatus.ACTIVE;
      session.startedAt = new Date();
      await this.sessionRepo.save(session);
    }

    const token = this.generateRtcToken(session.channelName, userId);

    return {
      token,
      channelName: session.channelName,
      appId: process.env.AGORA_APP_ID as string,
    };
  }

  async endSession(appointmentId: number, userId: number): Promise<void> {
    const session = await this.findLatestSession(appointmentId);
    if (!session) {
      throw new NotFoundException('No active call for this appointment');
    }

    const appointment = await this.appointmentRepo.findOneBy({
      id: appointmentId,
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    await this.assertParticipant(appointment, userId);

    session.status = VideoSessionStatus.ENDED;
    session.endedAt = new Date();
    await this.sessionRepo.save(session);
  }

  async getOrCreateSession(appointmentId: number): Promise<VideoSession> {
    const existing = await this.findLatestSession(appointmentId);
    if (existing && existing.status !== VideoSessionStatus.ENDED) {
      return existing;
    }

    const appointment = await this.appointmentRepo.findOneBy({
      id: appointmentId,
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (existing) {
      return this.reuseSession(existing);
    }
    return this.createWaitingSession(appointment);
  }

  private async createWaitingSession(
    appointment: Appointment,
  ): Promise<VideoSession> {
    const session = this.sessionRepo.create({
      appointmentId: appointment.id,
      channelName: `appointment-${appointment.id}`,
      doctorUserId: await this.resolveDoctorUserId(appointment),
      patientId: appointment.patientId,
      status: VideoSessionStatus.WAITING,
    });
    return this.sessionRepo.save(session);
  }

  /**
   * Reset the ENDED row for a new call instead of inserting another row,
   * keeping one session row per appointment (no ordering ambiguity).
   */
  private reuseSession(session: VideoSession): Promise<VideoSession> {
    session.status = VideoSessionStatus.WAITING;
    session.startedAt = null;
    session.endedAt = null;
    return this.sessionRepo.save(session);
  }
}
