import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetBookingByIdQuery,
  useGetDoctorBookingsQuery,
  useCancelBookingMutation,
} from '@/store/doctorPortalApi';
import { apiErrorMessage } from '@/utils/api-error';
import { formatAnimalDetails } from '@/utils/appointment';
import { RegistrationBackground } from '@/components/registration-background';
import { useTranslation } from 'react-i18next';

function formatTimeRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${fmt(s)} - ${fmt(e)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

type CancellationReason = 'emergency' | 'schedule_conflict' | 'other' | null;

export default function AppointmentCancelScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: fetchedAppointment,
    isLoading: idLoading,
  } = useGetBookingByIdQuery(String(id ?? ''), { skip: !id });
  const { data: bookings = [], isLoading: listLoading } = useGetDoctorBookingsQuery();
  const [cancelBooking, { isLoading }] = useCancelBookingMutation();

  const [selectedReason, setSelectedReason] = useState<CancellationReason>(null);
  const [note, setNote] = useState('');

  const appointment = fetchedAppointment ?? bookings.find((b) => String(b.id) === id);

  if (!appointment && (idLoading || listLoading)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#BD632F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('appointmentCancel.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color="#BD632F" />
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#BD632F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('appointmentCancel.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('appointmentCancel.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName =
    appointment.animalName || appointment.patientName || t('appointmentCancel.patient');
  const animalDetails = formatAnimalDetails(appointment);

  const handleCancel = async () => {
    if (!selectedReason) {
      Alert.alert(t('appointmentCancel.alerts.required'), t('appointmentCancel.alerts.selectReason'));
      return;
    }
    try {
      await cancelBooking({
        id: String(appointment.id),
        reason: selectedReason,
        note: note.trim() || undefined,
      }).unwrap();
      router.replace({
        pathname: '/appointment-cancelled',
        params: { id: String(appointment.id) },
      });
    } catch (err) {
      Alert.alert(
        t('appointmentCancel.alerts.error'),
        apiErrorMessage(err, t('appointmentCancel.alerts.cancelFailed')),
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <RegistrationBackground />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#BD632F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('appointmentCancel.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoCard}>
          <View style={styles.cardRow}>
            {appointment.animalImage ? (
              <Image source={{ uri: appointment.animalImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="paw" size={24} color="#BD632F" />
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{displayName}</Text>
              {animalDetails && (
                <Text style={styles.cardDetail}>{animalDetails}</Text>
              )}
              {appointment.patientName && (
                <View style={styles.ownerBlock}>
                  <Text style={styles.ownerLabel}>{t('appointmentCancel.ownerLabel')}</Text>
                  <Text style={styles.ownerName}>{appointment.patientName}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>{formatDate(appointment.startAt)}</Text>
            <Text style={styles.timeText}>{formatTimeRange(appointment.startAt, appointment.endAt)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('appointmentCancel.cancellationReason')}</Text>
        <View style={styles.radioGroup}>
          {([
            { value: 'emergency' as CancellationReason, labelKey: 'appointmentCancel.reasons.emergency' },
            { value: 'schedule_conflict' as CancellationReason, labelKey: 'appointmentCancel.reasons.scheduleConflict' },
            { value: 'other' as CancellationReason, labelKey: 'appointmentCancel.reasons.other' },
          ]).map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.radioRow}
              onPress={() => setSelectedReason(option.value)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.radioOuter,
                  selectedReason === option.value && styles.radioOuterActive,
                ]}
              >
                {selectedReason === option.value && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{t(option.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('appointmentCancel.noteOptional')}</Text>
        <TextInput
          style={styles.noteInput}
          placeholder=""
          placeholderTextColor="#9C9690"
          value={note}
          onChangeText={setNote}
          multiline
          textAlignVertical="top"
        />
        </KeyboardAwareScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.cancelBtn, isLoading && styles.cancelBtnDisabled]}
          onPress={handleCancel}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <Text style={styles.cancelBtnText}>
            {isLoading ? t('appointmentCancel.cancelling') : t('appointmentCancel.cancelBtn')}
          </Text>
        </TouchableOpacity>
      </View>
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
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 16,
  },
  cardRow: { flexDirection: 'row', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 14 },
  avatarPlaceholder: {
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1A1817', marginBottom: 2 },
  cardDetail: { fontSize: 13, fontWeight: '500', color: '#7C7672', marginBottom: 2 },
  ownerBlock: { marginTop: 2 },
  ownerLabel: { fontSize: 12, fontWeight: '600', color: '#BD632F', marginBottom: 2 },
  ownerName: { fontSize: 13, fontWeight: '600', color: '#1A1817' },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E6E1DC',
  },
  dateText: { fontSize: 13, fontWeight: '500', color: '#1A1817' },
  timeText: { fontSize: 13, fontWeight: '500', color: '#1A1817' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginTop: 24,
    marginBottom: 12,
  },
  radioGroup: { gap: 4 },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E6E1DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: { borderColor: '#BD632F' },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#BD632F',
  },
  radioLabel: { fontSize: 15, fontWeight: '500', color: '#1A1817' },
  noteInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 16,
    fontSize: 15,
    color: '#1A1817',
    minHeight: 120,
  },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500', color: '#9C9690' },
  bottomContainer: { paddingHorizontal: 20, paddingVertical: 16 },
  cancelBtn: {
    backgroundColor: '#E74C3C',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  cancelBtnDisabled: { opacity: 0.6 },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
