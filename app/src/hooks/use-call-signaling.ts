import { useEffect, useState, useCallback, useRef } from 'react';
import { socketManager } from '@/lib/socket-manager';
import { useRouter } from 'expo-router';

export interface IncomingCall {
  appointmentId: number;
  callerId: number;
  callerName: string;
  callerRole: 'FARMER' | 'PATIENT' | 'DOCTOR';
  channelName: string;
}

export type OutgoingCallState = 'idle' | 'calling' | 'accepted' | 'rejected' | 'timeout' | 'error';

export function useCallSignaling(userId: number | undefined) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [outgoingState, setOutgoingState] = useState<OutgoingCallState>('idle');
  const [outgoingAppointmentId, setOutgoingAppointmentId] = useState<number | null>(null);
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const handleCallStarted = (payload: {
      appointmentId: number;
      callerId: number;
      callerName: string;
      callerRole: 'FARMER' | 'PATIENT' | 'DOCTOR';
      channelName: string;
    }) => {
      setIncomingCall(payload);
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
      if (payload.accepted) {
        setOutgoingState('accepted');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        router.push({
          pathname: '/video-call',
          params: { appointmentId: String(payload.appointmentId) },
        });
      } else {
        setOutgoingState('rejected');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
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
    ) => {
      setOutgoingState('calling');
      setOutgoingAppointmentId(appointmentId);

      socketManager.emit('callStarted', {
        appointmentId,
        callerId,
        callerName,
        callerRole,
        channelName,
      });

      timeoutRef.current = setTimeout(() => {
        setOutgoingState('timeout');
        timeoutRef.current = null;
      }, 30000);
    },
    [],
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
        params: { appointmentId: String(incomingCall.appointmentId) },
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
    cancelCall,
    resetOutgoingState,
  };
}
