import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Animal } from '../animals/animal.entity';
import { Doctor } from '../doctors/doctor.entity';
import { Availability } from '../doctors/availability.entity';
import { ChatMessage, MessageStatus } from '../chat/chat-message.entity';
import { Conversation } from '../chat/conversation.entity';
import { User, UserRole } from '../users/user.entity';
import {
  Admin,
  AdminRole,
  AdminDesignation,
  AdminStatus,
} from '../admin/entities/admin.entity';

import { Category } from '../products/category.entity';
import { Brand } from '../products/brand.entity';
import { Product } from '../products/product.entity';
import {
  InventoryLedger,
  InventoryMovementType,
} from '../products/inventory-ledger.entity';
import { Livestock, LivestockStatus } from '../livestock/livestock.entity';
import { Clinic } from '../clinics/clinic.entity';
import { Service, ProviderType } from '../services/service.entity';
import { Address } from '../addresses/address.entity';
import { CartItem } from '../cart/cart-item.entity';
import { WishlistItem } from '../wishlist/wishlist-item.entity';
import { Order, OrderStatus } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';
import { Transaction, PaymentStatus } from '../payments/transaction.entity';
import { Delivery, DeliveryStatus } from '../delivery/delivery.entity';
import { Review, ReviewTargetType } from '../reviews/review.entity';
import {
  Notification,
  NotificationType,
} from '../notifications/notification.entity';
import { AiDiagnosis } from '../ai-diagnosis/ai-diagnosis.entity';
import { Faq } from '../faqs/faq.entity';
import { Medicine } from '../medicines/medicine.entity';

export const SEED_PASSWORD = 'Password123!';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(InventoryLedger)
    private readonly ledgerRepository: Repository<InventoryLedger>,
    @InjectRepository(Livestock)
    private readonly livestockRepository: Repository<Livestock>,
    @InjectRepository(Clinic)
    private readonly clinicRepository: Repository<Clinic>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(WishlistItem)
    private readonly wishlistItemRepository: Repository<WishlistItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(AiDiagnosis)
    private readonly aiDiagnosisRepository: Repository<AiDiagnosis>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Faq)
    private readonly faqRepository: Repository<Faq>,
    @InjectRepository(Medicine)
    private readonly medicineRepository: Repository<Medicine>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedFaqs();
    } catch (err) {
      this.logger.error('Failed to seed FAQs', err);
    }
    try {
      await this.seedMedicines();
    } catch (err) {
      this.logger.error('Failed to seed medicines', err);
    }
    try {
      await this.seedAdmins();
    } catch (err) {
      this.logger.error('Failed to seed admin accounts', err);
    }
  }

  private async backfillDemoLoginCredentials(): Promise<void> {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    // Covers both: (a) rows from an older seed run that predate a field, and
    // (b) roles (clinic/admin) added to seedUsers() after this database's
    // initial "if count === 0" seed already ran, so they were never created.
    const demoAccounts: Array<{
      phone: string;
      email: string;
      role: UserRole;
      name: string;
    }> = [
      {
        phone: '+8801700000001',
        email: 'doctor@gobadi.test',
        role: UserRole.DOCTOR,
        name: 'Dr. Michael Wilson',
      },
      {
        phone: '+8801800000001',
        email: 'patient@gobadi.test',
        role: UserRole.USER,
        name: 'Test Farmer Patient',
      },
      {
        phone: '+8801800000002',
        email: 'clinic@gobadi.test',
        role: UserRole.CLINIC,
        name: 'Savar Clinic Manager',
      },
      {
        phone: '+8801900000001',
        email: 'admin@gobadi.test',
        role: UserRole.ADMIN,
        name: 'Admin Supervisor',
      },
    ];
    let backfilled = false;
    for (const account of demoAccounts) {
      const user = await this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.phone = :phone', { phone: account.phone })
        .getOne();
      if (!user) {
        await this.userRepository.save({
          phone: account.phone,
          email: account.email,
          role: account.role,
          name: account.name,
          password: passwordHash,
          verified: true,
        });
        backfilled = true;
      } else if (!user.password || user.role !== account.role) {
        await this.userRepository.update(user.id, {
          email: user.email ?? account.email,
          role: account.role,
          password: passwordHash,
          verified: true,
        });
        backfilled = true;
      }
    }
    if (backfilled) {
      this.logger.log(
        `Backfilled demo login credentials for doctor@gobadi.test, patient@gobadi.test, ` +
          `clinic@gobadi.test, admin@gobadi.test — password: ${SEED_PASSWORD}`,
      );
    }
  }

  private async seedUsers(): Promise<User[]> {
    const count = await this.userRepository.count();
    if (count === 0) {
      this.logger.log('Seeding users...');
      const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
      const users = await this.userRepository.save([
        {
          phone: '+8801700000001',
          email: 'doctor@gobadi.test',
          role: UserRole.DOCTOR,
          name: 'Dr. Michael Wilson',
          password: passwordHash,
          verified: true,
        },
        {
          phone: '+8801700000002',
          role: UserRole.DOCTOR,
          name: 'Dr. Jessica Taylor',
          password: passwordHash,
          verified: true,
        },
        {
          phone: '+8801800000001',
          email: 'patient@gobadi.test',
          role: UserRole.USER,
          name: 'Test Farmer Patient',
          password: passwordHash,
          verified: true,
        },
        {
          phone: '+8801800000002',
          role: UserRole.CLINIC,
          name: 'Savar Clinic Manager',
          password: passwordHash,
          verified: true,
        },
        {
          phone: '+8801900000001',
          role: UserRole.ADMIN,
          name: 'Admin Supervisor',
          password: passwordHash,
          verified: true,
        },
      ]);
      return users;
    }
    return this.userRepository.find();
  }

  private async seedDoctors(users: User[]): Promise<Doctor[]> {
    const count = await this.doctorRepository.count();
    if (count === 0) {
      this.logger.log('Seeding doctors...');
      const doctorUsers = users.filter((u) => u.role === UserRole.DOCTOR);
      return this.doctorRepository.save([
        {
          userId: doctorUsers[0]?.id ?? null,
          name: 'Dr. Michael Wilson',
          specialty: 'Veterinary Surgeon',
          experience: '8 Years',
          rating: 4.8,
          avatar: 'michael_doctor.png',
          bio: 'Dr. Michael has spent over 8 years caring for farm animals, specialized in large cattle surgery and herd management.',
          qualifications: ['DVM, BAU', 'MS in Large Animal Surgery'],
          licenseNumber: 'VET-LIC-8821',
          location: 'Uttar Badda, Dhaka',
          consultationFee: 800,
          isVerified: true,
        },
        {
          userId: doctorUsers[1]?.id ?? null,
          name: 'Dr. Jessica Taylor',
          specialty: 'Animal Nutritionist',
          experience: '6 Years',
          rating: 4.9,
          avatar: 'jessica_doctor.png',
          bio: 'Dr. Jessica specializes in optimal nutrition and disease prevention for cows, goats, and sheep.',
          qualifications: ['DVM, BAU', 'MS in Animal Nutrition'],
          licenseNumber: 'VET-LIC-9932',
          location: 'Dhanmondi, Dhaka',
          consultationFee: 600,
          isVerified: true,
        },
      ]);
    }
    return this.doctorRepository.find();
  }

  private async seedAvailability(): Promise<void> {
    const count = await this.availabilityRepository.count();
    if (count === 0) {
      this.logger.log('Seeding doctor availability (Mon-Fri, 09:00-17:00)...');
      const doctors = await this.doctorRepository.find();
      const weekdays = [1, 2, 3, 4, 5]; // Mon-Fri
      const entries = doctors.flatMap((doctor) =>
        weekdays.map((dayOfWeek) => ({
          doctorId: doctor.id,
          dayOfWeek,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMinutes: 30,
          bufferMinutes: 10,
        })),
      );
      await this.availabilityRepository.save(entries);
    }
  }

  private async seedAnimals() {
    const count = await this.animalRepository.count();
    if (count === 0) {
      this.logger.log('Seeding animals...');
      await this.animalRepository.save([
        {
          name: 'Donald Tramp',
          breed: 'Albino Buffalo',
          weight: '725 Kg',
          age: '28 Months',
          color: 'Pinkish White',
        },
        {
          name: 'Kabir Cow',
          breed: 'Bangladeshi Cow',
          weight: '650 Kg',
          age: '24 Months',
          color: 'Brown',
        },
      ]);
    }
  }

  private async seedCategoriesAndBrandsAndProducts() {
    const catCount = await this.categoryRepository.count();
    if (catCount === 0) {
      this.logger.log('Seeding products, categories, and brands...');
      const cats = await this.categoryRepository.save([
        {
          name: 'Medicine & Vaccines',
          slug: 'medicine-vaccines',
          description: 'Antibiotics, vaccines, and supplements',
        },
        {
          name: 'Feeds & Supplements',
          slug: 'feeds-supplements',
          description: 'Animal feeds, bhushi, and growth boosters',
        },
        {
          name: 'Tools & Accessories',
          slug: 'tools-accessories',
          description: 'Ear tags, milk pails, and farm machinery',
        },
      ]);

      const brands = await this.brandRepository.save([
        {
          name: 'Renata Animal Health',
          slug: 'renata-animal-health',
          logo: 'renata.png',
          website: 'https://renata-ltd.com',
        },
        {
          name: 'ACI Animal Health',
          slug: 'aci-animal-health',
          logo: 'aci.png',
          website: 'https://aci-bd.com',
        },
        {
          name: 'Square Vet',
          slug: 'square-vet',
          logo: 'square.png',
          website: 'https://squarepharma.com.bd',
        },
      ]);

      const prods = await this.productRepository.save([
        {
          name: 'Renadex Injection 100ml',
          sku: 'MED-REN-001',
          price: 260,
          discount: 15,
          images: ['renadex.png'],
          description:
            'Effective rehydration and support injection for weak cattle.',
          categoryId: cats[0].id,
          brandId: brands[0].id,
          isPublished: true,
        },
        {
          name: 'ACI Cattle Feed Premium Mix 25kg',
          sku: 'FED-ACI-002',
          price: 1350,
          discount: 50,
          images: ['cattle_feed.png'],
          description:
            'Balanced feed formulated to boost milk production in dairy cows.',
          categoryId: cats[1].id,
          brandId: brands[1].id,
          isPublished: true,
        },
        {
          name: 'Square Dewormer Bolus',
          sku: 'MED-SQ-003',
          price: 45,
          discount: 0,
          images: ['dewormer.png'],
          description: 'Broad spectrum dewormer tablet for goats and cows.',
          categoryId: cats[0].id,
          brandId: brands[2].id,
          isPublished: true,
        },
      ]);

      // Seed initial stock ledger additions
      const stockAdditions = [
        {
          productId: prods[0].id,
          quantity: 150,
          movementType: InventoryMovementType.ADDITION,
          description: 'Initial import stock',
        },
        {
          productId: prods[1].id,
          quantity: 80,
          movementType: InventoryMovementType.ADDITION,
          description: 'Initial warehouse arrival',
        },
        {
          productId: prods[2].id,
          quantity: 1200,
          movementType: InventoryMovementType.ADDITION,
          description: 'Initial pharmacy stock',
        },
      ];
      await this.ledgerRepository.save(stockAdditions);
    }
  }

  private async seedClinicsAndServices(users: User[], doctors: Doctor[]) {
    const count = await this.clinicRepository.count();
    if (count === 0) {
      this.logger.log('Seeding clinics and consultation services...');
      const clinicManager =
        users.find((u) => u.role === UserRole.CLINIC) || users[0];

      const clinic = await this.clinicRepository.save({
        userId: clinicManager.id,
        name: 'Savar Central Veterinary Clinic',
        location: 'Dhaka - Aricha Hwy, Savar',
        description:
          'Comprehensive medical care, diagnostic lab, and surgery suite for all livestock species.',
        isVerified: true,
        rating: 4.9,
        avatar: 'savar_clinic.png',
        businessHours: { mon_fri: '08:00 - 20:00', sat_sun: '09:00 - 15:00' },
        doctors, // Link seeded doctors
      });

      // Seed consulting services
      await this.serviceRepository.save([
        {
          providerType: ProviderType.CLINIC,
          providerId: clinic.id,
          name: 'Cattle Vaccination & Deworming Package',
          description: 'Full herd diagnostic and immunization package.',
          price: 1800,
          durationMinutes: 45,
          isOnline: false,
          isOffline: true,
          location: clinic.location,
          isActive: true,
        },
        {
          providerType: ProviderType.DOCTOR,
          providerId: doctors[0].id,
          name: 'Large Cattle Surgical Consult',
          description:
            'Emergency and scheduled surgical consultation for cattle.',
          price: 1000,
          durationMinutes: 30,
          isOnline: true,
          isOffline: true,
          isActive: true,
        },
      ]);
    }
  }

  private async seedLivestock(users: User[]) {
    const count = await this.livestockRepository.count();
    if (count === 0) {
      this.logger.log('Seeding livestock marketplace listings...');
      const farmer = users.find((u) => u.role === UserRole.USER) || users[0];

      await this.livestockRepository.save([
        {
          sellerId: farmer.id,
          species: 'cow',
          breed: 'Friesian Crossbreed',
          price: 320000,
          age: '24 Months',
          weight: 520,
          gender: 'male',
          images: ['friesian_cow.jpg'],
          videos: [],
          location: 'Savar, Dhaka',
          isSold: false,
          isReserved: false,
          status: LivestockStatus.PUBLISHED,
          healthStatus: 'Healthy',
          farmName: 'Savar Dairy Farm',
          createdAt: new Date(),
        },
        {
          sellerId: farmer.id,
          species: 'goat',
          breed: 'Black Bengal',
          price: 28000,
          age: '12 Months',
          weight: 38,
          gender: 'female',
          images: ['black_bengal_goat.jpg'],
          videos: [],
          location: 'Manikganj, Dhaka',
          isSold: false,
          isReserved: false,
          status: LivestockStatus.PUBLISHED,
          healthStatus: 'Healthy',
          farmName: 'Black Bengal Farm',
          createdAt: new Date(),
        },
      ]);
    }
  }

  private async seedChatMessages(users: User[]) {
    const count = await this.chatMessageRepository.count();
    if (count === 0) {
      const doctor = await this.doctorRepository.findOne({
        where: {},
        order: { id: 'ASC' },
      });
      const patient = users.find((u) => u.role === UserRole.USER);
      if (!doctor || !patient) {
        return;
      }

      this.logger.log('Seeding a demo conversation and chat messages...');
      const conversation = await this.conversationRepository.save({
        doctorId: doctor.id,
        doctorUserId: doctor.userId ?? null,
        patientId: patient.id,
        lastMessageAt: new Date(),
      });

      await this.chatMessageRepository.save([
        {
          conversationId: conversation.id,
          senderId: doctor.userId ?? doctor.id,
          senderRole: UserRole.DOCTOR,
          text: 'Hello, how can I help you and your animal today?',
          status: MessageStatus.READ,
        },
        {
          conversationId: conversation.id,
          senderId: patient.id,
          senderRole: UserRole.USER,
          text: 'Thank you for reaching out!\nWe are looking for a surgery.',
          status: MessageStatus.DELIVERED,
        },
      ]);
    }
  }

  private async seedCommerceAndEngagementData(
    users: User[],
    doctors: Doctor[],
  ) {
    const count = await this.addressRepository.count();
    if (count > 0) {
      return;
    }

    const farmer = users.find((u) => u.role === UserRole.USER) || users[0];
    const product = await this.productRepository.findOne({
      where: {},
      order: { id: 'ASC' },
    });
    const livestock = await this.livestockRepository.findOne({
      where: {},
      order: { id: 'ASC' },
    });
    const doctor = doctors[0];
    if (!product || !livestock || !doctor) {
      return;
    }

    this.logger.log(
      'Seeding addresses, cart, wishlist, an order, and engagement data...',
    );

    await this.addressRepository.save([
      {
        userId: farmer.id,
        label: 'Home',
        contactName: farmer.name || 'Test Farmer',
        phone: farmer.phone || '+8801800000001',
        division: 'Dhaka',
        district: 'Dhaka',
        upazila: 'Mirpur',
        postalCode: '1216',
        isDefault: true,
      },
      {
        userId: farmer.id,
        label: 'Farm',
        contactName: farmer.name || 'Test Farmer',
        phone: farmer.phone || '+8801800000001',
        division: 'Dhaka',
        district: 'Savar',
        upazila: 'Savar Sadar',
        postalCode: '1340',
        isDefault: false,
      },
    ]);

    await this.cartItemRepository.save([
      { userId: farmer.id, productId: product.id, quantity: 2 },
    ]);

    await this.wishlistItemRepository.save([
      { userId: farmer.id, livestockId: livestock.id },
    ]);

    const orderId = `GBD-${Date.now().toString(36).toUpperCase()}`;
    const itemPrice = product.price;
    const itemQuantity = 1;
    const subtotal = itemPrice * itemQuantity;
    const tax = Math.round(subtotal * 0.05);
    const shippingFee = 100;
    const netAmount = subtotal + tax + shippingFee;

    await this.orderRepository.save({
      id: orderId,
      userId: farmer.id,
      totalPrice: subtotal,
      tax,
      shippingFee,
      discountAmount: 0,
      netAmount,
      deliveryAddress: {
        label: 'Home',
        contactName: farmer.name || 'Test Farmer',
        phone: farmer.phone || '+8801800000001',
        division: 'Dhaka',
        district: 'Dhaka',
        upazila: 'Mirpur',
        postalCode: '1216',
        addressLine: 'Road# 9, house# 5, Lane#3, Mirpur 11/a',
      },
      deliveryMethod: 'standard',
      status: OrderStatus.DELIVERED,
      paymentStatus: 'successful',
    });

    await this.orderItemRepository.save({
      orderId,
      productId: product.id,
      quantity: itemQuantity,
      price: itemPrice,
      discount: product.discount || 0,
      name: product.name,
    });

    await this.transactionRepository.save({
      orderId,
      userId: farmer.id,
      amount: netAmount,
      provider: 'simulate',
      status: PaymentStatus.SUCCESSFUL,
      gatewayTransactionId: `SIM-${orderId}`,
      auditTrail: [{ status: PaymentStatus.SUCCESSFUL, timestamp: new Date() }],
    });

    await this.deliveryRepository.save({
      orderId,
      trackingNumber: `TRK-${orderId}`,
      courierName: 'Gobadi Logistics',
      status: DeliveryStatus.DELIVERED,
      timeline: [
        {
          status: DeliveryStatus.PENDING,
          timestamp: new Date(),
          description: 'Order placed',
        },
        {
          status: DeliveryStatus.DELIVERED,
          timestamp: new Date(),
          description: 'Delivered to customer',
        },
      ],
    });

    await this.reviewRepository.save([
      {
        userId: farmer.id,
        targetType: ReviewTargetType.PRODUCT,
        targetId: String(product.id),
        rating: 5,
        text: 'Worked great for my herd, will buy again.',
        isVerified: true,
      },
      {
        userId: farmer.id,
        targetType: ReviewTargetType.DOCTOR,
        targetId: String(doctor.id),
        rating: 5,
        text: 'Very knowledgeable and responsive, highly recommend.',
        isVerified: true,
      },
    ]);

    await this.notificationRepository.save([
      {
        userId: farmer.id,
        title: 'Order delivered',
        body: `Your order ${orderId} has been delivered.`,
        type: NotificationType.DELIVERY,
        referenceType: 'Order',
        referenceId: orderId,
        isRead: false,
      },
      {
        userId: farmer.id,
        title: 'AI diagnosis ready',
        body: 'Your animal health scan results are ready to view.',
        type: NotificationType.AI_READY,
        isRead: false,
      },
    ]);

    await this.aiDiagnosisRepository.save({
      userId: farmer.id,
      images: [],
      symptoms: ['visual_scan'],
      analysisResult: 'Possible early-stage Foot and Mouth Disease detected',
      confidenceScore: 0.82,
      recommendations: [
        'Quarantine the herd',
        'Contact a veterinarian immediately',
      ],
      recommendedDoctorIds: [doctor.id],
    });
  }

  private async seedAdmins(): Promise<void> {
    const count = await this.adminRepository.count();
    if (count === 0) {
      this.logger.log('Seeding admin accounts...');
      const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
      await this.adminRepository.save([
        {
          name: 'Super Admin',
          email: 'superadmin@gobadi.com',
          password: passwordHash,
          role: AdminRole.SUPER_ADMIN,
          designation: AdminDesignation.MANAGER,
          verified: true,
          status: AdminStatus.ACTIVE,
        },
        {
          name: 'Admin',
          email: 'admin@gobadi.com',
          password: passwordHash,
          role: AdminRole.ADMIN,
          designation: AdminDesignation.SUPPORT,
          verified: true,
          status: AdminStatus.ACTIVE,
        },
      ]);
      this.logger.log(
        'Seeded superadmin@gobadi.com and admin@gobadi.com — password: ' +
          SEED_PASSWORD,
      );
    }
  }

  async seedFaqs(): Promise<void> {
    const count = await this.faqRepository.count();
    if (count > 0) {
      this.logger.log('FAQs already seeded, skipping.');
      return;
    }

    this.logger.log('Seeding FAQs...');

    const faqs = [
      // General
      {
        question: 'What is the Smart Farming App?',
        answer:
          'The Smart Farming App helps farmers manage daily agricultural activities such as crop planning, weather tracking, pest alerts, marketplace trading, and equipment sharing—all in one place.',
        category: 'general',
        sortOrder: 1,
      },
      {
        question: 'How accurate is the weather forecast?',
        answer:
          'Our weather forecasts are powered by trusted meteorological data sources and are updated in real-time. While we strive for high accuracy, local conditions may vary, so we recommend using forecasts as a guiding tool alongside your own observations.',
        category: 'general',
        sortOrder: 2,
      },
      {
        question: 'How can I add my farm or field details?',
        answer:
          'Go to the Profile tab, tap on your farm section, and fill in the required details such as farm name, location, size, and crop types. You can update this information anytime.',
        category: 'general',
        sortOrder: 3,
      },
      {
        question: 'Can I share my equipment with others?',
        answer:
          'Yes! The app has an equipment sharing feature where you can list your unused tools and machinery for other farmers to rent or borrow. Go to the Marketplace section to get started.',
        category: 'general',
        sortOrder: 4,
      },

      // Doctor Connection
      {
        question: 'How do I connect with a veterinarian?',
        answer:
          'Navigate to the Doctors tab, browse available veterinarians, check their ratings and availability, and book a consultation directly through the app.',
        category: 'doctor',
        sortOrder: 1,
      },
      {
        question: 'Can I have video consultations with doctors?',
        answer:
          'Yes, the app supports video call consultations with verified veterinarians. Simply book a video appointment and join at the scheduled time from the app.',
        category: 'doctor',
        sortOrder: 2,
      },
      {
        question: 'What if the doctor is unavailable?',
        answer:
          'If your preferred doctor is unavailable, you can check other available veterinarians or book an appointment for a later date. You can also set up notifications to be alerted when the doctor becomes available.',
        category: 'doctor',
        sortOrder: 3,
      },
      {
        question: 'How are consultation fees determined?',
        answer:
          'Consultation fees are set by each veterinarian based on their specialty, experience, and consultation type. Fees are displayed before you confirm any booking.',
        category: 'doctor',
        sortOrder: 4,
      },

      // Photo Diagnosis
      {
        question: 'How does the AI photo diagnosis work?',
        answer:
          'Simply upload a photo of your animal showing any symptoms. Our AI system analyzes the image and provides a preliminary diagnosis along with recommended actions. For confirmation, consult a veterinarian.',
        category: 'photo',
        sortOrder: 1,
      },
      {
        question: 'Is the AI diagnosis accurate?',
        answer:
          'Our AI model is trained on thousands of veterinary images and provides a confidence score with each diagnosis. While it is highly accurate for common conditions, it should be used as a preliminary screening tool, not a replacement for professional veterinary advice.',
        category: 'photo',
        sortOrder: 2,
      },
      {
        question: 'What types of animals can be diagnosed?',
        answer:
          'The AI photo diagnosis supports cattle (cows, buffalo), goats, and other common livestock animals. The system continuously improves and adds support for more species over time.',
        category: 'photo',
        sortOrder: 3,
      },
      {
        question: 'Can I save diagnosis results for my vet?',
        answer:
          'Yes, all diagnosis results are saved in your medical records. You can share them with your veterinarian during consultations for better treatment planning.',
        category: 'photo',
        sortOrder: 4,
      },
    ];

    for (const faq of faqs) {
      await this.faqRepository.save(this.faqRepository.create(faq));
    }

    this.logger.log(`Seeded ${faqs.length} FAQs across 3 categories.`);
  }

  async seedMedicines(): Promise<void> {
    const medicines: Array<{ name: string; type: string; sortOrder: number }> =
      [
        {
          name: 'Enrofloxacin 10% Injection',
          type: 'Antibiotic',
          sortOrder: 1,
        },
        { name: 'Amoxicillin 15% Injection', type: 'Antibiotic', sortOrder: 2 },
        {
          name: 'Oxytetracycline 20% Injection',
          type: 'Antibiotic',
          sortOrder: 3,
        },
        {
          name: 'Tylosin Tartrate Injection',
          type: 'Antibiotic',
          sortOrder: 4,
        },
        { name: 'Ceftriaxone Injection', type: 'Antibiotic', sortOrder: 5 },
        {
          name: 'Penicillin-Streptomycin Injection',
          type: 'Antibiotic',
          sortOrder: 6,
        },
        {
          name: 'Sulphachloropyridazine Premix',
          type: 'Antibiotic',
          sortOrder: 7,
        },
        { name: 'Neomycin Oral Solution', type: 'Antibiotic', sortOrder: 8 },
        {
          name: 'Ivermectin 1% Injection',
          type: 'Antiparasitic',
          sortOrder: 9,
        },
        { name: 'Albendazole Tablet', type: 'Antiparasitic', sortOrder: 10 },
        {
          name: 'Fenbendazole Oral Suspension',
          type: 'Antiparasitic',
          sortOrder: 11,
        },
        { name: 'Praziquantel Tablet', type: 'Antiparasitic', sortOrder: 12 },
        {
          name: 'Levamisole Oral Solution',
          type: 'Antiparasitic',
          sortOrder: 13,
        },
        { name: 'Closantel Suspension', type: 'Antiparasitic', sortOrder: 14 },
        {
          name: 'Meloxicam Injection',
          type: 'Anti-inflammatory',
          sortOrder: 15,
        },
        {
          name: 'Flunixin Meglumine Injection',
          type: 'Anti-inflammatory',
          sortOrder: 16,
        },
        {
          name: 'Diclofenac Sodium Injection',
          type: 'Anti-inflammatory',
          sortOrder: 17,
        },
        { name: 'Prednisolone Tablet', type: 'Corticosteroid', sortOrder: 18 },
        {
          name: 'Chlorpheniramine Maleate Injection',
          type: 'Antihistamine',
          sortOrder: 19,
        },
        { name: 'Vitamin ADE Injection', type: 'Vitamin', sortOrder: 20 },
        { name: 'Vitamin B-Complex Injection', type: 'Vitamin', sortOrder: 21 },
        {
          name: 'Calcium Borogluconate Injection',
          type: 'Supplement',
          sortOrder: 22,
        },
        {
          name: 'Selenium + Vitamin E Injection',
          type: 'Supplement',
          sortOrder: 23,
        },
        { name: 'Nystatin Ointment', type: 'Antifungal', sortOrder: 24 },
        { name: 'Griseofulvin Tablet', type: 'Antifungal', sortOrder: 25 },
        {
          name: 'Antipyretic Paracetamol Suspension',
          type: 'Antipyretic',
          sortOrder: 26,
        },
      ];

    if ((await this.medicineRepository.count()) > 0) {
      this.logger.log('Medicines already seeded, skipping.');
      return;
    }

    for (const medicine of medicines) {
      await this.medicineRepository.save(
        this.medicineRepository.create(medicine),
      );
    }

    this.logger.log(`Seeded ${medicines.length} medicines.`);
  }
}
