import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { RegistrationBackground } from '@/components/registration-background';

type DateFilter = 'today' | 'tomorrow' | 'this_week' | null;
type StatusFilter = 'all' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | null;
type ConsultationFilter = 'all' | 'video' | 'voice' | 'chat' | 'physical' | null;

const DATE_OPTIONS: { value: Exclude<DateFilter, null>; labelKey: string }[] = [
  { value: 'today', labelKey: 'appointmentFilter.dates.today' },
  { value: 'tomorrow', labelKey: 'appointmentFilter.dates.tomorrow' },
  { value: 'this_week', labelKey: 'appointmentFilter.dates.thisWeek' },
];

const STATUS_OPTIONS: { value: Exclude<StatusFilter, null>; labelKey: string }[] = [
  { value: 'all', labelKey: 'appointmentFilter.status.all' },
  { value: 'CONFIRMED', labelKey: 'appointmentFilter.status.upcoming' },
  { value: 'COMPLETED', labelKey: 'appointmentFilter.status.completed' },
  { value: 'CANCELLED', labelKey: 'appointmentFilter.status.cancelled' },
];

const CONSULTATION_OPTIONS: { value: Exclude<ConsultationFilter, null>; labelKey: string }[] = [
  { value: 'all', labelKey: 'appointmentFilter.consultation.all' },
  { value: 'video', labelKey: 'appointmentFilter.consultation.video' },
  { value: 'voice', labelKey: 'appointmentFilter.consultation.voice' },
  { value: 'chat', labelKey: 'appointmentFilter.consultation.chat' },
  { value: 'physical', labelKey: 'appointmentFilter.consultation.physical' },
];

export default function AppointmentFilterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  // No date filter by default — preselecting 'today' made a plain Apply (or
  // the Clear button, which also reset to 'today') silently re-enable the
  // Today filter, which emptied the Previous tab even after "clearing".
  const [selectedDate, setSelectedDate] = useState<DateFilter>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationFilter>('all');

  const handleApply = () => {
    const params: Record<string, string> = {};
    if (selectedDate) params.filterDate = selectedDate;
    if (selectedStatus && selectedStatus !== 'all') params.filterStatus = selectedStatus;
    if (selectedConsultation && selectedConsultation !== 'all') params.filterConsultationType = selectedConsultation;
    router.push({
      pathname: '/appointments',
      params,
    });
  };

  const handleClear = () => {
    setSelectedDate(null);
    setSelectedStatus('all');
    setSelectedConsultation('all');
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
        <Text style={styles.headerTitle}>{t('appointmentFilter.title')}</Text>
        <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
          <Text style={styles.clearText}>{t('appointmentFilter.clear')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>{t('appointmentFilter.dateSection')}</Text>
        <View style={styles.chipRow}>
          {DATE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, selectedDate === option.value && styles.chipActive]}
              onPress={() => setSelectedDate(selectedDate === option.value ? null : option.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedDate === option.value && styles.chipTextActive,
                ]}
              >
                {t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('appointmentFilter.statusSection')}</Text>
        <View style={styles.radioGroup}>
          {STATUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.radioRow}
              onPress={() => setSelectedStatus(option.value as StatusFilter)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.radioOuter,
                  selectedStatus === option.value && styles.radioOuterActive,
                ]}
              >
                {selectedStatus === option.value && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{t(option.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('appointmentFilter.consultationSection')}</Text>
        <View style={styles.radioGroup}>
          {CONSULTATION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.radioRow}
              onPress={() => setSelectedConsultation(option.value as ConsultationFilter)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.radioOuter,
                  selectedConsultation === option.value && styles.radioOuterActive,
                ]}
              >
                {selectedConsultation === option.value && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{t(option.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.8}>
          <Text style={styles.applyBtnText}>{t('appointmentFilter.apply')}</Text>
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
  clearText: { fontSize: 15, fontWeight: '600', color: '#BD632F' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginTop: 20,
    marginBottom: 12,
  },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  chipText: { fontSize: 14, fontWeight: '600', color: '#7C7672' },
  chipTextActive: { color: '#FFFFFF' },
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
  bottomContainer: { paddingHorizontal: 20, paddingVertical: 16 },
  applyBtn: {
    backgroundColor: '#BD632F',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  applyBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
