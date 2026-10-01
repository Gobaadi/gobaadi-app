import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChatService, ChatMessageClientView } from './chat.service';
import { ConversationService } from './conversation.service';
import { ChatGateway } from './chat.gateway';
import { SendMessageDto } from './dto/send-message.dto';
import { SendAttachmentMessageDto } from './dto/send-attachment-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { Conversation } from './conversation.entity';
import { S3Service } from '../s3/s3.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { Doctor } from '../doctors/doctor.entity';

const IMAGE_MIME_PREFIX = 'image/';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly conversationService: ConversationService,
    private readonly chatGateway: ChatGateway,
    private readonly s3Service: S3Service,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
  ) {}

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the current user's conversations" })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async getConversations(
    @CurrentUser() user: JwtPayload,
  ): Promise<Conversation[]> {
    return this.conversationService.listForUser(user.sub, user.role);
  }

  @Post('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create or find a conversation with a patient or doctor',
  })
  @ApiBody({
    schema: {
      properties: {
        patientId: { type: 'number', example: 1 },
        doctorId: { type: 'number', example: 1 },
        appointmentId: { type: 'number', example: 1 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Conversation created or found' })
  async createConversation(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: { patientId?: number; doctorId?: number; appointmentId?: number },
  ): Promise<Conversation> {
    if (body.appointmentId) {
      const appointment = await this.appointmentRepository.findOneBy({
        id: body.appointmentId,
      });
      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }
      const doctor = await this.doctorRepository.findOneBy({
        id: appointment.doctorId,
      });
      if (!doctor) {
        throw new ForbiddenException(
          'No doctor profile linked to this appointment',
        );
      }
      const isPatient = appointment.patientId === user.sub;
      const isDoctor = doctor.userId === user.sub;
      if (!isPatient && !isDoctor) {
        throw new ForbiddenException('You are not part of this appointment');
      }
      return this.conversationService.findOrCreate(
        doctor.id,
        appointment.patientId,
      );
    }

    if (user.role === UserRole.USER) {
      return this.conversationService.findOrCreateForPatient(
        user.sub,
        body.doctorId,
      );
    }
    const doctor = await this.doctorRepository.findOne({
      where: { userId: user.sub },
    });
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    return this.conversationService.findOrCreate(
      doctor.id,
      body.patientId as number,
    );
  }

  @Get('messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'conversationId', required: false })
  @ApiOperation({ summary: 'List messages in a conversation' })
  @ApiResponse({ status: 200, description: 'List of chat messages' })
  async getMessages(
    @CurrentUser() user: JwtPayload,
    @Query('conversationId') conversationIdParam?: string,
  ): Promise<ChatMessageClientView[]> {
    const conversationId = await this.resolveConversationId(
      user,
      conversationIdParam,
    );
    return this.chatService.getMessages(conversationId);
  }

  @Post('message')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a chat message' })
  @ApiResponse({ status: 201, description: 'Message created' })
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Body() body: SendMessageDto,
  ): Promise<ChatMessageClientView> {
    const conversationId = await this.resolveConversationId(
      user,
      body.conversationId?.toString(),
    );
    const saved = await this.chatService.sendMessage(
      user.sub,
      user.role,
      conversationId,
      body.text,
    );
    this.chatGateway.notifyConversation(
      conversationId,
      'messageReceived',
      saved,
    );
    await this.chatGateway.notifyConversationParticipants(
      conversationId,
      saved,
    );
    return saved;
  }

  @Post('message/attachment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: SendAttachmentMessageDto })
  @ApiOperation({
    summary: 'Send a chat message with an image/document attachment',
  })
  @ApiResponse({ status: 201, description: 'Message created' })
  async sendAttachmentMessage(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: SendAttachmentMessageDto,
  ): Promise<ChatMessageClientView> {
    if (!file) {
      throw new BadRequestException('A file is required');
    }
    const conversationId = await this.resolveConversationId(
      user,
      body.conversationId?.toString(),
    );

    const isImage = file.mimetype.startsWith(IMAGE_MIME_PREFIX);
    const uploadResult = await this.s3Service.uploadFile(file.buffer, {
      folder: 'gobadi/chat',
      contentType: file.mimetype,
    });

    const saved = await this.chatService.sendMessage(
      user.sub,
      user.role,
      conversationId,
      body.caption ?? '',
      {
        url: uploadResult.url,
        type: isImage ? 'image' : 'document',
        mimeType: file.mimetype,
      },
    );
    this.chatGateway.notifyConversation(
      conversationId,
      'messageReceived',
      saved,
    );
    await this.chatGateway.notifyConversationParticipants(
      conversationId,
      saved,
    );
    return saved;
  }

  @Patch('messages/:id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a message as read' })
  @ApiResponse({ status: 200, description: 'Message marked read' })
  async markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const updated = await this.chatService.markRead(
      parseInt(id, 10),
      user.sub,
      user.role,
    );
    this.chatGateway.notifyConversation(
      updated.conversationId,
      'messageStatusUpdate',
      {
        id: updated.id,
        status: updated.status,
      },
    );
    return updated;
  }

  @Get('appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List the current doctor's appointments available for chat",
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of appointments for chat' })
  async getDoctorAppointments(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const doctor = await this.doctorRepository.findOneBy({
      userId: user.sub,
    });
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }

    const currentPage = page ? parseInt(page, 10) : 1;
    const pageSize = limit ? parseInt(limit, 10) : 20;

    const [appointments, total] = await this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId: doctor.id })
      .andWhere("a.status IN ('CONFIRMED', 'RESCHEDULED', 'COMPLETED')")
      .orderBy('a.startAt', 'DESC')
      .skip((currentPage - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { data: appointments, page: currentPage, limit: pageSize, total };
  }

  private async resolveConversationId(
    user: JwtPayload,
    conversationIdParam?: string,
  ): Promise<number> {
    if (conversationIdParam) {
      const conversationId = parseInt(conversationIdParam, 10);
      const conversation =
        await this.conversationService.findById(conversationId);
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
      const isParticipant = await this.conversationService.isParticipant(
        conversationId,
        user.sub,
        user.role,
      );
      if (!isParticipant) {
        throw new ForbiddenException('Not a participant in this conversation');
      }
      return conversationId;
    }

    if (user.role !== UserRole.USER) {
      throw new BadRequestException('conversationId is required');
    }
    const conversation = await this.conversationService.findOrCreateForPatient(
      user.sub,
    );
    return conversation.id;
  }
}
