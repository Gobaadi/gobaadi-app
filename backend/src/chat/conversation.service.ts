import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './conversation.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Doctor } from '../doctors/doctor.entity';
import { UserRole } from '../users/user.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
  ) {}

  async findOrCreateForPatient(
    patientUserId: number,
    doctorId?: number,
  ): Promise<Conversation> {
    let resolvedDoctorId = doctorId;

    if (!resolvedDoctorId) {
      const latestAppointment = await this.appointmentRepository.findOne({
        where: { patientId: patientUserId },
        order: { startAt: 'DESC' },
      });
      resolvedDoctorId = latestAppointment?.doctorId;
    }

    if (!resolvedDoctorId) {
      const fallbackDoctor = await this.doctorRepository
        .createQueryBuilder('d')
        .where('d.userId IS NOT NULL')
        .orderBy('d.id', 'ASC')
        .getOne();
      resolvedDoctorId = fallbackDoctor?.id;
    }

    if (!resolvedDoctorId) {
      throw new BadRequestException(
        'No doctor available to start a conversation with',
      );
    }

    return this.findOrCreate(resolvedDoctorId, patientUserId);
  }

  async findOrCreate(
    doctorId: number,
    patientId: number,
  ): Promise<Conversation> {
    const existing = await this.conversationRepository.findOne({
      where: { doctorId, patientId },
    });
    if (existing) {
      return existing;
    }

    const doctor = await this.doctorRepository.findOneBy({ id: doctorId });
    const created = this.conversationRepository.create({
      doctorId,
      patientId,
      doctorUserId: doctor?.userId ?? null,
    });
    return this.conversationRepository.save(created);
  }

  async isParticipant(
    conversationId: number,
    userId: number,
    role: UserRole,
  ): Promise<boolean> {
    const conversation = await this.conversationRepository.findOneBy({
      id: conversationId,
    });
    if (!conversation) {
      return false;
    }
    return role === UserRole.USER
      ? conversation.patientId === userId
      : conversation.doctorUserId === userId;
  }

  async findById(conversationId: number): Promise<Conversation | null> {
    return this.conversationRepository.findOneBy({ id: conversationId });
  }

  async listForUser(userId: number, role: UserRole): Promise<Conversation[]> {
    if (role === UserRole.USER) {
      return this.conversationRepository.find({
        where: { patientId: userId },
        order: { lastMessageAt: 'DESC' },
      });
    }
    return this.conversationRepository.find({
      where: { doctorUserId: userId },
      order: { lastMessageAt: 'DESC' },
    });
  }

  async touchLastMessageAt(
    conversationId: number,
    messageText?: string,
  ): Promise<void> {
    const update: any = { lastMessageAt: new Date() };
    if (messageText !== undefined) {
      update.lastMessageText =
        messageText.length > 200
          ? `${messageText.slice(0, 200)}…`
          : messageText;
    }
    await this.conversationRepository.update(conversationId, update);
  }

  async incrementUnread(conversationId: number): Promise<void> {
    await this.conversationRepository
      .createQueryBuilder()
      .update(Conversation)
      .set({ unreadCount: () => '"unreadCount" + 1' })
      .where('id = :id', { id: conversationId })
      .execute();
  }

  async resetUnread(conversationId: number): Promise<void> {
    await this.conversationRepository.update(conversationId, {
      unreadCount: 0,
    });
  }
}
