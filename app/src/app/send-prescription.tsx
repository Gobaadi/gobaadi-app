import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import PrescriptionForm, { PrescriptionFormData } from '@/components/PrescriptionForm';
import { useSendPrescription } from '@/hooks/use-send-prescription';
import { useRequireDoctor } from '@/hooks/use-require-doctor';

export default function SendPrescriptionScreen() {
  // Destination of the doctor-only quick actions — block direct/deep-link
  // entry from a farmer account too.
  useRequireDoctor();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    appointmentId?: string;
    conversationId?: string;
    animalId?: string;
    patientName?: string;
    userEmail?: string;
  }>();

  const appointmentId = params.appointmentId || '';
  const conversationId = params.conversationId
    ? parseInt(params.conversationId, 10)
    : undefined;
  const animalId = params.animalId || '';
  const patientName = params.patientName || 'Patient';
  const userEmail = params.userEmail || '';

  const { sendPrescription } = useSendPrescription();
  const [sending, setSending] = useState(false);

  const handleSend = async (data: PrescriptionFormData) => {
    if (!appointmentId) {
      Alert.alert(
        t('sendPrescription.errorTitle'),
        t('sendPrescription.missingAppointment'),
      );
      return;
    }
    setSending(true);
    try {
      await sendPrescription({
        appointmentId,
        animalId: animalId || undefined,
        conversationId,
        patientName,
        userEmail,
        medications: data.medications,
        instructions: data.instructions,
        note: data.note,
      });
      router.back();
    } catch (err) {
      const errData = (err as { data?: { message?: string | string[] } })?.data;
      const raw = errData?.message ?? (err instanceof Error ? err.message : '');
      const message = Array.isArray(raw) ? raw[0] : raw;
      Alert.alert(t('sendPrescription.errorTitle'), message || t('sendPrescription.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Dimmed backdrop: tap to dismiss (blocked while a send is in flight). */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        disabled={sending}
        onPress={() => !sending && router.back()}
      />

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.grabber} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('prescription.title')}</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => !sending && router.back()}
            disabled={sending}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#1A1817" />
          </TouchableOpacity>
        </View>

        <PrescriptionForm onSend={handleSend} sending={sending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    overflow: 'hidden',
    shadowColor: '#1A1817',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 16,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0D8D0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
});
