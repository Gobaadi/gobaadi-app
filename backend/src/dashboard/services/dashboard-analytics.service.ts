import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Between, In, MoreThan, Repository } from 'typeorm';
import { User, UserRole } from '../../users/user.entity';
import { Animal } from '../../animals/animal.entity';
import { Referral } from '../../referrals/referral.entity';
import { Address } from '../../addresses/address.entity';
import { PushToken } from '../../notifications/push-token.entity';
import { AiDiagnosis } from '../../ai-diagnosis/ai-diagnosis.entity';
import {
  Appointment,
  AppointmentStatus,
} from '../../appointments/appointment.entity';
import { RefreshToken } from '../../auth/refresh-token.entity';
import { Task } from '../../tasks/task.entity';

export type Period = 'last_7_days' | 'last_30_days' | 'this_year';

const VALID_PERIODS: Period[] = ['last_7_days', 'last_30_days', 'this_year'];

export function normalizePeriod(raw?: string): Period {
  return raw && VALID_PERIODS.includes(raw as Period)
    ? (raw as Period)
    : 'last_7_days';
}

function getDateRange(period: Period): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case 'last_7_days':
      start.setDate(end.getDate() - 7);
      break;
    case 'last_30_days':
      start.setDate(end.getDate() - 30);
      break;
    case 'this_year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { start, end };
}

function getPreviousDateRange(period: Period): { start: Date; end: Date } {
  const { start: currentStart, end: currentEnd } = getDateRange(period);
  const duration = currentEnd.getTime() - currentStart.getTime();
  return {
    start: new Date(currentStart.getTime() - duration),
    end: new Date(currentEnd.getTime() - duration),
  };
}

function getGroupByFormat(period: Period): 'day' | 'month' {
  return period === 'this_year' ? 'month' : 'day';
}

function calcChange(current: number, previous: number) {
  const changePercent =
    previous > 0
      ? Math.round(((current - previous) / previous) * 100)
      : current > 0
        ? 100
        : 0;
  return {
    changePercent: Math.abs(changePercent),
    isPositive: changePercent >= 0,
  };
}

function eachDay(from: Date, to: Date, fn: (d: Date) => void) {
  const current = new Date(from);
  while (current <= to) {
    fn(new Date(current));
    current.setDate(current.getDate() + 1);
  }
}

function eachMonth(from: Date, to: Date, fn: (d: Date) => void) {
  const current = new Date(from);
  while (current <= to) {
    fn(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
}

const USER_LIST_FIELDS = [
  'id',
  'name',
  'email',
  'phone',
  'avatar',
  'role',
  'verified',
  'createdAt',
  'updatedAt',
] as const;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS_UPPER = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

@Injectable()
export class DashboardAnalyticsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(PushToken)
    private readonly pushTokenRepository: Repository<PushToken>,
    @InjectRepository(AiDiagnosis)
    private readonly aiDiagnosisRepository: Repository<AiDiagnosis>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async getStats(period: Period) {
    const { start, end } = getDateRange(period);
    const { start: prevStart, end: prevEnd } = getPreviousDateRange(period);
    const [totalUsers, totalFarmers, totalDoctors, current, previous] =
      await Promise.all([
        this.userRepository.count(),
        this.userRepository.count({ where: { role: UserRole.USER } }),
        this.userRepository.count({ where: { role: UserRole.DOCTOR } }),
        this.userRepository.count({
          where: { createdAt: Between(start, end) },
        }),
        this.userRepository.count({
          where: { createdAt: Between(prevStart, prevEnd) },
        }),
      ]);
    return {
      totalDownloads: 0,
      totalUsers,
      totalFarmers,
      totalDoctors,
      userGrowth: {
        current,
        previous,
        ...calcChange(current, previous),
      },
    };
  }

  async getUserGrowth(period: Period) {
    const { start, end } = getDateRange(period);
    const format = getGroupByFormat(period);
    const users = await this.userRepository.find({
      where: { createdAt: Between(start, end) },
      select: { createdAt: true },
      order: { createdAt: 'ASC' },
    });

    const grouped: Record<string, number> = {};
    if (format === 'day') {
      eachDay(start, end, (d) => {
        grouped[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
      });
    } else {
      eachMonth(start, end, (d) => {
        grouped[d.toLocaleDateString('en-US', { month: 'short' })] = 0;
      });
    }

    for (const user of users) {
      const key =
        format === 'day'
          ? user.createdAt.toLocaleDateString('en-US', { weekday: 'short' })
          : user.createdAt.toLocaleDateString('en-US', { month: 'short' });
      grouped[key] = (grouped[key] || 0) + 1;
    }

    const chartData = Object.entries(grouped).map(([day, value]) => ({
      day,
      value,
    }));

    const totalCurrent = users.length;
    const { start: prevStart, end: prevEnd } = getPreviousDateRange(period);
    const prevUsers = await this.userRepository.count({
      where: { createdAt: Between(prevStart, prevEnd) },
    });

    return {
      chartData,
      summary: {
        total: totalCurrent,
        ...calcChange(totalCurrent, prevUsers),
      },
    };
  }

  async getUserOS(period: Period) {
    const { start, end } = getDateRange(period);
    const format = getGroupByFormat(period);
    const pushTokens = await this.pushTokenRepository.find({
      where: { createdAt: Between(start, end) },
      select: { os: true, createdAt: true },
      order: { createdAt: 'ASC' },
    });

    const androidGrouped: Record<string, number> = {};
    const iosGrouped: Record<string, number> = {};

    if (format === 'day') {
      eachDay(start, end, (d) => {
        const key = String(d.getDate()).padStart(2, '0');
        androidGrouped[key] = 0;
        iosGrouped[key] = 0;
      });
    } else {
      eachMonth(start, end, (d) => {
        const key = d.toLocaleDateString('en-US', { month: 'short' });
        androidGrouped[key] = 0;
        iosGrouped[key] = 0;
      });
    }

    for (const pt of pushTokens) {
      const key =
        format === 'day'
          ? String(pt.createdAt.getDate()).padStart(2, '0')
          : pt.createdAt.toLocaleDateString('en-US', { month: 'short' });
      if (pt.os === 'ios') {
        iosGrouped[key] = (iosGrouped[key] || 0) + 1;
      } else {
        androidGrouped[key] = (androidGrouped[key] || 0) + 1;
      }
    }

    const android = Object.entries(androidGrouped).map(([date, value]) => ({
      date,
      value,
    }));
    const ios = Object.entries(iosGrouped).map(([date, value]) => ({
      date,
      value,
    }));
    return { android, ios };
  }

  async getAiUsers(period: Period) {
    const { start, end } = getDateRange(period);
    const { start: prevStart, end: prevEnd } = getPreviousDateRange(period);
    const [currentRows, previousRows, allRows, totalUsers] = await Promise.all([
      this.aiDiagnosisRepository.find({
        where: { createdAt: Between(start, end) },
        select: { userId: true },
      }),
      this.aiDiagnosisRepository.find({
        where: { createdAt: Between(prevStart, prevEnd) },
        select: { userId: true },
      }),
      this.aiDiagnosisRepository.find({ select: { userId: true } }),
      this.userRepository.count(),
    ]);

    const currentUnique = new Set(currentRows.map((d) => d.userId)).size;
    const previousUnique = new Set(previousRows.map((d) => d.userId)).size;
    const totalUnique = new Set(allRows.map((d) => d.userId)).size;
    const gaugePercentage =
      totalUsers > 0 ? Math.round((totalUnique / totalUsers) * 100) : 0;

    return {
      totalAiUsers: totalUnique,
      ...calcChange(currentUnique, previousUnique),
      gaugePercentage,
    };
  }

  async getAppointments(period: Period) {
    const { start, end } = getDateRange(period);
    const format = getGroupByFormat(period);
    const appointments = await this.appointmentRepository.find({
      where: { createdAt: Between(start, end) },
      select: { status: true, createdAt: true },
      order: { createdAt: 'ASC' },
    });

    const grouped: Record<string, { normal: number; urgent: number }> = {};
    if (format === 'day') {
      for (const d of WEEKDAYS) grouped[d] = { normal: 0, urgent: 0 };
    } else {
      eachMonth(start, end, (d) => {
        const key = d.toLocaleDateString('en-US', { month: 'short' });
        grouped[key] = { normal: 0, urgent: 0 };
      });
    }

    for (const apt of appointments) {
      const key =
        format === 'day'
          ? apt.createdAt.toLocaleDateString('en-US', { weekday: 'short' })
          : apt.createdAt.toLocaleDateString('en-US', { month: 'short' });
      if (!grouped[key]) grouped[key] = { normal: 0, urgent: 0 };
      if (
        apt.status === AppointmentStatus.CANCELLED ||
        apt.status === AppointmentStatus.RESCHEDULED
      ) {
        grouped[key].urgent += 1;
      } else {
        grouped[key].normal += 1;
      }
    }

    const chartData = Object.entries(grouped).map(([day, data]) => ({
      day,
      bar1: data.normal,
      bar2: data.urgent,
    }));
    return { chartData };
  }

  async getUserListStats(period: Period) {
    const { start: prevStart, end: prevEnd } = getPreviousDateRange(period);
    const [
      totalFarmers,
      totalDoctors,
      totalActiveAnimals,
      totalReferralUsers,
      prevFarmers,
      prevDoctors,
      prevActiveAnimals,
      prevReferralUsers,
    ] = await Promise.all([
      this.userRepository.count({ where: { role: UserRole.USER } }),
      this.userRepository.count({ where: { role: UserRole.DOCTOR } }),
      this.animalRepository.count(),
      this.referralRepository.count({
        where: { referralCount: MoreThan(0) },
      }),
      this.userRepository.count({
        where: {
          role: UserRole.USER,
          createdAt: Between(prevStart, prevEnd),
        },
      }),
      this.userRepository.count({
        where: {
          role: UserRole.DOCTOR,
          createdAt: Between(prevStart, prevEnd),
        },
      }),
      this.animalRepository.count(),
      this.referralRepository.count({
        where: {
          referralCount: MoreThan(0),
          createdAt: Between(prevStart, prevEnd),
        },
      }),
    ]);

    return {
      totalFarmers: {
        value: totalFarmers,
        ...calcChange(totalFarmers, prevFarmers),
      },
      totalDoctors: {
        value: totalDoctors,
        ...calcChange(totalDoctors, prevDoctors),
      },
      activeAnimals: {
        value: totalActiveAnimals,
        ...calcChange(totalActiveAnimals, prevActiveAnimals),
      },
      referralUsers: {
        value: totalReferralUsers,
        ...calcChange(totalReferralUsers, prevReferralUsers),
      },
    };
  }

  async getUserLocation(
    period: Period,
    role: 'farmer' | 'doctor',
    filter: 'District' | 'Upazila' | 'Division',
  ) {
    void period;
    const locationField =
      filter === 'Division'
        ? 'division'
        : filter === 'Upazila'
          ? 'upazila'
          : 'district';
    const roleFilter = role === 'farmer' ? UserRole.USER : UserRole.DOCTOR;

    const users = await this.userRepository.find({
      where: { role: roleFilter },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) return { chartData: [] };

    const addresses = await this.addressRepository.find({
      where: { userId: In(userIds) },
      select: {
        id: true,
        [locationField]: true,
      },
    });

    const grouped: Record<string, number> = {};
    for (const addr of addresses) {
      const loc = (addr as unknown as Record<string, string>)[locationField];
      if (loc) grouped[loc] = (grouped[loc] || 0) + 1;
    }

    const chartData = Object.entries(grouped)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
    return { chartData };
  }

  async getDailyUsers(period: Period) {
    const { start, end } = getDateRange(period);
    const { start: prevStart, end: prevEnd } = getPreviousDateRange(period);
    const format = getGroupByFormat(period);
    const users = await this.userRepository.find({
      where: { createdAt: Between(start, end) },
      select: { createdAt: true },
      order: { createdAt: 'ASC' },
    });

    const grouped: Record<string, number> = {};
    if (format === 'day') {
      for (const d of WEEKDAYS) grouped[d] = 0;
    } else {
      eachMonth(start, end, (d) => {
        grouped[d.toLocaleDateString('en-US', { month: 'short' })] = 0;
      });
    }

    for (const user of users) {
      const key =
        format === 'day'
          ? user.createdAt.toLocaleDateString('en-US', { weekday: 'short' })
          : user.createdAt.toLocaleDateString('en-US', { month: 'short' });
      grouped[key] = (grouped[key] || 0) + 1;
    }

    const chartData = Object.entries(grouped).map(([day, users]) => ({
      day,
      users,
    }));

    const totalCurrent = users.length;
    const prevUsers = await this.userRepository.count({
      where: { createdAt: Between(prevStart, prevEnd) },
    });
    return {
      chartData,
      summary: {
        total: totalCurrent,
        ...calcChange(totalCurrent, prevUsers),
      },
    };
  }

  async getRegisteredAnimals(period: Period) {
    void period;
    const totalAnimals = await this.animalRepository.count();
    const chartData = [
      { day: 'M', fullDay: 'Mon', count: Math.round(totalAnimals * 0.15) },
      { day: 'T', fullDay: 'Tue', count: Math.round(totalAnimals * 0.25) },
      { day: 'W', fullDay: 'Wed', count: Math.round(totalAnimals * 0.08) },
      { day: 'T', fullDay: 'Thu', count: Math.round(totalAnimals * 0.3) },
      { day: 'F', fullDay: 'Fri', count: Math.round(totalAnimals * 0.22) },
      { day: 'S', fullDay: 'Sat', count: Math.round(totalAnimals * 0.24) },
      { day: 'S', fullDay: 'Sun', count: Math.round(totalAnimals * 0.22) },
    ];
    return {
      chartData,
      summary: { total: totalAnimals, changePercent: 0, isPositive: true },
    };
  }

  async getTaskFeatureUsers(period: Period) {
    const { start, end } = getDateRange(period);
    const { start: prevStart, end: prevEnd } = getPreviousDateRange(period);
    const tasks = await this.taskRepository.find({
      where: { createdAt: Between(start, end) },
      select: { userId: true, createdAt: true },
      order: { createdAt: 'ASC' },
    });

    const grouped: Record<string, number> = {};
    if (period === 'last_7_days' || period === 'last_30_days') {
      eachDay(start, end, (d) => {
        grouped[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
      });
    } else {
      for (const m of MONTHS_UPPER) grouped[m] = 0;
    }

    const userSeenPerPeriod = new Map<string, Set<number>>();
    for (const task of tasks) {
      const key =
        period === 'last_7_days' || period === 'last_30_days'
          ? task.createdAt.toLocaleDateString('en-US', { weekday: 'short' })
          : task.createdAt
              .toLocaleDateString('en-US', { month: 'short' })
              .toUpperCase();
      if (!userSeenPerPeriod.has(key)) {
        userSeenPerPeriod.set(key, new Set());
      }
      userSeenPerPeriod.get(key)!.add(task.userId);
    }
    userSeenPerPeriod.forEach((users, key) => {
      grouped[key] = users.size;
    });

    const chartData = Object.entries(grouped).map(([month, value]) => ({
      month,
      value,
    }));

    const totalCurrent = new Set(tasks.map((t) => t.userId)).size;
    const prevTasks = await this.taskRepository.find({
      where: { createdAt: Between(prevStart, prevEnd) },
      select: { userId: true },
    });
    const totalPrevious = new Set(prevTasks.map((t) => t.userId)).size;

    return {
      chartData,
      summary: {
        total: totalCurrent,
        ...calcChange(totalCurrent, totalPrevious),
      },
    };
  }

  async getRetention(period: Period) {
    const { start, end } = getDateRange(period);
    const { start: prevStart, end: prevEnd } = getPreviousDateRange(period);
    const format = getGroupByFormat(period);
    const refreshTokens = await this.refreshTokenRepository.find({
      where: { createdAt: Between(start, end) },
      select: { userId: true, createdAt: true },
      order: { createdAt: 'ASC' },
    });

    const grouped: Record<string, number> = {};
    if (format === 'day') {
      for (const d of WEEKDAYS) grouped[d] = 0;
    } else {
      eachMonth(start, end, (d) => {
        grouped[d.toLocaleDateString('en-US', { month: 'short' })] = 0;
      });
    }

    const userFirstSeen = new Map<number, Date>();
    for (const rt of refreshTokens) {
      const key =
        format === 'day'
          ? rt.createdAt.toLocaleDateString('en-US', { weekday: 'short' })
          : rt.createdAt.toLocaleDateString('en-US', { month: 'short' });
      if (!grouped[key]) grouped[key] = 0;
      const existing = userFirstSeen.get(rt.userId);
      if (!existing) {
        userFirstSeen.set(rt.userId, rt.createdAt);
        grouped[key] += 1;
      }
    }

    const chartData = Object.entries(grouped).map(([day, value]) => ({
      day,
      value,
    }));

    const totalCurrent = new Set(refreshTokens.map((rt) => rt.userId)).size;
    const prevRefreshTokens = await this.refreshTokenRepository.find({
      where: { createdAt: Between(prevStart, prevEnd) },
      select: { userId: true },
    });
    const totalPrevious = new Set(prevRefreshTokens.map((rt) => rt.userId))
      .size;

    const allValues = chartData.map((d) => d.value);
    const targetLine =
      allValues.length > 0
        ? Math.round(allValues.reduce((a, b) => a + b, 0) / allValues.length)
        : 0;

    return {
      chartData,
      summary: {
        total: totalCurrent,
        ...calcChange(totalCurrent, totalPrevious),
      },
      targetLine,
    };
  }

  private async findUserList(
    role: UserRole,
    page: number,
    limit: number,
    search?: string,
    status?: string,
    numericExact = false,
  ) {
    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.role = :role', { role })
      .orderBy('u.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .select(USER_LIST_FIELDS.map((f) => `u.${f}`));

    if (status && status !== 'all') {
      if (status === 'active') qb.andWhere('u.verified = :v', { v: true });
      if (status === 'inactive' || status === 'pending')
        qb.andWhere('u.verified = :v', { v: false });
    }

    if (search) {
      const searchId = parseInt(search, 10);
      if (
        numericExact &&
        !isNaN(searchId) &&
        String(searchId) === search.trim()
      ) {
        qb.andWhere('u.id = :searchId', { searchId });
      } else {
        qb.andWhere(
          new Brackets((w) => {
            w.where('LOWER(u.name) LIKE LOWER(:term)', { term: `%${search}%` })
              .orWhere('LOWER(u.email) LIKE LOWER(:term)', {
                term: `%${search}%`,
              })
              .orWhere('LOWER(u.phone) LIKE LOWER(:term)', {
                term: `%${search}%`,
              });
            if (!numericExact && !isNaN(searchId)) {
              w.orWhere('u.id = :searchId', { searchId });
            }
          }),
        );
      }
    }

    const [users, total] = await qb.getManyAndCount();
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getFarmersList(
    page: number,
    limit: number,
    search?: string,
    status?: string,
  ) {
    return this.findUserList(UserRole.USER, page, limit, search, status, false);
  }

  async getDoctorsList(
    page: number,
    limit: number,
    search?: string,
    status?: string,
  ) {
    return this.findUserList(
      UserRole.DOCTOR,
      page,
      limit,
      search,
      status,
      true,
    );
  }

  private async findUserByRole(id: number, role: UserRole) {
    const user = await this.userRepository.findOne({
      where: { id, role },
      select: Object.fromEntries(USER_LIST_FIELDS.map((f) => [f, true])),
    });
    return user || null;
  }

  async getFarmerById(id: number) {
    const user = await this.findUserByRole(id, UserRole.USER);
    if (!user) {
      throw new NotFoundException('Farmer not found');
    }
    return user;
  }

  async getDoctorById(id: number) {
    const user = await this.findUserByRole(id, UserRole.DOCTOR);
    if (!user) {
      throw new NotFoundException('Doctor not found');
    }
    return user;
  }

  async deleteFarmer(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user || user.role !== UserRole.USER) {
      throw new NotFoundException('Farmer not found');
    }
    await this.userRepository.remove(user);
  }

  async deleteDoctor(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user || user.role !== UserRole.DOCTOR) {
      throw new NotFoundException('Doctor not found');
    }
    await this.userRepository.remove(user);
  }
}
