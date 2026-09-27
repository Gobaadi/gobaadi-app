import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  Admin,
  AdminRole,
  AdminDesignation,
  AdminStatus,
} from './entities/admin.entity';
import { PaginatedResult } from '../common/paginated-result.interface';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<PaginatedResult<Admin>> {
    const where = search
      ? [{ name: ILike(`%${search}%`) }, { email: ILike(`%${search}%`) }]
      : {};
    const [data, total] = await this.adminRepository.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, page, limit, total };
  }

  async findById(id: number): Promise<Admin> {
    const admin = await this.adminRepository.findOneBy({ id });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    return admin;
  }

  async findByEmail(email: string): Promise<Admin | null> {
    return this.adminRepository.findOneBy({ email });
  }

  async create(dto: {
    name?: string;
    email: string;
    password: string;
    role?: AdminRole;
    designation: AdminDesignation;
    avatar?: string;
    status?: AdminStatus;
  }): Promise<Admin> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.adminRepository.findOneBy({
      email,
    });
    if (existing) {
      throw new ConflictException('An admin with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const admin = this.adminRepository.create({
      name: dto.name?.trim(),
      email,
      password: passwordHash,
      role: dto.role || AdminRole.ADMIN,
      designation: dto.designation,
      avatar: dto.avatar,
      status: dto.status || AdminStatus.ACTIVE,
      verified: true,
    });
    const saved = await this.adminRepository.save(admin);
    const { password, ...safe } = saved;
    void password;
    return safe as Admin;
  }

  async update(
    id: number,
    dto: {
      name?: string;
      email?: string;
      password?: string;
      role?: AdminRole;
      designation?: AdminDesignation;
      avatar?: string;
      status?: AdminStatus;
    },
  ): Promise<Admin> {
    const admin = await this.adminRepository.findOneBy({ id });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const { password, ...rest } = dto;
    if (rest.email !== undefined) {
      const newEmail = rest.email.trim().toLowerCase();
      if (newEmail !== admin.email) {
        const existing = await this.adminRepository.findOneBy({
          email: newEmail,
        });
        if (existing) {
          throw new ConflictException('Email already in use');
        }
        rest.email = newEmail;
      } else {
        delete rest.email;
      }
    }

    Object.assign(admin, rest);
    if (password) {
      admin.password = await bcrypt.hash(password, 10);
    }
    const saved = await this.adminRepository.save(admin);
    const { password: savedPassword, ...safe } = saved;
    void savedPassword;
    return safe as Admin;
  }

  async delete(id: number): Promise<{ success: boolean }> {
    const admin = await this.adminRepository.findOneBy({ id });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    await this.adminRepository.remove(admin);
    return { success: true };
  }

  async deactivate(id: number): Promise<Admin> {
    const admin = await this.adminRepository.findOneBy({ id });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    admin.status =
      admin.status === AdminStatus.ACTIVE
        ? AdminStatus.DEACTIVE
        : AdminStatus.ACTIVE;
    return this.adminRepository.save(admin);
  }
}
