import { HttpException } from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  TimeOffBillingBreakdown,
  TimeOffConflictInfo,
  TimeOffService,
} from './time-off.service';
import { CreateTimeOffDto } from './dto/create-time-off.dto';
import { DoctorTimeOff } from './doctor-time-off.entity';
import {
  Appointment,
  AppointmentStatus,
} from '../appointments/appointment.entity';
import { User } from '../users/user.entity';
import { Animal } from '../animals/animal.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

interface Conflict409Body {
  statusCode: number;
  message: string;
  conflicts: TimeOffConflictInfo[];
  estimatedWalletDeduction: number;
  billing: TimeOffBillingBreakdown;
}

const makeAppointment = (overrides: Partial<Appointment> = {}): Appointment =>
  ({
    id: 12,
    doctorId: 1,
    patientId: 2,
    animalId: 7,
    startAt: new Date('2026-08-24T10:00:00.000Z'),
    endAt: new Date('2026-08-24T10:30:00.000Z'),
    durationMinutes: 30,
    price: 500,
    paymentStatus: 'paid',
    status: AppointmentStatus.CONFIRMED,
    ...overrides,
  }) as Appointment;

const dto = (overrides: Partial<CreateTimeOffDto> = {}): CreateTimeOffDto => ({
  startDate: '2026-08-24',
  endDate: '2026-08-26',
  reason: 'vacation' as CreateTimeOffDto['reason'],
  ...overrides,
});

const makeService = (appointments: Appointment[]) => {
  const savedAppointments: Appointment[] = [];
  const walletAdjustments: unknown[][] = [];

  const timeOffRepository = {
    create: <T>(input: T): T => input,
    save: <T extends object>(input: T): Promise<T & { id: number }> =>
      Promise.resolve({ id: 1, createdAt: new Date(), ...input } as T & {
        id: number;
      }),
    find: (): Promise<DoctorTimeOff[]> => Promise.resolve([]),
    findOneBy: (): Promise<DoctorTimeOff | null> => Promise.resolve(null),
    remove: (): Promise<DoctorTimeOff | null> => Promise.resolve(null),
  };

  const appointmentRepository = {
    createQueryBuilder: () => {
      const qb: {
        where: () => typeof qb;
        andWhere: () => typeof qb;
        getMany: () => Promise<Appointment[]>;
      } = {
        where: () => qb,
        andWhere: () => qb,
        getMany: () => Promise.resolve(appointments),
      };
      return qb;
    },
    save: (appointment: Appointment): Promise<Appointment> => {
      savedAppointments.push(appointment);
      return Promise.resolve(appointment);
    },
    findOneBy: (): Promise<Appointment | null> => Promise.resolve(null),
  };

  const userRepository = {
    find: (): Promise<Array<{ id: number; name: string }>> =>
      Promise.resolve([{ id: 2, name: 'Sophia Rodriguez' }]),
  };
  const animalRepository = {
    find: (): Promise<Array<{ id: number; name: string }>> =>
      Promise.resolve([{ id: 7, name: 'Clara' }]),
  };
  const walletService = {
    adjustBalance: (...args: unknown[]): Promise<void> => {
      walletAdjustments.push(args);
      return Promise.resolve();
    },
  };
  const notificationsService = {
    createNotification: jest.fn((): Promise<object> => Promise.resolve({})),
  };

  const service = new TimeOffService(
    timeOffRepository as unknown as Repository<DoctorTimeOff>,
    appointmentRepository as unknown as Repository<Appointment>,
    userRepository as unknown as Repository<User>,
    animalRepository as unknown as Repository<Animal>,
    walletService as unknown as WalletService,
    notificationsService as unknown as NotificationsService,
  );

  return {
    service,
    walletAdjustments,
    savedAppointments,
    notificationsService,
  };
};

const expect409 = async (
  promise: Promise<unknown>,
): Promise<Conflict409Body> => {
  let thrown: unknown;
  try {
    await promise;
  } catch (err) {
    thrown = err;
  }
  expect(thrown).toBeInstanceOf(HttpException);
  const httpException = thrown as HttpException;
  expect(httpException.getStatus()).toBe(409);
  return httpException.getResponse() as Conflict409Body;
};

describe('TimeOffService', () => {
  describe('create (without force)', () => {
    it('throws a 409 carrying conflicts, names and a Pending billing breakdown', async () => {
      const { service } = makeService([makeAppointment()]);

      const body = await expect409(service.create(1, 9, dto()));

      expect(body.statusCode).toBe(409);
      expect(body.conflicts).toHaveLength(1);
      expect(body.conflicts[0]).toMatchObject({
        id: 12,
        price: 500,
        paymentStatus: 'paid',
        animalName: 'Clara',
        ownerName: 'Sophia Rodriguez',
      });
      expect(body.estimatedWalletDeduction).toBe(550);
      expect(body.billing).toEqual({
        appointmentsFeeTotal: 500,
        cancellationFeesTotal: 50,
        totalFee: 550,
        cancellationFeeRate: 0.1,
        status: 'Pending',
      });
    });

    it('counts only paid appointments towards the appointments fee', async () => {
      const { service } = makeService([
        makeAppointment({ id: 12, price: 500, paymentStatus: 'paid' }),
        makeAppointment({ id: 13, price: 300, paymentStatus: 'pending' }),
      ]);

      const body = await expect409(service.create(1, 9, dto()));

      expect(body.billing).toEqual({
        appointmentsFeeTotal: 500,
        cancellationFeesTotal: 80,
        totalFee: 580,
        cancellationFeeRate: 0.1,
        status: 'Pending',
      });
      expect(body.estimatedWalletDeduction).toBe(580);
      expect(body.billing.totalFee).toBe(body.estimatedWalletDeduction);
    });
  });

  describe('create (force: true)', () => {
    it('cancels appointments, settles the wallet and returns a Paid receipt', async () => {
      const appointment = makeAppointment();
      const { service, walletAdjustments, savedAppointments } = makeService([
        appointment,
      ]);

      const result = await service.create(1, 9, dto({ force: true }));

      expect(appointment.status).toBe(AppointmentStatus.CANCELLED);
      expect(savedAppointments).toHaveLength(1);
      expect(result.cancelledAppointments[0]).toMatchObject({
        id: 12,
        animalName: 'Clara',
        ownerName: 'Sophia Rodriguez',
      });
      expect(result.refundedTotal).toBe(500);
      expect(result.cancellationFeesTotal).toBe(50);
      expect(result.walletDeduction).toBe(550);
      expect(result.billing).toEqual({
        appointmentsFeeTotal: 500,
        cancellationFeesTotal: 50,
        totalFee: 550,
        cancellationFeeRate: 0.1,
        status: 'Paid',
      });
      expect(walletAdjustments).toEqual([
        [2, 500, 'time_off_cancellation_refund', 'Appointment', '12'],
        [9, -550, 'time_off_cancellation_fee', 'Appointment', '12'],
      ]);
    });

    it('charges only the cancellation fee for unpaid appointments', async () => {
      const appointment = makeAppointment({ paymentStatus: 'pending' });
      const { service, walletAdjustments, notificationsService } = makeService([
        appointment,
      ]);

      const result = await service.create(1, 9, dto({ force: true }));

      expect(result.refundedTotal).toBe(0);
      expect(result.billing).toEqual({
        appointmentsFeeTotal: 0,
        cancellationFeesTotal: 50,
        totalFee: 50,
        cancellationFeeRate: 0.1,
        status: 'Paid',
      });
      expect(walletAdjustments).toEqual([
        [9, -50, 'time_off_cancellation_fee', 'Appointment', '12'],
      ]);
      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('blocks the range without touching the wallet when there are no conflicts', async () => {
      const { service, walletAdjustments } = makeService([]);

      const result = await service.create(1, 9, dto());

      expect(result.cancelledAppointments).toEqual([]);
      expect(result.walletDeduction).toBe(0);
      expect(result.billing.status).toBe('Paid');
      expect(walletAdjustments).toHaveLength(0);
    });
  });
});
