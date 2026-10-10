import React, { useEffect, useState } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useGetMyDoctorProfileQuery,
  useGetAvailabilityQuery,
  useSetAvailabilityMutation,
  type AvailabilityEntry,
} from '@/store/doctorPortalApi';
import { useTranslation } from '@/hooks/use-translation';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface DayRow {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

function defaultRows(): DayRow[] {
  return DAY_LABELS.map((_, dayOfWeek) => ({
    dayOfWeek,
    enabled: false,
    startTime: '09:00',
    endTime: '17:00',
  }));
}

export default function DoctorAvailabilityScreen() {
  const { data: profile, isLoading: isProfileLoading } = useGetMyDoctorProfileQuery();
  const isDoctor = useRequireDoctor();
  const { t } = useTranslation();
  if (!isDoctor) return null;
  const { data: availability, isLoading: isAvailabilityLoading } = useGetAvailabilityQuery(
    profile?.id ?? 0,
    { skip: !profile?.id },
  );
  const [setAvailability, { isLoading: isSaving }] = useSetAvailabilityMutation();

  const [rows, setRows] = useState<DayRow[]>(defaultRows());

  useEffect(() => {
    if (!availability) return;
    setRows((prev) =>
      prev.map((row) => {
        const existing = availability.find((a) => a.dayOfWeek === row.dayOfWeek);
        return existing
          ? { ...row, enabled: true, startTime: existing.startTime, endTime: existing.endTime }
          : { ...row, enabled: false };
      }),
    );
  }, [availability]);

  function updateRow(dayOfWeek: number, patch: Partial<DayRow>) {
    setRows((prev) => prev.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row)));
  }

  async function handleSave() {
    if (!profile?.id) return;
    const entries: AvailabilityEntry[] = rows
      .filter((row) => row.enabled)
      .map((row) => ({ dayOfWeek: row.dayOfWeek, startTime: row.startTime, endTime: row.endTime }));

    try {
      await setAvailability({ doctorId: profile.id, entries }).unwrap();
      Alert.alert(t('doctorAvailability.alerts.saved.title'), t('doctorAvailability.alerts.saved.msg'));
    } catch (err) {
      console.log('Error saving availability:', err);
      Alert.alert(t('doctorAvailability.alerts.saveError.title'), t('doctorAvailability.alerts.saveError.msg'));
    }
  }

  const isLoading = isProfileLoading || isAvailabilityLoading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('doctorAvailability.title')}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color="#BD632F" style={{ marginTop: 30 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {rows.map((row) => (
            <View key={row.dayOfWeek} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{t(`doctorAvailability.days.${DAY_KEYS[row.dayOfWeek]}`)}</Text>
                <Switch
                  value={row.enabled}
                  onValueChange={(enabled) => updateRow(row.dayOfWeek, { enabled })}
                  trackColor={{ true: '#BD632F' }}
                />
              </View>
              {row.enabled ? (
                <View style={styles.timeRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={row.startTime}
                    onChangeText={(startTime) => updateRow(row.dayOfWeek, { startTime })}
                    placeholder="09:00"
                  />
                  <Text style={styles.timeSeparator}>{t('doctorAvailability.to')}</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={row.endTime}
                    onChangeText={(endTime) => updateRow(row.dayOfWeek, { endTime })}
                    placeholder="17:00"
                  />
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving || !profile?.id}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{t('doctorAvailability.save')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1817',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 110,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  timeInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1A1817',
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 12,
    color: '#9C9690',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9E5DF',
  },
  saveButton: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
