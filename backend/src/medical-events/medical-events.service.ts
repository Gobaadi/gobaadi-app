import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MedicalEvent,
  MedicalEventStatus,
  MedicalEventType,
} from './medical-event.entity';
import { CreateMedicalEventDto } from './dto/create-medical-event.dto';
import { UpdateMedicalEventDto } from './dto/update-medical-event.dto';
import { Appointment } from '../appointments/appointment.entity';
import { Animal } from '../animals/animal.entity';
import { PaginatedResult } from '../common/paginated-result.interface';
export { MedicalEvent, MedicalEventType } from './medical-event.entity';

@Injectable()
export class MedicalEventsService {
  constructor(
    @InjectRepository(MedicalEvent)
    private readonly medicalEventRepository: Repository<MedicalEvent>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
  ) {}

  async list(
    requesterUserId: number,
    requesterDoctorId: number | null,
    patientId: number,
    type?: MedicalEventType,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<MedicalEvent>> {
    await this.assertCanAccessPatient(
      requesterUserId,
      requesterDoctorId,
      patientId,
    );

    const where: Record<string, unknown> = { patientId };
    if (type) {
      where.type = type;
    }
    const currentPage = page && page > 0 ? page : 1;
    const pageSize = limit && limit > 0 ? limit : 20;
    const [data, total] = await this.medicalEventRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    });
    return { data, page: currentPage, limit: pageSize, total };
  }

  async getById(
    id: number,
    requesterUserId: number,
    requesterDoctorId: number | null,
  ): Promise<MedicalEvent> {
    const event = await this.medicalEventRepository.findOneBy({ id });
    if (!event) {
      throw new NotFoundException('Medical event not found');
    }
    await this.assertCanAccessPatient(
      requesterUserId,
      requesterDoctorId,
      event.patientId,
    );
    return event;
  }

  /**
   * Latest CONSULTATION record for an appointment (any status), or null when
   * no consultation has been started yet. Lets a chat screen re-attach to an
   * ongoing consultation instead of relying on an in-navigation param.
   */
  async getLatestForAppointment(
    requesterUserId: number,
    requesterDoctorId: number | null,
    appointmentId: number,
  ): Promise<MedicalEvent | null> {
    const appointment = await this.appointmentRepository.findOneBy({
      id: appointmentId,
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    this.assertAppointmentParticipant(
      appointment,
      requesterUserId,
      requesterDoctorId,
    );
    return this.medicalEventRepository.findOne({
      where: { appointmentId, type: MedicalEventType.CONSULTATION },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    doctorId: number,
    patientId: number,
    dto: CreateMedicalEventDto,
  ): Promise<MedicalEvent> {
    const appointment = await this.appointmentRepository.findOneBy({
      id: dto.appointmentId,
    });
    if (
      !appointment ||
      appointment.doctorId !== doctorId ||
      appointment.patientId !== patientId
    ) {
      throw new ForbiddenException(
        'The appointment must belong to you and this patient',
      );
    }

    return this.medicalEventRepository.save(
      this.medicalEventRepository.create({
        patientId,
        appointmentId: dto.appointmentId,
        doctorId,
        type: dto.type,
        data: dto.data,
        nextFollowUpAt: dto.nextFollowUpAt
          ? new Date(dto.nextFollowUpAt)
          : null,
      }),
    );
  }

  async update(
    id: number,
    doctorId: number,
    dto: UpdateMedicalEventDto,
  ): Promise<MedicalEvent> {
    const event = await this.medicalEventRepository.findOneBy({ id });
    if (!event) {
      throw new NotFoundException('Medical event not found');
    }
    if (event.doctorId !== doctorId) {
      throw new ForbiddenException('You may only update your own records');
    }
    if (dto.status) {
      event.status = dto.status;
    }
    if (dto.data) {
      event.data = { ...event.data, ...dto.data };
    }
    return this.medicalEventRepository.save(event);
  }

  async delete(id: number, doctorId: number): Promise<void> {
    const event = await this.medicalEventRepository.findOneBy({ id });
    if (!event) {
      throw new NotFoundException('Medical event not found');
    }
    if (event.doctorId !== doctorId) {
      throw new ForbiddenException('You may only delete your own records');
    }
    await this.medicalEventRepository.remove(event);
  }

  /**
   * Find-or-create the CONSULTATION record for an appointment. Keyed by
   * appointment (patient user <-> doctor), never by animal — either
   * appointment participant may call it.
   *
   * One consultation per appointment: if a record already exists it is always
   * returned as-is (ONGOING resumes the session, COMPLETED stays ended) —
   * a finished session can never be resurrected by starting again.
   */
  async startForAppointment(
    requesterUserId: number,
    requesterDoctorId: number | null,
    appointmentId: number,
  ): Promise<MedicalEvent> {
    const appointment = await this.appointmentRepository.findOneBy({
      id: appointmentId,
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    this.assertAppointmentParticipant(
      appointment,
      requesterUserId,
      requesterDoctorId,
    );

    const existing = await this.medicalEventRepository.findOne({
      where: {
        appointmentId,
        type: MedicalEventType.CONSULTATION,
      },
      order: { createdAt: 'DESC' },
    });
    if (existing) {
      return existing;
    }

    return this.medicalEventRepository.save(
      this.medicalEventRepository.create({
        patientId: appointment.patientId,
        appointmentId,
        doctorId: appointment.doctorId,
        type: MedicalEventType.CONSULTATION,
        data: { startedAt: new Date().toISOString() },
      }),
    );
  }

  async endForParticipant(
    requesterUserId: number,
    requesterDoctorId: number | null,
    eventId: number,
  ): Promise<MedicalEvent> {
    const event = await this.medicalEventRepository.findOneBy({ id: eventId });
    if (!event) {
      throw new NotFoundException('Medical event not found');
    }
    const isPatient = event.patientId === requesterUserId;
    const isDoctor =
      requesterDoctorId !== null && event.doctorId === requesterDoctorId;
    if (!isPatient && !isDoctor) {
      throw new ForbiddenException(
        'You are not a participant of this consultation',
      );
    }
    event.status = MedicalEventStatus.COMPLETED;
    return this.medicalEventRepository.save(event);
  }

  private assertAppointmentParticipant(
    appointment: Appointment,
    requesterUserId: number,
    requesterDoctorId: number | null,
  ): void {
    if (appointment.patientId === requesterUserId) {
      return;
    }
    if (
      requesterDoctorId !== null &&
      appointment.doctorId === requesterDoctorId
    ) {
      return;
    }
    throw new ForbiddenException(
      'You are not a participant of this appointment',
    );
  }

  private async assertCanAccessPatient(
    requesterUserId: number,
    requesterDoctorId: number | null,
    patientId: number,
  ): Promise<void> {
    if (patientId === requesterUserId) {
      return;
    }
    if (requesterDoctorId) {
      const treated = await this.appointmentRepository.findOneBy({
        doctorId: requesterDoctorId,
        patientId,
      });
      if (treated) {
        return;
      }
    }
    const animal = await this.animalRepository.findOneBy({ id: patientId });
    if (animal?.userId === requesterUserId) {
      return;
    }
    throw new ForbiddenException(
      'You may only access medical records for your own animals or patients you have treated',
    );
  }
}
