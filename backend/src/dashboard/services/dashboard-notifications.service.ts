import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
} from '../../notifications/notification.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { User } from '../../users/user.entity';
import {
  DashboardBroadcastNotificationDto,
  CreateNotificationDto,
  DashboardSendNotificationDto,
} from '../dto/notification.dto';

export interface NotificationsMeta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
}

@Injectable()
export class DashboardNotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private project(notification: Notification) {
    const { user, ...rest } = notification;
    return {
      ...rest,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
          }
        : null,
    };
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
    type?: string,
  ): Promise<{
    data: ReturnType<DashboardNotificationsService['project']>[];
    meta: NotificationsMeta;
  }> {
    const qb = this.notificationRepository
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.user', 'user')
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type && type !== 'all') {
      if (!Object.values(NotificationType).includes(type as NotificationType)) {
        throw new BadRequestException(
          `type must be one of: ${Object.values(NotificationType).join(', ')}`,
        );
      }
      qb.andWhere('n.type = :type', { type });
    }

    const q = search?.trim();
    if (q) {
      const numericId = /^\d+$/.test(q) ? parseInt(q, 10) : undefined;
      qb.andWhere(
        new Brackets((w) => {
          w.where('LOWER(n.title) LIKE LOWER(:q)', { q: `%${q}%` })
            .orWhere('LOWER(n.body) LIKE LOWER(:q)', { q: `%${q}%` })
            .orWhere('LOWER(user.name) LIKE LOWER(:q)', { q: `%${q}%` })
            .orWhere('LOWER(user.email) LIKE LOWER(:q)', { q: `%${q}%` })
            .orWhere('LOWER(user.phone) LIKE LOWER(:q)', { q: `%${q}%` });
          if (numericId !== undefined) {
            w.orWhere('n.id = :numericId', { numericId });
          }
        }),
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => this.project(row)),
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
    };
  }

  async findMine(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Notification[]; meta: NotificationsMeta }> {
    const [data, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
    };
  }

  async unreadCount(userId: number): Promise<{ count: number }> {
    const count = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async findOne(id: number) {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return this.project(notification);
  }

  async markRead(id: number, userId: number): Promise<Notification> {
    return this.notificationsService.markAsRead(id, userId);
  }

  async markAllRead(userId: number): Promise<void> {
    await this.notificationsService.markAllAsRead(userId);
  }

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const user = await this.userRepository.findOneBy({ id: dto.userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const notification = this.notificationRepository.create({
      title: dto.title,
      body: dto.body,
      type: dto.type ?? NotificationType.SYSTEM,
      userId: dto.userId,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      occurrence: dto.occurrence,
      time: dto.time,
      isRead: false,
    });
    return this.notificationRepository.save(notification);
  }

  async send(dto: DashboardSendNotificationDto): Promise<{ count: number }> {
    return this.notificationsService.sendToUsers(
      dto.userIds,
      dto.title,
      dto.body,
      dto.type ?? NotificationType.SYSTEM,
      dto.referenceType,
      dto.referenceId,
    );
  }

  async broadcast(
    dto: DashboardBroadcastNotificationDto,
  ): Promise<{ success: boolean; count: number }> {
    const users = await this.userRepository.find({
      where: dto.role ? { role: dto.role } : {},
      select: { id: true },
    });
    if (users.length === 0) {
      return { success: true, count: 0 };
    }
    const rows = users.map((user) =>
      this.notificationRepository.create({
        title: dto.title,
        body: dto.body,
        type: dto.type ?? NotificationType.SYSTEM,
        userId: user.id,
        occurrence: dto.occurrence,
        time: dto.time,
        isRead: false,
      }),
    );
    await this.notificationRepository.save(rows);
    return { success: true, count: users.length };
  }

  async remove(id: number): Promise<void> {
    const notification = await this.notificationRepository.findOneBy({ id });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    await this.notificationRepository.remove(notification);
  }
}
