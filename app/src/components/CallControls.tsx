import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CallControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
  onEndCall: () => void;
}

export function CallControls({
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onEndCall,
}: CallControlsProps) {
  return (
    <View style={styles.controlBar}>
      <TouchableOpacity style={styles.controlBtn} onPress={onToggleCamera} activeOpacity={0.8}>
        <Ionicons
          name={isCameraOff ? 'videocam-off' : 'videocam'}
          size={22}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.controlBtn} onPress={onToggleMute} activeOpacity={0.8}>
        <Ionicons
          name={isMuted ? 'mic-off' : 'mic'}
          size={22}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.controlBtn} onPress={onSwitchCamera} activeOpacity={0.8}>
        <Ionicons name="camera-reverse" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.endCallBtn} onPress={onEndCall} activeOpacity={0.8}>
        <Ionicons name="call" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  controlBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  controlBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
