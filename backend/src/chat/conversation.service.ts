import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Conversation } from './conversation.entity';
import { ChatMessage, MessageStatus } from './chat-message.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Doctor } from '../doctors/doctor.entity';
import { User } from '../users/user.entity';
import { Animal } from '../animals/animal.entity';
import { UserRole } from '../users/user.entity';

/** Conversation with the patient's name/photo and the linked animal's name/photo. */
export interface EnrichedConversation extends Conversation {
  patientName?: string;
  patientPhone?: string;
  patientEmail?: string;
  patientPhoto?: string;
  animalName?: string;
  animalImage?: string;
}

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
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

  async listForUser(
    userId: number,
    role: UserRole,
  ): Promise<EnrichedConversation[]> {
    const conversations = await this.conversationRepository.find({
      where:
        role === UserRole.USER ? { patientId: userId } : { doctorUserId: userId },
      order: { lastMessageAt: 'DESC' },
    });
    if (conversations.length === 0) {
      return [];
    }

    // Per-viewer unread: messages sent by the OTHER side that this viewer
    // has not read yet. The stored conversations.unreadCount column is a
    // single shared counter (bumped on every send, including the sender's
    // own message), so it can never be correct for both participants —
    // derive from message status instead.
    const unreadRows: { conversationId: number; unread: string }[] =
      await this.chatMessageRepository
        .createQueryBuilder('m')
        .select('m.conversationId', 'conversationId')
        .addSelect('COUNT(*)', 'unread')
        .where('m.conversationId IN (:...conversationIds)', {
          conversationIds: conversations.map((c) => c.id),
        })
        .andWhere('m.senderRole != :viewerRole', { viewerRole: role })
        .andWhere('m.status != :readStatus', { readStatus: MessageStatus.READ })
        .groupBy('m.conversationId')
        .getRawMany();
    const unreadByConversation = new Map(
      unreadRows.map((row) => [Number(row.conversationId), Number(row.unread)]),
    );

    const patientIds = [...new Set(conversations.map((c) => c.patientId))];
    const patients = await this.userRepository.find({
      where: { id: In(patientIds) },
      select: { id: true, name: true, phone: true, email: true, profilePhoto: true, avatar: true },
    });
    const patientsById = new Map(patients.map((p) => [p.id, p]));

    const appointmentIds = [
      ...new Set(
        conversations
          .map((c) => c.appointmentId)
          .filter((id): id is number => id != null),
      ),
    ];
    const appointmentById = new Map<number, Appointment>();
    const animalsById = new Map<number, Animal>();
    if (appointmentIds.length > 0) {
      const appointments = await this.appointmentRepository.find({
        where: { id: In(appointmentIds) },
        select: { id: true, animalId: true },
      });
      appointments.forEach((a) => appointmentById.set(a.id, a));

      const animalIds = [
        ...new Set(
          appointments
            .map((a) => a.animalId)
            .filter((id): id is number => id != null),
        ),
      ];
      if (animalIds.length > 0) {
        const animals = await this.animalRepository.find({
          where: { id: In(animalIds) },
          select: { id: true, name: true, image: true },
        });
        const animalById = new Map(animals.map((a) => [a.id, a]));
        for (const appointment of appointments) {
          if (appointment.animalId != null) {
            const animal = animalById.get(appointment.animalId);
            if (animal) {
              animalsById.set(appointment.id, animal);
            }
          }
        }
      }
    }

    return conversations.map((conversation) => {
      const patient = patientsById.get(conversation.patientId);
      const appointment = conversation.appointmentId
        ? appointmentById.get(conversation.appointmentId)
        : undefined;
      const animal = conversation.appointmentId
        ? animalsById.get(conversation.appointmentId)
        : undefined;
      return {
        ...conversation,
        unreadCount: unreadByConversation.get(conversation.id) ?? 0,
        patientName: patient?.name,
        patientPhone: patient?.phone,
        patientEmail: patient?.email,
        patientPhoto: patient?.profilePhoto || patient?.avatar || undefined,
        animalName: animal?.name,
        animalImage: animal?.image,
      };
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
}
