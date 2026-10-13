import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { IPushProvider, PushMessage } from '../push-provider.interface';
import { getAndroidChannelId } from '../fcm-config.util';

@Injectable()
export class ExpoPushProvider implements IPushProvider {
  private readonly logger = new Logger(ExpoPushProvider.name);
  private readonly expo = new Expo();

  async sendPush(messages: PushMessage[]): Promise<string[]> {
    const validMessages = messages.filter((m) => {
      if (!Expo.isExpoPushToken(m.token)) {
        this.logger.warn(`Skipping non-Expo push token: ${String(m.token)}`);
        return false;
      }
      return true;
    });
    if (validMessages.length === 0) {
      return [];
    }

    const channelId = getAndroidChannelId();
    const expoMessages: ExpoPushMessage[] = validMessages.map((m) => ({
      to: m.token,
      title: m.title,
      body: m.body,
      data: m.data,
      sound: 'default',
      // Lock-screen / killed-app delivery: high priority puts Android pushes
      // on FCM's high-priority queue (bypasses Doze) and maps to
      // apns-priority: 10 on iOS; contentAvailable sets content-available: 1
      // so iOS can wake the app in the background; channelId targets the
      // app's HIGH-importance Android channel.
      priority: 'high',
      channelId,
      contentAvailable: true,
    }));

    const staleTokens: string[] = [];
    const chunks = this.expo.chunkPushNotifications(expoMessages);
    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.forEach((ticket, i) => {
          if (
            ticket.status === 'error' &&
            ticket.details?.error === 'DeviceNotRegistered'
          ) {
            const message = chunk[i];
            staleTokens.push(
              Array.isArray(message.to) ? message.to[0] : message.to,
            );
          } else if (ticket.status === 'error') {
            this.logger.warn(`Push ticket error: ${ticket.message}`);
          }
        });
      } catch (err) {
        this.logger.error('Failed to send Expo push notification chunk', err);
      }
    }

    return staleTokens;
  }
}
