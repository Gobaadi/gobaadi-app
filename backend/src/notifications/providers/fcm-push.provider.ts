import { Injectable, Logger } from '@nestjs/common';
import { getMessaging, type Message } from 'firebase-admin/messaging';
import { IPushProvider, PushMessage } from '../push-provider.interface';
import { getAndroidChannelId, getFirebaseApp } from '../fcm-config.util';

/**
 * Error codes that mean the token is permanently invalid (app uninstalled /
 * token rotated) so the caller can prune it from `push_tokens`.
 * `INVALID_ARGUMENT` is included because FCM returns it for syntactically
 * invalid/unknown registration tokens.
 */
const STALE_TOKEN_CODES = new Set<string>([
  'messaging/UNREGISTERED',
  'messaging/INVALID_REGISTRATION',
  'messaging/NOT_REGISTERED',
  'messaging/INVALID_ARGUMENT',
]);

/** FCM batch sends accept at most 500 messages per call. */
const BATCH_LIMIT = 500;

/**
 * Sends push notifications directly through Firebase Cloud Messaging.
 *
 * Payload is built so notifications wake killed/closed apps and show on the
 * lock screen:
 *  - Android: `priority: 'high'` puts the message on the high-priority FCM
 *    queue (bypasses Doze), `notification.channelId` targets the app's
 *    HIGH-importance channel (sound + vibration + lock-screen visibility).
 *  - iOS: `apns-priority: 10` displays immediately and
 *    `apns-content-available: 1` wakes the app in the background.
 *
 * No-ops (with a single warning) when firebase-admin credentials are not
 * configured — same defensive style as MailService skipping when no API key
 * is set.
 */
@Injectable()
export class FcmPushProvider implements IPushProvider {
  private readonly logger = new Logger(FcmPushProvider.name);
  private warnedUnconfigured = false;

  async sendPush(messages: PushMessage[]): Promise<string[]> {
    const app = getFirebaseApp();
    if (!app) {
      if (!this.warnedUnconfigured) {
        this.logger.warn(
          'FCM is not configured (set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS) — skipping FCM push',
        );
        this.warnedUnconfigured = true;
      }
      return [];
    }

    const messaging = getMessaging(app);
    const channelId = getAndroidChannelId();
    const staleTokens: string[] = [];

    for (let i = 0; i < messages.length; i += BATCH_LIMIT) {
      const batch = messages.slice(i, i + BATCH_LIMIT);
      try {
        const res = await messaging.sendEach(
          batch.map((m) => this.buildMessage(m, channelId)),
        );

        res.responses.forEach((r, idx) => {
          const token = batch[idx].token;
          if (r.success) return;

          const code = r.error?.code;
          if (code && STALE_TOKEN_CODES.has(code)) {
            staleTokens.push(token);
          } else {
            this.logger.warn(
              `FCM send failed for token …${token.slice(-12)}: ${code ?? r.error?.message}`,
            );
          }
        });
      } catch (err) {
        this.logger.error('FCM sendEach failed', err);
      }
    }

    return staleTokens;
  }

  private buildMessage(m: PushMessage, channelId: string): Message {
    return {
      token: m.token,
      data: this.stringifyData(m.data),
      android: {
        priority: 'high',
        notification: {
          channelId,
          title: m.title,
          body: m.body,
          sound: 'default',
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-content-available': '1',
        },
        payload: {
          aps: {
            alert: { title: m.title, body: m.body },
            sound: 'default',
            'content-available': 1,
          },
        },
      },
    };
  }

  /** FCM data values must be strings. */
  private stringifyData(
    data?: Record<string, unknown>,
  ): Record<string, string> | undefined {
    if (!data) return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      out[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    return out;
  }
}
