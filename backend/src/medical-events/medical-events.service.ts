import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
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

  /**
   * Animal-scoped history for the doctor/patient detail screens. The route
   * path carries an animal id, but medical events are keyed by the pet owner
   * (MedicalEvent.patientId), so the animal is resolved to its owner first
   * and results are restricted to appointments that are actually linked to
   * this animal. Owner bookings made without an animal id cannot be
   * attributed to any other animal, so they are included as well.
   */
  async listByAnimal(
    requesterUserId: number,
    requesterDoctorId: number | null,
    animalId: number,
    type?: MedicalEventType,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<MedicalEvent>> {
    const animal = await this.animalRepository.findOneBy({ id: animalId });
    if (!animal) {
      throw new NotFoundException('Animal not found');
    }
    await this.assertCanAccessAnimal(
      requesterUserId,
      requesterDoctorId,
      animal,
    );

    const appointmentWhere: FindOptionsWhere<Appointment>[] = [
      { animalId: animal.id },
    ];
    if (typeof animal.userId === 'number') {
      appointmentWhere.push({ patientId: animal.userId, animalId: IsNull() });
    }
    const appointments = await this.appointmentRepository.find({
      where: appointmentWhere,
      select: { id: true },
    });
    const appointmentIds = appointments.map((a) => a.id);

    const currentPage = page && page > 0 ? page : 1;
    const pageSize = limit && limit > 0 ? limit : 20;
    if (appointmentIds.length === 0) {
      return { data: [], page: currentPage, limit: pageSize, total: 0 };
    }

    const where: Record<string, unknown> = {
      appointmentId: In(appointmentIds),
    };
    if (type) {
      where.type = type;
    }
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

  /**
   * Create a record for an appointment. The second argument is the **animal**
   * id (the route/DTO shape is animal-based); the stored `patientId` is the
   * appointment's owner, per the entity contract.
   */
  async create(
    doctorId: number,
    animalId: number,
    dto: CreateMedicalEventDto,
  ): Promise<MedicalEvent> {
    const animal = await this.animalRepository.findOneBy({ id: animalId });
    if (!animal) {
      throw new NotFoundException('Animal not found');
    }
    const appointment = await this.appointmentRepository.findOneBy({
      id: dto.appointmentId,
    });
    if (!appointment || appointment.doctorId !== doctorId) {
      throw new ForbiddenException(
        'The appointment must belong to you and this patient',
      );
    }
    const appointmentMatchesAnimal =
      appointment.animalId === animalId ||
      (appointment.animalId == null &&
        typeof animal.userId === 'number' &&
        appointment.patientId === animal.userId);
    if (!appointmentMatchesAnimal) {
      throw new ForbiddenException(
        'The appointment must belong to you and this patient',
      );
    }

    return this.medicalEventRepository.save(
      this.medicalEventRepository.create({
        patientId: appointment.patientId,
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

  /** Read access to an animal: its owner, or a doctor with an appointment for the animal/its owner. */
  private async assertCanAccessAnimal(
    requesterUserId: number,
    requesterDoctorId: number | null,
    animal: Animal,
  ): Promise<void> {
    if (animal.userId === requesterUserId) {
      return;
    }
    if (requesterDoctorId) {
      const where: FindOptionsWhere<Appointment>[] = [
        { doctorId: requesterDoctorId, animalId: animal.id },
      ];
      if (typeof animal.userId === 'number') {
        where.push({
          doctorId: requesterDoctorId,
          patientId: animal.userId,
        });
      }
      const treated = await this.appointmentRepository.findOne({ where });
      if (treated) {
        return;
      }
    }
    throw new ForbiddenException(
      'You may only access medical records for your own animals or patients you have treated',
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
