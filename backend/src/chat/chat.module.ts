import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatMessage } from './chat-message.entity';
import { Conversation } from './conversation.entity';
import { ChatGateway } from './chat.gateway';
import { ConversationService } from './conversation.service';
import { Appointment } from '../appointments/appointment.entity';
import { Doctor } from '../doctors/doctor.entity';
import { VideoSession } from '../video-call/video-call.entity';
import { S3Module } from '../s3/s3.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessage,
      Conversation,
      Appointment,
      Doctor,
      VideoSession,
    ]),
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
    S3Module,
    NotificationsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ConversationService],
  exports: [ChatService, ChatGateway, ConversationService],
})
export class ChatModule {}
