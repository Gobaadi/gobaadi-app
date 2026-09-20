import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import 'dotenv/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AnimalsModule } from './animals/animals.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ChatModule } from './chat/chat.module';
import { SeedModule } from './seed/seed.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { HealthController } from './health/health.controller';
import { MailModule } from './mail/mail.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { RemindersModule } from './reminders/reminders.module';
import { WeatherModule } from './weather/weather.module';
import { TasksModule } from './tasks/tasks.module';
import { AlertsModule } from './alerts/alerts.module';
import { ReferralsModule } from './referrals/referrals.module';
import { AdminModule } from './admin/admin.module';
import { SearchModule } from './search/search.module';
import { MeilisearchModule } from './meilisearch/meilisearch.module';

import { ProductsModule } from './products/products.module';
import { LivestockModule } from './livestock/livestock.module';
import { AddressesModule } from './addresses/addresses.module';
import { CartModule } from './cart/cart.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { PaymentsModule } from './payments/payments.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveryModule } from './delivery/delivery.module';
import { ClinicsModule } from './clinics/clinics.module';
import { ServicesModule } from './services/services.module';
import { AiDiagnosisModule } from './ai-diagnosis/ai-diagnosis.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WalletModule } from './wallet/wallet.module';
import { DiscountsModule } from './discounts/discounts.module';
import { TimeOffModule } from './time-off/time-off.module';
import { MedicalEventsModule } from './medical-events/medical-events.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { CalendarModule } from './calendar/calendar.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { FaqsModule } from './faqs/faqs.module';
import { SupportModule } from './support/support.module';
import { FieldsModule } from './fields/fields.module';
import { MarketRatesModule } from './market-rates/market-rates.module';
import { BadgesModule } from './badges/badges.module';
import { VideoCallModule } from './video-call/video-call.module';
import { AiModule } from './ai/ai.module';
import { PatientsModule } from './patients/patients.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgrespassword',
      database: process.env.DB_DATABASE || 'gobadi',
      autoLoadEntities: true,
      synchronize: true,
      dropSchema: true,
      ssl:
        process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    RedisModule,
    MeilisearchModule,
    AuthModule,
    UsersModule,
    AnimalsModule,
    DoctorsModule,
    AppointmentsModule,
    ChatModule,
    SeedModule,
    CloudinaryModule,
    MailModule,
    MedicalRecordsModule,
    RemindersModule,
    WeatherModule,
    TasksModule,
    AlertsModule,
    ReferralsModule,
    AdminModule,
    SearchModule,
    ProductsModule,
    LivestockModule,
    AddressesModule,
    CartModule,
    WishlistModule,
    PaymentsModule,
    OrdersModule,
    DeliveryModule,
    ClinicsModule,
    ServicesModule,
    AiDiagnosisModule,
    ReviewsModule,
    NotificationsModule,
    WalletModule,
    DiscountsModule,
    TimeOffModule,
    MedicalEventsModule,
    PrescriptionsModule,
    PaymentMethodsModule,
    CalendarModule,
    SubscriptionsModule,
    FaqsModule,
    SupportModule,
    FieldsModule,
    MarketRatesModule,
    BadgesModule,
    VideoCallModule,
    AiModule,
    PatientsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass:
        process.env.SKIP_THROTTLE === 'true'
          ? class MockThrottlerGuard {
              canActivate() {
                return true;
              }
            }
          : ThrottlerGuard,
    },
  ],
})
export class AppModule {}
