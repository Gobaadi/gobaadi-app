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
import {
  Appointment,
  AppointmentStatus,
} from '../appointments/appointment.entity';

const CALL_GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes before/after slot

@Injectable()
export class VideoCallService {
  constructor(
    @InjectRepository(VideoSession)
    private readonly sessionRepo: Repository<VideoSession>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
  ) {}

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

    const isDoctor = appointment.doctorId === userId;
    const isPatient = appointment.patientId === userId;

    if (!isDoctor && !isPatient) {
      throw new ForbiddenException(
        'You are not a participant of this consultation',
      );
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot start a call for a cancelled appointment');
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot start a call for a completed appointment');
    }

    const now = new Date();
    const callWindowStart = new Date(
      appointment.startAt.getTime() - CALL_GRACE_PERIOD_MS,
    );
    const callWindowEnd = new Date(
      appointment.endAt.getTime() + CALL_GRACE_PERIOD_MS,
    );

    if (now < callWindowStart || now > callWindowEnd) {
      throw new BadRequestException(
        'Call is only allowed within the consultation time window',
      );
    }

    const existing = await this.sessionRepo.findOne({
      where: { appointmentId },
    });
    if (existing && existing.status !== VideoSessionStatus.ENDED) {
      return existing;
    }

    const channelName = `appointment-${appointmentId}`;

    const session = this.sessionRepo.create({
      appointmentId,
      channelName,
      doctorUserId: appointment.doctorId,
      patientId: appointment.patientId,
      status: VideoSessionStatus.WAITING,
    });

    return this.sessionRepo.save(session);
  }

  async joinSession(
    appointmentId: number,
    userId: number,
  ): Promise<{ token: string; channelName: string; appId: string }> {
    const session = await this.sessionRepo.findOne({
      where: { appointmentId },
    });
    if (!session) {
      throw new NotFoundException('No active call for this appointment');
    }

    if (session.status === VideoSessionStatus.ENDED) {
      throw new BadRequestException('This call has ended');
    }

    const appointment = await this.appointmentRepo.findOneBy({
      id: appointmentId,
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const isDoctor = appointment.doctorId === userId;
    const isPatient = appointment.patientId === userId;

    if (!isDoctor && !isPatient) {
      throw new ForbiddenException('You are not part of this consultation');
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
    const session = await this.sessionRepo.findOne({
      where: { appointmentId },
    });
    if (!session) {
      throw new NotFoundException('No active call for this appointment');
    }

    if (session.doctorUserId !== userId && session.patientId !== userId) {
      throw new ForbiddenException('You are not part of this consultation');
    }

    session.status = VideoSessionStatus.ENDED;
    session.endedAt = new Date();
    await this.sessionRepo.save(session);
  }

  async getOrCreateSession(appointmentId: number): Promise<VideoSession> {
    let session = await this.sessionRepo.findOne({
      where: { appointmentId },
    });
    if (!session || session.status === VideoSessionStatus.ENDED) {
      const appointment = await this.appointmentRepo.findOneBy({
        id: appointmentId,
      });
      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }
      const channelName = `appointment-${appointmentId}`;
      session = this.sessionRepo.create({
        appointmentId,
        channelName,
        doctorUserId: appointment.doctorId,
        patientId: appointment.patientId,
        status: VideoSessionStatus.WAITING,
      });
      session = await this.sessionRepo.save(session);
    }
    return session;
  }
}
