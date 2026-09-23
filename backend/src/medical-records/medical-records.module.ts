import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordsController } from './medical-records.controller';
import { FileProcessingProcessor } from './file-processing.processor';
import { Attachment } from './attachment.entity';
import { S3Module } from '../s3/s3.module';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attachment]),
    BullModule.registerQueue({ name: 'file-processing-queue' }),
    MulterModule.register({ limits: { fileSize: 20 * 1024 * 1024 } }),
    S3Module,
    ChatModule,
    NotificationsModule,
  ],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService, FileProcessingProcessor],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
