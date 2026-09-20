import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  Appointment,
  AppointmentStatus,
} from '../appointments/appointment.entity';
import { Task } from '../tasks/task.entity';
import { DoctorTimeOff } from '../time-off/doctor-time-off.entity';
import { Availability } from '../doctors/availability.entity';

export interface CalendarDay {
  date: string;
  appointments: Appointment[];
  tasks: Task[];
  blockTimes: DoctorTimeOff[];
}

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(DoctorTimeOff)
    private readonly timeOffRepository: Repository<DoctorTimeOff>,
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
  ) {}

  async getDoctorMonthlyCalendar(
    doctorId: number,
    month: number,
    year: number,
  ): Promise<CalendarDay[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [appointments, tasks, blockTimes] = await Promise.all([
      this.appointmentRepository.find({
        where: {
          doctorId,
          startAt: MoreThanOrEqual(startDate),
          endAt: LessThanOrEqual(endDate),
        },
        order: { startAt: 'ASC' },
      }),
      this.taskRepository.find({
        where: {
          userId: doctorId,
          dueDate: Between(startDate, endDate),
        },
      }),
      this.timeOffRepository.find({
        where: {
          doctorId,
          startDate: Between(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
          ),
        },
      }),
    ]);

    return this.buildCalendarDays(
      startDate,
      endDate,
      appointments,
      tasks,
      blockTimes,
    );
  }

  async getDoctorWeeklyCalendar(
    doctorId: number,
    date: string,
  ): Promise<CalendarDay[]> {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59);

    const [appointments, tasks, blockTimes] = await Promise.all([
      this.appointmentRepository.find({
        where: {
          doctorId,
          startAt: MoreThanOrEqual(start),
          endAt: LessThanOrEqual(end),
        },
        order: { startAt: 'ASC' },
      }),
      this.taskRepository.find({
        where: {
          userId: doctorId,
          dueDate: Between(start, end),
        },
      }),
      this.timeOffRepository.find({
        where: {
          doctorId,
          startDate: Between(
            start.toISOString().split('T')[0],
            end.toISOString().split('T')[0],
          ),
        },
      }),
    ]);

    return this.buildCalendarDays(start, end, appointments, tasks, blockTimes);
  }

  async getUserAppointments(
    userId: number,
    date: string,
    view: 'day' | 'week' | 'month',
  ): Promise<Appointment[]> {
    const start = new Date(date);
    let end = new Date(date);

    if (view === 'week') {
      start.setDate(start.getDate() - start.getDay());
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59);
    } else if (view === 'month') {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1, 0);
      end.setHours(23, 59, 59);
    }

    return this.appointmentRepository.find({
      where: {
        patientId: userId,
        startAt: MoreThanOrEqual(start),
        endAt: LessThanOrEqual(end),
      },
      order: { startAt: 'ASC' },
    });
  }

  async getBadges(
    doctorId: number,
    month: number,
    year: number,
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [appointments, blockTimes, availabilities] = await Promise.all([
      this.appointmentRepository.find({
        where: {
          doctorId,
          startAt: MoreThanOrEqual(startDate),
          endAt: LessThanOrEqual(endDate),
        },
      }),
      this.timeOffRepository.find({
        where: {
          doctorId,
          startDate: Between(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
          ),
        },
      }),
      this.availabilityRepository.find({
        where: { doctorId, isActive: true },
      }),
    ]);

    const badges: Record<string, number> = {};
    for (const apt of appointments) {
      const dateStr = apt.startAt.toISOString().split('T')[0];
      badges[dateStr] = (badges[dateStr] || 0) + 1;
    }

    const totalAppointments = appointments.length;

    // Count blocked days from doctor_time_off
    const blockedDays = new Set<string>();
    for (const bt of blockTimes) {
      const btStart = new Date(bt.startDate);
      const btEnd = new Date(bt.endDate);
      const cursor = new Date(btStart);
      while (cursor <= btEnd) {
        blockedDays.add(cursor.toISOString().split('T')[0]);
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // Count open days: days in month where doctor has availability and is not blocked
    const daysInMonth = new Date(year, month, 0).getDate();
    let openDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dateStr = date.toISOString().split('T')[0];
      if (blockedDays.has(dateStr)) continue;
      const dayOfWeek = date.getDay();
      const hasAvailability = availabilities.some(
        (a) => a.dayOfWeek === dayOfWeek && !a.specificDate,
      );
      if (hasAvailability) openDays++;
    }

    return {
      badges,
      totalAppointments,
      openDays,
      blockedDays: blockedDays.size,
    };
  }

  private buildCalendarDays(
    start: Date,
    end: Date,
    appointments: Appointment[],
    tasks: Task[],
    blockTimes: DoctorTimeOff[],
  ): CalendarDay[] {
    const days: CalendarDay[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        appointments: appointments.filter(
          (a) => a.startAt.toISOString().split('T')[0] === dateStr,
        ),
        tasks: tasks.filter(
          (t) => t.dueDate && t.dueDate.toISOString().split('T')[0] === dateStr,
        ),
        blockTimes: blockTimes.filter((b) => b.startDate === dateStr),
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  }
}
