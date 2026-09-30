import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  MedicalEventsService,
  MedicalEvent,
  MedicalEventType,
} from './medical-events.service';
import { CreateMedicalEventDto } from './dto/create-medical-event.dto';
import {
  CreateLabTestDto,
  CreateVaccinationDto,
} from './dto/create-wrapper.dto';
import { UpdateMedicalEventDto } from './dto/update-medical-event.dto';
import { DoctorsService } from '../doctors/doctors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { PaginatedResult } from '../common/paginated-result.interface';

@ApiTags('medical-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MedicalEventsController {
  constructor(
    private readonly medicalEventsService: MedicalEventsService,
    private readonly doctorsService: DoctorsService,
  ) {}

  @Get('animals/:id/medical-events')
  @ApiOperation({
    summary:
      'List structured clinical records for an animal (own animal for owners, or any patient the doctor has treated)',
  })
  @ApiParam({ name: 'id', example: '1' })
  @ApiQuery({ name: 'type', required: false, enum: MedicalEventType })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('type') type?: MedicalEventType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<MedicalEvent>> {
    const doctor =
      user.role === UserRole.DOCTOR
        ? await this.doctorsService.getDoctorByUserId(user.sub)
        : null;
    return this.medicalEventsService.list(
      user.sub,
      doctor?.id ?? null,
      parseInt(id, 10),
      type,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('medical-events/:id')
  @ApiOperation({ summary: 'Get a single medical event by ID' })
  @ApiParam({ name: 'id', example: '1' })
  async getById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent> {
    const doctor =
      user.role === UserRole.DOCTOR
        ? await this.doctorsService.getDoctorByUserId(user.sub)
        : null;
    return this.medicalEventsService.getById(
      parseInt(id, 10),
      user.sub,
      doctor?.id ?? null,
    );
  }

  @Post('animals/:id/medical-events')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Create a structured clinical record for an animal (doctor-only)',
  })
  @ApiParam({ name: 'id', example: '1' })
  @ApiResponse({ status: 201, description: 'Medical event created' })
  async create(
    @Param('id') id: string,
    @Body() body: CreateMedicalEventDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent> {
    const doctor = await this.doctorsService.getDoctorByUserId(user.sub);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    return this.medicalEventsService.create(doctor.id, parseInt(id, 10), body);
  }

  @Patch('medical-events/:eventId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Update a clinical record (doctor-only, own records)',
  })
  @ApiParam({ name: 'eventId', example: '1' })
  async update(
    @Param('eventId') eventId: string,
    @Body() body: UpdateMedicalEventDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent> {
    const doctor = await this.doctorsService.getDoctorByUserId(user.sub);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    return this.medicalEventsService.update(
      parseInt(eventId, 10),
      doctor.id,
      body,
    );
  }

  @Delete('medical-events/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Delete a medical event (doctor-only, own records)',
  })
  @ApiParam({ name: 'id', example: '1' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean }> {
    const doctor = await this.doctorsService.getDoctorByUserId(user.sub);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    await this.medicalEventsService.delete(parseInt(id, 10), doctor.id);
    return { success: true };
  }

  // --- Lab Test Wrapper Routes ---

  @Get('lab-tests/animal/:animalId')
  @ApiOperation({ summary: "Get animal's lab tests" })
  @ApiParam({ name: 'animalId', example: '1' })
  async getLabTests(
    @Param('animalId') animalId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent[]> {
    const doctor =
      user.role === UserRole.DOCTOR
        ? await this.doctorsService.getDoctorByUserId(user.sub)
        : null;
    const result = await this.medicalEventsService.list(
      user.sub,
      doctor?.id ?? null,
      parseInt(animalId, 10),
      MedicalEventType.LAB_TEST,
    );
    return result.data;
  }

  @Post('lab-tests')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Create a lab test record' })
  async createLabTest(
    @Body() body: CreateLabTestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent> {
    const doctor = await this.doctorsService.getDoctorByUserId(user.sub);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    return this.medicalEventsService.create(doctor.id, body.animalId, {
      appointmentId: body.appointmentId,
      type: MedicalEventType.LAB_TEST,
      data: body.data,
    });
  }

  @Put('lab-tests/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Update a lab test record' })
  @ApiParam({ name: 'id', example: '1' })
  async updateLabTest(
    @Param('id') id: string,
    @Body() body: UpdateMedicalEventDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent> {
    const doctor = await this.doctorsService.getDoctorByUserId(user.sub);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    return this.medicalEventsService.update(parseInt(id, 10), doctor.id, body);
  }

  // --- Vaccination Wrapper Routes ---

  @Get('vaccinations/animal/:animalId')
  @ApiOperation({ summary: "Get animal's vaccination records" })
  @ApiParam({ name: 'animalId', example: '1' })
  async getVaccinations(
    @Param('animalId') animalId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent[]> {
    const doctor =
      user.role === UserRole.DOCTOR
        ? await this.doctorsService.getDoctorByUserId(user.sub)
        : null;
    const result = await this.medicalEventsService.list(
      user.sub,
      doctor?.id ?? null,
      parseInt(animalId, 10),
      MedicalEventType.VACCINATION,
    );
    return result.data;
  }

  @Post('vaccinations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Create a vaccination record' })
  async createVaccination(
    @Body() body: CreateVaccinationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent> {
    const doctor = await this.doctorsService.getDoctorByUserId(user.sub);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    return this.medicalEventsService.create(doctor.id, body.animalId, {
      appointmentId: body.appointmentId,
      type: MedicalEventType.VACCINATION,
      data: body.data,
    });
  }

  @Put('vaccinations/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Update a vaccination record' })
  @ApiParam({ name: 'id', example: '1' })
  async updateVaccination(
    @Param('id') id: string,
    @Body() body: UpdateMedicalEventDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent> {
    const doctor = await this.doctorsService.getDoctorByUserId(user.sub);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    return this.medicalEventsService.update(parseInt(id, 10), doctor.id, body);
  }

  @Delete('vaccinations/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Delete a vaccination record' })
  @ApiParam({ name: 'id', example: '1' })
  async removeVaccination(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean }> {
    const doctor = await this.doctorsService.getDoctorByUserId(user.sub);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    await this.medicalEventsService.delete(parseInt(id, 10), doctor.id);
    return { success: true };
  }

  // --- Consultation Wrapper Routes ---

  @Get('consultations/animal/:animalId')
  @ApiOperation({ summary: "Get animal's consultation records" })
  @ApiParam({ name: 'animalId', example: '1' })
  async getConsultations(
    @Param('animalId') animalId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent[]> {
    const doctor =
      user.role === UserRole.DOCTOR
        ? await this.doctorsService.getDoctorByUserId(user.sub)
        : null;
    const result = await this.medicalEventsService.list(
      user.sub,
      doctor?.id ?? null,
      parseInt(animalId, 10),
      MedicalEventType.CONSULTATION,
    );
    return result.data;
  }

  @Get('consultations/appointment/:appointmentId')
  @ApiOperation({
    summary: 'Get the latest consultation for an appointment (null if none)',
  })
  @ApiParam({ name: 'appointmentId', example: '1' })
  @ApiResponse({ status: 200, description: 'Consultation record or null' })
  async getConsultationByAppointment(
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent | null> {
    const doctor =
      user.role === UserRole.DOCTOR
        ? await this.doctorsService.getDoctorByUserId(user.sub)
        : null;
    return this.medicalEventsService.getLatestForAppointment(
      user.sub,
      doctor?.id ?? null,
      parseInt(appointmentId, 10),
    );
  }

  @Get('consultations/:id')
  @ApiOperation({ summary: 'Get a single consultation record' })
  @ApiParam({ name: 'id', example: '1' })
  async getConsultationById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent> {
    const doctor =
      user.role === UserRole.DOCTOR
        ? await this.doctorsService.getDoctorByUserId(user.sub)
        : null;
    return this.medicalEventsService.getById(
      parseInt(id, 10),
      user.sub,
      doctor?.id ?? null,
    );
  }

  @Put('consultations/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Update a consultation record' })
  @ApiParam({ name: 'id', example: '1' })
  async updateConsultation(
    @Param('id') id: string,
    @Body() body: UpdateMedicalEventDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent> {
    const doctor = await this.doctorsService.getDoctorByUserId(user.sub);
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    return this.medicalEventsService.update(parseInt(id, 10), doctor.id, body);
  }

  @Post('consultations/appointment/:appointmentId')
  @ApiOperation({
    summary: 'Start (or resume) the consultation for an appointment',
  })
  @ApiParam({ name: 'appointmentId', example: '1' })
  @ApiResponse({ status: 201, description: 'Consultation started' })
  async startConsultationByAppointment(
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent> {
    const doctor =
      user.role === UserRole.DOCTOR
        ? await this.doctorsService.getDoctorByUserId(user.sub)
        : null;
    return this.medicalEventsService.startForAppointment(
      user.sub,
      doctor?.id ?? null,
      parseInt(appointmentId, 10),
    );
  }

  @Post('consultations/:id/end')
  @ApiOperation({ summary: 'End a consultation (mark as completed)' })
  @ApiParam({ name: 'id', example: '1' })
  async endConsultation(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalEvent> {
    const doctor =
      user.role === UserRole.DOCTOR
        ? await this.doctorsService.getDoctorByUserId(user.sub)
        : null;
    return this.medicalEventsService.endForParticipant(
      user.sub,
      doctor?.id ?? null,
      parseInt(id, 10),
    );
  }
}
