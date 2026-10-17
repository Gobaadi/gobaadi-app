import React, { useState, useEffect } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  useGetMyDoctorProfileQuery,
  useGetAvailabilityQuery,
  useSetAvailabilityMutation,
} from '@/store/doctorPortalApi';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface DaySchedule {
  day: string;
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  availabilityId?: number;
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function time12to24(time12: string): string {
  const match = time12.match(/(\d{2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return '09:00';
  let [, h, m, ampm] = match;
  let hour = parseInt(h, 10);
  if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${m}`;
}

function time12ToDate(time12: string): Date {
  const [h, m] = time12to24(time12).split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTime12(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return formatTime12h(`${h}:${m}`);
}

function buildEmptySchedule(): DaySchedule[] {
  return DAY_KEYS.map((day, idx) => ({
    day,
    dayOfWeek: idx,
    enabled: false,
    startTime: '09:00 AM',
    endTime: '05:00 PM',
  }));
}

export default function WorkingHoursScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const isDoctor = useRequireDoctor();

  const { data: profile } = useGetMyDoctorProfileQuery();
  const doctorId = profile?.id;
  const { data: availability, isLoading: loadingAvailability } = useGetAvailabilityQuery(doctorId!, { skip: !doctorId });
  const [setAvailability, { isLoading: saving }] = useSetAvailabilityMutation();

  const [schedule, setSchedule] = useState<DaySchedule[]>(buildEmptySchedule());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ dayIndex: number; field: 'startTime' | 'endTime' } | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  useEffect(() => {
    if (availability && availability.length > 0) {
      const mapped: DaySchedule[] = DAY_KEYS.map((day, idx) => {
        const entry = availability.find((a) => a.dayOfWeek === idx);
        if (entry) {
          return {
            day,
            dayOfWeek: idx,
            enabled: entry.isActive,
            startTime: formatTime12h(entry.startTime),
            endTime: formatTime12h(entry.endTime),
            availabilityId: entry.id,
          };
        }
        return { day, dayOfWeek: idx, enabled: false, startTime: '09:00 AM', endTime: '05:00 PM' };
      });
      setSchedule(mapped); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [availability]);

  if (!isDoctor) return null;

  const toggleDay = (index: number) => {
    setSchedule((prev) =>
      prev.map((item, i) => (i === index ? { ...item, enabled: !item.enabled } : item))
    );
    setHasChanges(true);
  };

  const handleDayPress = (day: string) => {
    setSelectedDay(day);
  };

  const openTimePicker = (dayIndex: number, field: 'startTime' | 'endTime') => {
    const time12 = schedule[dayIndex][field];
    setPickerTarget({ dayIndex, field });
    setPickerDate(time12ToDate(time12));
    setPickerVisible(true);
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setPickerVisible(false);
    }
    if (event.type === 'dismissed' || !selectedDate || !pickerTarget) return;
    const newTime12 = dateToTime12(selectedDate);
    const { dayIndex, field } = pickerTarget;
    setSchedule((prev) =>
      prev.map((item, i) => (i === dayIndex ? { ...item, [field]: newTime12 } : item))
    );
    setHasChanges(true);
    if (Platform.OS === 'ios') {
      setPickerVisible(false);
    }
  };

  const toggleAmPm = (dayIndex: number, field: 'startTime' | 'endTime', ampm: 'AM' | 'PM') => {
    const current12 = schedule[dayIndex][field];
    const timePart = current12.split(' ')[0];
    const currentAmPm = current12.includes('AM') ? 'AM' : 'PM';
    if (currentAmPm === ampm) return;
    const newTime12 = `${timePart} ${ampm}`;
    setSchedule((prev) =>
      prev.map((item, i) => (i === dayIndex ? { ...item, [field]: newTime12 } : item))
    );
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    if (!doctorId) return;
    // Same-day windows must be chronological — reject end <= start before
    // hitting the API (backend re-validates).
    const invalidDay = schedule.find(
      (s) => s.enabled && time12to24(s.endTime) <= time12to24(s.startTime),
    );
    if (invalidDay) {
      Alert.alert(
        t('workingHours.alerts.invalidRangeTitle'),
        t('workingHours.alerts.invalidRange', {
          day: t(`workingHours.days.${invalidDay.day}`),
        }),
      );
      return;
    }
    const entries = schedule
      .filter((s) => s.enabled)
      .map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: time12to24(s.startTime),
        endTime: time12to24(s.endTime),
      }));
    try {
      await setAvailability({ doctorId, entries }).unwrap();
      setHasChanges(false);
      Alert.alert(t('workingHours.alerts.savedTitle'), t('workingHours.alerts.savedMsg'));
    } catch {
      Alert.alert(t('workingHours.alerts.errorTitle'), t('workingHours.alerts.saveFailedMsg'));
    }
  };

  if (selectedDay) {
    const dayIndex = schedule.findIndex((d) => d.day === selectedDay);
    const dayData = schedule[dayIndex];
    const startIsAM = dayData.startTime.includes('AM');
    const endIsAM = dayData.endTime.includes('AM');

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedDay(null)} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t(`workingHours.days.${selectedDay}`)}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.timePickerContent}>
          <Text style={styles.timeLabel}>{t('workingHours.start')}</Text>
          <View style={styles.timePickerRow}>
            <TouchableOpacity
              style={styles.timeBox}
              activeOpacity={0.7}
              onPress={() => openTimePicker(dayIndex, 'startTime')}
            >
              <Text style={styles.timeValue}>{dayData.startTime.split(' ')[0]}</Text>
            </TouchableOpacity>
            <View style={styles.ampmRow}>
              <TouchableOpacity
                style={[styles.ampmBtn, startIsAM && styles.ampmBtnActive]}
                activeOpacity={0.8}
                onPress={() => toggleAmPm(dayIndex, 'startTime', 'AM')}
              >
                <Text style={[styles.ampmText, startIsAM && styles.ampmTextActive]}>am</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ampmBtn, !startIsAM && styles.ampmBtnActive]}
                activeOpacity={0.8}
                onPress={() => toggleAmPm(dayIndex, 'startTime', 'PM')}
              >
                <Text style={[styles.ampmText, !startIsAM && styles.ampmTextActive]}>pm</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.timeLabel, { marginTop: 32 }]}>{t('workingHours.end')}</Text>
          <View style={styles.timePickerRow}>
            <TouchableOpacity
              style={styles.timeBox}
              activeOpacity={0.7}
              onPress={() => openTimePicker(dayIndex, 'endTime')}
            >
              <Text style={styles.timeValue}>{dayData.endTime.split(' ')[0]}</Text>
            </TouchableOpacity>
            <View style={styles.ampmRow}>
              <TouchableOpacity
                style={[styles.ampmBtn, endIsAM && styles.ampmBtnActive]}
                activeOpacity={0.8}
                onPress={() => toggleAmPm(dayIndex, 'endTime', 'AM')}
              >
                <Text style={[styles.ampmText, endIsAM && styles.ampmTextActive]}>am</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ampmBtn, !endIsAM && styles.ampmBtnActive]}
                activeOpacity={0.8}
                onPress={() => toggleAmPm(dayIndex, 'endTime', 'PM')}
              >
                <Text style={[styles.ampmText, !endIsAM && styles.ampmTextActive]}>pm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {pickerVisible && pickerTarget && (
          <DateTimePicker
            value={pickerDate}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}
      </SafeAreaView>
    );
  }

  if (loadingAvailability) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('workingHours.title')}</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BD632F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('workingHours.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {schedule.map((item, index) => (
          <TouchableOpacity
            key={item.day}
            style={styles.dayRow}
            onPress={() => handleDayPress(item.day)}
            activeOpacity={0.7}
          >
            <Text style={styles.dayLabel}>{t(`workingHours.days.${item.day}`)}</Text>
            <Text style={styles.timeRange}>
              {item.startTime} - {item.endTime}
            </Text>
            <Switch
              value={item.enabled}
              onValueChange={() => toggleDay(index)}
              trackColor={{ true: '#BD632F', false: '#E6E1DC' }}
              thumbColor="#FFFFFF"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
          onPress={handleSaveAll}
          activeOpacity={0.85}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>{t('workingHours.save')}</Text>
          )}
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
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1817' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E1DC',
  },
  dayLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1817' },
  timeRange: { fontSize: 13, fontWeight: '500', color: '#7C7672', marginRight: 14 },
  timePickerContent: { paddingHorizontal: 20, paddingBottom: 100 },
  timeLabel: { fontSize: 14, fontWeight: '600', color: '#1A1817', marginBottom: 12 },
  timePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  timeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  timeValue: { fontSize: 28, fontWeight: '700', color: '#BD632F' },
  ampmRow: { flexDirection: 'row', gap: 8 },
  ampmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    backgroundColor: '#FFFFFF',
  },
  ampmBtnActive: { backgroundColor: '#BD632F', borderColor: '#BD632F' },
  ampmText: { fontSize: 14, fontWeight: '600', color: '#7C7672' },
  ampmTextActive: { color: '#FFFFFF' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
  },
  saveBtn: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#E6E1DC' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
