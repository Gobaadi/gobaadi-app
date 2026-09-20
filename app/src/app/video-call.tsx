import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RtcSurfaceView, RenderModeType } from 'react-native-agora';
import { useAgora } from '@/hooks/use-agora';
import { agoraManager } from '@/lib/agora-manager';
import { CallControls } from '@/components/CallControls';
import {
  useJoinSessionQuery,
  useEndSessionMutation,
} from '@/store/videoCallApi';

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function VideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    appointmentId?: string;
    conversationId?: string;
    patientName?: string;
    animalImage?: string;
  }>();

  const appointmentId = params.appointmentId ? parseInt(params.appointmentId, 10) : 0;
  const conversationId = params.conversationId || '';
  const patientName = params.patientName || 'Patient';
  const animalImage = params.animalImage || '';

  const { data: callData, isLoading: isJoining } = useJoinSessionQuery(appointmentId, {
    skip: !appointmentId,
  });
  const [endSession] = useEndSessionMutation();

  const [callEnded, setCallEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const {
    localUid,
    remoteUids,
    isConnected,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    switchCamera,
  } = useAgora(
    callData?.token || '',
    callData?.channelName || '',
    callData?.appId || '',
    appointmentId,
  );

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const handleEndCall = async () => {
    try {
      await agoraManager.leave();
      await endSession(appointmentId).unwrap();
    } catch {
      // ignore
    }
    setCallEnded(true);
  };

  if (isJoining) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BD632F" />
        <Text style={styles.loadingText}>Connecting...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Remote Video (full screen) */}
      {remoteUids.length > 0 && (
        <RtcSurfaceView
          style={styles.videoBackground}
          canvas={{
            uid: remoteUids[0],
            renderMode: RenderModeType.RenderModeFit,
          }}
        />
      )}

      {/* Local Video (PiP) */}
      {localUid !== null && (
        <View style={styles.pipContainer}>
          <RtcSurfaceView
            style={styles.pipBox}
            canvas={{
              uid: localUid,
              renderMode: RenderModeType.RenderModeFit,
            }}
          />
        </View>
      )}

      {/* Status Bar */}
      <SafeAreaView style={styles.statusBar} />

      {/* Top Controls */}
      <TouchableOpacity style={styles.backBtnTop} onPress={() => router.back()} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Timer */}
      <View style={styles.callInfoOverlay}>
        <Text style={styles.callTimer}>{formatTimer(elapsed)}</Text>
        {!isConnected && <Text style={styles.connectingText}>Connecting...</Text>}
      </View>

      {/* Bottom Control Bar */}
      <CallControls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onSwitchCamera={switchCamera}
        onEndCall={handleEndCall}
      />

      {/* Call Ended Modal */}
      <Modal visible={callEnded} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCheckCircle}>
              <Ionicons name="checkmark" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.modalTitle}>Consultation ended!</Text>
            <Text style={styles.modalSubtitle}>Your consultation has ended successfully.</Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                router.replace({
                  pathname: '/chat',
                  params: {
                    consultationId: '',
                    conversationId,
                    patientName,
                    animalImage,
                    appointmentId: String(appointmentId),
                  },
                });
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnText}>Back to Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={() => router.replace('/(tabs)/doctor-home')}
              activeOpacity={0.85}
            >
              <Text style={[styles.modalBtnText, styles.modalBtnSecondaryText]}>Back to home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  loadingText: { color: '#FFF', marginTop: 12, fontSize: 16 },
  videoBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  backBtnTop: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pipContainer: { position: 'absolute', top: 50, right: 20 },
  pipBox: { width: 100, height: 140, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#FFFFFF' },
  callInfoOverlay: { position: 'absolute', bottom: 160, left: 0, right: 0, alignItems: 'center' },
  callTimer: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  connectingText: { fontSize: 12, color: '#FFC107', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, alignItems: 'center', width: '100%' },
  modalCheckCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1A1817', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, fontWeight: '500', color: '#7C7672', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalBtn: { backgroundColor: '#BD632F', borderRadius: 26, paddingHorizontal: 24, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  modalBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalBtnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E6E1DC' },
  modalBtnSecondaryText: { color: '#1A1817' },
});
