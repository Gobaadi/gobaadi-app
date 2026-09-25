import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { S3Module } from '../s3/s3.module';
import { DashboardAuthGuard } from './guards/dashboard-auth.guard';
import { DashboardAdminGuard } from './guards/dashboard-admin.guard';
import { DashboardSuperAdminGuard } from './guards/dashboard-super-admin.guard';
import { DashboardAuthController } from './controllers/dashboard-auth.controller';
import { DashboardAdminAuthController } from './controllers/dashboard-admin-auth.controller';
import { DashboardAdminsController } from './controllers/dashboard-admins.controller';
import { DashboardUsersController } from './controllers/dashboard-users.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardAnimalsController } from './controllers/dashboard-animals.controller';
import { DashboardNotificationsController } from './controllers/dashboard-notifications.controller';
import { DashboardAnalyticsService } from './services/dashboard-analytics.service';
import { DashboardAnimalsService } from './services/dashboard-animals.service';
import { DashboardNotificationsService } from './services/dashboard-notifications.service';
import { User } from '../users/user.entity';
import { Animal } from '../animals/animal.entity';
import { Notification } from '../notifications/notification.entity';
import { PushToken } from '../notifications/push-token.entity';
import { Address } from '../addresses/address.entity';
import { RefreshToken } from '../auth/refresh-token.entity';
import { AiDiagnosis } from '../ai-diagnosis/ai-diagnosis.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Referral } from '../referrals/referral.entity';
import { Task } from '../tasks/task.entity';

@Module({
  imports: [
    AuthModule,
    AdminModule,
    UsersModule,
    NotificationsModule,
    S3Module,
    TypeOrmModule.forFeature([
      User,
      Animal,
      Notification,
      PushToken,
      Address,
      RefreshToken,
      AiDiagnosis,
      Appointment,
      Referral,
      Task,
    ]),
  ],
  controllers: [
    DashboardAuthController,
    // Registered before DashboardAdminsController so exact paths
    // (/dashboard/admins/profile) win over /dashboard/admins/:id.
    DashboardAdminAuthController,
    DashboardAdminsController,
    DashboardUsersController,
    DashboardController,
    DashboardAnimalsController,
    DashboardNotificationsController,
  ],
  providers: [
    DashboardAuthGuard,
    DashboardAdminGuard,
    DashboardSuperAdminGuard,
    DashboardAnalyticsService,
    DashboardAnimalsService,
    DashboardNotificationsService,
  ],
})
export class DashboardModule {}
