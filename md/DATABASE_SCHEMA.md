# Database Schema Documentation

All tables use **TypeORM** with **PostgreSQL**.

---

## 1. `users`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `phone` | `varchar` | nullable, unique (partial) | |
| `role` | `enum(UserRole)` | default: `user` | `user`, `doctor`, `clinic`, `admin` |
| `name` | `varchar` | nullable | |
| `email` | `varchar` | nullable, unique (partial) | |
| `avatar` | `varchar` | nullable | |
| `password` | `varchar` | nullable, select: false | Hidden from default queries |
| `verified` | `boolean` | default: `false` | |
| `profilePhoto` | `varchar` | nullable | |
| `dateOfBirth` | `date` | nullable | |
| `bloodGroup` | `varchar` | nullable | |
| `allergies` | `text` | nullable | |
| `emergencyContactName` | `varchar` | nullable | |
| `emergencyContactPhone` | `varchar` | nullable | |
| `language` | `varchar` | default: `en` | |
| `isDoctorVerified` | `boolean` | default: `false` | |
| `verificationDocuments` | `simple-array` | nullable | String array |
| `googleId` | `varchar` | nullable, unique (partial) | |
| `facebookId` | `varchar` | nullable, unique (partial) | |
| `createdAt` | `timestamptz` | auto | |

---

## 2. `doctors`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | nullable | FK → `users.id` |
| `name` | `varchar` | required | |
| `specialty` | `varchar` | indexed | |
| `experience` | `varchar` | required | |
| `rating` | `float` | default: `4.8` | |
| `avatar` | `varchar` | required | |
| `bio` | `text` | required | |
| `qualifications` | `text[]` | default: `{}` | |
| `licenseNumber` | `varchar` | nullable | |
| `consultationFee` | `float` | default: `500` | |
| `isVerified` | `boolean` | default: `false` | |
| `clinics` | `ManyToMany` | — | → `clinics` (via `clinic_doctors`) |

---

## 3. `clinics`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | required | Owner/manager user ID |
| `name` | `varchar` | required | |
| `location` | `varchar` | required | |
| `businessHours` | `jsonb` | nullable | `Record<string, any>` |
| `isVerified` | `boolean` | default: `false` | |
| `rating` | `float` | default: `5.0` | |
| `avatar` | `varchar` | nullable | |
| `description` | `text` | required | |
| `doctors` | `ManyToMany` | — | → `doctors` (via `clinic_doctors`) |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

**Join table:** `clinic_doctors` (`clinicId`, `doctorId`)

---

## 4. `doctor_availability`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `doctorId` | `int` | indexed | |
| `dayOfWeek` | `int` | nullable | 0=Sunday..6=Saturday |
| `startTime` | `varchar` | required | `HH:mm` 24h |
| `endTime` | `varchar` | required | `HH:mm` 24h |
| `slotDurationMinutes` | `int` | default: `30` | |
| `bufferMinutes` | `int` | default: `10` | |
| `isActive` | `boolean` | default: `true` | |
| `specificDate` | `date` | nullable | null=weekly; set=one-off |
| `isAvailable` | `boolean` | default: `true` | |
| `overrideSlots` | `simple-array` | nullable | e.g. `['09:00-09:30']` |

**Composite indexes:** `(doctorId, dayOfWeek)`, `(doctorId, specificDate)`

---

## 5. `doctor_time_off`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `doctorId` | `int` | indexed | |
| `startDate` | `date` | required | |
| `endDate` | `date` | required | |
| `reason` | `enum(TimeOffReason)` | required | `vacation`, `sick_leave`, `conference_training`, `emergency`, `other` |
| `note` | `text` | nullable | |
| `createdAt` | `timestamptz` | auto | |

---

## 6. `services`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `providerType` | `enum(ProviderType)` | required | `doctor`, `clinic`, `ai` |
| `providerId` | `int` | indexed | Doctor/Clinic ID or mock AI ID |
| `name` | `varchar` | required | |
| `description` | `text` | required | |
| `durationMinutes` | `int` | required | |
| `price` | `float` | required | |
| `preparationInstructions` | `text` | nullable | |
| `requirements` | `text` | nullable | |
| `isOnline` | `boolean` | default: `true` | |
| `isOffline` | `boolean` | default: `false` | |
| `location` | `varchar` | nullable | Clinic address if offline |
| `cancellationPolicy` | `text` | nullable | |
| `isActive` | `boolean` | default: `true` | |
| `isRecurring` | `boolean` | default: `false` | |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 7. `appointments`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `doctorId` | `int` | indexed | |
| `clinicId` | `int` | nullable, indexed | |
| `serviceId` | `int` | nullable, indexed | |
| `patientId` | `int` | indexed | User.id (owner) |
| `animalId` | `int` | nullable, indexed | Animal.id (patient) |
| `startAt` | `timestamptz` | required | |
| `endAt` | `timestamptz` | required | |
| `durationMinutes` | `int` | required | |
| `price` | `float` | default: `0` | |
| `paymentStatus` | `varchar` | default: `pending` | `pending`, `paid`, `failed`, `refunded` |
| `paymentTransactionId` | `varchar` | nullable | |
| `prescription` | `text` | nullable | |
| `notes` | `text` | nullable | |
| `consultationType` | `enum(ConsultationType)` | nullable, indexed | `online_video`, `online_voice`, `online_chat`, `physical` |
| `reasonForConsultation` | `text` | nullable | |
| `symptoms` | `text[]` | nullable | |
| `followUpId` | `int` | nullable | |
| `status` | `enum(AppointmentStatus)` | default: `CONFIRMED` | `PENDING`, `CONFIRMED`, `RESCHEDULED`, `CANCELLED`, `COMPLETED` |
| `reminder24hSent` | `boolean` | default: `false` | |
| `reminder1hSent` | `boolean` | default: `false` | |
| `cancelledAt` | `timestamptz` | nullable | |
| `cancelledByUserId` | `int` | nullable | |
| `cancellationReason` | `text` | nullable | |
| `cancellationFee` | `decimal(10,2)` | default: `0` | |
| `refundAmount` | `decimal(10,2)` | default: `0` | |
| `walletTransactionId` | `varchar` | nullable | FK → `wallet_transactions.id` |
| `consultationNotes` | `text` | nullable | |
| `followUpDate` | `date` | nullable | |
| `originalStartAt` | `timestamptz` | nullable | |
| `rescheduledAt` | `timestamptz` | nullable | |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

**Unique index:** `(doctorId, startAt)` where `status != 'CANCELLED'`

---

## 8. `prescriptions`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `appointmentId` | `int` | indexed | |
| `doctorId` | `int` | indexed | |
| `animalId` | `int` | indexed | Animal.id (patient) |
| `ownerId` | `int` | indexed | User.id (owner) |
| `medicines` | `jsonb` | nullable | `Medicine[]` — `{ name, dosage, duration, notes? }` |
| `attachmentUrl` | `varchar` | nullable | |
| `sentAt` | `timestamptz` | nullable | |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 9. `medical_events`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `patientId` | `int` | indexed | Animal.id |
| `appointmentId` | `int` | indexed | |
| `doctorId` | `int` | indexed | |
| `type` | `enum(MedicalEventType)` | required | `CONSULTATION`, `TREATMENT`, `VACCINATION`, `LAB_TEST` |
| `status` | `enum(MedicalEventStatus)` | default: `ONGOING` | `ONGOING`, `COMPLETED` |
| `data` | `jsonb` | required | Free-form structured content per type |
| `nextFollowUpAt` | `timestamptz` | nullable | |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 10. `ai_diagnoses`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | FK → `users.id` |
| `images` | `text[]` | default: `{}` | |
| `symptoms` | `text[]` | default: `{}` | |
| `status` | `enum(AiDiagnosisStatus)` | default: `PENDING` | `PENDING`, `READY`, `FAILED` |
| `failureReason` | `varchar` | nullable | |
| `analysisResult` | `text` | nullable | |
| `confidenceScore` | `float` | nullable | |
| `recommendations` | `text[]` | default: `{}` | |
| `recommendedDoctorIds` | `int[]` | default: `{}` | |
| `prescriptionId` | `int` | nullable | |
| `createdAt` | `timestamptz` | auto | |

---

## 11. `attachments`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `patientId` | `int` | indexed | |
| `appointmentId` | `int` | nullable, indexed | |
| `uploadedByUserId` | `int` | required | |
| `originalFileName` | `varchar` | required | |
| `mimeType` | `varchar` | required | |
| `fileSizeBytes` | `int` | required | |
| `storageUrl` | `varchar` | nullable | |
| `storagePublicId` | `varchar` | nullable | |
| `status` | `enum(AttachmentStatus)` | default: `UPLOADED` | `UPLOADED`, `PROCESSING`, `READY`, `FAILED` |
| `failureReason` | `varchar` | nullable | |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 12. `video_sessions`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `appointmentId` | `int` | indexed | |
| `channelName` | `varchar` | required | |
| `status` | `enum(VideoSessionStatus)` | default: `WAITING` | `WAITING`, `ACTIVE`, `ENDED` |
| `doctorUserId` | `int` | nullable | |
| `patientId` | `int` | nullable | |
| `startedAt` | `timestamptz` | nullable | |
| `endedAt` | `timestamptz` | nullable | |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 13. `conversations`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `doctorId` | `int` | indexed | |
| `doctorUserId` | `int` | nullable | |
| `patientId` | `int` | indexed | |
| `appointmentId` | `int` | nullable | |
| `lastMessageAt` | `timestamptz` | nullable | |
| `createdAt` | `timestamptz` | auto | |

**Unique index:** `(doctorId, patientId)`

---

## 14. `chat_messages`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `conversationId` | `int` | indexed | |
| `senderId` | `int` | indexed | |
| `senderRole` | `enum(UserRole)` | required | |
| `text` | `text` | required | |
| `createdAt` | `timestamptz` | auto | |
| `status` | `enum(MessageStatus)` | default: `SENT` | `SENT`, `DELIVERED`, `READ` |
| `deliveredAt` | `timestamptz` | nullable | |
| `readAt` | `timestamptz` | nullable | |
| `attachmentUrl` | `varchar` | nullable | |
| `attachmentType` | `enum('image','document')` | nullable | |
| `attachmentMimeType` | `varchar` | nullable | |

---

## 15. `notifications`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | FK → `users.id` |
| `title` | `varchar` | required | |
| `body` | `text` | required | |
| `type` | `enum(NotificationType)` | default: `SYSTEM` | `order`, `booking`, `payment`, `delivery`, `reminder`, `ai_ready`, `prescription_ready`, `promotion`, `system`, `message`, `referral` |
| `referenceType` | `varchar` | nullable | e.g. `Order`, `Appointment` |
| `referenceId` | `varchar` | nullable | e.g. Order ID |
| `isRead` | `boolean` | default: `false` | |
| `createdAt` | `timestamptz` | auto | |

---

## 16. `notification_preferences`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | unique, indexed | |
| `appointmentReminders` | `boolean` | default: `true` | |
| `promotionalOffers` | `boolean` | default: `true` | |
| `chatMessages` | `boolean` | default: `true` | |
| `prescriptionUpdates` | `boolean` | default: `true` | |
| `labResults` | `boolean` | default: `true` | |
| `vaccinationReminders` | `boolean` | default: `true` | |
| `systemUpdates` | `boolean` | default: `true` | |
| `weatherAlerts` | `boolean` | default: `true` | |
| `taskReminders` | `boolean` | default: `true` | |
| `followUpReminders` | `boolean` | default: `true` | |
| `hygieneReminders` | `boolean` | default: `true` | |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 17. `push_tokens`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | FK → `users.id` |
| `token` | `varchar` | unique | |
| `deviceId` | `varchar` | nullable | |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 18. `products`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `sku` | `varchar` | unique, indexed | |
| `barcode` | `varchar` | nullable, indexed | |
| `name` | `varchar` | required | |
| `description` | `text` | required | |
| `price` | `float` | required | |
| `discount` | `float` | default: `0` | |
| `brandId` | `int` | nullable | FK → `brands.id` (SET NULL) |
| `categoryId` | `int` | nullable | FK → `categories.id` (SET NULL) |
| `specifications` | `jsonb` | nullable | |
| `instructions` | `text` | nullable | |
| `images` | `text[]` | default: `{}` | |
| `videos` | `text[]` | default: `{}` | |
| `documents` | `text[]` | default: `{}` | |
| `seoTitle` | `varchar` | nullable | |
| `seoDescription` | `varchar` | nullable | |
| `seoKeywords` | `varchar` | nullable | |
| `status` | `enum(ProductStatus)` | default: `draft` | `draft`, `published`, `archived` |
| `visibility` | `boolean` | default: `true` | |
| `isPrescriptionRequired` | `boolean` | default: `false` | |
| `deletedAt` | `timestamptz` | nullable | Soft delete |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 19. `categories`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `name` | `varchar` | unique, indexed | |
| `slug` | `varchar` | unique, indexed | |
| `description` | `varchar` | nullable | |

---

## 20. `brands`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `name` | `varchar` | unique, indexed | |
| `slug` | `varchar` | unique, indexed | |
| `description` | `varchar` | nullable | |

---

## 21. `inventory_ledger`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `productId` | `int` | indexed | FK → `products.id` (CASCADE) |
| `movementType` | `enum(InventoryMovementType)` | required | `addition`, `reservation`, `sale`, `return`, `adjustment` |
| `quantity` | `int` | required | Positive=credit, negative=debit |
| `batchNumber` | `varchar` | nullable | |
| `expiryDate` | `date` | nullable | |
| `referenceId` | `varchar` | nullable | e.g. Order ID |
| `createdAt` | `timestamptz` | auto | |

---

## 22. `cart_items`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | FK → `users.id` (CASCADE) |
| `productId` | `int` | nullable | FK → `products.id` (CASCADE) |
| `livestockId` | `int` | nullable | FK → `livestock.id` (CASCADE) |
| `quantity` | `int` | default: `1` | |
| `createdAt` | `timestamptz` | auto | |

---

## 23. `wishlist_items`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | FK → `users.id` (CASCADE) |
| `productId` | `int` | nullable | FK → `products.id` (CASCADE) |
| `livestockId` | `int` | nullable | FK → `livestock.id` (CASCADE) |
| `createdAt` | `timestamptz` | auto | |

---

## 24. `orders`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `varchar` | PK | Format: `GBD-xxxxxx` |
| `userId` | `int` | indexed | |
| `totalPrice` | `float` | required | |
| `tax` | `float` | required | |
| `shippingFee` | `float` | required | |
| `discountAmount` | `float` | default: `0` | |
| `netAmount` | `float` | required | |
| `deliveryAddress` | `jsonb` | required | Snapshot of address |
| `deliveryMethod` | `varchar` | required | `standard`, `express`, `same_day`, `store_pickup`, `seller_pickup` |
| `trackingNumber` | `varchar` | nullable | |
| `eta` | `timestamptz` | nullable | |
| `status` | `enum(OrderStatus)` | default: `pending`, indexed | `pending`, `confirmed`, `preparing`, `packed`, `shipped`, `delivered`, `completed`, `cancelled`, `refunded`, `returned`, `failed` |
| `paymentStatus` | `varchar` | default: `pending` | `pending`, `processing`, `successful`, `failed`, `cancelled`, `refunded` |
| `transactionId` | `varchar` | nullable | |
| `deliveryNotes` | `varchar` | nullable | |
| `items` | `OneToMany` | — | → `order_items` |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 25. `order_items`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `orderId` | `varchar` | indexed | FK → `orders.id` (CASCADE) |
| `productId` | `int` | nullable | FK → `products.id` (SET NULL) |
| `livestockId` | `int` | nullable | FK → `livestock.id` (SET NULL) |
| `quantity` | `int` | required | |
| `price` | `float` | required | Price at checkout |
| `discount` | `float` | default: `0` | Discount at checkout |
| `name` | `varchar` | required | Snapshot of item name |

---

## 26. `deliveries`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `orderId` | `varchar` | unique, indexed | FK → `orders.id` (CASCADE) |
| `trackingNumber` | `varchar` | unique, indexed | |
| `courierName` | `varchar` | required | |
| `status` | `enum(DeliveryStatus)` | default: `pending` | `pending`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `failed`, `returned` |
| `timeline` | `jsonb` | default: `[]` | `{ status, timestamp, location?, description }[]` |
| `deliveryProofUrl` | `varchar` | nullable | |
| `deliveryNotes` | `varchar` | nullable | |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 27. `transactions`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, auto-generated | |
| `orderId` | `varchar` | nullable, indexed | |
| `bookingId` | `int` | nullable, indexed | |
| `userId` | `int` | indexed | FK → `users.id` (CASCADE) |
| `amount` | `float` | required | |
| `provider` | `varchar` | required | `bkash`, `nagad`, `stripe`, `sslcommerz`, `rocket`, `paypal`, `simulate` |
| `status` | `enum(PaymentStatus)` | default: `pending` | `pending`, `processing`, `successful`, `failed`, `cancelled`, `expired`, `refunded` |
| `gatewayTransactionId` | `varchar` | nullable | |
| `gatewayMetadata` | `jsonb` | nullable | |
| `redirectUrl` | `varchar` | nullable | |
| `callbackUrl` | `varchar` | nullable | |
| `auditTrail` | `jsonb` | default: `[]` | `{ status, timestamp, message? }[]` |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 28. `payment_methods`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | |
| `type` | `enum(PaymentMethodType)` | required | `bkash`, `card`, `cash` |
| `maskedNumber` | `varchar` | nullable | |
| `provider` | `varchar` | nullable | |
| `isDefault` | `boolean` | default: `false` | |
| `isVerified` | `boolean` | default: `false` | |
| `verificationOtp` | `varchar` | nullable | |
| `createdAt` | `timestamptz` | auto | |

---

## 29. `wallets`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | unique, indexed | |
| `balance` | `float` | default: `0` | |
| `coins` | `int` | default: `0` | |

---

## 30. `wallet_transactions`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `walletId` | `int` | indexed | |
| `amount` | `float` | required | Signed: negative=debit, positive=credit |
| `reason` | `varchar` | required | |
| `referenceType` | `varchar` | nullable | |
| `referenceId` | `varchar` | nullable | |
| `createdAt` | `timestamptz` | auto | |

---

## 31. `livestock`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `sellerId` | `int` | indexed | FK → `users.id` (CASCADE) |
| `species` | `varchar` | indexed | e.g. cattle, goat, sheep, poultry |
| `breed` | `varchar` | indexed | |
| `age` | `varchar` | required | e.g. `24 Months` |
| `weight` | `float` | required | in Kg |
| `gender` | `varchar` | required | Male / Female |
| `vaccinationHistory` | `jsonb` | nullable | |
| `medicalHistory` | `jsonb` | nullable | |
| `healthStatus` | `varchar` | required | e.g. Healthy, Recovering |
| `pregnancyStatus` | `varchar` | nullable | e.g. Pregnant (3 Months) |
| `certification` | `varchar` | nullable | URL to document |
| `farmName` | `varchar` | required | |
| `location` | `varchar` | required | Division/District |
| `images` | `text[]` | default: `{}` | |
| `videos` | `text[]` | default: `{}` | |
| `documents` | `text[]` | default: `{}` | |
| `price` | `float` | required | |
| `isNegotiable` | `boolean` | default: `false` | |
| `isFeatured` | `boolean` | default: `false` | |
| `isReserved` | `boolean` | default: `false` | |
| `isSold` | `boolean` | default: `false` | |
| `status` | `enum(LivestockStatus)` | default: `draft` | `draft`, `published`, `archived` |
| `isVerified` | `boolean` | default: `false` | |
| `deletedAt` | `timestamptz` | nullable | Soft delete |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 32. `animals`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | nullable, indexed | |
| `name` | `varchar` | indexed | |
| `breed` | `varchar` | indexed | |
| `weight` | `varchar` | required | |
| `age` | `varchar` | required | |
| `color` | `varchar` | required | |
| `image` | `varchar` | nullable | |

---

## 33. `addresses`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | FK → `users.id` (CASCADE) |
| `label` | `varchar` | required | Home, Farm, Office, Clinic |
| `contactName` | `varchar` | required | |
| `phone` | `varchar` | required | |
| `division` | `varchar` | required | |
| `district` | `varchar` | required | |
| `upazila` | `varchar` | required | |
| `postalCode` | `varchar` | required | |
| `latitude` | `float` | nullable | |
| `longitude` | `float` | nullable | |
| `isDefault` | `boolean` | default: `false` | |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 34. `fields`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | |
| `name` | `varchar` | required | |
| `sizeAcres` | `decimal(10,2)` | required | |
| `cropType` | `varchar` | nullable | |
| `location` | `varchar` | nullable | |
| `createdAt` | `timestamptz` | auto | |

---

## 35. `tasks`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | |
| `title` | `varchar` | required | |
| `detail` | `text` | nullable | |
| `scheduledTime` | `timestamptz` | indexed | |
| `isDone` | `boolean` | default: `false` | |
| `category` | `varchar` | nullable | `field`, `animal`, `appointment`, `other` |
| `priority` | `enum(TaskPriority)` | default: `medium` | `low`, `medium`, `high` |
| `dueDate` | `date` | nullable | |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 36. `reviews`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | FK → `users.id` (CASCADE) |
| `targetType` | `enum(ReviewTargetType)` | required | `product`, `livestock`, `doctor`, `clinic`, `service` |
| `targetId` | `varchar` | required | Target entity ID |
| `rating` | `int` | required | 1–5 |
| `text` | `text` | required | |
| `images` | `text[]` | default: `{}` | |
| `videos` | `text[]` | default: `{}` | |
| `reply` | `text` | nullable | Vendor/provider reply |
| `helpfulCount` | `int` | default: `0` | |
| `isReported` | `boolean` | default: `false` | |
| `isApproved` | `boolean` | default: `true` | |
| `isVerified` | `boolean` | default: `false` | Verified purchase/booking |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

**Composite index:** `(targetType, targetId, isApproved)`

---

## 37. `discounts`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `code` | `varchar(10)` | unique, indexed | Case-sensitive promo code |
| `percent` | `float` | required | 0–100 |
| `validFrom` | `date` | nullable | |
| `validTo` | `date` | nullable | |
| `usageLimit` | `int` | nullable | null=unlimited |
| `usageCount` | `int` | default: `0` | |
| `isActive` | `boolean` | default: `true` | |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 38. `patient_discounts`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `doctorId` | `int` | indexed | |
| `patientId` | `int` | indexed | Animal.id |
| `percent` | `float` | required | |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

**Unique index:** `(doctorId, patientId)`

---

## 39. `badges`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `name` | `varchar` | required | |
| `description` | `text` | required | |
| `icon` | `varchar` | nullable | |
| `criteria` | `jsonb` | required | `{ type: string, threshold: number }` |
| `createdAt` | `timestamptz` | auto | |

---

## 40. `user_badges`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | |
| `badgeId` | `int` | indexed | |
| `earnedAt` | `timestamptz` | auto | |

---

## 41. `referrals`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | unique, indexed | |
| `referralCode` | `varchar` | unique, indexed | |
| `totalEarned` | `float` | default: `0` | |
| `pendingAmount` | `float` | default: `0` | |
| `payoutStatus` | `enum(PayoutStatus)` | default: `NONE` | `NONE`, `PENDING`, `PAID` |
| `referralCount` | `int` | default: `0` | |
| `redeemedReferralCode` | `varchar` | nullable | |
| `createdAt` | `timestamptz` | auto | |

---

## 42. `subscription_plans`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `name` | `varchar` | required | |
| `price` | `decimal(10,2)` | required | |
| `durationDays` | `int` | required | |
| `features` | `jsonb` | nullable | `Record<string, unknown>` |
| `isActive` | `boolean` | default: `true` | |
| `createdAt` | `timestamptz` | auto | |

---

## 43. `user_subscriptions`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | |
| `planId` | `int` | indexed | |
| `startDate` | `timestamptz` | required | |
| `endDate` | `timestamptz` | required | |
| `status` | `enum(SubscriptionStatus)` | default: `active` | `active`, `cancelled`, `expired` |
| `createdAt` | `timestamptz` | auto | |

---

## 44. `market_rates`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `commodity` | `varchar` | indexed | |
| `price` | `decimal(10,2)` | required | |
| `unit` | `varchar` | required | |
| `date` | `date` | required | |
| `region` | `varchar` | nullable | |
| `createdAt` | `timestamptz` | auto | |

---

## 45. `faqs`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `question` | `text` | required | |
| `answer` | `text` | required | |
| `category` | `varchar` | nullable | |
| `order` | `int` | default: `0` | Sort order |
| `createdAt` | `timestamptz` | auto | |

---

## 46. `alerts`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `title` | `varchar` | required | |
| `location` | `varchar` | required | |
| `crop` | `varchar` | required | |
| `severity` | `enum(AlertSeverity)` | required | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `actionType` | `enum(AlertActionType)` | required | `MANAGE`, `SCHEDULE` |
| `isActive` | `boolean` | default: `true`, indexed | |
| `createdAt` | `timestamptz` | auto | |

---

## 47. `alert_action_logs`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `alertId` | `int` | indexed | |
| `userId` | `int` | required | |
| `actionChoice` | `enum(AlertActionType)` | required | `MANAGE`, `SCHEDULE` |
| `createdAt` | `timestamptz` | auto | |

---

## 48. `support_tickets`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | |
| `subject` | `varchar` | required | |
| `message` | `text` | nullable | |
| `status` | `enum(TicketStatus)` | default: `open` | `open`, `in-progress`, `closed` |
| `createdAt` | `timestamptz` | auto | |
| `updatedAt` | `timestamptz` | auto | |

---

## 49. `support_ticket_replies`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `ticketId` | `int` | indexed | |
| `authorId` | `int` | indexed | |
| `message` | `text` | required | |
| `createdAt` | `timestamptz` | auto | |

---

## 50. `refresh_tokens`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, auto-increment | |
| `userId` | `int` | indexed | |
| `tokenHash` | `varchar` | unique, indexed | |
| `expiresAt` | `timestamptz` | required | |
| `revokedAt` | `timestamptz` | nullable | |
| `createdAt` | `timestamptz` | auto | |

---

## Enums Summary

| Enum | Values |
|---|---|
| `UserRole` | `user`, `doctor`, `clinic`, `admin` |
| `ProductStatus` | `draft`, `published`, `archived` |
| `OrderStatus` | `pending`, `confirmed`, `preparing`, `packed`, `shipped`, `delivered`, `completed`, `cancelled`, `refunded`, `returned`, `failed` |
| `DeliveryStatus` | `pending`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `failed`, `returned` |
| `LivestockStatus` | `draft`, `published`, `archived` |
| `NotificationType` | `order`, `booking`, `payment`, `delivery`, `reminder`, `ai_ready`, `prescription_ready`, `promotion`, `system`, `message`, `referral` |
| `PaymentStatus` | `pending`, `processing`, `successful`, `failed`, `cancelled`, `expired`, `refunded` |
| `ProviderType` | `doctor`, `clinic`, `ai` |
| `AlertSeverity` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `AlertActionType` | `MANAGE`, `SCHEDULE` |
| `AppointmentStatus` | `PENDING`, `CONFIRMED`, `RESCHEDULED`, `CANCELLED`, `COMPLETED` |
| `ConsultationType` | `online_video`, `online_voice`, `online_chat`, `physical` |
| `TaskPriority` | `low`, `medium`, `high` |
| `PayoutStatus` | `NONE`, `PENDING`, `PAID` |
| `MessageStatus` | `SENT`, `DELIVERED`, `READ` |
| `TicketStatus` | `open`, `in-progress`, `closed` |
| `ReviewTargetType` | `product`, `livestock`, `doctor`, `clinic`, `service` |
| `AttachmentStatus` | `UPLOADED`, `PROCESSING`, `READY`, `FAILED` |
| `InventoryMovementType` | `addition`, `reservation`, `sale`, `return`, `adjustment` |
| `SubscriptionStatus` | `active`, `cancelled`, `expired` |
| `PaymentMethodType` | `bkash`, `card`, `cash` |
| `MedicalEventType` | `CONSULTATION`, `TREATMENT`, `VACCINATION`, `LAB_TEST` |
| `MedicalEventStatus` | `ONGOING`, `COMPLETED` |
| `AiDiagnosisStatus` | `PENDING`, `READY`, `FAILED` |
| `VideoSessionStatus` | `WAITING`, `ACTIVE`, `ENDED` |
| `TimeOffReason` | `vacation`, `sick_leave`, `conference_training`, `emergency`, `other` |
