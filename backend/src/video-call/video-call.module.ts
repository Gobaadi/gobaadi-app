import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoSession } from './video-call.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Doctor } from '../doctors/doctor.entity';
import { MedicalEvent } from '../medical-events/medical-event.entity';
import { VideoCallService } from './video-call.service';
import { VideoCallController } from './video-call.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoSession, Appointment, Doctor, MedicalEvent]),
    AuthModule,
  ],
  controllers: [VideoCallController],
  providers: [VideoCallService],
  exports: [VideoCallService],
})
export class VideoCallModule {}
