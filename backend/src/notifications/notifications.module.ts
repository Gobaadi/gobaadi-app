import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { PushToken } from './push-token.entity';
import { NotificationPreference } from './notification-preference.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './notifications.processor';
import { ExpoPushProvider } from './providers/expo-push.provider';
import { FcmPushProvider } from './providers/fcm-push.provider';
import { RoutingPushProvider } from './providers/routing-push.provider';
import { PUSH_PROVIDER } from './push-provider.interface';
import { BullModule } from '@nestjs/bullmq';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, PushToken, NotificationPreference]),
    BullModule.registerQueue({
      name: 'notifications-queue',
    }),
    UsersModule,
  ],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    ExpoPushProvider,
    FcmPushProvider,
    RoutingPushProvider,
    { provide: PUSH_PROVIDER, useExisting: RoutingPushProvider },
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, TypeOrmModule],
})
export class NotificationsModule {}
