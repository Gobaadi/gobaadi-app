import { BadRequestException } from '@nestjs/common';
import {
  Appointment,
  AppointmentStatus,
  ConsultationType,
} from '../appointments/appointment.entity';

const CALL_GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes before/after slot

/**
 * Shared rules for starting or joining a video call — used by
 * VideoCallService (createSession/joinSession) and
 * AppointmentsService.getJoinInfo so every entry point enforces the
 * same status + time-window policy.
 */
export function assertCanCall(appointment: Appointment): void {
  if (
    appointment.status !== AppointmentStatus.CONFIRMED &&
    appointment.status !== AppointmentStatus.RESCHEDULED
  ) {
    throw new BadRequestException(
      'This appointment is not in a joinable state',
    );
  }

  // Legacy rows may have no consultationType; reject only explicit
  // non-online types (e.g. physical).
  if (
    appointment.consultationType != null &&
    appointment.consultationType !== ConsultationType.ONLINE_VIDEO &&
    appointment.consultationType !== ConsultationType.ONLINE_VOICE &&
    appointment.consultationType !== ConsultationType.ONLINE_CHAT
  ) {
    throw new BadRequestException(
      'This appointment is not an online consultation',
    );
  }

  const now = Date.now();
  const windowStart = appointment.startAt.getTime() - CALL_GRACE_PERIOD_MS;
  const windowEnd = appointment.endAt.getTime() + CALL_GRACE_PERIOD_MS;
  if (now < windowStart || now > windowEnd) {
    throw new BadRequestException(
      'Call is only allowed within the consultation time window',
    );
  }
}
