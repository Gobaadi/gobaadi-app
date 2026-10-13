import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

interface CallControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
  hideVideoControls?: boolean;
  /** Optional row (e.g. quick-action chips) rendered above the button bar. */
  quickActions?: React.ReactNode;
}

function ControlButton({
  icon,
  label,
  active,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.btnWrap, disabled && styles.btnWrapDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View style={[styles.circleBtn, !active && styles.circleBtnOff]}>
        <Ionicons
          name={icon}
          size={24}
          color={active ? '#1A1817' : '#FFFFFF'}
        />
      </View>
      <Text style={styles.btnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function CallControls({
  isMuted,
  isCameraOff,
  isSpeakerOn,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onToggleSpeaker,
  onEndCall,
  hideVideoControls = false,
  quickActions,
}: CallControlsProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrapper}>
      {quickActions}
      <View
        style={[
          styles.controlBar,
          { paddingBottom: Math.max(insets.bottom, 24) + 16 },
        ]}
      >
      {!hideVideoControls && (
        <ControlButton
          icon={isCameraOff ? 'videocam-off' : 'videocam'}
          label={isCameraOff ? t('callControls.cameraOff') : t('callControls.camera')}
          active={!isCameraOff}
          onPress={onToggleCamera}
        />
      )}

      <ControlButton
        icon={isMuted ? 'mic-off' : 'mic'}
        label={isMuted ? t('callControls.muted') : t('callControls.mic')}
        active={!isMuted}
        onPress={onToggleMute}
      />

      <ControlButton
        icon={isSpeakerOn ? 'volume-high' : 'ear'}
        label={isSpeakerOn ? t('callControls.speaker') : t('callControls.earpiece')}
        active={isSpeakerOn}
        onPress={onToggleSpeaker}
      />

      {!hideVideoControls && (
        <ControlButton
          icon="camera-reverse"
          label={t('callControls.flip')}
          active
          disabled={isCameraOff}
          onPress={onSwitchCamera}
        />
      )}

      <TouchableOpacity
        style={styles.endCallWrap}
        onPress={onEndCall}
        activeOpacity={0.8}
        accessibilityLabel={t('callControls.endCall')}
        accessibilityRole="button"
      >
        <View style={styles.endCallBtn}>
          <Ionicons name="call" size={30} color="#FFFFFF" />
        </View>
        <Text style={styles.btnLabel}>{t('callControls.end')}</Text>
      </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    // Tighter than before: speaker button makes it 5 controls on video calls,
    // must still fit 360dp-wide phones.
    gap: 10,
    paddingTop: 14,
    paddingHorizontal: 12,
  },
  btnWrap: {
    alignItems: 'center',
    gap: 6,
  },
  btnWrapDisabled: {
    opacity: 0.4,
  },
  circleBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  circleBtnOff: {
    backgroundColor: 'rgba(26,24,23,0.85)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  endCallWrap: {
    alignItems: 'center',
    gap: 6,
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  btnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
