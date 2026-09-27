import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DoctorsService, Doctor, Availability } from './doctors.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { UpdateSingleDayDto } from './dto/update-single-day.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { PaginatedResult } from '../common/paginated-result.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Appointment,
  AppointmentStatus,
  ConsultationType,
} from '../appointments/appointment.entity';
import { DoctorTimeOff } from '../time-off/doctor-time-off.entity';

@ApiTags('doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(
    private readonly doctorsService: DoctorsService,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(DoctorTimeOff)
    private readonly timeOffRepository: Repository<DoctorTimeOff>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all doctors' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'specialty', required: false })
  @ApiResponse({ status: 200, description: 'List of doctors' })
  async getDoctors(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('specialty') specialty?: string,
  ): Promise<Doctor[] | PaginatedResult<Doctor>> {
    return this.doctorsService.getDoctors(
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
      specialty,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current logged-in doctor's own profile" })
  @ApiResponse({ status: 200, description: 'The doctor profile' })
  async getMyDoctorProfile(@CurrentUser() user: JwtPayload): Promise<Doctor> {
    const doctor = await this.doctorsService.getDoctorByUserId(user.sub);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    return doctor;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the current doctor's core profile fields" })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDoctorProfileDto,
  ): Promise<Doctor> {
    return this.doctorsService.updateProfile(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a doctor by id' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiResponse({ status: 200, description: 'The doctor' })
  async getDoctorById(@Param('id') id: string): Promise<Doctor> {
    return this.doctorsService.getDoctorById(id);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: "Get a doctor's weekly availability" })
  @ApiParam({ name: 'id', example: '1' })
  @ApiResponse({ status: 200, description: 'List of availability windows' })
  async getAvailability(@Param('id') id: string): Promise<Availability[]> {
    return this.doctorsService.getAvailability(id);
  }

  @Post(':id/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Replace a doctor's weekly availability (doctor-only, own profile)",
  })
  @ApiParam({ name: 'id', example: '1' })
  @ApiResponse({ status: 201, description: 'Availability replaced' })
  async setAvailability(
    @Param('id') id: string,
    @Body() body: SetAvailabilityDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Availability[]> {
    const doctor = await this.doctorsService.getDoctorByUserId(user.sub);
    if (!doctor || doctor.id !== parseInt(id, 10)) {
      throw new ForbiddenException('You may only manage your own availability');
    }
    return this.doctorsService.setAvailability(doctor.id, body.entries);
  }

  @Patch(':id/availability/:dayId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Update a single day's availability without resending the whole week",
  })
  @ApiParam({ name: 'id', example: '1' })
  @ApiParam({ name: 'dayId', example: '1' })
  @ApiResponse({ status: 200, description: 'Availability day updated' })
  async updateSingleDay(
    @Param('id') id: string,
    @Param('dayId') dayId: string,
    @Body() body: UpdateSingleDayDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Availability> {
    const doctor = await this.doctorsService.getDoctorByUserId(user.sub);
    if (!doctor || doctor.id !== parseInt(id, 10)) {
      throw new ForbiddenException('You may only manage your own availability');
    }
    return this.doctorsService.updateSingleDay(
      doctor.id,
      parseInt(dayId, 10),
      body,
    );
  }

  @Patch('me/qualifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the current doctor's qualifications" })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        qualifications: {
          type: 'array',
          items: { type: 'string' },
          example: ['MBBS', 'MD Cardiology'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Qualifications updated' })
  async updateMyQualifications(
    @CurrentUser() user: JwtPayload,
    @Body('qualifications') qualifications: string[],
  ): Promise<Doctor> {
    return this.doctorsService.updateQualifications(user.sub, qualifications);
  }

  @Patch('me/specializations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the current doctor's specializations" })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        specializations: {
          type: 'array',
          items: { type: 'string' },
          example: ['Cardiology', 'Pediatrics'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Specializations updated' })
  async updateMySpecializations(
    @CurrentUser() user: JwtPayload,
    @Body('specializations') specializations: string[],
  ): Promise<Doctor> {
    return this.doctorsService.updateSpecializations(user.sub, specializations);
  }

  @Patch('me/experiences')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the current doctor's work experiences" })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        experiences: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              organization: { type: 'string' },
              duration: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Experiences updated' })
  async updateMyExperiences(
    @CurrentUser() user: JwtPayload,
    @Body('experiences')
    experiences: Array<{
      title: string;
      organization: string;
      duration: string;
      description?: string;
    }>,
  ): Promise<Doctor> {
    return this.doctorsService.updateExperiences(user.sub, experiences);
  }

  @Get('me/dashboard-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current doctor's dashboard stats" })
  @ApiResponse({
    status: 200,
    description: 'Doctor stats: patients count, consultations, experience',
  })
  async getMyDashboardStats(@CurrentUser() user: JwtPayload) {
    const doctor = await this.doctorsService.getDoctorByUserId(user.sub);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }

    const totalPatients = await this.appointmentRepository
      .createQueryBuilder('a')
      .select('COUNT(DISTINCT a.patientId)', 'count')
      .where('a.doctorId = :doctorId', { doctorId: doctor.id })
      .getRawOne()
      .then((r: { count: string }) => parseInt(r.count, 10));

    const totalConsultations = await this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId: doctor.id })
      .andWhere("a.status = 'COMPLETED'")
      .getCount();

    return {
      totalPatients,
      totalConsultations,
      yearsOfExperience: doctor.experience,
      specializations: doctor.specializations,
      qualifications: doctor.qualifications,
      consultationFee: doctor.consultationFee,
      rating: doctor.rating,
    };
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'Get doctor schedule with optional filters' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filter by date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'consultationType',
    required: false,
    enum: ConsultationType,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({ name: 'month', required: false, description: 'Month (1-12)' })
  @ApiQuery({ name: 'year', required: false, description: 'Year (e.g. 2026)' })
  @ApiResponse({ status: 200, description: 'Doctor schedule' })
  async getDoctorSchedule(
    @Param('id') id: string,
    @Query('date') date?: string,
    @Query('consultationType') consultationType?: ConsultationType,
    @Query('status') status?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const doctorId = parseInt(id, 10);
    await this.doctorsService.getDoctorById(doctorId);

    const qb = this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId });

    if (date) {
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(`${date}T23:59:59`);
      qb.andWhere('a.startAt >= :dayStart AND a.startAt <= :dayEnd', {
        dayStart,
        dayEnd,
      });
    } else if (month && year) {
      const startDate = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        1,
      );
      const endDate = new Date(
        parseInt(year, 10),
        parseInt(month, 10),
        0,
        23,
        59,
        59,
      );
      qb.andWhere('a.startAt >= :startDate AND a.startAt <= :endDate', {
        startDate,
        endDate,
      });
    }

    if (consultationType) {
      qb.andWhere('a.consultationType = :consultationType', {
        consultationType,
      });
    }

    if (status) {
      qb.andWhere('a.status = :status', { status });
    }

    qb.orderBy('a.startAt', 'ASC');

    const appointments = await qb.getMany();
    const blockTimes = await this.timeOffRepository.find({
      where: { doctorId },
      order: { startDate: 'ASC' },
    });

    return { appointments, blockTimes };
  }

  @Get(':id/schedule/list')
  @ApiOperation({
    summary: 'Get doctor schedule as flat list for current month (ascending)',
  })
  @ApiParam({ name: 'id', example: '1' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Month (1-12), default current',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Year, default current',
  })
  @ApiResponse({
    status: 200,
    description: 'Flat list of appointments sorted by date ascending',
  })
  async getDoctorScheduleList(
    @Param('id') id: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const doctorId = parseInt(id, 10);
    await this.doctorsService.getDoctorById(doctorId);

    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const appointments = await this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere('a.startAt >= :startDate AND a.startAt <= :endDate', {
        startDate,
        endDate,
      })
      .orderBy('a.startAt', 'ASC')
      .getMany();

    return appointments;
  }
}
