import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from 'firebase-admin';

/**
 * Lazily builds (and caches) the firebase-admin app from env config.
 *
 * Credentials resolution order (matches the repo convention of env-based
 * Google credentials, e.g. the GMAIL_API_* vars):
 *   1. FIREBASE_SERVICE_ACCOUNT  – the service-account JSON pasted as a string
 *   2. GOOGLE_APPLICATION_CREDENTIALS – path to a service-account JSON file
 *
 * Returns `null` when neither is set, so callers can no-op defensively
 * (same style as MailService when RESEND_API_KEY is unset).
 */
let cached: App | null | undefined;

export function getFirebaseApp(): App | null {
  if (cached !== undefined) {
    return cached;
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (getApps().length > 0) {
    cached = getApps()[0];
    return cached;
  }

  if (!json && !credFile) {
    cached = null;
    return cached;
  }

  try {
    const credential = json
      ? cert(JSON.parse(json) as ServiceAccount)
      : applicationDefault();

    cached = initializeApp({
      credential,
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } catch (err) {
    console.error(
      'Failed to initialize firebase-admin — FCM push disabled',
      err,
    );
    cached = null;
  }

  return cached;
}

/**
 * Android notification channel id sent with every push. MUST match a channel
 * created on the app side (see app/src/lib/push-notifications.ts) — otherwise
 * Android falls back to the expo-notifications "Miscellaneous" channel and
 * loses the high-importance lock-screen behaviour.
 */
export function getAndroidChannelId(): string {
  return process.env.PUSH_ANDROID_CHANNEL_ID || 'default';
}
