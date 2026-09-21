import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { getRequiredJwtSecret } from '../auth/jwt-secret.util';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { Appointment } from '../appointments/appointment.entity';
import { VideoSession } from '../video-call/video-call.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly conversationService: ConversationService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(VideoSession)
    private readonly sessionRepo: Repository<VideoSession>,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;

    if (!token || typeof token !== 'string') {
      this.logger.warn(
        `Unauthorized WebSocket connection attempt: ${client.id}. Disconnecting.`,
      );
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: getRequiredJwtSecret(),
      });
      client.data.user = payload;
      client.join(`user:${payload.sub}`);
      this.logger.log(
        `Authorized client connected: ${client.id} (user ${payload.sub})`,
      );
    } catch {
      this.logger.warn(
        `Invalid token on WebSocket connection: ${client.id}. Disconnecting.`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const user: JwtPayload = client.data.user;
    if (!user) {
      return;
    }
    const isParticipant = await this.conversationService.isParticipant(
      data.conversationId,
      user.sub,
      user.role,
    );
    if (!isParticipant) {
      return;
    }
    client.join(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; text: string },
  ) {
    const user: JwtPayload = client.data.user;
    if (!user) {
      return;
    }
    const isParticipant = await this.conversationService.isParticipant(
      data.conversationId,
      user.sub,
      user.role,
    );
    if (!isParticipant) {
      return;
    }

    const savedMsg = await this.chatService.sendMessage(
      user.sub,
      user.role,
      data.conversationId,
      data.text,
    );
    this.notifyConversation(data.conversationId, 'messageReceived', savedMsg);
    await this.notifyConversationParticipants(data.conversationId, savedMsg);

    const conversation = await this.conversationService.findById(
      data.conversationId,
    );
    if (conversation) {
      const recipientId =
        conversation.patientId === user.sub
          ? conversation.doctorUserId
          : conversation.patientId;
      if (recipientId) {
        await this.notificationsService.createNotification(
          recipientId,
          'New message',
          data.text.length > 120 ? `${data.text.slice(0, 120)}…` : data.text,
          NotificationType.MESSAGE,
          'Conversation',
          String(data.conversationId),
        );
      }
    }

    return savedMsg;
  }

  /**
   * Notifies both participants' user-rooms so conversation-list screens can
   * reorder/update without having to join every conversation's room.
   */
  async notifyConversationParticipants(
    conversationId: number,
    payload: any,
  ): Promise<void> {
    const conversation =
      await this.conversationService.findById(conversationId);
    if (!conversation) return;
    this.notifyUser(conversation.patientId, 'conversationUpdated', payload);
    if (conversation.doctorUserId) {
      this.notifyUser(
        conversation.doctorUserId,
        'conversationUpdated',
        payload,
      );
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; isTyping: boolean },
  ) {
    const user: JwtPayload = client.data.user;
    if (!user) {
      return;
    }
    client.to(`conversation:${data.conversationId}`).emit('typingIndicator', {
      userId: user.sub,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: number },
  ) {
    const user: JwtPayload = client.data.user;
    if (!user) {
      return;
    }
    const updated = await this.chatService.markRead(
      data.messageId,
      user.sub,
      user.role,
    );
    this.notifyConversation(updated.conversationId, 'messageStatusUpdate', {
      id: updated.id,
      status: updated.status,
    });
  }

  // ──────────────────────────────────────────────
  //  Video-call signaling handlers
  // ──────────────────────────────────────────────

  @SubscribeMessage('callStarted')
  async handleCallStarted(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      appointmentId: number;
      callerId: number;
      callerName: string;
      callerRole: 'FARMER' | 'PATIENT' | 'DOCTOR';
      channelName: string;
    },
  ) {
    const user: JwtPayload = client.data.user;
    if (!user) return;

    const appointment = await this.appointmentRepo.findOneBy({
      id: data.appointmentId,
    });
    if (!appointment) return;

    if (appointment.doctorId !== user.sub && appointment.patientId !== user.sub) {
      return;
    }

    const targetUserId =
      user.sub === appointment.doctorId
        ? appointment.patientId
        : appointment.doctorId;

    this.notifyUser(targetUserId, 'callStarted', {
      appointmentId: data.appointmentId,
      callerId: data.callerId,
      callerName: data.callerName,
      callerRole: data.callerRole,
      channelName: data.channelName,
    });
  }

  @SubscribeMessage('callResponse')
  async handleCallResponse(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      appointmentId: number;
      accepted: boolean;
      responderId: number;
    },
  ) {
    const user: JwtPayload = client.data.user;
    if (!user) return;

    const appointment = await this.appointmentRepo.findOneBy({
      id: data.appointmentId,
    });
    if (!appointment) return;

    if (appointment.doctorId !== user.sub && appointment.patientId !== user.sub) {
      return;
    }

    const targetUserId =
      user.sub === appointment.doctorId
        ? appointment.patientId
        : appointment.doctorId;

    this.notifyUser(targetUserId, 'callResponse', {
      appointmentId: data.appointmentId,
      accepted: data.accepted,
      responderId: data.responderId,
    });
  }

  @SubscribeMessage('callEnded')
  async handleCallEnded(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      appointmentId: number;
      endedBy: number;
    },
  ) {
    const user: JwtPayload = client.data.user;
    if (!user) return;

    const appointment = await this.appointmentRepo.findOneBy({
      id: data.appointmentId,
    });
    if (!appointment) return;

    if (appointment.doctorId !== user.sub && appointment.patientId !== user.sub) {
      return;
    }

    const targetUserId =
      user.sub === appointment.doctorId
        ? appointment.patientId
        : appointment.doctorId;

    this.notifyUser(targetUserId, 'callEnded', {
      appointmentId: data.appointmentId,
      endedBy: data.endedBy,
    });
  }

  notifyConversation(
    conversationId: number,
    event: string,
    payload: any,
  ): void {
    this.server.to(`conversation:${conversationId}`).emit(event, payload);
  }

  notifyUser(userId: number, event: string, payload: any): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  broadcastAll(event: string, payload: any): void {
    this.server.emit(event, payload);
  }
}
