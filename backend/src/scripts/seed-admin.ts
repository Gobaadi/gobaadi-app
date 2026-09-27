import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  Admin,
  AdminRole,
  AdminDesignation,
  AdminStatus,
} from '../admin/entities/admin.entity';
import { User, UserRole } from '../users/user.entity';

const SEED_PASSWORD = 'Password123!';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgrespassword',
    database: process.env.DB_DATABASE || 'gobadi',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [Admin, User],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('Database connected for seeding...');

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  // Seed super_admin
  const adminRepo = dataSource.getRepository(Admin);
  const existingAdmin = await adminRepo.findOneBy({
    email: 'admin@gobadi.com',
  });

  if (!existingAdmin) {
    await adminRepo.save({
      name: 'Super Admin',
      email: 'admin@gobadi.com',
      password: passwordHash,
      role: AdminRole.SUPER_ADMIN,
      designation: AdminDesignation.FOUNDER,
      verified: true,
      status: AdminStatus.ACTIVE,
    });
    console.log('✓ Super Admin seeded: admin@gobadi.com / ' + SEED_PASSWORD);
  } else {
    console.log('• Super Admin already exists, skipping.');
  }

  await dataSource.destroy();
  console.log('Seeding completed!');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
