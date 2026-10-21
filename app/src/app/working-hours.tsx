import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetMyDoctorProfileQuery,
  useGetAvailabilityQuery,
  useSetAvailabilityMutation,
} from '@/store/doctorPortalApi';

const DAY_ORDER_KEYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_OF_WEEK: Record<string, number> = {
  saturday: 6,
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
};
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const WHEEL_ITEM_HEIGHT = 36;

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

function buildEmptySchedule(): DaySchedule[] {
  return DAY_ORDER_KEYS.map((day) => ({
    day,
    dayOfWeek: DAY_OF_WEEK[day],
    enabled: false,
    startTime: '09:00 AM',
    endTime: '05:00 PM',
  }));
}

function settledIndex(offset: number, len: number): number {
  let i = Math.round(offset / WHEEL_ITEM_HEIGHT);
  if (i < 0) i = 0;
  if (i > len - 1) i = len - 1;
  return i;
}

function WheelColumn({
  values,
  index,
  onChange,
}: {
  values: string[];
  index: number;
  onChange: (i: number) => void;
}) {
  const listRef = useRef<FlatList>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current && listRef.current) {
      listRef.current.scrollToOffset({ offset: index * WHEEL_ITEM_HEIGHT, animated: false });
      mounted.current = true;
    }
  }, [index]);

  const settle = useCallback(
    (offset: number) => {
      const i = settledIndex(offset, values.length);
      if (i !== index) onChange(i);
    },
    [index, values.length, onChange],
  );

  return (
    <FlatList
      ref={listRef}
      data={values}
      keyExtractor={(v) => v}
      showsVerticalScrollIndicator={false}
      snapToInterval={WHEEL_ITEM_HEIGHT}
      decelerationRate="fast"
      getItemLayout={(_, i) => ({ length: WHEEL_ITEM_HEIGHT, offset: WHEEL_ITEM_HEIGHT * i, index: i })}
      contentContainerStyle={styles.wheelInner}
      onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
      onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.y)}
      renderItem={({ item, index: i }) => (
        <View style={styles.wheelItem} key={item}>
          <Text style={[styles.wheelText, i === index && styles.wheelTextActive]}>{item}</Text>
        </View>
      )}
    />
  );
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


  useEffect(() => {
    if (availability && availability.length > 0) {
      const mapped: DaySchedule[] = DAY_ORDER_KEYS.map((day) => {
        const idx = DAY_OF_WEEK[day];
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

  const handleSaveAll = async (): Promise<boolean> => {
    if (!doctorId) return false;
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
      return false;
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
      return true;
    } catch {
      Alert.alert(t('workingHours.alerts.errorTitle'), t('workingHours.alerts.saveFailedMsg'));
      return false;
    }
  };

  const updateDayTime = (
    dayIndex: number,
    field: 'startTime' | 'endTime',
    hour12?: number,
    minute?: number,
  ) => {
    setSchedule((prev) =>
      prev.map((item, i) => {
        if (i !== dayIndex) return item;
        const raw = item[field];
        const apm = raw.includes('AM') ? 'AM' : 'PM';
        const currentHour12 = parseInt(raw.split(':')[0], 10);
        const currentMinute = parseInt(raw.split(':')[1], 10);
        const h = hour12 ?? currentHour12;
        const m = minute ?? currentMinute;
        return { ...item, [field]: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${apm}` };
      }),
    );
    setHasChanges(true);
  };

  const handleSaveDay = async () => {
    const ok = await handleSaveAll();
    if (ok) setSelectedDay(null);
  };

  if (selectedDay) {
    const dayIndex = schedule.findIndex((d) => d.day === selectedDay);
    const dayData = schedule[dayIndex];
    const hourToIndex = (v: string) => Math.max(0, parseInt(v.split(':')[0], 10) - 1);
    const minuteToIndex = (v: string) => Math.max(0, parseInt(v.split(':')[1], 10));
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
          <View style={styles.wheelRow}>
            <WheelColumn
              values={[...HOURS]}
              index={hourToIndex(dayData.startTime)}
              onChange={(i) => updateDayTime(dayIndex, 'startTime', i + 1)}
            />
            <Text style={styles.wheelColon}>:</Text>
            <WheelColumn
              values={[...MINUTES]}
              index={minuteToIndex(dayData.startTime)}
              onChange={(i) => updateDayTime(dayIndex, 'startTime', undefined, i)}
            />
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

          <Text style={[styles.timeLabel, { marginTop: 28 }]}>{t('workingHours.end')}</Text>
          <View style={styles.wheelRow}>
            <WheelColumn
              values={[...HOURS]}
              index={hourToIndex(dayData.endTime)}
              onChange={(i) => updateDayTime(dayIndex, 'endTime', i + 1)}
            />
            <Text style={styles.wheelColon}>:</Text>
            <WheelColumn
              values={[...MINUTES]}
              index={minuteToIndex(dayData.endTime)}
              onChange={(i) => updateDayTime(dayIndex, 'endTime', undefined, i)}
            />
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

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSaveDay}
            activeOpacity={0.85}
            disabled={saving}
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1817' },
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
  wheelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', paddingVertical: 4, paddingHorizontal: 8 },
  wheelInner: { paddingVertical: WHEEL_ITEM_HEIGHT * 2 },
  wheelItem: { width: 48, height: WHEEL_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  wheelText: { fontSize: 16, fontWeight: '600', color: '#9C9690' },
  wheelTextActive: { fontSize: 18, fontWeight: '700', color: '#BD632F' },
  wheelColon: { fontSize: 18, fontWeight: '700', color: '#BD632F' },
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
