import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ChatMessage, MessageStatus } from './chat-message.entity';
import { ConversationService } from './conversation.service';
import { UserRole } from '../users/user.entity';
export { ChatMessage } from './chat-message.entity';

export interface ChatMessageClientView {
  id: number;
  conversationId: number;
  sender: 'user' | 'doctor';
  text: string;
  time: string;
  createdAt: Date;
  status: MessageStatus;
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'document' | null;
  attachmentMimeType?: string | null;
}

export interface SendMessageAttachment {
  url: string;
  type: 'image' | 'document';
  mimeType: string;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    private readonly conversationService: ConversationService,
  ) {}

  async getMessages(conversationId: number): Promise<ChatMessageClientView[]> {
    const messages = await this.chatMessageRepository.find({
      where: { conversationId },
      order: { id: 'ASC' },
    });
    return messages.map((m) => this.toClientView(m));
  }

  async sendMessage(
    senderId: number,
    senderRole: UserRole,
    conversationId: number,
    text: string,
    attachment?: SendMessageAttachment,
  ): Promise<ChatMessageClientView> {
    if ((!text || !text.trim()) && !attachment) {
      throw new BadRequestException('Message must have text or an attachment');
    }
    const newMessage = this.chatMessageRepository.create({
      conversationId,
      senderId,
      senderRole,
      text: text || '',
      status: MessageStatus.SENT,
      attachmentUrl: attachment?.url ?? null,
      attachmentType: attachment?.type ?? null,
      attachmentMimeType: attachment?.mimeType ?? null,
    });
    const saved = await this.chatMessageRepository.save(newMessage);
    await this.conversationService.touchLastMessageAt(
      conversationId,
      text || (attachment ? '[Attachment]' : ''),
    );
    return this.toClientView(saved);
  }

  async markDelivered(messageId: number): Promise<ChatMessage> {
    await this.chatMessageRepository.update(messageId, {
      status: MessageStatus.DELIVERED,
      deliveredAt: new Date(),
    });
    return this.chatMessageRepository.findOneByOrFail({ id: messageId });
  }

  async markRead(
    messageId: number,
    userId: number,
    role: UserRole,
  ): Promise<ChatMessage> {
    const message = await this.chatMessageRepository.findOneBy({
      id: messageId,
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    const isParticipant = await this.conversationService.isParticipant(
      message.conversationId,
      userId,
      role,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant in this conversation');
    }

    await this.chatMessageRepository.update(messageId, {
      status: MessageStatus.READ,
      readAt: new Date(),
    });
    return this.chatMessageRepository.findOneByOrFail({ id: messageId });
  }

  /**
   * Marks every message the viewer has RECEIVED in the conversation as READ.
   * Messages sent by the viewer are untouched — read status belongs to the
   * recipient, and each participant's unread count is derived from messages
   * sent by the other party (see ConversationService.listForUser).
   * Returns the ids of the messages that changed so callers can broadcast
   * status updates to the other participant.
   */
  async markConversationRead(
    conversationId: number,
    userId: number,
    role: UserRole,
  ): Promise<number[]> {
    const isParticipant = await this.conversationService.isParticipant(
      conversationId,
      userId,
      role,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant in this conversation');
    }

    const unread = await this.chatMessageRepository.find({
      where: {
        conversationId,
        senderRole: Not(role),
        status: Not(MessageStatus.READ),
      },
      select: { id: true },
    });
    if (unread.length === 0) {
      return [];
    }

    await this.chatMessageRepository.update(
      { id: In(unread.map((m) => m.id)) },
      { status: MessageStatus.READ, readAt: new Date() },
    );
    return unread.map((m) => m.id);
  }

  private toClientView(message: ChatMessage): ChatMessageClientView {
    return {
      id: message.id,
      conversationId: message.conversationId,
      sender: message.senderRole === UserRole.DOCTOR ? 'doctor' : 'user',
      text: message.text,
      time: message.createdAt.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAt: message.createdAt,
      status: message.status,
      attachmentUrl: message.attachmentUrl,
      attachmentType: message.attachmentType,
      attachmentMimeType: message.attachmentMimeType,
    };
  }
}
