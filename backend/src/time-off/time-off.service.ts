import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DoctorTimeOff } from './doctor-time-off.entity';
import { CreateTimeOffDto } from './dto/create-time-off.dto';
import {
  Appointment,
  AppointmentStatus,
} from '../appointments/appointment.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { User } from '../users/user.entity';
import { Animal } from '../animals/animal.entity';
export { DoctorTimeOff } from './doctor-time-off.entity';

/**
 * Placeholder business rule — the doctor absorbs the full refund to the
 * patient plus this percentage as a penalty fee when forced to cancel due to
 * blocking time off. Confirm the real rate with product before shipping.
 */
const CANCELLATION_FEE_RATE = 0.1;

export interface TimeOffConflictInfo {
  id: number;
  startAt: Date;
  patientId: number;
  price: number;
  animalId?: number | null;
  paymentStatus?: string;
  animalName?: string | null;
  ownerName?: string | null;
}

export interface TimeOffBillingBreakdown {
  appointmentsFeeTotal: number;
  cancellationFeesTotal: number;
  totalFee: number;
  cancellationFeeRate: number;
  status: 'Pending' | 'Paid';
}

export interface CreateTimeOffResult {
  timeOff: DoctorTimeOff;
  cancelledAppointments: TimeOffConflictInfo[];
  refundedTotal: number;
  cancellationFeesTotal: number;
  walletDeduction: number;
  billing: TimeOffBillingBreakdown;
}

@Injectable()
export class TimeOffService {
  constructor(
    @InjectRepository(DoctorTimeOff)
    private readonly timeOffRepository: Repository<DoctorTimeOff>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(doctorId: number): Promise<DoctorTimeOff[]> {
    return this.timeOffRepository.find({
      where: { doctorId },
      order: { startDate: 'DESC' },
    });
  }

  async create(
    doctorId: number,
    doctorUserId: number,
    dto: CreateTimeOffDto,
  ): Promise<CreateTimeOffResult> {
    const conflicts = await this.findConflicts(
      doctorId,
      dto.startDate,
      dto.endDate,
    );
    const conflictInfo = await this.toConflictInfo(conflicts);

    if (conflicts.length > 0 && !dto.force) {
      throw new HttpException(
        {
          statusCode: 409,
          message:
            'Blocking this time will cancel existing appointments. Confirm with force=true to proceed.',
          conflicts: conflictInfo,
          estimatedWalletDeduction: this.estimateDeduction(conflicts),
          billing: this.buildBilling(conflicts, 'Pending'),
        },
        HttpStatus.CONFLICT,
      );
    }

    const timeOff = await this.timeOffRepository.save(
      this.timeOffRepository.create({
        doctorId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        reason: dto.reason,
        note: dto.note,
      }),
    );

    let refundedTotal = 0;
    let cancellationFeesTotal = 0;

    for (const appointment of conflicts) {
      appointment.status = AppointmentStatus.CANCELLED;
      appointment.cancelledAt = new Date();
      appointment.cancelledByUserId = doctorUserId;
      await this.appointmentRepository.save(appointment);

      const cancellationFee = appointment.price * CANCELLATION_FEE_RATE;
      cancellationFeesTotal += cancellationFee;

      if (appointment.paymentStatus === 'paid') {
        refundedTotal += appointment.price;
        await this.walletService.adjustBalance(
          appointment.patientId,
          appointment.price,
          'time_off_cancellation_refund',
          'Appointment',
          String(appointment.id),
        );
        await this.notificationsService.createNotification(
          appointment.patientId,
          'Appointment cancelled',
          "Your doctor blocked this time off — you've been refunded.",
          NotificationType.BOOKING,
          'Appointment',
          String(appointment.id),
        );
      }

      await this.walletService.adjustBalance(
        doctorUserId,
        -(
          appointment.price * (appointment.paymentStatus === 'paid' ? 1 : 0) +
          cancellationFee
        ),
        'time_off_cancellation_fee',
        'Appointment',
        String(appointment.id),
      );
    }

    return {
      timeOff,
      cancelledAppointments: conflictInfo,
      refundedTotal,
      cancellationFeesTotal,
      walletDeduction: refundedTotal + cancellationFeesTotal,
      billing: this.buildBilling(conflicts, 'Paid'),
    };
  }

  async remove(doctorId: number, id: number): Promise<void> {
    const timeOff = await this.timeOffRepository.findOneBy({ id, doctorId });
    if (!timeOff) {
      throw new NotFoundException('Time off not found');
    }
    await this.timeOffRepository.remove(timeOff);
  }

  private async findConflicts(
    doctorId: number,
    startDate: string,
    endDate: string,
  ): Promise<Appointment[]> {
    const rangeStart = new Date(`${startDate}T00:00:00`);
    const rangeEnd = new Date(`${endDate}T23:59:59.999`);
    return this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere("a.status != 'CANCELLED'")
      .andWhere('a.startAt BETWEEN :rangeStart AND :rangeEnd', {
        rangeStart,
        rangeEnd,
      })
      .getMany();
  }

  private estimateDeduction(conflicts: Appointment[]): number {
    return conflicts.reduce((sum, a) => {
      const fee = a.price * CANCELLATION_FEE_RATE;
      const refund = a.paymentStatus === 'paid' ? a.price : 0;
      return sum + fee + refund;
    }, 0);
  }

  private async toConflictInfo(
    conflicts: Appointment[],
  ): Promise<TimeOffConflictInfo[]> {
    if (conflicts.length === 0) return [];

    const animalIds = [
      ...new Set(
        conflicts
          .map((a) => a.animalId)
          .filter((id): id is number => typeof id === 'number'),
      ),
    ];
    const ownerIds = [...new Set(conflicts.map((a) => a.patientId))];

    const [animals, owners] = await Promise.all([
      animalIds.length > 0
        ? this.animalRepository.find({ where: { id: In(animalIds) } })
        : Promise.resolve([]),
      ownerIds.length > 0
        ? this.userRepository.find({ where: { id: In(ownerIds) } })
        : Promise.resolve([]),
    ]);
    const animalById = new Map(animals.map((an) => [an.id, an]));
    const ownerById = new Map(owners.map((u) => [u.id, u]));

    return conflicts.map((a) => ({
      id: a.id,
      startAt: a.startAt,
      patientId: a.patientId,
      price: a.price,
      animalId: a.animalId ?? null,
      paymentStatus: a.paymentStatus,
      animalName: a.animalId
        ? (animalById.get(a.animalId)?.name ?? null)
        : null,
      ownerName: ownerById.get(a.patientId)?.name ?? null,
    }));
  }

  private buildBilling(
    conflicts: Appointment[],
    status: TimeOffBillingBreakdown['status'],
  ): TimeOffBillingBreakdown {
    const appointmentsFeeTotal = conflicts.reduce(
      (sum, a) => sum + (a.paymentStatus === 'paid' ? a.price : 0),
      0,
    );
    const cancellationFeesTotal = conflicts.reduce(
      (sum, a) => sum + a.price * CANCELLATION_FEE_RATE,
      0,
    );
    return {
      appointmentsFeeTotal,
      cancellationFeesTotal,
      totalFee: appointmentsFeeTotal + cancellationFeesTotal,
      cancellationFeeRate: CANCELLATION_FEE_RATE,
      status,
    };
  }

  /**
   * Calculate cancellation fee for a specific appointment.
   * Used by the appointment cancel logic.
   */
  async calculateCancellationFee(
    appointmentId: number,
  ): Promise<{ cancellationFee: number; refundAmount: number }> {
    const appointment = await this.appointmentRepository.findOneBy({
      id: appointmentId,
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const cancellationFee = appointment.price * CANCELLATION_FEE_RATE;
    const refundAmount =
      appointment.paymentStatus === 'paid'
        ? appointment.price - cancellationFee
        : 0;

    return { cancellationFee, refundAmount: Math.max(0, refundAmount) };
  }
}
