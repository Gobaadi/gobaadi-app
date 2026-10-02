import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, type StyleProp, type ImageStyle } from 'react-native';
import { doctorImageSource, hasDoctorAvatar } from '@/utils/doctor-image';

const INITIALS_COLORS = [
  '#BD632F',
  '#2E7D32',
  '#1565C0',
  '#7C5CE0',
  '#C2185B',
  '#00838F',
];

function getInitials(name?: string): string {
  const cleaned = (name || '').replace(/^dr\.?\s+/i, '').trim();
  if (!cleaned) return '?';
  const words = cleaned.split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (
    words[0].charAt(0).toUpperCase() +
    words[words.length - 1].charAt(0).toUpperCase()
  );
}

function getColorForName(name?: string): string {
  const key = name || '?';
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash + key.charCodeAt(i) * (i + 1)) % 997;
  }
  return INITIALS_COLORS[hash % INITIALS_COLORS.length];
}

export interface DoctorAvatarProps {
  name?: string;
  avatar?: string | null;
  size: number;
  radius?: number;
  style?: StyleProp<ImageStyle>;
}

export function DoctorAvatar({ name, avatar, size, radius, style }: DoctorAvatarProps) {
  const [failed, setFailed] = useState(false);
  const borderRadius = radius ?? size / 2;
  const showImage = hasDoctorAvatar(avatar) && !failed;

  if (showImage) {
    return (
      <Image
        source={doctorImageSource(avatar)}
        style={[{ width: size, height: size, borderRadius }, style]}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.initials,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: getColorForName(name),
        },
        style,
      ]}
    >
      <Text style={[styles.initialsText, { fontSize: Math.max(11, size * 0.34) }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initials: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
