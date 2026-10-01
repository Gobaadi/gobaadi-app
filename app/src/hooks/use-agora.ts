import { useState, useEffect, useCallback, useRef } from 'react';
import { agoraManager } from '@/lib/agora-manager';
import type { IRtcEngineEventHandler, RtcConnection } from 'react-native-agora';

interface AgoraState {
  localUid: number | null;
  remoteUids: number[];
  isConnected: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isFrontCamera: boolean;
}

export function useAgora(
  token: string,
  channelName: string,
  appId: string,
  uid: number,
  startCameraOff = false,
) {
  const [state, setState] = useState<AgoraState>({
    localUid: null,
    remoteUids: [],
    isConnected: false,
    isMuted: false,
    isCameraOff: startCameraOff,
    isFrontCamera: true,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let mounted = true;

    const handler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: (_connection: RtcConnection, _elapsed: number) => {
        if (mounted) {
          setState(prev => ({ ...prev, localUid: uid, isConnected: true }));
        }
      },
      onUserJoined: (_connection: RtcConnection, remoteUid: number, _elapsed: number) => {
        if (mounted) {
          setState(prev => ({
            ...prev,
            remoteUids: [...prev.remoteUids, remoteUid],
          }));
        }
      },
      onUserOffline: (_connection: RtcConnection, remoteUid: number, _reason: any) => {
        if (mounted) {
          setState(prev => ({
            ...prev,
            remoteUids: prev.remoteUids.filter(id => id !== remoteUid),
          }));
        }
      },
      onLeaveChannel: () => {
        if (mounted) {
          setState(prev => ({
            ...prev,
            localUid: null,
            remoteUids: [],
            isConnected: false,
          }));
        }
      },
      onTokenPrivilegeWillExpire: () => {
        // Token will expire — the parent component should handle refresh
        // via the video-call screen's re-join flow or token refresh endpoint
      },
    };

    const setup = async () => {
      if (!token || !appId || !channelName || uid <= 0) return;

      await agoraManager.init(appId);
      const engine = agoraManager.getEngine();
      if (!engine || !mounted) return;

      engine.registerEventHandler(handler);
      // Audio call: never publish camera. Also resets the singleton engine
      // after a previous audio call so later video calls start with camera on.
      await agoraManager.muteVideo(startCameraOff);
      await agoraManager.join(token, channelName, uid);
    };

    setup();

    return () => {
      mounted = false;
      const engine = agoraManager.getEngine();
      if (engine) {
        engine.unregisterEventHandler(handler);
      }
      agoraManager.leave();
    };
  }, [appId, token, channelName, uid, startCameraOff]);

  const toggleMute = useCallback(async () => {
    const newMuted = !stateRef.current.isMuted;
    await agoraManager.muteAudio(newMuted);
    setState(prev => ({ ...prev, isMuted: newMuted }));
  }, []);

  const toggleCamera = useCallback(async () => {
    const newCameraOff = !stateRef.current.isCameraOff;
    await agoraManager.muteVideo(newCameraOff);
    setState(prev => ({ ...prev, isCameraOff: newCameraOff }));
  }, []);

  const switchCamera = useCallback(async () => {
    await agoraManager.switchCamera();
    setState(prev => ({ ...prev, isFrontCamera: !prev.isFrontCamera }));
  }, []);

  return {
    ...state,
    toggleMute,
    toggleCamera,
    switchCamera,
  };
}
