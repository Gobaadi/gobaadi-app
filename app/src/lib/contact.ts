import { Alert, Linking, Platform } from 'react-native';
import i18n from '@/i18n';

export const SUPPORT_EMAIL = 'ceo.gobaadi@gmail.com';
export const SUPPORT_PHONE = '+8801911418977';

/**
 * Opens an external URL via the OS intent resolver.
 *
 * Deliberately avoids Linking.canOpenURL: on Android 11+ package-visibility
 * rules and on some iOS configs it reports false/throws for system schemes
 * like mailto:/tel: even though openURL works fine. We attempt openURL
 * unconditionally and only fall back to a user-facing alert when the OS-ish
 * rejection means no handler exists (GOB-FAR-TC-029: the tap must never be
 * a silent no-op).
 */
async function openExternalUrl(url: string, fallbackMessageKey: string) {
  if (Platform.OS === 'web') {
    window.location.href = url;
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      i18n.t('contactSupport.alerts.cannotOpenTitle'),
      i18n.t(fallbackMessageKey),
    );
  }
}

export function openSupportEmail() {
  void openExternalUrl(
    `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Gobaadi Support Request')}`,
    'contactSupport.alerts.noEmailApp',
  );
}

export function openSupportPhone() {
  void openExternalUrl(
    `tel:${SUPPORT_PHONE}`,
    'contactSupport.alerts.noPhoneApp',
  );
}
