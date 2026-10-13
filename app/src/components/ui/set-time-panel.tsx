import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { localDateKey } from '@/utils/date';
import {
  WHEEL_ITEM_HEIGHT,
  DURATION_OPTIONS,
  type TimeOfDay,
  dateFromDateKey,
} from '@/utils/time';
import { useTranslation } from '@/hooks/use-translation';

const HOUR_VALUES = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTE_VALUES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIOD_VALUES = ['AM', 'PM'];

const DURATION_NAME_KEYS: Record<number, string> = {
  30: 'durations.thirtyMin',
  60: 'durations.oneHour',
  120: 'durations.twoHours',
  180: 'durations.threeHour',
};

function WheelColumn({
  values,
  selectedIndex,
  onSelect,
}: {
  values: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const initializedRef = useRef(false);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.wheelColumn}
      contentContainerStyle={styles.wheelColumnContent}
      showsVerticalScrollIndicator={false}
      snapToInterval={WHEEL_ITEM_HEIGHT}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onContentSizeChange={() => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        scrollRef.current?.scrollTo({
          y: selectedIndex * WHEEL_ITEM_HEIGHT,
          animated: false,
        });
      }}
      onScroll={(event) => {
        const index = Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
        if (index >= 0 && index < values.length && index !== selectedIndex) {
          onSelect(index);
        }
      }}
    >
      {values.map((value, index) => (
        <View key={value} style={styles.wheelItem}>
          <Text
            numberOfLines={1}
            style={[styles.wheelItemText, index === selectedIndex && styles.wheelItemTextActive]}
          >
            {value}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function SetTimePanel({
  i18nPrefix,
  dateKey,
  onDateChange,
  time,
  onTimeChange,
  durationMins,
  onDurationChange,
}: {
  i18nPrefix: 'editTask' | 'addTask';
  dateKey: string;
  onDateChange: (key: string) => void;
  time: TimeOfDay;
  onTimeChange: (time: TimeOfDay) => void;
  durationMins: number;
  onDurationChange: (mins: number) => void;
}) {
  const { t } = useTranslation();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const todayKey = localDateKey();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowKey = localDateKey(tomorrowDate);
  const isToday = dateKey === todayKey;
  const isTomorrow = dateKey === tomorrowKey;

  function handleDateChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (event.type === 'dismissed' || !date) return;
    onDateChange(localDateKey(date));
    if (Platform.OS === 'ios') setShowDatePicker(false);
  }

  return (
    <>
      <Text style={styles.sectionHeading}>{t(`${i18nPrefix}.setTime`)}</Text>
      <View style={styles.timePanel}>
        <Text style={styles.timePanelLabel}>{t(`${i18nPrefix}.whenToDo`)}</Text>

        <View style={styles.dateRow}>
          <TouchableOpacity
            style={[styles.datePill, isToday && styles.datePillSelected]}
            onPress={() => onDateChange(todayKey)}
            activeOpacity={0.7}
          >
            <Text style={[styles.datePillText, isToday && styles.datePillTextSelected]}>
              {t(`${i18nPrefix}.today`)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.datePill, isTomorrow && styles.datePillSelected]}
            onPress={() => onDateChange(tomorrowKey)}
            activeOpacity={0.7}
          >
            <Text style={[styles.datePillText, isTomorrow && styles.datePillTextSelected]}>
              {t(`${i18nPrefix}.tomorrow`)}
            </Text>
          </TouchableOpacity>
          <View style={styles.dateRowSpacer} />
          <TouchableOpacity
            style={styles.calendarBtn}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={18} color="#7C7672" />
          </TouchableOpacity>
        </View>

        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((mins) => {
            const isSel = durationMins === mins;
            return (
              <TouchableOpacity
                key={mins}
                style={[styles.durationPill, isSel && styles.durationPillSelected]}
                onPress={() => onDurationChange(mins)}
                activeOpacity={0.7}
              >
                <Text style={[styles.durationPillText, isSel && styles.durationPillTextSelected]}>
                  {t(`${i18nPrefix}.${DURATION_NAME_KEYS[mins]}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.wheelBox}>
          <View style={styles.wheelHighlight} pointerEvents="none" />
          <View style={styles.wheelRow}>
            <WheelColumn
              values={HOUR_VALUES}
              selectedIndex={HOUR_VALUES.indexOf(String(time.hour))}
              onSelect={(index) => onTimeChange({ ...time, hour: index + 1 })}
            />
            <WheelColumn
              values={MINUTE_VALUES}
              selectedIndex={time.minute}
              onSelect={(index) => onTimeChange({ ...time, minute: index })}
            />
            <WheelColumn
              values={PERIOD_VALUES}
              selectedIndex={PERIOD_VALUES.indexOf(time.period)}
              onSelect={(index) =>
                onTimeChange({ ...time, period: PERIOD_VALUES[index] as 'AM' | 'PM' })
              }
            />
          </View>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={dateFromDateKey(dateKey)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 14,
    marginTop: 6,
  },
  timePanel: {
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 20,
  },
  timePanelLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  dateRowSpacer: {
    flex: 1,
  },
  datePill: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    backgroundColor: '#FAF9F6',
  },
  datePillSelected: {
    borderColor: '#BD632F',
    backgroundColor: '#FFF8F4',
    borderWidth: 1.5,
  },
  datePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
  },
  datePillTextSelected: {
    color: '#BD632F',
    fontWeight: '700',
  },
  calendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F0EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    backgroundColor: '#FAF9F6',
    alignItems: 'center',
  },
  durationPillSelected: {
    borderColor: '#BD632F',
    backgroundColor: '#FFF8F4',
    borderWidth: 1.5,
  },
  durationPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C7672',
  },
  durationPillTextSelected: {
    color: '#BD632F',
    fontWeight: '700',
  },
  wheelBox: {
    height: WHEEL_ITEM_HEIGHT * 3,
    backgroundColor: '#F5F2ED',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  wheelHighlight: {
    position: 'absolute',
    top: WHEEL_ITEM_HEIGHT,
    left: 6,
    right: 6,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: '#FBE3D0',
  },
  wheelRow: {
    flexDirection: 'row',
    flex: 1,
  },
  wheelColumn: {
    flex: 1,
  },
  wheelColumnContent: {
    paddingVertical: WHEEL_ITEM_HEIGHT,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9C9690',
  },
  wheelItemTextActive: {
    color: '#BD632F',
    fontWeight: '800',
  },
});
