import { Injectable } from '@nestjs/common';
import { Expo } from 'expo-server-sdk';
import { IPushProvider, PushMessage } from '../push-provider.interface';
import { ExpoPushProvider } from './expo-push.provider';
import { FcmPushProvider } from './fcm-push.provider';

/**
 * Routes each message to the right transport based on its token format:
 *  - `ExponentPushToken[...]` / `ExpoPushToken[...]` → Expo push service
 *    (used by iOS devices and any Expo-registered token)
 *  - anything else → treated as a native FCM registration token and sent
 *    through firebase-admin.
 *
 * Stale tokens from both transports are merged so the caller still prunes
 * them uniformly.
 */
@Injectable()
export class RoutingPushProvider implements IPushProvider {
  constructor(
    private readonly expo: ExpoPushProvider,
    private readonly fcm: FcmPushProvider,
  ) {}

  async sendPush(messages: PushMessage[]): Promise<string[]> {
    const expoMessages: PushMessage[] = [];
    const fcmMessages: PushMessage[] = [];

    for (const m of messages) {
      if (Expo.isExpoPushToken(m.token)) {
        expoMessages.push(m);
      } else {
        fcmMessages.push(m);
      }
    }

    const [expoStale, fcmStale] = await Promise.all([
      expoMessages.length > 0
        ? this.expo.sendPush(expoMessages)
        : Promise.resolve([]),
      fcmMessages.length > 0
        ? this.fcm.sendPush(fcmMessages)
        : Promise.resolve([]),
    ]);

    return [...expoStale, ...fcmStale];
  }
}
