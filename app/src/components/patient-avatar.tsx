import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, type StyleProp, type ImageStyle } from 'react-native';
import { isRenderableImageUri } from '@/utils/photo-uri';

const INITIALS_COLORS = [
  '#BD632F',
  '#2E7D32',
  '#1565C0',
  '#7C5CE0',
  '#C2185B',
  '#00838F',
];

function getInitials(name?: string): string {
  const cleaned = (name || '').trim();
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

export interface PatientAvatarProps {
  name?: string;
  image?: string | null;
  size: number;
  radius?: number;
  style?: StyleProp<ImageStyle>;
}

export function PatientAvatar({ name, image, size, radius, style }: PatientAvatarProps) {
  const [failed, setFailed] = useState(false);
  const borderRadius = radius ?? size / 2;
  const showImage = isRenderableImageUri(image) && !failed;

  if (showImage) {
    return (
      <Image
        source={{ uri: image as string }}
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
