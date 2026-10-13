import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { store } from '@/store/store';
import { notificationsApi } from '@/store/notificationsApi';

let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // expo-notifications not available in Expo Go (SDK 53+)
}

Notifications?.setNotificationHandler?.({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Background notification task (WhatsApp-style headless handling).
 *
 * Must be defined at module scope (expo-task-manager requirement) in a module
 * required early by the app, so the headless JS executor can run it when the
 * app is backgrounded or killed. `registerTaskAsync` is called during push
 * registration below.
 */
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  // Displaying the notification is the OS's job (Android system tray / iOS
  // notification center) — high-priority FCM + the HIGH-importance channel
  // below make it appear on the lock screen even from a killed app. This task
  // only runs the JS side when a payload needs processing.
  return Notifications?.BackgroundNotificationTaskResult?.NoData ?? 1;
});

const DEVICE_ID_KEY = 'gobaadi_device_id';

let currentExpoToken: string | null = null;
let currentDeviceToken: string | null = null;
let taskRegistered = false;

/** Stable per-install id so the backend can dedupe tokens per physical device. */
async function getOrCreateDeviceId(): Promise<string | undefined> {
  try {
    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existing) return existing;
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    await SecureStore.setItemAsync(DEVICE_ID_KEY, uuid);
    return uuid;
  } catch {
    return undefined;
  }
}

/**
 * Creates the high-importance Android channel. MUST run before the Android 13
 * permission prompt and before fetching any push token (expo-notifications
 * SDK 57 requirement). The channel id ('default') must match the backend's
 * PUSH_ANDROID_CHANNEL_ID so remote pushes target this channel.
 *
 * HIGH importance + sound + vibration + PUBLIC lock-screen visibility make
 * notifications bypass Doze and show immediately on the lock screen.
 */
async function ensureNotificationChannel(): Promise<void> {
  if (!Notifications || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      description: 'General notifications from Gobaadi',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      lightColor: '#BD632F',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
  } catch (err) {
    console.warn('Failed to create notification channel', err);
  }
}

/**
 * Requests permission and registers this device's push tokens with the
 * backend:
 *  - the Expo push token (used for iOS delivery and as an Android fallback)
 *  - on Android, the native FCM registration token, which the backend sends
 *    through firebase-admin at high priority (lock screen / killed app).
 *
 * Both tokens carry the same deviceId so the backend can dedupe them and
 * deliver exactly one notification per device.
 *
 * No-ops (with a console warning) if the EAS project isn't configured yet —
 * same defensive fallback style as MailService when RESEND_API_KEY is unset.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!Notifications) {
    console.warn('expo-notifications not available in Expo Go — skipping push registration.');
    return;
  }

  await ensureNotificationChannel();

  try {
    if (!taskRegistered) {
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      taskRegistered = true;
    }
  } catch (err) {
    console.warn('Failed to register background notification task', err);
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn(
      'No EAS projectId configured (app.json extra.eas.projectId) — skipping push token registration.',
    );
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return;
  }

  const deviceId = await getOrCreateDeviceId();

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentExpoToken = token;
    await store.dispatch(
      notificationsApi.endpoints.registerPushToken.initiate({
        token,
        deviceId,
        platform: Platform.OS,
      }),
    );
  } catch (err) {
    console.warn('Failed to register push token', err);
  }

  // Native FCM registration token (Android only — iOS APNs tokens require
  // separate APNs credentials on the backend, so iOS stays on the Expo path).
  if (Platform.OS === 'android') {
    try {
      const native = await Notifications.getDevicePushTokenAsync();
      if (native.type === 'android' && typeof native.data === 'string') {
        currentDeviceToken = native.data;
        await store.dispatch(
          notificationsApi.endpoints.registerPushToken.initiate({
            token: native.data,
            deviceId,
            platform: 'android',
          }),
        );
      }
    } catch (err) {
      console.warn('Failed to register native FCM token', err);
    }
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  const tokens = [currentExpoToken, currentDeviceToken].filter(
    (t): t is string => !!t,
  );
  if (tokens.length === 0) {
    return;
  }
  try {
    await Promise.all(
      tokens.map((token) =>
        store.dispatch(
          notificationsApi.endpoints.unregisterPushToken.initiate({ token }),
        ),
      ),
    );
  } catch (err) {
    console.warn('Failed to unregister push token', err);
  } finally {
    currentExpoToken = null;
    currentDeviceToken = null;
  }
}
