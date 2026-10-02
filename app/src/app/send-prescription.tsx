import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import PrescriptionForm, { PrescriptionFormData } from '@/components/PrescriptionForm';
import { useSendPrescription } from '@/hooks/use-send-prescription';

export default function SendPrescriptionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    appointmentId?: string;
    conversationId?: string;
    animalId?: string;
    patientName?: string;
  }>();

  const appointmentId = params.appointmentId || '';
  const conversationId = params.conversationId
    ? parseInt(params.conversationId, 10)
    : undefined;
  const animalId = params.animalId || '';
  const patientName = params.patientName || 'Patient';

  const { sendPrescription } = useSendPrescription();
  const [sending, setSending] = useState(false);

  const handleSend = async (data: PrescriptionFormData) => {
    if (!appointmentId) {
      Alert.alert(
        'Error',
        'Missing appointment information. Please open this from the appointment chat.',
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
        medications: data.medications,
        instructions: data.instructions,
        note: data.note,
      });
      router.back();
    } catch (err) {
      const errData = (err as { data?: { message?: string | string[] } })?.data;
      const raw = errData?.message ?? (err instanceof Error ? err.message : '');
      const message = Array.isArray(raw) ? raw[0] : raw;
      Alert.alert('Error', message || 'Failed to send prescription. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {patientName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <PrescriptionForm onSend={handleSend} sending={sending} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: '#BD632F',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', flex: 1, textAlign: 'center' },
});
