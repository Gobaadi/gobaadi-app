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
  joinError: string | null;
}

/** Join considered stuck if Agora gives no success/error within this window. */
const JOIN_TIMEOUT_MS = 20000;

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
    joinError: null,
  });
  const [joinAttempt, setJoinAttempt] = useState(0);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let mounted = true;

    const handler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: (_connection: RtcConnection, _elapsed: number) => {
        if (mounted) {
          setState(prev => ({ ...prev, localUid: uid, isConnected: true, joinError: null }));
        }
      },
      onError: (err, msg) => {
        // Only surface errors that block the initial join — post-connect
        // engine errors (mute/camera glitches) must not cover the call UI.
        if (mounted) {
          const message = `Call connection failed (${err}): ${msg}`;
          console.warn('[use-agora]', message);
          setState(prev =>
            prev.isConnected || prev.joinError ? prev : { ...prev, joinError: message },
          );
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
      if (!mounted) return;
      if (!engine) {
        setState(prev => ({ ...prev, joinError: 'Could not start the call engine' }));
        return;
      }

      engine.registerEventHandler(handler);
      // Audio call: never publish camera. Also resets the singleton engine
      // after a previous audio call so later video calls start with camera on.
      await agoraManager.muteVideo(startCameraOff);
      // Video call: start local preview so own face renders in the PiP
      // (Agora does not show self-view until startPreview is called).
      // Audio call: stop preview left running by a previous video call.
      if (startCameraOff) {
        await agoraManager.stopPreview();
      } else {
        await agoraManager.startPreview();
      }
      await agoraManager.join(token, channelName, uid);
    };

    setup().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to join the call';
      console.warn('[use-agora] join threw:', message);
      if (mounted) {
        setState(prev => (prev.isConnected ? prev : { ...prev, joinError: message }));
      }
    });

    // Agora can hang without ever resolving joinChannel (e.g. blocked UDP) —
    // surface a timeout instead of showing "Connecting..." forever.
    const joinTimeout =
      token && appId && channelName && uid > 0
        ? setTimeout(() => {
            if (!mounted) return;
            setState(prev =>
              prev.isConnected || prev.joinError
                ? prev
                : { ...prev, joinError: 'Connection timed out. Check your internet.' },
            );
          }, JOIN_TIMEOUT_MS)
        : null;

    return () => {
      mounted = false;
      if (joinTimeout) clearTimeout(joinTimeout);
      const engine = agoraManager.getEngine();
      if (engine) {
        engine.unregisterEventHandler(handler);
      }
      agoraManager.leave();
    };
  }, [appId, token, channelName, uid, startCameraOff, joinAttempt]);

  const toggleMute = useCallback(async () => {
    const newMuted = !stateRef.current.isMuted;
    await agoraManager.muteAudio(newMuted);
    setState(prev => ({ ...prev, isMuted: newMuted }));
  }, []);

  const toggleCamera = useCallback(async () => {
    const newCameraOff = !stateRef.current.isCameraOff;
    await agoraManager.muteVideo(newCameraOff);
    // Re-enable self-view after camera-off (preview may have been halted).
    if (!newCameraOff) {
      await agoraManager.startPreview();
    }
    setState(prev => ({ ...prev, isCameraOff: newCameraOff }));
  }, []);

  const switchCamera = useCallback(async () => {
    await agoraManager.switchCamera();
    setState(prev => ({ ...prev, isFrontCamera: !prev.isFrontCamera }));
  }, []);

  const retryJoin = useCallback(() => {
    setState(prev => ({ ...prev, joinError: null }));
    setJoinAttempt(prev => prev + 1);
  }, []);

  return {
    ...state,
    toggleMute,
    toggleCamera,
    switchCamera,
    retryJoin,
  };
}
