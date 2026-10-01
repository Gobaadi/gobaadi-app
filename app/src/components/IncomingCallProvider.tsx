import React, { createContext, useContext } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { useCallSignaling, type OutgoingCallState, type CallType } from '@/hooks/use-call-signaling';
import { IncomingCallModal } from '@/components/IncomingCallModal';

interface CallSignalingContextValue {
  incomingCall: ReturnType<typeof useCallSignaling>['incomingCall'];
  acceptCall: () => void;
  rejectCall: () => void;
  outgoingState: OutgoingCallState;
  outgoingAppointmentId: number | null;
  startCall: (
    appointmentId: number,
    callerId: number,
    callerName: string,
    callerRole: 'FARMER' | 'PATIENT' | 'DOCTOR',
    channelName: string,
    callType?: CallType,
  ) => void;
  ringCall: (appointmentId: number, callType?: CallType) => void;
  cancelCall: () => void;
  resetOutgoingState: () => void;
}

const CallSignalingContext = createContext<CallSignalingContextValue | null>(null);

export function useCallSignalingContext() {
  const ctx = useContext(CallSignalingContext);
  if (!ctx) {
    throw new Error('useCallSignalingContext must be used within IncomingCallProvider');
  }
  return ctx;
}

export function IncomingCallProvider({ children }: { children: React.ReactNode }) {
  const user = useSelector((state: RootState) => state.auth.user);
  const signaling = useCallSignaling(user);

  return (
    <CallSignalingContext.Provider value={signaling}>
      {children}
      <IncomingCallModal
        visible={!!signaling.incomingCall}
        callerName={signaling.incomingCall?.callerName ?? ''}
        callType={signaling.incomingCall?.callType ?? 'video'}
        onAccept={signaling.acceptCall}
        onReject={signaling.rejectCall}
      />
    </CallSignalingContext.Provider>
  );
}
