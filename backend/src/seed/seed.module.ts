import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Animal } from '../animals/animal.entity';
import { Doctor } from '../doctors/doctor.entity';
import { Availability } from '../doctors/availability.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { Conversation } from '../chat/conversation.entity';
import { User } from '../users/user.entity';
import { Admin } from '../admin/entities/admin.entity';
import { AdminRefreshToken } from '../admin/entities/admin-refresh-token.entity';

import { Category } from '../products/category.entity';
import { Brand } from '../products/brand.entity';
import { Product } from '../products/product.entity';
import { InventoryLedger } from '../products/inventory-ledger.entity';
import { Livestock } from '../livestock/livestock.entity';
import { Clinic } from '../clinics/clinic.entity';
import { Service } from '../services/service.entity';
import { Address } from '../addresses/address.entity';
import { CartItem } from '../cart/cart-item.entity';
import { WishlistItem } from '../wishlist/wishlist-item.entity';
import { Order } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';
import { Transaction } from '../payments/transaction.entity';
import { Delivery } from '../delivery/delivery.entity';
import { Review } from '../reviews/review.entity';
import { Notification } from '../notifications/notification.entity';
import { AiDiagnosis } from '../ai-diagnosis/ai-diagnosis.entity';
import { Faq } from '../faqs/faq.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Animal,
      Doctor,
      Availability,
      ChatMessage,
      Conversation,
      Admin,
      AdminRefreshToken,
      Category,
      Brand,
      Product,
      InventoryLedger,
      Livestock,
      Clinic,
      Service,
      Address,
      CartItem,
      WishlistItem,
      Order,
      OrderItem,
      Transaction,
      Delivery,
      Review,
      Notification,
      AiDiagnosis,
      Faq,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
