# Database Schemas Reference

> Auto-generated reference for all backend schemas.
> **ORM:** Prisma (PostgreSQL) | **Validation:** Zod

---

## Table of Contents

- [Enums](#enums)
- [Auth & Users](#auth--users)
- [Admin](#admin)
- [E-commerce: Products](#e-commerce-products)
- [E-commerce: Cart & Wishlist](#e-commerce-cart--wishlist)
- [E-commerce: Orders](#e-commerce-orders)
- [E-commerce: Inventory & Payments](#e-commerce-inventory--payments)
- [Healthcare: Doctors & Clinics](#healthcare-doctors--clinics)
- [Healthcare: Appointments & Services](#healthcare-appointments--services)
- [Healthcare: AI Diagnosis & Attachments](#healthcare-ai-diagnosis--attachments)
- [Livestock](#livestock)
- [Chat & Messaging](#chat--messaging)
- [Notifications & Push](#notifications--push)
- [Reviews & Ratings](#reviews--ratings)
- [Referrals & Tasks](#referrals--tasks)
- [Alerts & Farming](#alerts--farming)
- [Animal](#animal)
- [Entity Relationship Map](#entity-relationship-map)
- [Zod Validation Schemas](#zod-validation-schemas)

---

## Enums

All enums are defined in `backend/prisma/schemas/user.prisma`.

| Enum | Values | Used By |
|---|---|---|
| `UserRole` | `user`, `doctor`, `clinic`, `admin` | User, ChatMessage |
| `AdminRole` | `admin`, `super_admin` | Admin |
| `AdminDesignation` | `founder`, `co_founder`, `manager`, `developer`, `analyst`, `support` | Admin |
| `AdminStatus` | `active`, `deactive` | Admin |
| `ProductStatus` | `draft`, `published`, `archived` | Product |
| `InventoryMovementType` | `addition`, `reservation`, `sale`, `return`, `adjustment` | InventoryLedger |
| `OrderStatus` | `pending`, `confirmed`, `preparing`, `packed`, `shipped`, `delivered`, `completed`, `cancelled`, `refunded`, `returned`, `failed` | Order |
| `LivestockStatus` | `draft`, `published`, `archived` | Livestock |
| `ProviderType` | `doctor`, `clinic`, `ai` | Service |
| `AppointmentStatusEnum` | `PENDING`, `CONFIRMED`, `RESCHEDULED`, `CANCELLED`, `COMPLETED` | Appointment |
| `PaymentStatus` | `pending`, `processing`, `successful`, `failed`, `cancelled`, `expired`, `refunded` | Transaction |
| `DeliveryStatus` | `pending`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `failed`, `returned` | Delivery |
| `MessageStatus` | `SENT`, `DELIVERED`, `READ` | ChatMessage |
| `NotificationType` | `order`, `booking`, `payment`, `delivery`, `reminder`, `ai_ready`, `prescription_ready`, `promotion`, `system`, `message`, `referral` | Notification |
| `ReviewTargetType` | `product`, `livestock`, `doctor`, `clinic`, `service` | Review |
| `PayoutStatus` | `NONE`, `PENDING`, `PAID` | Referral |
| `AiDiagnosisStatusEnum` | `PENDING`, `READY`, `FAILED` | AiDiagnosis |
| `AttachmentStatus` | `UPLOADED`, `PROCESSING`, `READY`, `FAILED` | Attachment |
| `AlertSeverity` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | Alert |
| `AlertActionType` | `MANAGE`, `SCHEDULE` | Alert, AlertActionLog |
| `AttachmentTypeEnum` | `image`, `document` | ChatMessage |

---

## Auth & Users

### User

**Table:** `users` | **File:** `backend/prisma/schemas/user.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `phone` | `String?` | unique | - |
| `email` | `String?` | unique | - |
| `name` | `String?` | - | - |
| `avatar` | `String?` | - | - |
| `password` | `String?` | - | - |
| `role` | `UserRole` | - | `user` |
| `verified` | `Boolean` | - | `false` |
| `googleId` | `String?` | unique | - |
| `facebookId` | `String?` | unique | - |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Relations:** RefreshToken[], Notification[], Address[], CartItem[], WishlistItem[], Order[], Review[], PushToken[], Task[], AiDiagnosis[], Livestock[], Transaction[], Referral

---

### RefreshToken

**Table:** `refresh_tokens` | **File:** `backend/prisma/schemas/user.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `userId` | `Int` | FK → User, indexed | - |
| `tokenHash` | `String` | unique | - |
| `expiresAt` | `DateTime` | - | - |
| `revokedAt` | `DateTime?` | - | - |
| `createdAt` | `DateTime` | - | `now()` |

**Relations:** User (onDelete: Cascade)

---

### Address

**Table:** `addresses` | **File:** `backend/prisma/schemas/address.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `userId` | `Int` | FK → User, indexed | - |
| `label` | `String` | - | - |
| `contactName` | `String` | - | - |
| `phone` | `String` | - | - |
| `division` | `String` | - | - |
| `district` | `String` | - | - |
| `upazila` | `String` | - | - |
| `postalCode` | `String` | - | - |
| `latitude` | `Float?` | - | - |
| `longitude` | `Float?` | - | - |
| `isDefault` | `Boolean` | - | `false` |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Relations:** User (onDelete: Cascade)

---

## Admin

### Admin

**Table:** `admins` | **File:** `backend/prisma/schemas/admin.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `name` | `String?` | - | - |
| `email` | `String` | unique | - |
| `password` | `String` | - | - |
| `role` | `AdminRole` | - | `admin` |
| `designation` | `AdminDesignation` | - | - |
| `avatar` | `String?` | - | - |
| `phone` | `String?` | - | - |
| `status` | `AdminStatus` | - | `active` |
| `verified` | `Boolean` | - | `false` |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Relations:** AdminRefreshToken[]

---

### AdminRefreshToken

**Table:** `admin_refresh_tokens` | **File:** `backend/prisma/schemas/admin.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `adminId` | `Int` | FK → Admin, indexed | - |
| `tokenHash` | `String` | unique | - |
| `expiresAt` | `DateTime` | - | - |
| `revokedAt` | `DateTime?` | - | - |
| `createdAt` | `DateTime` | - | `now()` |

**Relations:** Admin (onDelete: Cascade)

---

## E-commerce: Products

### Brand

**Table:** `brands` | **File:** `backend/prisma/schemas/brand.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `name` | `String` | unique | - |
| `slug` | `String` | unique | - |
| `description` | `String?` | - | - |
| `logo` | `String?` | - | - |
| `website` | `String?` | - | - |

**Relations:** Product[]

---

### Category

**Table:** `categories` | **File:** `backend/prisma/schemas/category.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `name` | `String` | unique | - |
| `slug` | `String` | unique | - |
| `description` | `String?` | - | - |

**Relations:** Product[]

---

### Product

**Table:** `products` | **File:** `backend/prisma/schemas/product.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `sku` | `String` | unique | - |
| `barcode` | `String?` | indexed | - |
| `name` | `String` | - | - |
| `description` | `String` | - | - |
| `price` | `Float` | - | - |
| `discount` | `Float` | - | `0` |
| `brandId` | `Int?` | FK → Brand, onDelete: SetNull | - |
| `categoryId` | `Int?` | FK → Category, onDelete: SetNull | - |
| `specifications` | `Json?` | - | - |
| `instructions` | `String?` | - | - |
| `images` | `String[]` | - | `[]` |
| `videos` | `String[]` | - | `[]` |
| `documents` | `String[]` | - | `[]` |
| `seoTitle` | `String?` | - | - |
| `seoDescription` | `String?` | - | - |
| `seoKeywords` | `String?` | - | - |
| `status` | `ProductStatus` | - | `draft` |
| `visibility` | `Boolean` | - | `true` |
| `isPrescriptionRequired` | `Boolean` | - | `false` |
| `deletedAt` | `DateTime?` | soft delete | - |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Relations:** Brand?, Category?, InventoryLedger[], OrderItem[], CartItem[], WishlistItem[]

---

## E-commerce: Cart & Wishlist

### CartItem

**Table:** `cart_items` | **File:** `backend/prisma/schemas/cartItem.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `userId` | `Int` | FK → User, indexed | - |
| `productId` | `Int?` | FK → Product, onDelete: Cascade | - |
| `livestockId` | `Int?` | FK → Livestock, onDelete: Cascade | - |
| `quantity` | `Int` | - | `1` |
| `createdAt` | `DateTime` | - | `now()` |

**Relations:** User, Product?, Livestock?

---

### WishlistItem

**Table:** `wishlist_items` | **File:** `backend/prisma/schemas/wishlistItem.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `userId` | `Int` | FK → User, indexed | - |
| `productId` | `Int?` | FK → Product, onDelete: Cascade | - |
| `livestockId` | `Int?` | FK → Livestock, onDelete: Cascade | - |
| `createdAt` | `DateTime` | - | `now()` |

**Relations:** User, Product?, Livestock?

---

## E-commerce: Orders

### Order

**Table:** `orders` | **File:** `backend/prisma/schemas/order.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `String` | PK (UUID) | `uuid()` |
| `userId` | `Int` | FK → User, indexed | - |
| `totalPrice` | `Float` | - | - |
| `tax` | `Float` | - | - |
| `shippingFee` | `Float` | - | - |
| `discountAmount` | `Float` | - | `0` |
| `netAmount` | `Float` | - | - |
| `deliveryAddress` | `Json` | - | - |
| `deliveryMethod` | `String` | - | - |
| `trackingNumber` | `String?` | - | - |
| `eta` | `DateTime?` | - | - |
| `status` | `OrderStatus` | indexed | `pending` |
| `paymentStatus` | `String` | - | `"pending"` |
| `transactionId` | `String?` | - | - |
| `deliveryNotes` | `String?` | - | - |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Relations:** User, OrderItem[], Delivery?

---

### OrderItem

**Table:** `order_items` | **File:** `backend/prisma/schemas/orderItem.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `orderId` | `String` | FK → Order, indexed | - |
| `productId` | `Int?` | FK → Product, onDelete: SetNull | - |
| `livestockId` | `Int?` | FK → Livestock, onDelete: SetNull | - |
| `quantity` | `Int` | - | - |
| `price` | `Float` | - | - |
| `discount` | `Float` | - | `0` |
| `name` | `String` | - | - |

**Relations:** Order, Product?, Livestock?

---

### Delivery

**Table:** `deliveries` | **File:** `backend/prisma/schemas/delivery.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `orderId` | `String` | FK → Order, unique | - |
| `trackingNumber` | `String` | unique | - |
| `courierName` | `String` | - | - |
| `status` | `DeliveryStatus` | - | `pending` |
| `timeline` | `Json` | - | `"[]"` |
| `deliveryProofUrl` | `String?` | - | - |
| `deliveryNotes` | `String?` | - | - |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Relations:** Order (onDelete: Cascade)

---

## E-commerce: Inventory & Payments

### InventoryLedger

**Table:** `inventory_ledger` | **File:** `backend/prisma/schemas/inventoryLedger.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `productId` | `Int` | FK → Product, indexed | - |
| `movementType` | `InventoryMovementType` | - | - |
| `quantity` | `Int` | - | - |
| `batchNumber` | `String?` | - | - |
| `expiryDate` | `DateTime?` | - | - |
| `referenceId` | `String?` | - | - |
| `createdAt` | `DateTime` | - | `now()` |

**Relations:** Product (onDelete: Cascade)

---

### Transaction

**Table:** `transactions` | **File:** `backend/prisma/schemas/transaction.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `String` | PK (UUID) | `uuid()` |
| `orderId` | `String?` | indexed | - |
| `bookingId` | `Int?` | indexed | - |
| `userId` | `Int` | FK → User, indexed | - |
| `amount` | `Float` | - | - |
| `provider` | `String` | - | - |
| `status` | `PaymentStatus` | - | `pending` |
| `gatewayTransactionId` | `String?` | - | - |
| `gatewayMetadata` | `Json?` | - | - |
| `redirectUrl` | `String?` | - | - |
| `callbackUrl` | `String?` | - | - |
| `auditTrail` | `Json` | - | `"[]"` |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Relations:** User (onDelete: Cascade)

---

## Healthcare: Doctors & Clinics

### Doctor

**Table:** `doctors` | **File:** `backend/prisma/schemas/doctor.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `userId` | `Int?` | indexed | - |
| `name` | `String` | - | - |
| `specialty` | `String` | indexed | - |
| `experience` | `String` | - | - |
| `rating` | `Float` | - | `4.8` |
| `avatar` | `String` | - | - |
| `bio` | `String` | - | - |
| `qualifications` | `String[]` | - | - |
| `licenseNumber` | `String?` | - | - |
| `consultationFee` | `Float` | - | `500` |
| `isVerified` | `Boolean` | - | `false` |

**Relations:** ClinicDoctor[]

---

### DoctorAvailability

**Table:** `doctor_availability` | **File:** `backend/prisma/schemas/doctorAvailability.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `doctorId` | `Int` | indexed, unique with dayOfWeek | - |
| `dayOfWeek` | `Int` | 0-6, unique with doctorId | - |
| `startTime` | `String` | - | - |
| `endTime` | `String` | - | - |
| `slotDurationMinutes` | `Int` | - | `30` |
| `bufferMinutes` | `Int` | - | `10` |
| `isActive` | `Boolean` | - | `true` |

**Unique:** `@@unique([doctorId, dayOfWeek])`

---

### Clinic

**Table:** `clinics` | **File:** `backend/prisma/schemas/clinic.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `userId` | `Int` | - | - |
| `name` | `String` | - | - |
| `location` | `String` | - | - |
| `businessHours` | `Json?` | - | - |
| `isVerified` | `Boolean` | - | `false` |
| `rating` | `Float` | - | `5.0` |
| `avatar` | `String?` | - | - |
| `description` | `String` | - | - |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Relations:** ClinicDoctor[]

---

### ClinicDoctor (Join Table)

**Table:** `clinic_doctors` | **File:** `backend/prisma/schemas/clinicDoctor.prisma`

| Field | Type | Constraints |
|---|---|---|
| `clinicId` | `Int` | FK → Clinic, composite PK |
| `doctorId` | `Int` | FK → Doctor, composite PK |

**Composite PK:** `@@id([clinicId, doctorId])`
**Relations:** Clinic (onDelete: Cascade), Doctor (onDelete: Cascade)

---

## Healthcare: Appointments & Services

### Service

**Table:** `services` | **File:** `backend/prisma/schemas/service.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `providerType` | `ProviderType` | - | - |
| `providerId` | `Int` | indexed | - |
| `name` | `String` | - | - |
| `description` | `String` | - | - |
| `durationMinutes` | `Int` | - | - |
| `price` | `Float` | - | - |
| `preparationInstructions` | `String?` | - | - |
| `requirements` | `String?` | - | - |
| `isOnline` | `Boolean` | - | `true` |
| `isOffline` | `Boolean` | - | `false` |
| `location` | `String?` | - | - |
| `cancellationPolicy` | `String?` | - | - |
| `isActive` | `Boolean` | - | `true` |
| `isRecurring` | `Boolean` | - | `false` |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Relations:** Appointment[]

---

### Appointment

**Table:** `appointments` | **File:** `backend/prisma/schemas/appointment.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `doctorId` | `Int` | indexed | - |
| `clinicId` | `Int?` | indexed | - |
| `serviceId` | `Int?` | FK → Service, indexed | - |
| `patientId` | `Int` | indexed | - |
| `startAt` | `DateTime` | unique with doctorId | - |
| `endAt` | `DateTime` | - | - |
| `durationMinutes` | `Int` | - | - |
| `price` | `Float` | - | `0` |
| `paymentStatus` | `String` | - | `"pending"` |
| `paymentTransactionId` | `String?` | - | - |
| `prescription` | `String?` | - | - |
| `notes` | `String?` | - | - |
| `followUpId` | `Int?` | - | - |
| `status` | `AppointmentStatusEnum` | - | `CONFIRMED` |
| `reminder24hSent` | `Boolean` | - | `false` |
| `reminder1hSent` | `Boolean` | - | `false` |
| `cancelledAt` | `DateTime?` | - | - |
| `cancelledByUserId` | `Int?` | - | - |
| `originalStartAt` | `DateTime?` | - | - |
| `rescheduledAt` | `DateTime?` | - | - |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Unique:** `@@unique([doctorId, startAt])`
**Relations:** Service?

---

## Healthcare: AI Diagnosis & Attachments

### AiDiagnosis

**Table:** `ai_diagnoses` | **File:** `backend/prisma/schemas/aiDiagnosis.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `userId` | `Int` | FK → User, indexed | - |
| `images` | `String[]` | - | `[]` |
| `symptoms` | `String[]` | - | `[]` |
| `status` | `AiDiagnosisStatusEnum` | - | `PENDING` |
| `failureReason` | `String?` | - | - |
| `analysisResult` | `String?` | - | - |
| `confidenceScore` | `Float?` | - | - |
| `recommendations` | `String[]` | - | `[]` |
| `recommendedDoctorIds` | `Int[]` | - | `[]` |
| `prescriptionId` | `Int?` | - | - |
| `createdAt` | `DateTime` | - | `now()` |

**Relations:** User (onDelete: Cascade)

---

### Attachment

**Table:** `attachments` | **File:** `backend/prisma/schemas/attachment.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `patientId` | `Int` | indexed | - |
| `appointmentId` | `Int?` | indexed | - |
| `uploadedByUserId` | `Int` | - | - |
| `originalFileName` | `String` | - | - |
| `mimeType` | `String` | - | - |
| `fileSizeBytes` | `Int` | - | - |
| `storageUrl` | `String?` | - | - |
| `storagePublicId` | `String?` | - | - |
| `status` | `AttachmentStatus` | - | `UPLOADED` |
| `failureReason` | `String?` | - | - |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

---

## Livestock

### Livestock

**Table:** `livestock` | **File:** `backend/prisma/schemas/livestock.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `sellerId` | `Int` | FK → User, indexed | - |
| `species` | `String` | indexed | - |
| `breed` | `String` | indexed | - |
| `age` | `String` | - | - |
| `weight` | `Float` | - | - |
| `gender` | `String` | - | - |
| `vaccinationHistory` | `Json?` | - | - |
| `medicalHistory` | `Json?` | - | - |
| `healthStatus` | `String` | - | - |
| `pregnancyStatus` | `String?` | - | - |
| `certification` | `String?` | - | - |
| `farmName` | `String` | - | - |
| `location` | `String` | - | - |
| `images` | `String[]` | - | `[]` |
| `videos` | `String[]` | - | `[]` |
| `documents` | `String[]` | - | `[]` |
| `price` | `Float` | - | - |
| `isNegotiable` | `Boolean` | - | `false` |
| `isFeatured` | `Boolean` | - | `false` |
| `isReserved` | `Boolean` | - | `false` |
| `isSold` | `Boolean` | - | `false` |
| `status` | `LivestockStatus` | - | `draft` |
| `isVerified` | `Boolean` | - | `false` |
| `deletedAt` | `DateTime?` | soft delete | - |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Relations:** User (SellerLivestock), OrderItem[], CartItem[], WishlistItem[]

---

## Chat & Messaging

### Conversation

**Table:** `conversations` | **File:** `backend/prisma/schemas/conversation.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `doctorId` | `Int` | indexed | - |
| `doctorUserId` | `Int?` | - | - |
| `patientId` | `Int` | indexed | - |
| `appointmentId` | `Int?` | - | - |
| `lastMessageAt` | `DateTime?` | - | - |
| `createdAt` | `DateTime` | - | `now()` |

**Unique:** `@@unique([doctorId, patientId])`
**Relations:** ChatMessage[]

---

### ChatMessage

**Table:** `chat_messages` | **File:** `backend/prisma/schemas/chatMessage.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `conversationId` | `Int` | FK → Conversation, indexed | - |
| `senderId` | `Int` | indexed | - |
| `senderRole` | `UserRole` | - | - |
| `text` | `String` | - | - |
| `createdAt` | `DateTime` | - | `now()` |
| `status` | `MessageStatus` | - | `SENT` |
| `deliveredAt` | `DateTime?` | - | - |
| `readAt` | `DateTime?` | - | - |
| `attachmentUrl` | `String?` | - | - |
| `attachmentType` | `AttachmentTypeEnum?` | - | - |
| `attachmentMimeType` | `String?` | - | - |

**Relations:** Conversation

---

## Notifications & Push

### Notification

**Table:** `notifications` | **File:** `backend/prisma/schemas/notification.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `title` | `String` | - | - |
| `body` | `String` | - | - |
| `type` | `NotificationType` | - | `system` |
| `isRead` | `Boolean` | - | `false` |
| `userId` | `Int` | FK → User, indexed | - |
| `referenceType` | `String?` | - | - |
| `referenceId` | `String?` | - | - |
| `occurrence` | `String?` | - | - |
| `time` | `String?` | - | - |
| `createdAt` | `DateTime` | - | `now()` |

**Relations:** User (onDelete: Cascade)

---

### PushToken

**Table:** `push_tokens` | **File:** `backend/prisma/schemas/dashboard.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `userId` | `Int` | FK → User, indexed | - |
| `token` | `String` | unique | - |
| `deviceId` | `String?` | - | - |
| `os` | `String?` | - | - |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Relations:** User (onDelete: Cascade)

---

## Reviews & Ratings

### Review

**Table:** `reviews` | **File:** `backend/prisma/schemas/review.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `userId` | `Int` | FK → User, indexed | - |
| `targetType` | `ReviewTargetType` | composite index | - |
| `targetId` | `String` | composite index | - |
| `rating` | `Int` | - | - |
| `text` | `String` | - | - |
| `images` | `String[]` | - | `[]` |
| `videos` | `String[]` | - | `[]` |
| `reply` | `String?` | - | - |
| `helpfulCount` | `Int` | - | `0` |
| `isReported` | `Boolean` | - | `false` |
| `isApproved` | `Boolean` | composite index | `true` |
| `isVerified` | `Boolean` | - | `false` |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Composite Index:** `[targetType, targetId, isApproved]`
**Relations:** User (onDelete: Cascade)

---

## Referrals & Tasks

### Referral

**Table:** `referrals` | **File:** `backend/prisma/schemas/referral.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `userId` | `Int` | FK → User, unique, indexed | - |
| `referralCode` | `String` | unique | - |
| `totalEarned` | `Float` | - | `0` |
| `pendingAmount` | `Float` | - | `0` |
| `payoutStatus` | `PayoutStatus` | - | `NONE` |
| `referralCount` | `Int` | - | `0` |
| `redeemedReferralCode` | `String?` | - | - |
| `createdAt` | `DateTime` | - | `now()` |

**Relations:** User (onDelete: Cascade)

---

### Task

**Table:** `tasks` | **File:** `backend/prisma/schemas/task.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `userId` | `Int` | FK → User, indexed | - |
| `title` | `String` | - | - |
| `detail` | `String?` | - | - |
| `scheduledTime` | `DateTime` | indexed | - |
| `isDone` | `Boolean` | - | `false` |
| `createdAt` | `DateTime` | - | `now()` |
| `updatedAt` | `DateTime` | @updatedAt | - |

**Relations:** User (onDelete: Cascade)

---

## Alerts & Farming

### Alert

**Table:** `alerts` | **File:** `backend/prisma/schemas/alert.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `title` | `String` | - | - |
| `location` | `String` | - | - |
| `crop` | `String` | - | - |
| `severity` | `AlertSeverity` | - | - |
| `actionType` | `AlertActionType` | - | - |
| `isActive` | `Boolean` | indexed | `true` |
| `createdAt` | `DateTime` | - | `now()` |

**Relations:** AlertActionLog[]

---

### AlertActionLog

**Table:** `alert_action_logs` | **File:** `backend/prisma/schemas/alertActionLog.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `alertId` | `Int` | FK → Alert, indexed | - |
| `userId` | `Int` | - | - |
| `actionChoice` | `AlertActionType` | - | - |
| `createdAt` | `DateTime` | - | `now()` |

**Relations:** Alert

---

## Animal

### Animal

**Table:** `animals` | **File:** `backend/prisma/schemas/animal.prisma`

| Field | Type | Constraints | Default |
|---|---|---|---|
| `id` | `Int` | PK, autoincrement | - |
| `userId` | `Int?` | indexed | - |
| `name` | `String` | - | - |
| `breed` | `String` | - | - |
| `weight` | `String` | - | - |
| `age` | `String` | - | - |
| `color` | `String` | - | - |
| `image` | `String?` | - | - |

---

## Entity Relationship Map

```
User (1) ──< RefreshToken (N)
User (1) ──< Notification (N)
User (1) ──< Address (N)
User (1) ──< CartItem (N)
User (1) ──< WishlistItem (N)
User (1) ──< Order (N)
User (1) ──< Review (N)
User (1) ──< PushToken (N)
User (1) ──< Task (N)
User (1) ──< AiDiagnosis (N)
User (1) ──< Livestock (N)       [SellerLivestock]
User (1) ──< Transaction (N)
User (1) ──< Referral (1)

Admin (1) ──< AdminRefreshToken (N)

Clinic (1) ──< ClinicDoctor (N) >── (1) Doctor
Doctor (1) ──< DoctorAvailability (N)

Service (1) ──< Appointment (N)
Appointment ── relates to Doctor, Clinic, Patient(User)

Product (N) >── (1) Brand
Product (N) >── (1) Category
Product (1) ──< InventoryLedger (N)
Product (1) ──< OrderItem (N)
Product (1) ──< CartItem (N)
Product (1) ──< WishlistItem (N)

Livestock (1) ──< OrderItem (N)
Livestock (1) ──< CartItem (N)
Livestock (1) ──< WishlistItem (N)

Order (1) ──< OrderItem (N)
Order (1) ──< Delivery (1)

Conversation (1) ──< ChatMessage (N)

Alert (1) ──< AlertActionLog (N)
```

---

## Zod Validation Schemas

### Auth Validation
**File:** `backend/src/app/module/auth/auth.validation.ts`

| Schema | Fields |
|---|---|
| `registerValidationSchema` | `name` (string), `identifier` (phone/email), `password` (8-100 chars), `role` (user/doctor/clinic/admin) |
| `loginValidationSchema` | `identifier` (phone/email), `password` (string) |
| `sendOtpValidationSchema` | `phone` (phone/email), `purpose` (login/verify/reset) |
| `verifyOtpValidationSchema` | `phone` (phone/email), `code` (string), `purpose` (login/verify/reset) |
| `forgotPasswordValidationSchema` | `identifier` (phone/email) |
| `resetPasswordValidationSchema` | `resetToken` (string), `newPassword` (8-100 chars) |
| `googleAuthValidationSchema` | `idToken` (string) |
| `facebookAuthValidationSchema` | `accessToken` (string) |
| `refreshTokenValidationSchema` | `refreshToken` (string) |

---

### User Validation
**File:** `backend/src/app/module/user/user.validation.ts`

| Schema | Fields |
|---|---|
| `updateUserValidationSchema` | Params: `id`. Body: `name` (2-100), `email`, `phone` (10-15), `avatar` (URL), `password` (6-100), `role`, `verified` (all optional) |

---

### Admin Validation
**File:** `backend/src/app/module/admin/admin.validation.ts`

| Schema | Fields |
|---|---|
| `createAdminValidationSchema` | `name`, `email`, `password` (6-100), `role` (admin/super_admin), `designation` (enum), `avatar` (URL), `status` (active/deactive) |
| `updateAdminValidationSchema` | All create fields (all optional) |
| `deleteAdminValidationSchema` | Params: `id` |
| `deactivateAdminValidationSchema` | Params: `id` |

---

### Admin Auth Validation
**File:** `backend/src/app/module/admin/admin.auth.validation.ts`

| Schema | Fields |
|---|---|
| `adminLoginValidationSchema` | `email`, `password` |
| `adminSendOtpValidationSchema` | `email`, `purpose` (verify/reset) |
| `adminVerifyOtpValidationSchema` | `email`, `code`, `purpose` (verify/reset) |
| `adminForgotPasswordValidationSchema` | `email` |
| `adminResetPasswordValidationSchema` | `resetToken`, `newPassword` (8-100) |
| `adminRefreshTokenValidationSchema` | `refreshToken` |
| `adminUpdateProfileValidationSchema` | `name`, `designation`, `password` (6-100) (all optional) |

---

### Notification Validation
**File:** `backend/src/app/module/notification/notification.validation.ts`

| Schema | Fields |
|---|---|
| `createNotificationValidationSchema` | `title`, `body`, `type` (notification enum), `userId` (positive int), `referenceType`, `referenceId` |
| `sendNotificationValidationSchema` | `title`, `body`, `type`, `userIds` (array, min 1), `referenceType`, `referenceId` |
| `broadcastNotificationValidationSchema` | `title`, `body`, `type`, `role` (user/doctor/clinic/admin), `occurrence`, `time` |
| `notificationParamsValidationSchema` | Params: `id` |

---

## File Inventory

### Prisma Schema Files (33)
All located under `backend/prisma/schemas/`:

| File | Models |
|---|---|
| `schema.prisma` | Generator + datasource config |
| `user.prisma` | All 21 enums, User, RefreshToken |
| `admin.prisma` | Admin, AdminRefreshToken |
| `address.prisma` | Address |
| `aiDiagnosis.prisma` | AiDiagnosis |
| `alert.prisma` | Alert |
| `alertActionLog.prisma` | AlertActionLog |
| `animal.prisma` | Animal |
| `appointment.prisma` | Appointment |
| `attachment.prisma` | Attachment |
| `brand.prisma` | Brand |
| `cartItem.prisma` | CartItem |
| `category.prisma` | Category |
| `chatMessage.prisma` | ChatMessage |
| `clinic.prisma` | Clinic |
| `clinicDoctor.prisma` | ClinicDoctor |
| `conversation.prisma` | Conversation |
| `dashboard.prisma` | PushToken |
| `delivery.prisma` | Delivery |
| `doctor.prisma` | Doctor |
| `doctorAvailability.prisma` | DoctorAvailability |
| `inventoryLedger.prisma` | InventoryLedger |
| `livestock.prisma` | Livestock |
| `notification.prisma` | Notification |
| `order.prisma` | Order |
| `orderItem.prisma` | OrderItem |
| `product.prisma` | Product |
| `referral.prisma` | Referral |
| `review.prisma` | Review |
| `service.prisma` | Service |
| `task.prisma` | Task |
| `transaction.prisma` | Transaction |
| `wishlistItem.prisma` | WishlistItem |

### Zod Validation Files (5)
| File |
|---|
| `backend/src/app/module/auth/auth.validation.ts` |
| `backend/src/app/module/user/user.validation.ts` |
| `backend/src/app/module/admin/admin.validation.ts` |
| `backend/src/app/module/admin/admin.auth.validation.ts` |
| `backend/src/app/module/notification/notification.validation.ts` |

---

> **Totals:** 34 Prisma Models | 21 Enums | 16 Zod Schemas | PostgreSQL
