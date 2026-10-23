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
  isSpeakerOn: boolean;
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
  onTokenExpiring?: () => void,
) {
  const [state, setState] = useState<AgoraState>({
    localUid: null,
    remoteUids: [],
    isConnected: false,
    isMuted: false,
    isCameraOff: startCameraOff,
    isFrontCamera: true,
    // Loudspeaker on by default — earpiece is far too quiet for consultations.
    isSpeakerOn: true,
    joinError: null,
  });
  const [joinAttempt, setJoinAttempt] = useState(0);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Keep callback in a ref so the join effect never re-runs (a rejoin
  // would drop an live call if the parent recreates the callback).
  const onTokenExpiringRef = useRef(onTokenExpiring);
  useEffect(() => {
    onTokenExpiringRef.current = onTokenExpiring;
  }, [onTokenExpiring]);

  useEffect(() => {
    let mounted = true;

    const handler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: (_connection: RtcConnection, _elapsed: number) => {
        if (mounted) {
          setState(prev => ({ ...prev, localUid: uid, isConnected: true, joinError: null }));
          // Speaker route is channel-scoped — setEnableSpeakerphone is only
          // valid once joined (per SDK docs).
          agoraManager.setSpeaker(stateRef.current.isSpeakerOn);
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
        // Token about to expire mid-call — parent fetches a fresh one and
        // calls agoraManager.renewToken so the join privileges extend.
        onTokenExpiringRef.current?.();
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
      // Engine reconfiguration can reject on some native builds (e.g. calling
      // stopPreview without a prior startPreview on an audio-only session).
      // Log and continue — these must never fake a join failure since the
      // join itself may still succeed.
      await agoraManager
        .muteVideo(startCameraOff)
        .catch((err: unknown) => console.warn('[use-agora] muteVideo failed:', err));
      // Audio call: stop preview left running by a previous video call.
      // Video call: start local preview so own face renders in the PiP
      // (Agora does not show self-view until startPreview is called).
      if (startCameraOff) {
        await agoraManager
          .stopPreview()
          .catch((err: unknown) => console.warn('[use-agora] stopPreview failed:', err));
      } else {
        await agoraManager
          .startPreview()
          .catch((err: unknown) => console.warn('[use-agora] startPreview failed:', err));
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

  const toggleSpeaker = useCallback(() => {
    const newSpeakerOn = !stateRef.current.isSpeakerOn;
    agoraManager.setSpeaker(newSpeakerOn);
    setState(prev => ({ ...prev, isSpeakerOn: newSpeakerOn }));
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
    toggleSpeaker,
    retryJoin,
  };
}
