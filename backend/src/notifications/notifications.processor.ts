import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Expo } from 'expo-server-sdk';
import { In, Repository } from 'typeorm';
import { PushToken } from './push-token.entity';
import { Notification, NotificationType } from './notification.entity';
import { PUSH_PROVIDER } from './push-provider.interface';
import type { IPushProvider } from './push-provider.interface';

interface SendPushJobData {
  userId: number;
  title: string;
  body: string;
  notificationId?: number;
  type?: string;
}

interface BroadcastJobData {
  userIds: number[];
  title: string;
  body: string;
  type?: NotificationType;
}

@Processor('notifications-queue')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    @InjectRepository(PushToken)
    private readonly pushTokenRepository: Repository<PushToken>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @Inject(PUSH_PROVIDER)
    private readonly pushProvider: IPushProvider,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'send-push') {
      const { userId, title, body, notificationId, type } =
        job.data as SendPushJobData;
      await this.pushToUsers([userId], title, body, { notificationId, type });
      return { success: true };
    }

    if (job.name === 'broadcast') {
      const { userIds, title, body, type } = job.data as BroadcastJobData;
      const rows = userIds.map((userId) =>
        this.notificationRepository.create({
          userId,
          title,
          body,
          type: type ?? NotificationType.SYSTEM,
          isRead: false,
        }),
      );
      await this.notificationRepository.save(rows);
      await this.pushToUsers(userIds, title, body, { type });
      this.logger.log(
        `Broadcast notification created for ${userIds.length} user(s)`,
      );
      return { success: true, count: userIds.length };
    }
  }

  private async pushToUsers(
    userIds: number[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const tokens = await this.pushTokenRepository.find({
      where: { userId: In(userIds) },
    });
    if (tokens.length === 0) {
      return;
    }

    const selected = this.selectTokensPerDevice(tokens);
    const staleTokens = await this.pushProvider.sendPush(
      selected.map((t) => ({ token: t.token, title, body, data })),
    );
    if (staleTokens.length > 0) {
      await this.pushTokenRepository.delete({ token: In(staleTokens) });
      this.logger.log(`Pruned ${staleTokens.length} stale push token(s)`);
    }
  }

  /**
   * A device may register both its native FCM token and its Expo push token.
   * Sending to both would deliver the same notification twice on that device,
   * so group tokens by device and keep only one per group — preferring the
   * native (non-Expo) token, since it goes straight through FCM. Tokens
   * without a deviceId are each treated as their own device.
   */
  private selectTokensPerDevice(tokens: PushToken[]): PushToken[] {
    const groups = new Map<string, PushToken[]>();
    for (const t of tokens) {
      const key = t.deviceId ?? `token:${t.token}`;
      const group = groups.get(key);
      if (group) {
        group.push(t);
      } else {
        groups.set(key, [t]);
      }
    }

    const selected: PushToken[] = [];
    for (const group of groups.values()) {
      const native = group.find((t) => !Expo.isExpoPushToken(t.token));
      selected.push(native ?? group[0]);
    }
    return selected;
  }
}
