import { Alert, Linking, Platform } from 'react-native';

export const SUPPORT_EMAIL = 'support@gobaadi.com';
export const SUPPORT_PHONE = '+8801911418977';

function openExternalUrl(url: string, fallbackMessage: string) {
  if (Platform.OS === 'web') {
    window.location.href = url;
    return;
  }
  Linking.openURL(url).catch(() =>
    Alert.alert('No app available', fallbackMessage),
  );
}

export function openSupportEmail() {
  openExternalUrl(`mailto:${SUPPORT_EMAIL}`, `Please email us at ${SUPPORT_EMAIL}`);
}

export function openSupportPhone() {
  openExternalUrl(`tel:${SUPPORT_PHONE}`, `Please call customer service at ${SUPPORT_PHONE}`);
}
