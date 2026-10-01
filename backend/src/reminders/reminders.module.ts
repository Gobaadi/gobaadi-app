import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { RemindersService } from './reminders.service';
import { RemindersProcessor } from './reminders.processor';
import { Appointment } from '../appointments/appointment.entity';
import { Doctor } from '../doctors/doctor.entity';
import { User } from '../users/user.entity';
import { MedicalEvent } from '../medical-events/medical-event.entity';
import { VideoSession } from '../video-call/video-call.entity';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      Doctor,
      User,
      MedicalEvent,
      VideoSession,
    ]),
    BullModule.registerQueue({ name: 'reminders-queue' }),
    ChatModule,
    NotificationsModule,
  ],
  providers: [RemindersService, RemindersProcessor],
})
export class RemindersModule {}
