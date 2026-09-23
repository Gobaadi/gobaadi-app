import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import { AiDiagnosis } from './ai-diagnosis.entity';
import { AiDiagnosisService } from './ai-diagnosis.service';
import { AiDiagnosisAnalyzerService } from './ai-diagnosis-analyzer.service';
import { AiDiagnosisProcessor } from './ai-diagnosis.processor';
import { AiDiagnosisController } from './ai-diagnosis.controller';
import { Doctor } from '../doctors/doctor.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { S3Module } from '../s3/s3.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiDiagnosis, Doctor]),
    BullModule.registerQueue({ name: 'ai-diagnosis-queue' }),
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
    NotificationsModule,
    S3Module,
    ChatModule,
  ],
  providers: [
    AiDiagnosisService,
    AiDiagnosisAnalyzerService,
    AiDiagnosisProcessor,
  ],
  controllers: [AiDiagnosisController],
  exports: [AiDiagnosisService, TypeOrmModule],
})
export class AiDiagnosisModule {}
