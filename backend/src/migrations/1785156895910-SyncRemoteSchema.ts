import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncRemoteSchema1785156895910 implements MigrationInterface {
  name = 'SyncRemoteSchema1785156895910';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_a000cca60bcf04454e72769949"`,
    );
    await queryRunner.query(
      `CREATE TABLE "addresses" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "label" character varying NOT NULL, "contactName" character varying NOT NULL, "phone" character varying NOT NULL, "division" character varying NOT NULL, "district" character varying NOT NULL, "upazila" character varying NOT NULL, "postalCode" character varying NOT NULL, "latitude" double precision, "longitude" double precision, "isDefault" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_745d8f43d3af10ab8247465e450" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_95c93a584de49f0b0e13f75363" ON "addresses"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "ai_diagnoses" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "images" text array NOT NULL DEFAULT '{}', "symptoms" text array NOT NULL DEFAULT '{}', "analysisResult" text NOT NULL, "confidenceScore" double precision NOT NULL, "recommendations" jsonb, "recommendedDoctorIds" integer array NOT NULL DEFAULT '{}', "prescriptionId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f3e2ee5af390139b5bf25eb2fed" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b695bcc34ef950d6feb42f3b5a" ON "ai_diagnoses"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c25bc63d248ca90e8dcc1d92d0" ON "refresh_tokens"  ("tokenHash") `,
    );
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "slug" character varying NOT NULL, "description" character varying, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8b0be371d28245da6e4f4b6187" ON "categories"  ("name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_420d9f679d41281f282f5bc7d0" ON "categories"  ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "brands" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "slug" character varying NOT NULL, "description" character varying, CONSTRAINT "PK_b0c437120b624da1034a81fc561" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_96db6bbbaa6f23cad26871339b" ON "brands"  ("name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b15428f362be2200922952dc26" ON "brands"  ("slug") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_status_enum" AS ENUM('draft', 'published', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" SERIAL NOT NULL, "sku" character varying NOT NULL, "barcode" character varying, "name" character varying NOT NULL, "description" text NOT NULL, "price" double precision NOT NULL, "discount" double precision NOT NULL DEFAULT '0', "brandId" integer, "categoryId" integer, "specifications" jsonb, "instructions" text, "images" text array NOT NULL DEFAULT '{}', "videos" text array NOT NULL DEFAULT '{}', "documents" text array NOT NULL DEFAULT '{}', "seoTitle" character varying, "seoDescription" character varying, "seoKeywords" character varying, "status" "public"."products_status_enum" NOT NULL DEFAULT 'draft', "visibility" boolean NOT NULL DEFAULT true, "isPrescriptionRequired" boolean NOT NULL DEFAULT false, "deletedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c44ac33a05b144dd0d9ddcf932" ON "products"  ("sku") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_adfc522baf9d9b19cd7d9461b7" ON "products"  ("barcode") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."livestock_status_enum" AS ENUM('draft', 'published', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "livestock" ("id" SERIAL NOT NULL, "sellerId" integer NOT NULL, "species" character varying NOT NULL, "breed" character varying NOT NULL, "age" character varying NOT NULL, "weight" double precision NOT NULL, "gender" character varying NOT NULL, "vaccinationHistory" jsonb, "medicalHistory" jsonb, "healthStatus" character varying NOT NULL, "pregnancyStatus" character varying, "certification" character varying, "farmName" character varying NOT NULL, "location" character varying NOT NULL, "images" text array NOT NULL DEFAULT '{}', "videos" text array NOT NULL DEFAULT '{}', "documents" text array NOT NULL DEFAULT '{}', "price" double precision NOT NULL, "isNegotiable" boolean NOT NULL DEFAULT false, "isFeatured" boolean NOT NULL DEFAULT false, "isReserved" boolean NOT NULL DEFAULT false, "isSold" boolean NOT NULL DEFAULT false, "status" "public"."livestock_status_enum" NOT NULL DEFAULT 'draft', "isVerified" boolean NOT NULL DEFAULT false, "deletedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_62bc9a7d8eb727058382a8396fa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e71f6c60cbff8e8e352c342ea1" ON "livestock"  ("sellerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd2e908c9d460d107364314bf8" ON "livestock"  ("species") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_de55c24b40db86800fb0944a2c" ON "livestock"  ("breed") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cart_items" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "productId" integer, "livestockId" integer, "quantity" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6fccf5ec03c172d27a28a82928b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_84e765378a5f03ad9900df3a9b" ON "cart_items"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "clinics" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "name" character varying NOT NULL, "location" character varying NOT NULL, "businessHours" jsonb, "isVerified" boolean NOT NULL DEFAULT false, "rating" double precision NOT NULL DEFAULT '5', "avatar" character varying, "description" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5513b659e4d12b01a8ab3956abc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_items" ("id" SERIAL NOT NULL, "orderId" character varying NOT NULL, "productId" integer, "livestockId" integer, "quantity" integer NOT NULL, "price" double precision NOT NULL, "discount" double precision NOT NULL DEFAULT '0', "name" character varying NOT NULL, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f1d359a55923bb45b057fbdab0" ON "order_items"  ("orderId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."deliveries_status_enum" AS ENUM('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned')`,
    );
    await queryRunner.query(
      `CREATE TABLE "deliveries" ("id" SERIAL NOT NULL, "orderId" character varying NOT NULL, "trackingNumber" character varying NOT NULL, "courierName" character varying NOT NULL, "status" "public"."deliveries_status_enum" NOT NULL DEFAULT 'pending', "timeline" jsonb NOT NULL DEFAULT '[]', "deliveryProofUrl" character varying, "deliveryNotes" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_f7433e3639e213f901e22cf864" UNIQUE ("orderId"), CONSTRAINT "PK_a6ef225c5c5f0974e503bfb731f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f7433e3639e213f901e22cf864" ON "deliveries"  ("orderId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_625c844d5fa30acc79f8121914" ON "deliveries"  ("trackingNumber") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('order', 'booking', 'payment', 'delivery', 'reminder', 'ai_ready', 'prescription_ready', 'promotion', 'system')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "type" "public"."notifications_type_enum" NOT NULL DEFAULT 'system', "referenceType" character varying, "referenceId" character varying, "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_692a909ee0fa9383e7859f9b40" ON "notifications"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'processing', 'successful', 'failed', 'cancelled', 'expired', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" character varying, "bookingId" integer, "userId" integer NOT NULL, "amount" double precision NOT NULL, "provider" character varying NOT NULL, "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'pending', "gatewayTransactionId" character varying, "gatewayMetadata" jsonb, "redirectUrl" character varying, "callbackUrl" character varying, "auditTrail" jsonb NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2fdbbae70ff802bc8b703ee7c5" ON "transactions"  ("orderId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f9ea0e567005f90669eff3cede" ON "transactions"  ("bookingId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6bb58f2b6e30cb51a6504599f4" ON "transactions"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_ledger_movementtype_enum" AS ENUM('addition', 'reservation', 'sale', 'return', 'adjustment')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_ledger" ("id" SERIAL NOT NULL, "productId" integer NOT NULL, "movementType" "public"."inventory_ledger_movementtype_enum" NOT NULL, "quantity" integer NOT NULL, "batchNumber" character varying, "expiryDate" date, "referenceId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_56ba7cef08f3263f90418ddfeef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d597ef0189284a994bdba26283" ON "inventory_ledger"  ("productId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reviews_targettype_enum" AS ENUM('product', 'livestock', 'doctor', 'clinic', 'service')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reviews" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "targetType" "public"."reviews_targettype_enum" NOT NULL, "targetId" character varying NOT NULL, "rating" integer NOT NULL, "text" text NOT NULL, "images" text array NOT NULL DEFAULT '{}', "videos" text array NOT NULL DEFAULT '{}', "reply" text, "helpfulCount" integer NOT NULL DEFAULT '0', "isReported" boolean NOT NULL DEFAULT false, "isApproved" boolean NOT NULL DEFAULT true, "isVerified" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7ed5659e7139fc8bc039198cc1" ON "reviews"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3ecd470866a8915f2c9fd2f507" ON "reviews"  ("targetType", "targetId", "isApproved") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."services_providertype_enum" AS ENUM('doctor', 'clinic', 'ai')`,
    );
    await queryRunner.query(
      `CREATE TABLE "services" ("id" SERIAL NOT NULL, "providerType" "public"."services_providertype_enum" NOT NULL, "providerId" integer NOT NULL, "name" character varying NOT NULL, "description" text NOT NULL, "durationMinutes" integer NOT NULL, "price" double precision NOT NULL, "preparationInstructions" text, "requirements" text, "isOnline" boolean NOT NULL DEFAULT true, "isOffline" boolean NOT NULL DEFAULT false, "location" character varying, "cancellationPolicy" text, "isActive" boolean NOT NULL DEFAULT true, "isRecurring" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b619ef0a4fe392dbde07eee1e" ON "services"  ("providerId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "wishlist_items" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "productId" integer, "livestockId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0bd52924a97cda208ed2a07bd69" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3167e7490f12ed329a36703d98" ON "wishlist_items"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "clinic_doctors" ("clinicId" integer NOT NULL, "doctorId" integer NOT NULL, CONSTRAINT "PK_d2aa06e3ab1055e9f99033780ac" PRIMARY KEY ("clinicId", "doctorId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a2b8dd1e9a951b2127d36a6696" ON "clinic_doctors"  ("clinicId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7f6d1a296e68f92a0a8bbb6aad" ON "clinic_doctors"  ("doctorId") `,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "items"`);
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "clinicId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "serviceId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "price" double precision NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "paymentStatus" character varying NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "paymentTransactionId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "prescription" text`,
    );
    await queryRunner.query(`ALTER TABLE "appointments" ADD "notes" text`);
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "followUpId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD "attachmentUrl" character varying`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_messages_attachmenttype_enum" AS ENUM('image', 'document')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD "attachmentType" "public"."chat_messages_attachmenttype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD "attachmentMimeType" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctors" ADD "qualifications" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctors" ADD "licenseNumber" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctors" ADD "consultationFee" double precision NOT NULL DEFAULT '500'`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctors" ADD "isVerified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "tax" double precision NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "shippingFee" double precision NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "discountAmount" double precision NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "netAmount" double precision NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "deliveryMethod" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "trackingNumber" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "eta" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "deliveryNotes" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'doctor', 'clinic', 'admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING (CASE WHEN "role"::"text" = 'patient' THEN 'user' ELSE "role"::"text" END)::"public"."users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."chat_messages_senderrole_enum" RENAME TO "chat_messages_senderrole_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_messages_senderrole_enum" AS ENUM('user', 'doctor', 'clinic', 'admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ALTER COLUMN "senderRole" TYPE "public"."chat_messages_senderrole_enum" USING (CASE WHEN "senderRole"::"text" = 'patient' THEN 'user' ELSE "senderRole"::"text" END)::"public"."chat_messages_senderrole_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."chat_messages_senderrole_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "deliveryAddress"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "deliveryAddress" jsonb NOT NULL`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_775c9f06fc27ae3ff8fb26f2c4"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "status"`);
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'confirmed', 'preparing', 'packed', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'returned', 'failed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "paymentStatus" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_302009a9251b22c777904d6d7b" ON "users"  ("phone") WHERE "phone" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_040a7ee2072d45bc98efddf3c0" ON "appointments"  ("clinicId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f77953c373efb8ab146d98e90c" ON "appointments"  ("serviceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_775c9f06fc27ae3ff8fb26f2c4" ON "orders"  ("status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" ADD CONSTRAINT "FK_95c93a584de49f0b0e13f753630" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" ADD CONSTRAINT "FK_b695bcc34ef950d6feb42f3b5a3" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_ea86d0c514c4ecbb5694cbf57df" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_ff56834e735fa78a15d0cf21926" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "livestock" ADD CONSTRAINT "FK_e71f6c60cbff8e8e352c342ea1c" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_84e765378a5f03ad9900df3a9ba" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_72679d98b31c737937b8932ebe6" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_25a2e1bf98aa0e643e14bcc22d6" FOREIGN KEY ("livestockId") REFERENCES "livestock"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac010" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_d1bbd89a3a30560ca375df6d761" FOREIGN KEY ("livestockId") REFERENCES "livestock"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ADD CONSTRAINT "FK_f7433e3639e213f901e22cf8640" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_ledger" ADD CONSTRAINT "FK_d597ef0189284a994bdba262835" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_7ed5659e7139fc8bc039198cc1f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" ADD CONSTRAINT "FK_3167e7490f12ed329a36703d980" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" ADD CONSTRAINT "FK_485ece8ab9b569d1c560144aa25" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" ADD CONSTRAINT "FK_2c98082caaf579ed5a0dd057fff" FOREIGN KEY ("livestockId") REFERENCES "livestock"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinic_doctors" ADD CONSTRAINT "FK_a2b8dd1e9a951b2127d36a6696e" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinic_doctors" ADD CONSTRAINT "FK_7f6d1a296e68f92a0a8bbb6aad2" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clinic_doctors" DROP CONSTRAINT "FK_7f6d1a296e68f92a0a8bbb6aad2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinic_doctors" DROP CONSTRAINT "FK_a2b8dd1e9a951b2127d36a6696e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" DROP CONSTRAINT "FK_2c98082caaf579ed5a0dd057fff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" DROP CONSTRAINT "FK_485ece8ab9b569d1c560144aa25"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" DROP CONSTRAINT "FK_3167e7490f12ed329a36703d980"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_7ed5659e7139fc8bc039198cc1f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_ledger" DROP CONSTRAINT "FK_d597ef0189284a994bdba262835"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" DROP CONSTRAINT "FK_f7433e3639e213f901e22cf8640"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_d1bbd89a3a30560ca375df6d761"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_cdb99c05982d5191ac8465ac010"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_25a2e1bf98aa0e643e14bcc22d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_72679d98b31c737937b8932ebe6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_84e765378a5f03ad9900df3a9ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "livestock" DROP CONSTRAINT "FK_e71f6c60cbff8e8e352c342ea1c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_ff56834e735fa78a15d0cf21926"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_ea86d0c514c4ecbb5694cbf57df"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" DROP CONSTRAINT "FK_b695bcc34ef950d6feb42f3b5a3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" DROP CONSTRAINT "FK_95c93a584de49f0b0e13f753630"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_775c9f06fc27ae3ff8fb26f2c4"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_f77953c373efb8ab146d98e90c"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_040a7ee2072d45bc98efddf3c0"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_302009a9251b22c777904d6d7b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "paymentStatus" SET DEFAULT 'Pending'`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "status" character varying NOT NULL DEFAULT 'Placed'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_775c9f06fc27ae3ff8fb26f2c4" ON "orders" USING btree ("status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "deliveryAddress"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "deliveryAddress" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_messages_senderrole_enum_old" AS ENUM('patient', 'doctor', 'admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ALTER COLUMN "senderRole" TYPE "public"."chat_messages_senderrole_enum_old" USING "senderRole"::"text"::"public"."chat_messages_senderrole_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."chat_messages_senderrole_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."chat_messages_senderrole_enum_old" RENAME TO "chat_messages_senderrole_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum_old" AS ENUM('patient', 'doctor', 'admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'patient'`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "deliveryNotes"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "eta"`);
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "trackingNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "deliveryMethod"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "netAmount"`);
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "discountAmount"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "shippingFee"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "tax"`);
    await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN "isVerified"`);
    await queryRunner.query(
      `ALTER TABLE "doctors" DROP COLUMN "consultationFee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctors" DROP COLUMN "licenseNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctors" DROP COLUMN "qualifications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP COLUMN "attachmentMimeType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP COLUMN "attachmentType"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."chat_messages_attachmenttype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP COLUMN "attachmentUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "followUpId"`,
    );
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "notes"`);
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "prescription"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "paymentTransactionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "paymentStatus"`,
    );
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "price"`);
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "serviceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "clinicId"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" ADD "items" jsonb`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7f6d1a296e68f92a0a8bbb6aad"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a2b8dd1e9a951b2127d36a6696"`,
    );
    await queryRunner.query(`DROP TABLE "clinic_doctors"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3167e7490f12ed329a36703d98"`,
    );
    await queryRunner.query(`DROP TABLE "wishlist_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8b619ef0a4fe392dbde07eee1e"`,
    );
    await queryRunner.query(`DROP TABLE "services"`);
    await queryRunner.query(`DROP TYPE "public"."services_providertype_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3ecd470866a8915f2c9fd2f507"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7ed5659e7139fc8bc039198cc1"`,
    );
    await queryRunner.query(`DROP TABLE "reviews"`);
    await queryRunner.query(`DROP TYPE "public"."reviews_targettype_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d597ef0189284a994bdba26283"`,
    );
    await queryRunner.query(`DROP TABLE "inventory_ledger"`);
    await queryRunner.query(
      `DROP TYPE "public"."inventory_ledger_movementtype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6bb58f2b6e30cb51a6504599f4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9ea0e567005f90669eff3cede"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2fdbbae70ff802bc8b703ee7c5"`,
    );
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_692a909ee0fa9383e7859f9b40"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_625c844d5fa30acc79f8121914"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f7433e3639e213f901e22cf864"`,
    );
    await queryRunner.query(`DROP TABLE "deliveries"`);
    await queryRunner.query(`DROP TYPE "public"."deliveries_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f1d359a55923bb45b057fbdab0"`,
    );
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "clinics"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_84e765378a5f03ad9900df3a9b"`,
    );
    await queryRunner.query(`DROP TABLE "cart_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_de55c24b40db86800fb0944a2c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dd2e908c9d460d107364314bf8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e71f6c60cbff8e8e352c342ea1"`,
    );
    await queryRunner.query(`DROP TABLE "livestock"`);
    await queryRunner.query(`DROP TYPE "public"."livestock_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_adfc522baf9d9b19cd7d9461b7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c44ac33a05b144dd0d9ddcf932"`,
    );
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TYPE "public"."products_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b15428f362be2200922952dc26"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_96db6bbbaa6f23cad26871339b"`,
    );
    await queryRunner.query(`DROP TABLE "brands"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_420d9f679d41281f282f5bc7d0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8b0be371d28245da6e4f4b6187"`,
    );
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c25bc63d248ca90e8dcc1d92d0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_610102b60fea1455310ccd299d"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b695bcc34ef950d6feb42f3b5a"`,
    );
    await queryRunner.query(`DROP TABLE "ai_diagnoses"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_95c93a584de49f0b0e13f75363"`,
    );
    await queryRunner.query(`DROP TABLE "addresses"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a000cca60bcf04454e72769949" ON "users" USING btree ("phone") `,
    );
  }
}
