import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IncomingCallModalProps {
  visible: boolean;
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({
  visible,
  callerName,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <Ionicons name="videocam" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Incoming Video Call</Text>
          <Text style={styles.subtitle}>{callerName}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.8}>
              <Ionicons name="call" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.8}>
              <Ionicons name="videocam" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1A1817',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '80%',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7C7672',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 24,
  },
  rejectBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
