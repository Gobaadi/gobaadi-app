import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prescription } from './prescription.entity';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { Appointment } from '../appointments/appointment.entity';
import { Animal } from '../animals/animal.entity';
import { S3Service } from '../s3/s3.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
export { Prescription } from './prescription.entity';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepository: Repository<Prescription>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    private readonly s3Service: S3Service,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    doctorUserId: number,
    dto: CreatePrescriptionDto,
  ): Promise<Prescription> {
    // Verify appointment exists and doctor owns it
    const appointment = await this.appointmentRepository.findOneBy({
      id: dto.appointmentId,
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Verify animal exists
    const animal = await this.animalRepository.findOneBy({
      id: dto.animalId,
    });
    if (!animal) {
      throw new NotFoundException('Animal not found');
    }

    return this.prescriptionRepository.save(
      this.prescriptionRepository.create({
        appointmentId: dto.appointmentId,
        doctorId: doctorUserId,
        animalId: dto.animalId,
        ownerId: animal.userId,
        medicines: dto.medicines,
      }),
    );
  }

  async findByAppointmentId(
    appointmentId: number,
    userId: number,
  ): Promise<Prescription | null> {
    const prescription = await this.prescriptionRepository.findOneBy({
      appointmentId,
    });
    if (!prescription) {
      return null;
    }

    // Check ownership - either the owner or doctor on the appointment
    const appointment = await this.appointmentRepository.findOneBy({
      id: appointmentId,
    });
    if (
      appointment &&
      appointment.patientId !== userId &&
      appointment.doctorId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return prescription;
  }

  async findByAnimalId(
    animalId: number,
    userId: number,
  ): Promise<Prescription[]> {
    // Verify animal exists and user has access
    const animal = await this.animalRepository.findOneBy({ id: animalId });
    if (!animal) {
      throw new NotFoundException('Animal not found');
    }
    if (animal.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prescriptionRepository.find({
      where: { animalId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: number,
    doctorUserId: number,
    dto: UpdatePrescriptionDto,
  ): Promise<Prescription> {
    const prescription = await this.prescriptionRepository.findOneBy({ id });
    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }
    if (prescription.doctorId !== doctorUserId) {
      throw new ForbiddenException('Only the creating doctor can edit');
    }

    if (dto.medicines !== undefined) {
      prescription.medicines = dto.medicines;
    }

    return this.prescriptionRepository.save(prescription);
  }

  async addAttachment(
    id: number,
    doctorUserId: number,
    file: Express.Multer.File,
  ): Promise<Prescription> {
    const prescription = await this.prescriptionRepository.findOneBy({ id });
    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }
    if (prescription.doctorId !== doctorUserId) {
      throw new ForbiddenException(
        'Only the creating doctor can add attachments',
      );
    }

    const uploadResult = await this.s3Service.uploadFile(file.buffer, {
      folder: 'prescriptions',
      contentType: file.mimetype,
    });
    prescription.attachmentUrl = uploadResult.url;

    return this.prescriptionRepository.save(prescription);
  }

  async send(id: number, doctorUserId: number): Promise<Prescription> {
    const prescription = await this.prescriptionRepository.findOneBy({ id });
    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }
    if (prescription.doctorId !== doctorUserId) {
      throw new ForbiddenException('Only the creating doctor can send');
    }

    prescription.sentAt = new Date();
    const saved = await this.prescriptionRepository.save(prescription);

    // Notify the owner
    await this.notificationsService.createNotification(
      prescription.ownerId,
      'Prescription ready',
      'Your prescription has been sent.',
      NotificationType.BOOKING,
      'Prescription',
      String(saved.id),
    );

    return saved;
  }
}
