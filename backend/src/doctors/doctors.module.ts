import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { Doctor } from './doctor.entity';
import { Availability } from './availability.entity';
import { Appointment } from '../appointments/appointment.entity';
import { DoctorTimeOff } from '../time-off/doctor-time-off.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Doctor, Availability, Appointment, DoctorTimeOff]),
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
