import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, TicketStatus } from './support-ticket.entity';
import { SupportTicketReply } from './support-ticket-reply.entity';
import {
  CreateTicketDto,
  ReplyTicketDto,
  UpdateTicketStatusDto,
} from './dto/support.dto';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepository: Repository<SupportTicket>,
    @InjectRepository(SupportTicketReply)
    private readonly replyRepository: Repository<SupportTicketReply>,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    userId: number,
    dto: CreateTicketDto,
    file?: Express.Multer.File,
  ): Promise<SupportTicket> {
    let attachmentUrl: string | null = null;
    let attachmentFileName: string | null = null;

    if (file) {
      const uploaded = await this.s3Service.uploadFile(file.buffer, {
        folder: 'gobadi/support-attachments',
        contentType: file.mimetype,
      });
      attachmentUrl = uploaded.url;
      attachmentFileName = file.originalname;
    }

    return this.ticketRepository.save(
      this.ticketRepository.create({
        userId,
        subject: dto.subject,
        message: dto.message,
        attachmentUrl,
        attachmentFileName,
      }),
    );
  }

  async listUserTickets(userId: number): Promise<SupportTicket[]> {
    return this.ticketRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getById(
    id: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<SupportTicket> {
    const ticket = await this.ticketRepository.findOneBy({ id });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    if (!isAdmin && ticket.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return ticket;
  }

  async reply(
    ticketId: number,
    userId: number,
    isAdmin: boolean,
    dto: ReplyTicketDto,
  ): Promise<SupportTicketReply> {
    const ticket = await this.ticketRepository.findOneBy({ id: ticketId });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    if (!isAdmin && ticket.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Auto-update status to in-progress if currently open
    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
      await this.ticketRepository.save(ticket);
    }

    return this.replyRepository.save(
      this.replyRepository.create({
        ticketId,
        authorId: userId,
        message: dto.message,
      }),
    );
  }

  async listAll(): Promise<SupportTicket[]> {
    return this.ticketRepository.find({ order: { createdAt: 'DESC' } });
  }

  async updateStatus(
    id: number,
    dto: UpdateTicketStatusDto,
  ): Promise<SupportTicket> {
    const ticket = await this.ticketRepository.findOneBy({ id });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    ticket.status = dto.status as TicketStatus;
    return this.ticketRepository.save(ticket);
  }
}
