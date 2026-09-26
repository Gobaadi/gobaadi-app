import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { User, UserRole } from '../../users/user.entity';
import { Animal } from '../../animals/animal.entity';
import { Notification } from '../../notifications/notification.entity';
import { DashboardAdminGuard } from '../guards/dashboard-admin.guard';
import {
  DashboardAnalyticsService,
  normalizePeriod,
} from '../services/dashboard-analytics.service';

const MAX_RESULTS_PER_CATEGORY = 5;

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(DashboardAdminGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly analyticsService: DashboardAnalyticsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard overview stats' })
  @ApiQuery({ name: 'period', required: false })
  getStats(@Query('period') period?: string) {
    return this.analyticsService.getStats(normalizePeriod(period));
  }

  @Get('user-growth')
  @ApiOperation({ summary: 'User growth chart' })
  getUserGrowth(@Query('period') period?: string) {
    return this.analyticsService.getUserGrowth(normalizePeriod(period));
  }

  @Get('user-os')
  @ApiOperation({ summary: 'Push token OS chart' })
  getUserOS(@Query('period') period?: string) {
    return this.analyticsService.getUserOS(normalizePeriod(period));
  }

  @Get('ai-users')
  @ApiOperation({ summary: 'AI users stats' })
  getAiUsers(@Query('period') period?: string) {
    return this.analyticsService.getAiUsers(normalizePeriod(period));
  }

  @Get('appointments')
  @ApiOperation({ summary: 'Appointments chart' })
  getAppointments(@Query('period') period?: string) {
    return this.analyticsService.getAppointments(normalizePeriod(period));
  }

  @Get('retention')
  @ApiOperation({ summary: 'User retention chart' })
  getRetention(@Query('period') period?: string) {
    return this.analyticsService.getRetention(normalizePeriod(period));
  }

  @Get('user-list-stats')
  @ApiOperation({ summary: 'User list stats' })
  getUserListStats(@Query('period') period?: string) {
    return this.analyticsService.getUserListStats(normalizePeriod(period));
  }

  @Get('user-location')
  @ApiOperation({ summary: 'User location distribution' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'filter', required: false })
  getUserLocation(
    @Query('period') period?: string,
    @Query('role') role?: string,
    @Query('filter') filter?: string,
  ) {
    const validFilters = ['District', 'Upazila', 'Division'] as const;
    const safeFilter = (
      validFilters.includes(filter as (typeof validFilters)[number])
        ? filter
        : 'District'
    ) as (typeof validFilters)[number];
    return this.analyticsService.getUserLocation(
      normalizePeriod(period),
      role === 'doctor' ? 'doctor' : 'farmer',
      safeFilter,
    );
  }

  @Get('daily-users')
  @ApiOperation({ summary: 'Daily users chart' })
  getDailyUsers(@Query('period') period?: string) {
    return this.analyticsService.getDailyUsers(normalizePeriod(period));
  }

  @Get('registered-animals')
  @ApiOperation({ summary: 'Registered animals chart' })
  getRegisteredAnimals(@Query('period') period?: string) {
    return this.analyticsService.getRegisteredAnimals(normalizePeriod(period));
  }

  @Get('task-feature-users')
  @ApiOperation({ summary: 'Task feature users chart' })
  getTaskFeatureUsers(@Query('period') period?: string) {
    return this.analyticsService.getTaskFeatureUsers(normalizePeriod(period));
  }

  @Get('search')
  @ApiOperation({
    summary:
      'Global dashboard search (farmers, doctors, animals, notifications)',
  })
  @ApiQuery({ name: 'q', required: false })
  async search(@Query('q') q?: string) {
    const trimmed = (q ?? '').trim();
    if (trimmed.length < 2) {
      return { farmers: [], doctors: [], animals: [], notifications: [] };
    }
    const term = `%${trimmed}%`;

    const userSearch = (role: UserRole) =>
      this.userRepository
        .createQueryBuilder('u')
        .where('u.role = :role', { role })
        .andWhere(
          new Brackets((w) => {
            w.where('LOWER(u.name) LIKE LOWER(:term)', { term })
              .orWhere('LOWER(u.email) LIKE LOWER(:term)', { term })
              .orWhere('LOWER(u.phone) LIKE LOWER(:term)', { term });
          }),
        )
        .select([
          'u.id',
          'u.name',
          'u.email',
          'u.phone',
          'u.avatar',
          'u.verified',
        ])
        .orderBy('u.id', 'DESC')
        .take(MAX_RESULTS_PER_CATEGORY)
        .getMany();

    const [farmers, doctors, animals, notifications] = await Promise.all([
      userSearch(UserRole.USER),
      userSearch(UserRole.DOCTOR),
      this.animalRepository
        .createQueryBuilder('a')
        .andWhere(
          new Brackets((w) => {
            w.where('LOWER(a.name) LIKE LOWER(:term)', { term }).orWhere(
              'LOWER(a.breed) LIKE LOWER(:term)',
              { term },
            );
          }),
        )
        .select(['a.id', 'a.name', 'a.breed', 'a.image', 'a.userId'])
        .orderBy('a.id', 'DESC')
        .take(MAX_RESULTS_PER_CATEGORY)
        .getMany(),
      this.notificationRepository
        .createQueryBuilder('n')
        .andWhere(
          new Brackets((w) => {
            w.where('LOWER(n.title) LIKE LOWER(:term)', { term }).orWhere(
              'LOWER(n.body) LIKE LOWER(:term)',
              { term },
            );
          }),
        )
        .select([
          'n.id',
          'n.title',
          'n.body',
          'n.type',
          'n.isRead',
          'n.createdAt',
        ])
        .orderBy('n.id', 'DESC')
        .take(MAX_RESULTS_PER_CATEGORY)
        .getMany(),
    ]);

    return { farmers, doctors, animals, notifications };
  }

  @Get('farmers')
  @ApiOperation({ summary: 'Farmers list (paginated, searchable)' })
  getFarmers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.analyticsService.getFarmersList(
      parseInt(page ?? '1', 10) || 1,
      parseInt(limit ?? '10', 10) || 10,
      search,
      status,
    );
  }

  @Get('doctors')
  @ApiOperation({ summary: 'Doctors list (paginated, searchable)' })
  getDoctors(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.analyticsService.getDoctorsList(
      parseInt(page ?? '1', 10) || 1,
      parseInt(limit ?? '10', 10) || 10,
      search,
      status,
    );
  }

  @Get('farmers/:id')
  @ApiOperation({ summary: 'Get farmer by id' })
  getFarmer(@Param('id', ParseIntPipe) id: number) {
    return this.analyticsService.getFarmerById(id);
  }

  @Get('doctors/:id')
  @ApiOperation({ summary: 'Get doctor by id' })
  getDoctor(@Param('id', ParseIntPipe) id: number) {
    return this.analyticsService.getDoctorById(id);
  }

  @Delete('farmers/:id')
  @ApiOperation({ summary: 'Delete farmer' })
  async deleteFarmer(@Param('id', ParseIntPipe) id: number) {
    await this.analyticsService.deleteFarmer(id);
    return { success: true, message: 'Farmer deleted successfully' };
  }

  @Delete('doctors/:id')
  @ApiOperation({ summary: 'Delete doctor' })
  async deleteDoctor(@Param('id', ParseIntPipe) id: number) {
    await this.analyticsService.deleteDoctor(id);
    return { success: true, message: 'Doctor deleted successfully' };
  }
}
