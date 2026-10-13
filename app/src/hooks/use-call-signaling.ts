import { useEffect, useState, useCallback, useRef } from 'react';
import { socketManager } from '@/lib/socket-manager';
import { useRouter } from 'expo-router';

export type CallType = 'audio' | 'video';

export interface IncomingCall {
  appointmentId: number;
  callerId: number;
  callerName: string;
  callerRole: 'FARMER' | 'PATIENT' | 'DOCTOR';
  channelName: string;
  callType: CallType;
}

export type OutgoingCallState = 'idle' | 'calling' | 'accepted' | 'rejected' | 'timeout' | 'error';

interface SignalingUser {
  id: number;
  name?: string;
  role?: string;
}

export function useCallSignaling(user: SignalingUser | null | undefined) {
  const userId = user?.id;
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [outgoingState, setOutgoingState] = useState<OutgoingCallState>('idle');
  const [outgoingAppointmentId, setOutgoingAppointmentId] = useState<number | null>(null);
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outgoingCallTypeRef = useRef<CallType>('video');

  useEffect(() => {
    if (!userId) return;

    const handleCallStarted = (payload: {
      appointmentId: number;
      callerId: number;
      callerName: string;
      callerRole: 'FARMER' | 'PATIENT' | 'DOCTOR';
      channelName: string;
      callType?: CallType;
    }) => {
      setIncomingCall({ ...payload, callType: payload.callType === 'audio' ? 'audio' : 'video' });
    };

    const handleCallEnded = () => {
      setIncomingCall(null);
      setOutgoingState('idle');
      setOutgoingAppointmentId(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const handleCallResponse = (payload: {
      accepted: boolean;
      appointmentId: number;
      responderId: number;
    }) => {
      // Only honor responses while the outgoing call is still pending —
      // late "accepted"/"rejected" after cancel/timeout must be ignored.
      if (timeoutRef.current === null) return;
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      if (payload.accepted) {
        setOutgoingState('accepted');
        router.push({
          pathname: '/video-call',
          params: {
            appointmentId: String(payload.appointmentId),
            callType: outgoingCallTypeRef.current,
          },
        });
      } else {
        setOutgoingState('rejected');
      }
    };

    socketManager.on('callStarted', handleCallStarted);
    socketManager.on('callEnded', handleCallEnded);
    socketManager.on('callResponse', handleCallResponse);

    return () => {
      socketManager.off('callStarted', handleCallStarted);
      socketManager.off('callEnded', handleCallEnded);
      socketManager.off('callResponse', handleCallResponse);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [userId, router]);

  const startCall = useCallback(
    (
      appointmentId: number,
      callerId: number,
      callerName: string,
      callerRole: 'FARMER' | 'PATIENT' | 'DOCTOR',
      channelName: string,
      callType: CallType = 'video',
    ) => {
      setOutgoingState('calling');
      setOutgoingAppointmentId(appointmentId);
      outgoingCallTypeRef.current = callType;

      socketManager.emit('callStarted', {
        appointmentId,
        callerId,
        callerName,
        callerRole,
        channelName,
        callType,
      });

      timeoutRef.current = setTimeout(() => {
        setOutgoingState('timeout');
        timeoutRef.current = null;
      }, 30000);
    },
    [],
  );

  /**
   * Fire-and-forget ring: notifies the other party, then the caller joins
   * /video-call immediately and waits in the Agora channel. The callee
   * accepts via IncomingCallModal and joins the same channel
   * (channelName convention matches backend video-call.service).
   */
  const ringCall = useCallback(
    (appointmentId: number, callType: CallType = 'video') => {
      if (!userId || !appointmentId) return;
      const callerRole = user?.role === 'doctor'
        ? ('DOCTOR' as const)
        : ('PATIENT' as const);
      outgoingCallTypeRef.current = callType;
      socketManager.emit('callStarted', {
        appointmentId,
        callerId: userId,
        callerName:
          user?.name || (callerRole === 'DOCTOR' ? 'Doctor' : 'Patient'),
        callerRole,
        channelName: `appointment-${appointmentId}`,
        callType,
      });
    },
    [userId, user],
  );

  const cancelCall = useCallback(() => {
    if (outgoingAppointmentId && userId) {
      socketManager.emit('callEnded', {
        appointmentId: outgoingAppointmentId,
        endedBy: userId,
      });
    }
    setOutgoingState('idle');
    setOutgoingAppointmentId(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [outgoingAppointmentId, userId]);

  const acceptCall = useCallback(() => {
    if (incomingCall && userId) {
      socketManager.emit('callResponse', {
        accepted: true,
        appointmentId: incomingCall.appointmentId,
        responderId: userId,
      });
      setIncomingCall(null);
      router.push({
        pathname: '/video-call',
        params: {
          appointmentId: String(incomingCall.appointmentId),
          callType: incomingCall.callType,
        },
      });
    }
  }, [incomingCall, userId, router]);

  const rejectCall = useCallback(() => {
    if (incomingCall && userId) {
      socketManager.emit('callResponse', {
        accepted: false,
        appointmentId: incomingCall.appointmentId,
        responderId: userId,
      });
      setIncomingCall(null);
    }
  }, [incomingCall, userId]);

  const resetOutgoingState = useCallback(() => {
    setOutgoingState('idle');
    setOutgoingAppointmentId(null);
  }, []);

  return {
    incomingCall,
    acceptCall,
    rejectCall,
    outgoingState,
    outgoingAppointmentId,
    startCall,
    ringCall,
    cancelCall,
    resetOutgoingState,
  };
}
