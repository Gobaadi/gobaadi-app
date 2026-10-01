import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RtcSurfaceView, RenderModeType } from 'react-native-agora';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { useAgora } from '@/hooks/use-agora';
import { agoraManager } from '@/lib/agora-manager';
import { CallControls } from '@/components/CallControls';
import {
  useJoinSessionQuery,
  useEndSessionMutation,
} from '@/store/videoCallApi';
import { socketManager } from '@/lib/socket-manager';

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Session length starts counting when the call connects (after join). */
const SESSION_DURATION_S = 30 * 60;
const SESSION_WARN_S = 25 * 60;

/** Surface the backend's real message (e.g. call-gate errors) when present. */
function joinErrorMessage(error: unknown): string {
  const data = (error as { data?: { message?: string | string[] } })?.data;
  const raw = data?.message;
  const message = Array.isArray(raw) ? raw[0] : raw;
  return message || 'Failed to join call';
}

async function requestPermissions(audioOnly: boolean): Promise<boolean> {
  if (Platform.OS === 'android') {
    const perms = audioOnly
      ? [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]
      : [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ];
    const result = await PermissionsAndroid.requestMultiple(perms);
    const micGranted =
      result['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED;
    if (audioOnly) return micGranted;
    return (
      micGranted &&
      result['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED
    );
  }
  return true;
}

export default function VideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    appointmentId?: string;
    callType?: string;
    patientName?: string;
    animalImage?: string;
  }>();
  const user = useSelector((state: RootState) => state.auth.user);

  const appointmentId = params.appointmentId ? parseInt(params.appointmentId, 10) : 0;
  const isAudioCall = params.callType === 'audio';
  const peerName =
    params.patientName ||
    (user?.role === 'doctor' ? 'Patient' : 'Doctor');
  const peerImage = params.animalImage || '';

  const { data: callData, isLoading: isJoining, error: joinError } = useJoinSessionQuery(appointmentId, {
    skip: !appointmentId,
  });
  const [endSession] = useEndSessionMutation();

  const [callEnded, setCallEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionsRequested, setPermissionsRequested] = useState(false);
  const endedRef = useRef(false);
  // True once Agora actually connects — guards cleanup so a failed join or
  // denied permissions never ends the OTHER party's live call.
  const connectedRef = useRef(false);

  const uid = user?.id ?? 0;

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
    uid,
    isAudioCall,
  );

  useEffect(() => {
    if (permissionsRequested) return;
    setPermissionsRequested(true);
    requestPermissions(isAudioCall).then((granted) => {
      setHasPermission(granted);
      if (!granted) {
        Alert.alert(
          'Permissions Required',
          isAudioCall
            ? 'Microphone permission is needed for audio calls. Please enable it in your device settings.'
            : 'Camera and microphone permissions are needed for video calls. Please enable them in your device settings.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      }
    });
  }, [permissionsRequested, isAudioCall, router]);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) connectedRef.current = true;
  }, [isConnected]);

  useEffect(() => {
    const handleCallEnded = (payload: { appointmentId: number; endedBy: number }) => {
      if (payload.appointmentId === appointmentId && payload.endedBy !== uid) {
        setCallEnded(true);
        agoraManager.leave();
      }
    };
    socketManager.on('callEnded', handleCallEnded);
    return () => {
      socketManager.off('callEnded', handleCallEnded);
    };
  }, [appointmentId, uid]);

  useEffect(() => {
    return () => {
      if (!endedRef.current && connectedRef.current) {
        endedRef.current = true;
        agoraManager.leave();
        endSession(appointmentId).unwrap().catch(() => {});
        socketManager.emit('callEnded', { appointmentId, endedBy: uid });
      }
    };
  }, [appointmentId, uid, endSession]);

  const handleEndCall = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (!connectedRef.current) {
      // Never connected (failed join / permissions / backing out) — leave the
      // screen without ending the session or signaling the other party.
      router.back();
      return;
    }
    try {
      await agoraManager.leave();
      await endSession(appointmentId).unwrap();
      socketManager.emit('callEnded', { appointmentId, endedBy: uid });
    } catch {
      // ignore cleanup errors
    }
    setCallEnded(true);
  }, [appointmentId, uid, endSession, router]);

  // Callee declined: the caller is already waiting in this screen (ringCall
  // joins immediately), so surface the rejection and leave cleanly.
  useEffect(() => {
    const handleResponse = (payload: {
      appointmentId: number;
      accepted: boolean;
    }) => {
      if (payload.appointmentId !== appointmentId || payload.accepted) return;
      if (endedRef.current) return;
      Alert.alert('Call Declined', 'The other party declined the call.', [
        { text: 'OK', onPress: () => handleEndCall() },
      ]);
    };
    socketManager.on('callResponse', handleResponse);
    return () => {
      socketManager.off('callResponse', handleResponse);
    };
  }, [appointmentId, handleEndCall]);

  // Session timing (counts from join): warn at 25 min, auto-end at 30 min —
  // neither party has to press end, the session closes itself.
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!isConnected || endedRef.current) return;
    if (elapsed >= SESSION_DURATION_S) {
      handleEndCall();
      return;
    }
    if (elapsed >= SESSION_WARN_S && !warnedRef.current) {
      warnedRef.current = true;
      Alert.alert(
        'Almost time',
        'Only 5 minutes left in this session.',
      );
    }
  }, [elapsed, isConnected, handleEndCall]);

  if (!appointmentId) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="warning-outline" size={48} color="#E53935" />
        <Text style={styles.loadingText}>Missing appointment information</Text>
        <TouchableOpacity
          style={{ marginTop: 16, padding: 12, backgroundColor: '#BD632F', borderRadius: 12 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="videocam-off" size={48} color="#E53935" />
        <Text style={styles.loadingText}>Permissions denied</Text>
      </View>
    );
  }

  if (isJoining) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BD632F" />
        <Text style={styles.loadingText}>Connecting...</Text>
      </View>
    );
  }

  if (joinError) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="warning-outline" size={48} color="#E53935" />
        <Text style={styles.loadingText}>{joinErrorMessage(joinError)}</Text>
        <TouchableOpacity
          style={{ marginTop: 16, padding: 12, backgroundColor: '#BD632F', borderRadius: 12 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isAudioCall ? (
        <View style={styles.audioStage}>
          <View style={styles.audioAvatar}>
            {peerImage ? (
              <Image source={{ uri: peerImage }} style={styles.audioAvatarImage} />
            ) : (
              <Ionicons name="person" size={56} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.audioPeerName}>{peerName}</Text>
          <Text style={styles.audioCallLabel}>Audio call</Text>
        </View>
      ) : (
        <>
          {remoteUids.length > 0 && (
            <RtcSurfaceView
              style={styles.videoBackground}
              canvas={{
                uid: remoteUids[0],
                renderMode: RenderModeType.RenderModeFit,
              }}
            />
          )}

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
        </>
      )}

      <SafeAreaView style={styles.statusBar} />

      <TouchableOpacity
        style={styles.backBtnTop}
        onPress={handleEndCall}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.callInfoOverlay}>
        <Text style={styles.callTimer}>{formatTimer(elapsed)}</Text>
        {!isConnected && <Text style={styles.connectingText}>Connecting...</Text>}
        {isConnected && remoteUids.length === 0 && (
          <Text style={styles.connectingText}>Waiting for participant...</Text>
        )}
      </View>

      <CallControls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onSwitchCamera={switchCamera}
        onEndCall={handleEndCall}
        hideVideoControls={isAudioCall}
      />

      <Modal visible={callEnded} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCheckCircle}>
              <Ionicons name="checkmark" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.modalTitle}>Consultation ended!</Text>
            <Text style={styles.modalSubtitle}>
              Your consultation has ended successfully.
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                if (user?.role === 'doctor') {
                  router.replace('/(tabs)/doctor-home');
                } else {
                  router.replace('/(tabs)/doctors');
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: { color: '#FFF', marginTop: 12, fontSize: 16 },
  videoBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  audioStage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  audioAvatar: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  audioAvatarImage: { width: 132, height: 132 },
  audioPeerName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  audioCallLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  backBtnTop: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pipContainer: { position: 'absolute', top: 50, right: 20 },
  pipBox: {
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  callInfoOverlay: {
    position: 'absolute',
    bottom: 160,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  callTimer: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  connectingText: { fontSize: 12, color: '#FFC107', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  modalCheckCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1817',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7C7672',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalBtn: {
    backgroundColor: '#BD632F',
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  modalBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
