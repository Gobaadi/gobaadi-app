import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository, SelectQueryBuilder } from 'typeorm';
import { Animal } from '../animals/animal.entity';
import { assertCanCall, ConsultationGateState } from '../common/call-gate';
import { PaginatedResult } from '../common/paginated-result.interface';
import { DiscountsService } from '../discounts/discounts.service';
import { Doctor, DoctorsService } from '../doctors/doctors.service';
import {
  MedicalEvent,
  MedicalEventStatus,
  MedicalEventType,
} from '../medical-events/medical-event.entity';
import { NotificationType } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Service } from '../services/service.entity';
import { TimeOffService } from '../time-off/time-off.service';
import { User, UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { VideoCallService } from '../video-call/video-call.service';
import { WalletService } from '../wallet/wallet.service';
import {
  Appointment,
  AppointmentStatus,
  ConsultationType,
} from './appointment.entity';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import {
  addMinutes,
  parseSlotDateTime,
  subMinutes,
} from './utils/slot-time.util';
import { dhakaDayWindow } from './utils/dhaka-day-window.util';

const RESCHEDULE_CANCEL_BUFFER_MS = 1 * 60 * 60 * 1000; // 1 hour

export interface AppointmentWithPatient extends Appointment {
  patientName?: string;
  patientPhone?: string;
  patientAvatar?: string;
  animalName?: string;
  animalImage?: string;
  animalBreed?: string;
  animalAge?: string;
  animalWeight?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorAvatar?: string;
}

export type AppointmentListFilter =
  'today' | 'previous' | 'upcoming' | 'completed' | 'cancelled';

export interface ListAppointmentsOptions {
  filter?: AppointmentListFilter;
  consultationType?: ConsultationType;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(MedicalEvent)
    private readonly medicalEventRepository: Repository<MedicalEvent>,
    private readonly dataSource: DataSource,
    private readonly doctorsService: DoctorsService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly discountsService: DiscountsService,
    private readonly walletService: WalletService,
    private readonly timeOffService: TimeOffService,
    private readonly videoCallService: VideoCallService,
  ) {}

  async bookAppointment(
    doctorId: number,
    patientId: number,
    date: string,
    time: string,
    clinicId?: number,
    serviceId?: number,
    animalId?: number,
    consultationType?: ConsultationType,
    reasonForConsultation?: string,
    symptoms?: string[],
  ): Promise<Appointment> {
    console.log(
      'this is Bookappointment',
      doctorId,
      patientId,
      date,
      time,
      clinicId,
      serviceId,
      animalId,
      consultationType,
      reasonForConsultation,
      symptoms,
    );
    const startAt = parseSlotDateTime(date, time);
    const appointment = await this.assertNoConflictAndBook(
      doctorId,
      patientId,
      startAt,
      {
        clinicId,
        serviceId,
        animalId,
        consultationType,
        reasonForConsultation,
        symptoms,
      },
    );

    // Wallet integration: try to pay from wallet, fallback to pending
    if (appointment.price > 0) {
      try {
        const walletBalance = await this.walletService.getBalance(patientId);
        if (walletBalance.balance >= appointment.price) {
          await this.walletService.pay(
            patientId,
            appointment.price,
            'appointment_booking',
            'Appointment',
            String(appointment.id),
          );
          appointment.paymentStatus = 'paid';
          await this.appointmentRepository.save(appointment);
        }
      } catch {
        // Insufficient balance — keep paymentStatus as 'pending'
      }
    }

    await this.notificationsService.createNotification(
      patientId,
      'Appointment booked',
      'Your appointment is booked and confirmed.',
      NotificationType.BOOKING,
      'Appointment',
      String(appointment.id),
    );
    const doctor = await this.doctorsService.getDoctorById(doctorId);
    if (doctor.userId) {
      await this.notificationsService.createNotification(
        doctor.userId,
        'New appointment',
        'You have a new appointment booked.',
        NotificationType.BOOKING,
        'Appointment',
        String(appointment.id),
      );
    }

    return appointment;
  }

  async listAvailableSlots(
    doctorId: number,
    dateStr: string,
  ): Promise<string[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }
    const targetDate = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(targetDate.getTime())) {
      throw new BadRequestException('date must be a valid calendar date');
    }
    const availability = await this.doctorsService.getAvailabilityForDate(
      doctorId,
      targetDate,
    );
    if (availability.length === 0) {
      return [];
    }
    const windows = availability.filter((w) => w.isActive);
    if (windows.length === 0) {
      return [];
    }

    const existing = await this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere("a.status != 'CANCELLED'")
      .andWhere('a.startAt >= :dayStart AND a.startAt < :dayEnd', {
        dayStart: targetDate,
        dayEnd: addMinutes(targetDate, 24 * 60),
      })
      .getMany();

    const slots: string[] = [];
    for (const window of windows) {
      const [startH, startM] = window.startTime.split(':').map(Number);
      const [endH, endM] = window.endTime.split(':').map(Number);
      let cursor = new Date(targetDate);
      cursor.setHours(startH, startM, 0, 0);
      const windowEnd = new Date(targetDate);
      windowEnd.setHours(endH, endM, 0, 0);

      while (addMinutes(cursor, window.slotDurationMinutes) <= windowEnd) {
        const slotStart = new Date(cursor);
        const slotEnd = addMinutes(slotStart, window.slotDurationMinutes);
        const bufStart = subMinutes(slotStart, window.bufferMinutes);
        const bufEnd = addMinutes(slotEnd, window.bufferMinutes);

        const overlaps = existing.some(
          (a) => a.startAt < bufEnd && a.endAt > bufStart,
        );
        if (!overlaps) {
          slots.push(
            slotStart.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }),
          );
        }
        cursor = slotEnd;
      }
    }
    return slots;
  }

  async listForUser(
    userId: number,
    role: UserRole,
    opts: ListAppointmentsOptions = {},
  ): Promise<
    AppointmentWithPatient[] | PaginatedResult<AppointmentWithPatient>
  > {
    const qb = this.appointmentRepository.createQueryBuilder('a');

    if (role === UserRole.USER) {
      qb.where('a.patientId = :userId', { userId });
    } else {
      const doctor = await this.doctorsService.getDoctorByUserId(userId);
      if (!doctor) {
        return opts.page || opts.limit
          ? {
              data: [],
              page: opts.page ?? 1,
              limit: opts.limit ?? 20,
              total: 0,
            }
          : [];
      }
      qb.where('a.doctorId = :doctorId', { doctorId: doctor.id });
    }

    this.applyListFilter(qb, opts.filter);

    if (opts.consultationType) {
      qb.andWhere('a.consultationType = :consultationType', {
        consultationType: opts.consultationType,
      });
    }

    if (opts.search) {
      const matchingAnimals = await this.animalRepository
        .createQueryBuilder('an')
        .select('an.id')
        .where('an.name ILIKE :search', { search: `%${opts.search}%` })
        .getMany();
      const ids = matchingAnimals.map((a) => a.id);
      if (ids.length === 0) {
        return opts.page || opts.limit
          ? {
              data: [],
              page: opts.page ?? 1,
              limit: opts.limit ?? 20,
              total: 0,
            }
          : [];
      }
      qb.andWhere('a.animalId IN (:...ids)', { ids });
    }

    qb.orderBy('a.startAt', 'DESC');

    let appointments: Appointment[];
    let total: number | undefined;
    const currentPage = opts.page && opts.page > 0 ? opts.page : 1;
    const pageSize = opts.limit && opts.limit > 0 ? opts.limit : 20;
    if (opts.page || opts.limit) {
      qb.skip((currentPage - 1) * pageSize).take(pageSize);
      [appointments, total] = await qb.getManyAndCount();
    } else {
      appointments = await qb.getMany();
    }

    const enriched = await this.enrichWithPatientAndAnimal(appointments, role);

    if (opts.page || opts.limit) {
      return {
        data: enriched,
        page: currentPage,
        limit: pageSize,
        total: total ?? 0,
      };
    }
    return enriched;
  }

  async rescheduleAppointment(
    appointmentId: number,
    requesterId: number,
    requesterRole: UserRole,
    date: string,
    time: string,
  ): Promise<Appointment> {
    const appointment = await this.getOwnedAppointment(
      appointmentId,
      requesterId,
      requesterRole,
    );
    this.enforceReschedulableBuffer(appointment);

    const newStartAt = parseSlotDateTime(date, time);
    const rebooked = await this.assertNoConflictAndBook(
      appointment.doctorId,
      appointment.patientId,
      newStartAt,
      {
        excludeAppointmentId: appointment.id,
        clinicId: appointment.clinicId ?? undefined,
        serviceId: appointment.serviceId ?? undefined,
        animalId: appointment.animalId ?? undefined,
        consultationType: appointment.consultationType ?? undefined,
        reasonForConsultation: appointment.reasonForConsultation,
        symptoms: appointment.symptoms,
      },
    );

    await this.appointmentRepository.update(appointment.id, {
      status: AppointmentStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledByUserId: requesterId,
    });

    await this.appointmentRepository.update(rebooked.id, {
      status: AppointmentStatus.RESCHEDULED,
      originalStartAt: appointment.startAt,
      rescheduledAt: new Date(),
    });

    await this.notificationsService.createNotification(
      appointment.patientId,
      'Appointment rescheduled',
      'Your appointment was rescheduled.',
      NotificationType.BOOKING,
      'Appointment',
      String(rebooked.id),
    );

    return this.appointmentRepository.findOneByOrFail({ id: rebooked.id });
  }

  async cancelAppointment(
    appointmentId: number,
    requesterId: number,
    requesterRole: UserRole,
    dto: CancelAppointmentDto,
  ): Promise<
    Appointment & {
      walletDeduction: number;
      cancellationFee: number;
      refundAmount: number;
    }
  > {
    const appointment = await this.getOwnedAppointment(
      appointmentId,
      requesterId,
      requesterRole,
    );
    this.enforceReschedulableBuffer(appointment);

    // Calculate cancellation fee using block-time settings
    const { cancellationFee, refundAmount } =
      await this.timeOffService.calculateCancellationFee(appointmentId);

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancelledAt = new Date();
    appointment.cancelledByUserId = requesterId;
    appointment.cancellationReason = dto.note
      ? `${dto.reason} - ${dto.note}`
      : dto.reason;
    appointment.cancellationFee = cancellationFee;
    appointment.refundAmount = refundAmount;

    let walletDeduction = 0;
    if (appointment.paymentStatus === 'paid') {
      // Refund remainder to patient
      if (refundAmount > 0) {
        const refundTx = await this.walletService.adjustBalance(
          appointment.patientId,
          refundAmount,
          'appointment_cancellation_refund',
          'Appointment',
          String(appointment.id),
        );
        appointment.walletTransactionId = String(refundTx.id);
      }
      walletDeduction = appointment.price;
    }

    const saved = await this.appointmentRepository.save(appointment);

    if (requesterId === saved.patientId) {
      const doctor = await this.doctorsService.getDoctorById(saved.doctorId);
      if (doctor.userId) {
        await this.notificationsService.createNotification(
          doctor.userId,
          'Appointment cancelled',
          `Your appointment was cancelled. Cancellation fee: ${cancellationFee}`,
          NotificationType.BOOKING,
          'Appointment',
          String(saved.id),
        );
      }
    } else {
      await this.notificationsService.createNotification(
        saved.patientId,
        'Appointment cancelled',
        `Your appointment was cancelled. Refund: ${refundAmount}`,
        NotificationType.BOOKING,
        'Appointment',
        String(saved.id),
      );
    }

    return { ...saved, walletDeduction, cancellationFee, refundAmount };
  }

  async completeAppointment(
    appointmentId: number,
    doctorUserId: number,
  ): Promise<Appointment> {
    const doctor = await this.doctorsService.getDoctorByUserId(doctorUserId);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    const appointment = await this.appointmentRepository.findOneBy({
      id: appointmentId,
    });
    if (!appointment || appointment.doctorId !== doctor.id) {
      throw new NotFoundException('Appointment not found');
    }
    appointment.status = AppointmentStatus.COMPLETED;
    const saved = await this.appointmentRepository.save(appointment);

    // Create a CONSULTATION medical event with COMPLETED status
    await this.medicalEventRepository.save(
      this.medicalEventRepository.create({
        patientId: appointment.patientId,
        appointmentId: saved.id,
        doctorId: doctor.id,
        type: MedicalEventType.CONSULTATION,
        status: MedicalEventStatus.COMPLETED,
        data: {
          consultationType: saved.consultationType,
          reasonForConsultation: saved.reasonForConsultation,
          symptoms: saved.symptoms,
          completedAt: new Date().toISOString(),
        },
      }),
    );

    await this.notificationsService.createNotification(
      saved.patientId,
      'Appointment complete',
      'Your appointment is complete — leave a review!',
      NotificationType.BOOKING,
      'Appointment',
      String(saved.id),
    );

    return saved;
  }

  async getAppointmentById(
    appointmentId: number,
    requesterId: number,
    requesterRole: UserRole,
  ): Promise<AppointmentWithPatient> {
    const appointment = await this.getOwnedAppointment(
      appointmentId,
      requesterId,
      requesterRole,
    );
    const enriched = await this.enrichWithPatientAndAnimal(
      [appointment],
      requesterRole,
    );
    return enriched[0];
  }

  async startConsultation(
    appointmentId: number,
    doctorUserId: number,
    consultationNotes?: string,
  ): Promise<Appointment> {
    const doctor = await this.doctorsService.getDoctorByUserId(doctorUserId);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    const appointment = await this.appointmentRepository.findOneBy({
      id: appointmentId,
    });
    if (!appointment || appointment.doctorId !== doctor.id) {
      throw new NotFoundException('Appointment not found');
    }
    if (
      appointment.status !== AppointmentStatus.CONFIRMED &&
      appointment.status !== AppointmentStatus.RESCHEDULED
    ) {
      throw new BadRequestException(
        'Appointment must be confirmed or rescheduled to start consultation',
      );
    }

    appointment.consultationNotes = consultationNotes;
    return this.appointmentRepository.save(appointment);
  }

  async getDoctorStats(doctorUserId: number) {
    const doctor = await this.doctorsService.getDoctorByUserId(doctorUserId);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }

    const { start: todayStart, end: todayEnd } = dhakaDayWindow(new Date());

    const totalToday = await this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId: doctor.id })
      .andWhere('a.startAt >= :todayStart AND a.startAt < :todayEnd', {
        todayStart,
        todayEnd,
      })
      .andWhere("a.status != 'CANCELLED'")
      .getCount();

    const completedToday = await this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId: doctor.id })
      .andWhere('a.startAt >= :todayStart AND a.startAt < :todayEnd', {
        todayStart,
        todayEnd,
      })
      .andWhere("a.status = 'COMPLETED'")
      .getCount();

    return { totalToday, completedToday };
  }

  async getRecentCompleted(
    doctorUserId: number,
    days: number = 2,
  ): Promise<AppointmentWithPatient[]> {
    const doctor = await this.doctorsService.getDoctorByUserId(doctorUserId);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const appointments = await this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId: doctor.id })
      .andWhere("a.status = 'COMPLETED'")
      .andWhere('a.startAt >= :since', { since })
      .orderBy('a.startAt', 'DESC')
      .getMany();

    return this.enrichWithPatientAndAnimal(appointments, UserRole.DOCTOR);
  }

  async searchDoctorAppointments(
    doctorUserId: number,
    opts: {
      search?: string;
      date?: string;
      consultationType?: ConsultationType;
      page?: number;
      limit?: number;
    },
  ): Promise<
    AppointmentWithPatient[] | PaginatedResult<AppointmentWithPatient>
  > {
    const doctor = await this.doctorsService.getDoctorByUserId(doctorUserId);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }

    const qb = this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId: doctor.id });

    if (opts.date) {
      const dayStart = new Date(`${opts.date}T00:00:00`);
      const dayEnd = new Date(`${opts.date}T23:59:59`);
      qb.andWhere('a.startAt >= :dayStart AND a.startAt <= :dayEnd', {
        dayStart,
        dayEnd,
      });
    }

    if (opts.consultationType) {
      qb.andWhere('a.consultationType = :consultationType', {
        consultationType: opts.consultationType,
      });
    }

    if (opts.search) {
      const matchingAnimals = await this.animalRepository
        .createQueryBuilder('an')
        .select('an.id')
        .where('an.name ILIKE :search', { search: `%${opts.search}%` })
        .getMany();
      const animalIds = matchingAnimals.map((a) => a.id);

      const userRepo = this.dataSource.getRepository(User);
      const matchingUsers = await userRepo
        .createQueryBuilder('u')
        .select('u.id')
        .where('u.name ILIKE :search', { search: `%${opts.search}%` })
        .getMany();
      const userIds = matchingUsers.map((u) => u.id);

      if (animalIds.length === 0 && userIds.length === 0) {
        return this.emptyResult(opts.page, opts.limit);
      }

      const conditions: string[] = [];
      const params: Record<string, unknown> = {};
      if (animalIds.length > 0) {
        conditions.push('a.animalId IN (:...animalIds)');
        params.animalIds = animalIds;
      }
      if (userIds.length > 0) {
        conditions.push('a.patientId IN (:...userIds)');
        params.userIds = userIds;
      }
      if (conditions.length > 0) {
        qb.andWhere(`(${conditions.join(' OR ')})`, params);
      }
    }

    qb.orderBy('a.startAt', 'DESC');

    const currentPage = opts.page && opts.page > 0 ? opts.page : 1;
    const pageSize = opts.limit && opts.limit > 0 ? opts.limit : 20;

    let appointments: Appointment[];
    let total: number | undefined;
    if (opts.page || opts.limit) {
      qb.skip((currentPage - 1) * pageSize).take(pageSize);
      [appointments, total] = await qb.getManyAndCount();
    } else {
      appointments = await qb.getMany();
    }

    const enriched = await this.enrichWithPatientAndAnimal(
      appointments,
      UserRole.DOCTOR,
    );

    if (opts.page || opts.limit) {
      return {
        data: enriched,
        page: currentPage,
        limit: pageSize,
        total: total ?? 0,
      };
    }
    return enriched;
  }

  private emptyResult(
    page?: number,
    limit?: number,
  ): PaginatedResult<AppointmentWithPatient> {
    return {
      data: [],
      page: page ?? 1,
      limit: limit ?? 20,
      total: 0,
    };
  }

  /**
   * Returns Agora token + channel info for joining a video call.
   */
  async getJoinInfo(
    appointmentId: number,
    requesterId: number,
    requesterRole: UserRole,
  ): Promise<{ token: string; channelName: string; appId: string }> {
    const appointment = await this.getOwnedAppointment(
      appointmentId,
      requesterId,
      requesterRole,
    );
    const consultation = await this.medicalEventRepository.findOne({
      where: { appointmentId, type: MedicalEventType.CONSULTATION },
      order: { createdAt: 'DESC' },
    });
    const consultationState: ConsultationGateState = !consultation
      ? 'none'
      : consultation.status === MedicalEventStatus.ONGOING
        ? 'ONGOING'
        : 'COMPLETED';
    assertCanCall(appointment, { consultationState });

    const session =
      await this.videoCallService.getOrCreateSession(appointmentId);
    const token = this.videoCallService.generateRtcToken(
      session.channelName,
      requesterId,
    );

    return {
      token,
      channelName: session.channelName,
      appId: process.env.AGORA_APP_ID as string,
    };
  }

  private async enrichWithPatientAndAnimal(
    appointments: Appointment[],
    role: UserRole,
  ): Promise<AppointmentWithPatient[]> {
    if (appointments.length === 0) {
      return [];
    }

    const animalIds = [
      ...new Set(appointments.map((a) => a.animalId).filter(Boolean)),
    ] as number[];
    const animals =
      animalIds.length > 0
        ? await this.animalRepository.findBy({ id: In(animalIds) })
        : [];
    const animalsById = new Map(animals.map((a) => [a.id, a]));

    const distinctPatientIds = [
      ...new Set(appointments.map((a) => a.patientId)),
    ];
    const patients = await Promise.all(
      distinctPatientIds.map((id) => this.usersService.findById(id)),
    );
    const patientsById = new Map(
      patients
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => [p.id, p]),
    );

    const patientFields = (appointment: Appointment) => {
      const patient = patientsById.get(appointment.patientId);
      return {
        patientName: patient?.name,
        patientPhone: patient?.phone,
        patientImage: patient?.profilePhoto || patient?.avatar,
      };
    };

    const animalFields = (appointment: Appointment) => ({
      animalName: appointment.animalId
        ? animalsById.get(appointment.animalId)?.name
        : undefined,
      animalImage: appointment.animalId
        ? animalsById.get(appointment.animalId)?.image
        : undefined,
      animalBreed: appointment.animalId
        ? animalsById.get(appointment.animalId)?.breed
        : undefined,
      animalAge: appointment.animalId
        ? animalsById.get(appointment.animalId)?.age
        : undefined,
      animalWeight: appointment.animalId
        ? animalsById.get(appointment.animalId)?.weight
        : undefined,
    });

    if (role !== UserRole.DOCTOR) {
      const distinctDoctorIds = [
        ...new Set(appointments.map((a) => a.doctorId)),
      ];
      const doctors = await Promise.all(
        distinctDoctorIds.map((id) =>
          this.doctorsService.getDoctorById(id).catch(() => null),
        ),
      );
      const doctorsById = new Map(
        doctors.filter(Boolean).map((d) => [d!.id, d!]),
      );

      return appointments.map((appointment) => ({
        ...appointment,
        ...patientFields(appointment),
        ...animalFields(appointment),
        doctorName: doctorsById.get(appointment.doctorId)?.name,
        doctorSpecialty: doctorsById.get(appointment.doctorId)?.specialty,
        doctorAvatar: doctorsById.get(appointment.doctorId)?.avatar,
      }));
    }

    return appointments.map((appointment) => ({
      ...appointment,
      patientName: patientsById.get(appointment.patientId)?.name,
      patientPhone: patientsById.get(appointment.patientId)?.phone,
      patientAvatar:
        patientsById.get(appointment.patientId)?.profilePhoto ||
        patientsById.get(appointment.patientId)?.avatar ||
        undefined,
      ...animalFields(appointment),
    }));
  }

  private applyListFilter(
    qb: SelectQueryBuilder<Appointment>,
    filter?: AppointmentListFilter,
  ): void {
    if (!filter) {
      return;
    }
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = addMinutes(todayStart, 24 * 60);

    switch (filter) {
      case 'today':
        qb.andWhere('a.startAt >= :todayStart AND a.startAt < :todayEnd', {
          todayStart,
          todayEnd,
        }).andWhere("a.status != 'CANCELLED'");
        break;
      case 'previous':
        qb.andWhere('a.startAt < :todayStart', { todayStart });
        break;
      case 'upcoming':
        qb.andWhere('a.startAt >= :todayEnd', { todayEnd }).andWhere(
          "a.status IN ('PENDING', 'CONFIRMED', 'RESCHEDULED')",
        );
        break;
      case 'completed':
        qb.andWhere('a.status = :status', {
          status: AppointmentStatus.COMPLETED,
        });
        break;
      case 'cancelled':
        qb.andWhere('a.status = :status', {
          status: AppointmentStatus.CANCELLED,
        });
        break;
    }
  }

  private async getOwnedAppointment(
    appointmentId: number,
    requesterId: number,
    requesterRole: UserRole,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOneBy({
      id: appointmentId,
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (requesterRole === UserRole.USER) {
      if (appointment.patientId !== requesterId) {
        throw new ForbiddenException(
          'You may only manage your own appointments',
        );
      }
    } else {
      const doctor = await this.doctorsService.getDoctorByUserId(requesterId);
      if (!doctor || appointment.doctorId !== doctor.id) {
        throw new ForbiddenException(
          'You may only manage your own appointments',
        );
      }
    }
    return appointment;
  }

  private enforceReschedulableBuffer(appointment: Appointment): void {
    const msUntilStart = appointment.startAt.getTime() - Date.now();
    // Only future appointments need advance notice; appointments that already
    // started (or passed) may always be cancelled/rescheduled for cleanup.
    if (msUntilStart > 0 && msUntilStart < RESCHEDULE_CANCEL_BUFFER_MS) {
      throw new BadRequestException(
        'Appointments can only be rescheduled or cancelled at least 1 hour in advance',
      );
    }
  }

  private async assertNoConflictAndBook(
    doctorId: number,
    patientId: number,
    startAt: Date,
    opts?: {
      excludeAppointmentId?: number;
      clinicId?: number;
      serviceId?: number;
      animalId?: number;
      consultationType?: ConsultationType;
      reasonForConsultation?: string;
      symptoms?: string[];
    },
  ): Promise<Appointment> {
    return this.dataSource.transaction(async (manager) => {
      // Lock the doctor row to serialize all concurrent booking attempts for this doctor.
      await manager
        .getRepository(Doctor)
        .createQueryBuilder('d')
        .setLock('pessimistic_write')
        .where('d.id = :doctorId', { doctorId })
        .getOne();

      const window = await this.doctorsService.findAvailabilityWindow(
        doctorId,
        startAt,
      );
      if (!window) {
        throw new BadRequestException('Doctor is not available at this time');
      }

      const endAt = addMinutes(startAt, window.slotDurationMinutes);
      const bufStart = subMinutes(startAt, window.bufferMinutes);
      const bufEnd = addMinutes(endAt, window.bufferMinutes);

      const conflictQuery = manager
        .getRepository(Appointment)
        .createQueryBuilder('a')
        .where('a.doctorId = :doctorId', { doctorId })
        .andWhere("a.status != 'CANCELLED'")
        .andWhere('a.startAt < :bufEnd AND a.endAt > :bufStart', {
          bufEnd,
          bufStart,
        });
      if (opts?.excludeAppointmentId) {
        conflictQuery.andWhere('a.id != :excludeId', {
          excludeId: opts.excludeAppointmentId,
        });
      }
      const conflicts = await conflictQuery.getMany();
      if (conflicts.length > 0) {
        throw new ConflictException('This time slot is no longer available');
      }

      let price = 0;
      if (opts?.serviceId) {
        const service = await manager
          .getRepository(Service)
          .findOneBy({ id: opts.serviceId });
        if (service) {
          price = service.price;
        }
      } else {
        const doctor = await manager
          .getRepository(Doctor)
          .findOneBy({ id: doctorId });
        if (doctor) {
          price = doctor.consultationFee;
        }
      }

      if (opts?.animalId) {
        const discount = await this.discountsService.getDiscount(
          doctorId,
          opts.animalId,
        );
        if (discount) {
          price = price - (price * discount.percent) / 100;
        }
      }

      try {
        const created = manager.getRepository(Appointment).create({
          doctorId,
          patientId,
          startAt,
          endAt,
          durationMinutes: window.slotDurationMinutes,
          status: AppointmentStatus.CONFIRMED,
          clinicId: opts?.clinicId || null,
          serviceId: opts?.serviceId || null,
          animalId: opts?.animalId || null,
          consultationType: opts?.consultationType || null,
          reasonForConsultation: opts?.reasonForConsultation,
          symptoms: opts?.symptoms,
          price,
          paymentStatus: 'pending',
        });
        return await manager.getRepository(Appointment).save(created);
      } catch (e: unknown) {
        if (e instanceof Error && 'code' in e && e.code === '23505') {
          throw new ConflictException(
            'This time slot was just booked by someone else',
          );
        }
        throw e;
      }
    });
  }
}
