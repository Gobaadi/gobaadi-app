import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorTimeOff } from './doctor-time-off.entity';
import { Appointment } from '../appointments/appointment.entity';
import { User } from '../users/user.entity';
import { Animal } from '../animals/animal.entity';
import { TimeOffService } from './time-off.service';
import { BlockTimesController } from './time-off.controller';
import { DoctorsModule } from '../doctors/doctors.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DoctorTimeOff, Appointment, User, Animal]),
    DoctorsModule,
    WalletModule,
    NotificationsModule,
  ],
  controllers: [BlockTimesController],
  providers: [TimeOffService],
  exports: [TimeOffService],
})
export class TimeOffModule {}
