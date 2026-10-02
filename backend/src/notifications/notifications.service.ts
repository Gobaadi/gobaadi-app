import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { PushToken } from './push-token.entity';
import { NotificationPreference } from './notification-preference.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user.entity';
import { PaginatedResult } from '../common/paginated-result.interface';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(PushToken)
    private readonly pushTokenRepository: Repository<PushToken>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
    @InjectQueue('notifications-queue')
    private readonly notificationsQueue: Queue,
    private readonly usersService: UsersService,
  ) {}

  async createNotification(
    userId: number,
    title: string,
    body: string,
    type: NotificationType,
    referenceType?: string,
    referenceId?: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      title,
      body,
      type,
      referenceType,
      referenceId,
      isRead: false,
    });

    const saved = await this.notificationRepository.save(notification);

    try {
      await this.notificationsQueue.add('send-push', {
        userId,
        notificationId: saved.id,
        title: saved.title,
        body: saved.body,
        type: saved.type,
      });
    } catch (err) {
      console.warn('Failed to queue push notification job', err);
    }

    return saved;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number, userId: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOneBy({ id });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not own this notification');
    }
    return notification;
  }

  async getUnreadCount(userId: number): Promise<{ count: number }> {
    const count = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(id: number, userId: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOneBy({ id });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not own this notification');
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async registerPushToken(
    userId: number,
    token: string,
    deviceId?: string,
    os?: string,
  ): Promise<PushToken> {
    const existing = await this.pushTokenRepository.findOneBy({ token });
    if (existing) {
      existing.userId = userId;
      existing.deviceId = deviceId;
      if (os) existing.os = os;
      return this.pushTokenRepository.save(existing);
    }
    const pushToken = this.pushTokenRepository.create({
      userId,
      token,
      deviceId,
      os,
    });
    return this.pushTokenRepository.save(pushToken);
  }

  async unregisterPushToken(userId: number, token: string): Promise<void> {
    await this.pushTokenRepository.delete({ userId, token });
  }

  /** Persists one Notification per recipient and enqueues push delivery for each. */
  async sendToUsers(
    userIds: number[],
    title: string,
    body: string,
    type: NotificationType = NotificationType.SYSTEM,
    referenceType?: string,
    referenceId?: string,
  ): Promise<{ count: number }> {
    const rows = userIds.map((userId) =>
      this.notificationRepository.create({
        userId,
        title,
        body,
        type,
        referenceType,
        referenceId,
        isRead: false,
      }),
    );
    const saved = await this.notificationRepository.save(rows);

    await Promise.all(
      saved.map((notification) =>
        this.notificationsQueue.add('send-push', {
          userId: notification.userId,
          notificationId: notification.id,
          title: notification.title,
          body: notification.body,
          type: notification.type,
        }),
      ),
    );

    return { count: saved.length };
  }

  /**
   * Resolves the target audience and enqueues a single 'broadcast' job that
   * does the per-user row creation + push fan-out inside the worker, so the
   * admin request that triggered this returns immediately regardless of
   * audience size.
   */
  async broadcastToRole(
    title: string,
    body: string,
    type: NotificationType = NotificationType.SYSTEM,
    role?: UserRole,
  ): Promise<{ queued: boolean }> {
    const userIds = await this.usersService.findAllIds(role);
    if (userIds.length === 0) {
      return { queued: false };
    }

    await this.notificationsQueue.add('broadcast', {
      userIds,
      title,
      body,
      type,
    });

    return { queued: true };
  }

  async findAllPaginated(
    page: number,
    limit: number,
    type?: NotificationType,
    userId?: number,
  ): Promise<PaginatedResult<Notification>> {
    const where: FindOptionsWhere<Notification> = {};
    if (type) where.type = type;
    if (userId) where.userId = userId;

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, page, limit, total };
  }

  async getPreferences(userId: number): Promise<NotificationPreference> {
    let pref = await this.preferenceRepository.findOneBy({ userId });
    if (!pref) {
      pref = this.preferenceRepository.create({ userId });
      pref = await this.preferenceRepository.save(pref);
    }
    return pref;
  }

  async updatePreferences(
    userId: number,
    data: Partial<NotificationPreference>,
  ): Promise<NotificationPreference> {
    let pref = await this.preferenceRepository.findOneBy({ userId });
    if (!pref) {
      pref = this.preferenceRepository.create({ userId });
    }

    const BOOLEAN_KEYS = [
      'appointmentReminders',
      'promotionalOffers',
      'chatMessages',
      'prescriptionUpdates',
      'labResults',
      'vaccinationReminders',
      'systemUpdates',
      'weatherAlerts',
      'taskReminders',
      'followUpReminders',
      'hygieneReminders',
    ] as const;

    for (const key of BOOLEAN_KEYS) {
      const value = data[key];
      if (value !== undefined) pref[key] = value;
    }

    return this.preferenceRepository.save(pref);
  }
}
