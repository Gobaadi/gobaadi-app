import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import { Doctor } from './doctor.entity';
import { Availability } from './availability.entity';
import { User } from '../users/user.entity';
import { Review, ReviewTargetType } from '../reviews/review.entity';
import { PaginatedResult } from '../common/paginated-result.interface';
import { MeilisearchService } from '../meilisearch/meilisearch.service';
import { S3Service } from '../s3/s3.service';
import { UpdateSingleDayDto } from './dto/update-single-day.dto';
export { Doctor } from './doctor.entity';
export { Availability } from './availability.entity';

const DOCTORS_INDEX = 'doctors';

export interface AvailabilityEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
  bufferMinutes?: number;
}

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly meilisearchService: MeilisearchService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Counts approved reviews per doctor in a single grouped query and
   * returns a Map keyed by doctor id. Doctors with no reviews are
   * absent from the map.
   */
  private async getReviewCounts(
    doctorIds: number[],
  ): Promise<Map<number, number>> {
    if (doctorIds.length === 0) {
      return new Map();
    }
    const rows: Array<{ targetId: string; count: string }> = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.targetId', 'targetId')
      .addSelect('COUNT(*)', 'count')
      .where('review.targetType = :targetType', {
        targetType: ReviewTargetType.DOCTOR,
      })
      .andWhere('review.isApproved = true')
      .andWhere('review.targetId IN (:...doctorIds)', {
        doctorIds: doctorIds.map(String),
      })
      .groupBy('review.targetId')
      .getRawMany();
    const counts = new Map<number, number>();
    for (const row of rows) {
      counts.set(parseInt(row.targetId, 10), parseInt(row.count, 10));
    }
    return counts;
  }

  async getDoctors(
    page?: number,
    limit?: number,
    specialty?: string,
  ): Promise<(Doctor & { reviewCount: number })[] | PaginatedResult<Doctor & { reviewCount: number }>> {
    const where = specialty ? { specialty: ILike(`%${specialty}%`) } : {};
    if (!page && !limit) {
      const doctors = await this.doctorRepository.find({ where, order: { id: 'ASC' } });
      const counts = await this.getReviewCounts(doctors.map((d) => d.id));
      return doctors.map((d) => ({ ...d, reviewCount: counts.get(d.id) ?? 0 }));
    }
    const currentPage = page && page > 0 ? page : 1;
    const pageSize = limit && limit > 0 ? limit : 20;
    const [data, total] = await this.doctorRepository.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    });
    const counts = await this.getReviewCounts(data.map((d) => d.id));
    return {
      data: data.map((d) => ({ ...d, reviewCount: counts.get(d.id) ?? 0 })),
      page: currentPage,
      limit: pageSize,
      total,
    };
  }

  async search(q: string, specialty?: string): Promise<Doctor[]> {
    if (!q) {
      return [];
    }
    const hits = await this.meilisearchService.search<Doctor>(
      DOCTORS_INDEX,
      q,
      {
        limit: 10,
        filter: specialty ? `specialty = "${specialty}"` : undefined,
      },
    );
    if (hits !== null) {
      return hits;
    }
    return this.doctorRepository.find({
      where: [{ name: ILike(`%${q}%`) }, { specialty: ILike(`%${q}%`) }],
      take: 10,
    });
  }

  async getDoctorById(
    id: string | number,
  ): Promise<Doctor & { reviewCount: number }> {
    const doctor = await this.doctorRepository.findOneBy({
      id: typeof id === 'string' ? parseInt(id, 10) : id,
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    const counts = await this.getReviewCounts([doctor.id]);
    return { ...doctor, reviewCount: counts.get(doctor.id) ?? 0 };
  }

  async getDoctorByUserId(userId: number): Promise<Doctor | null> {
    return this.doctorRepository.findOneBy({ userId });
  }

  /**
   * Creates the minimal, unverified profile row a self-registered doctor
   * needs so doctor-only endpoints (e.g. GET /doctors/me) resolve. The
   * doctor fills in specialty/experience/bio/etc. later; isVerified stays
   * false until an admin reviews the account.
   */
  async createProfileForUser(user: {
    id: number;
    name?: string;
  }): Promise<Doctor> {
    const existing = await this.getDoctorByUserId(user.id);
    if (existing) {
      return existing;
    }
    const doctor = this.doctorRepository.create({
      userId: user.id,
      name: user.name ?? 'New Doctor',
      specialty: 'General',
      experience: '0 Years',
      avatar: '',
      bio: '',
      isVerified: false,
    });
    return this.doctorRepository.save(doctor);
  }

  async getAvailability(doctorId: string | number): Promise<Availability[]> {
    const id = typeof doctorId === 'string' ? parseInt(doctorId, 10) : doctorId;
    await this.getDoctorById(id);
    return this.availabilityRepository.find({
      where: { doctorId: id },
      order: { dayOfWeek: 'ASC' },
    });
  }

  /**
   * Same-day availability windows must be chronological: end after start
   * (HH:mm zero-padded 24h strings, lexicographic compare is numeric-safe).
   * Guards both weekly entries and date overrides that reuse these fields.
   */
  private assertValidTimeWindow(startTime: string, endTime: string): void {
    if (endTime <= startTime) {
      throw new BadRequestException(
        'endTime must be after startTime for the same-day window',
      );
    }
  }

  async setAvailability(
    doctorId: number,
    entries: AvailabilityEntry[],
  ): Promise<Availability[]> {
    for (const entry of entries) {
      this.assertValidTimeWindow(entry.startTime, entry.endTime);
    }
    await this.availabilityRepository.delete({ doctorId });
    const created = entries.map((entry) =>
      this.availabilityRepository.create({
        doctorId,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        slotDurationMinutes: entry.slotDurationMinutes ?? 30,
        bufferMinutes: entry.bufferMinutes ?? 10,
      }),
    );
    return this.availabilityRepository.save(created);
  }

  /** Update a single availability entry (by dayId) without replacing the whole week. */
  async updateSingleDay(
    doctorId: number,
    dayId: number,
    dto: UpdateSingleDayDto,
  ): Promise<Availability> {
    const existing = await this.availabilityRepository.findOne({
      where: { id: dayId, doctorId },
    });
    if (!existing) {
      throw new NotFoundException('Availability entry not found');
    }

    if (dto.startTime !== undefined) existing.startTime = dto.startTime;
    if (dto.endTime !== undefined) existing.endTime = dto.endTime;
    if (dto.slotDurationMinutes !== undefined)
      existing.slotDurationMinutes = dto.slotDurationMinutes;
    if (dto.bufferMinutes !== undefined)
      existing.bufferMinutes = dto.bufferMinutes;
    if (dto.isActive !== undefined) existing.isActive = dto.isActive;
    if (dto.specificDate !== undefined)
      existing.specificDate = dto.specificDate
        ? new Date(dto.specificDate)
        : (null as any);
    if (dto.isAvailable !== undefined) existing.isAvailable = dto.isAvailable;
    if (dto.overrideSlots !== undefined)
      existing.overrideSlots = dto.overrideSlots;

    // Validate the effective merged window (partial updates included).
    this.assertValidTimeWindow(existing.startTime, existing.endTime);

    return this.availabilityRepository.save(existing);
  }

  /** Finds the active availability window covering the time-of-day of `at` for the doctor's day-of-week. */
  async findAvailabilityWindow(
    doctorId: number,
    at: Date,
  ): Promise<Availability | null> {
    const dayOfWeek = at.getDay();
    const specificDate = at.toISOString().split('T')[0];

    // Check for a date-specific override first
    const dateOverride = await this.availabilityRepository.findOne({
      where: {
        doctorId,
        specificDate: specificDate as any,
        isActive: true,
      },
    });

    if (dateOverride) {
      // If doctor marked this date as unavailable, return null
      if (!dateOverride.isAvailable) {
        return null;
      }
      // If there are override slots, check if the time falls within one
      if (dateOverride.overrideSlots && dateOverride.overrideSlots.length > 0) {
        const minutesOfDay = at.getHours() * 60 + at.getMinutes();
        for (const slot of dateOverride.overrideSlots) {
          const [startStr, endStr] = slot.split('-');
          const [startH, startM] = startStr.split(':').map(Number);
          const [endH, endM] = endStr.split(':').map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;
          if (minutesOfDay >= startMinutes && minutesOfDay < endMinutes) {
            return dateOverride;
          }
        }
        return null;
      }
      // No override slots, fall through to use the override's time window as-is
      return dateOverride;
    }

    // No date-specific override, use recurring weekly availability
    const windows = await this.availabilityRepository.find({
      where: { doctorId, dayOfWeek, isActive: true, specificDate: IsNull() },
    });

    const minutesOfDay = at.getHours() * 60 + at.getMinutes();
    for (const window of windows) {
      const [startH, startM] = window.startTime.split(':').map(Number);
      const [endH, endM] = window.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      if (minutesOfDay >= startMinutes && minutesOfDay < endMinutes) {
        return window;
      }
    }
    return null;
  }

  /** Get all availability entries for a doctor, including date-specific overrides */
  async getAvailabilityForDate(
    doctorId: number,
    date: Date,
  ): Promise<Availability[]> {
    const specificDate = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // Get recurring weekly entries
    const recurring = await this.availabilityRepository.find({
      where: { doctorId, dayOfWeek, isActive: true, specificDate: IsNull() },
    });

    // Get date-specific override if exists
    const override = await this.availabilityRepository.findOne({
      where: {
        doctorId,
        specificDate: specificDate as any,
        isActive: true,
      },
    });

    if (override) {
      if (!override.isAvailable) {
        return [];
      }
      return [override];
    }

    return recurring;
  }

  async updateQualifications(
    doctorUserId: number,
    qualifications: string[],
  ): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOneBy({
      userId: doctorUserId,
    });
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    doctor.qualifications = qualifications;
    return this.doctorRepository.save(doctor);
  }

  async updateSpecializations(
    doctorUserId: number,
    specializations: string[],
  ): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOneBy({
      userId: doctorUserId,
    });
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    doctor.specializations = specializations;
    return this.doctorRepository.save(doctor);
  }

  async uploadPhoto(
    doctorUserId: number,
    file: Express.Multer.File,
  ): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOneBy({
      userId: doctorUserId,
    });
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    const result = await this.s3Service.uploadFile(file.buffer, {
      folder: 'gobadi/avatars',
      contentType: file.mimetype,
    });
    doctor.avatar = result.url;
    return this.doctorRepository.save(doctor);
  }

  async uploadExperienceCertificate(
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    const result = await this.s3Service.uploadFile(file.buffer, {
      folder: 'experience-certificates',
      contentType: file.mimetype,
    });
    return { url: result.url };
  }

  async uploadCredentialDocument(
    doctorUserId: number,
    file: Express.Multer.File,
  ): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOneBy({
      userId: doctorUserId,
    });
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    const result = await this.s3Service.uploadFile(file.buffer, {
      folder: 'doctor-credentials',
      contentType: file.mimetype,
    });
    doctor.credentialDocuments = [
      ...(doctor.credentialDocuments || []),
      result.url,
    ];
    return this.doctorRepository.save(doctor);
  }

  async updateCredentialDocuments(
    doctorUserId: number,
    documents: string[],
  ): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOneBy({
      userId: doctorUserId,
    });
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    doctor.credentialDocuments = documents;
    return this.doctorRepository.save(doctor);
  }

  async updateExperiences(
    doctorUserId: number,
    experiences: Array<{
      title: string;
      organization: string;
      duration: string;
      description?: string;
      endDate?: string;
      isCurrent?: boolean;
    }>,
  ): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOneBy({
      userId: doctorUserId,
    });
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    doctor.experiences = experiences;
    return this.doctorRepository.save(doctor);
  }

  async updateProfile(
    doctorUserId: number,
    dto: {
      name?: string;
      specialty?: string;
      experience?: string;
      avatar?: string;
      bio?: string;
      consultationFee?: number;
      licenseNumber?: string;
      location?: string;
      credentialPeriod?: {
        startMonth?: string;
        startYear?: string;
        endMonth?: string;
        endYear?: string;
        isCurrentlyStudying?: boolean;
      };
    },
  ): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOneBy({
      userId: doctorUserId,
    });
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    if (dto.name !== undefined) doctor.name = dto.name;
    if (dto.specialty !== undefined) doctor.specialty = dto.specialty;
    if (dto.experience !== undefined) doctor.experience = dto.experience;
    if (dto.avatar !== undefined) doctor.avatar = dto.avatar;
    if (dto.bio !== undefined) doctor.bio = dto.bio;
    if (dto.consultationFee !== undefined)
      doctor.consultationFee = dto.consultationFee;
    if (dto.licenseNumber !== undefined)
      doctor.licenseNumber = dto.licenseNumber;
    if (dto.location !== undefined) doctor.location = dto.location;
    if (dto.credentialPeriod !== undefined)
      doctor.credentialPeriod = dto.credentialPeriod;
    const saved = await this.doctorRepository.save(doctor);
    // Keep the account-level name in sync so auth-derived UI (home greeting,
    // JWT payload) matches the profile name.
    if (dto.name !== undefined) {
      await this.userRepository.update(
        { id: doctorUserId },
        { name: dto.name },
      );
    }
    return saved;
  }

  async getDashboardStats(doctorUserId: number) {
    const doctor = await this.doctorRepository.findOneBy({
      userId: doctorUserId,
    });
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }

    return {
      yearsOfExperience: doctor.experience,
      specializations: doctor.specializations,
      qualifications: doctor.qualifications,
      consultationFee: doctor.consultationFee,
      rating: doctor.rating,
    };
  }
}
