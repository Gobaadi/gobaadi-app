import type { ImageSourcePropType } from 'react-native';

const AVATAR_ASSETS: Record<string, ImageSourcePropType> = {
  'michael_doctor.png': require('@/assets/images/michael_doctor.png'),
  'jessica_doctor.png': require('@/assets/images/jessica_doctor.png'),
  'doctor.png': require('@/assets/images/doctor.png'),
  'doctor_avatar.png': require('@/assets/images/doctor_avatar.png'),
};

const DEFAULT_IMAGE = require('@/assets/images/doctor.png');

export function doctorImageSource(
  avatar?: string | null,
  fallback: ImageSourcePropType = DEFAULT_IMAGE,
): ImageSourcePropType {
  if (avatar && avatar.startsWith('http')) return { uri: avatar };
  if (avatar && AVATAR_ASSETS[avatar]) return AVATAR_ASSETS[avatar];
  return fallback;
}
