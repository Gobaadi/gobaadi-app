import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';

export function getWeekDates(reference: Date): Date[] {
  const start = new Date(reference);
  start.setDate(start.getDate() - start.getDay());
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_LETTERS = [
  'schedule.dayLetters.sun',
  'schedule.dayLetters.mon',
  'schedule.dayLetters.tue',
  'schedule.dayLetters.wed',
  'schedule.dayLetters.thu',
  'schedule.dayLetters.fri',
  'schedule.dayLetters.sat',
];

export default function ScheduleWeekStrip({
  selectedDate,
  onSelectDate,
  appointmentDates,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  appointmentDates?: Set<string>;
}) {
  const { t } = useTranslation();
  const weekDates = useMemo(
    () => getWeekDates(selectedDate),
    [selectedDate],
  );

  return (
    <View style={styles.weekStrip}>
      <View style={styles.weekDateRow}>
        {weekDates.map((date, i) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          const hasAppointment = appointmentDates?.has(
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
          );
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.weekDateCell,
                isSelected && styles.weekDateCellSelected,
              ]}
              onPress={() => onSelectDate(date)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.weekDateLetter,
                  isSelected && styles.weekDateLetterSelected,
                ]}
              >
                {t(DAY_LETTERS[date.getDay()])}
              </Text>
              <View
                style={[
                  styles.weekDateNumberWrap,
                  !isSelected && hasAppointment && styles.weekDateNumberHasAppointment,
                ]}
              >
                <Text
                  style={[
                    styles.weekDateNumber,
                    isSelected && styles.weekDateNumberSelected,
                    isToday && !isSelected && styles.weekDateNumberToday,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekStrip: {
    marginTop: 4,
    marginBottom: 16,
  },
  weekDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  weekDateCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 20,
  },
  weekDateCellSelected: {
    backgroundColor: '#BD632F',
  },
  weekDateLetter: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9C9690',
    marginBottom: 2,
  },
  weekDateLetterSelected: {
    color: '#FFFFFF',
  },
  weekDateNumberWrap: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDateNumberHasAppointment: {
    backgroundColor: '#BD632F',
  },
  weekDateNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1817',
  },
  weekDateNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  weekDateNumberToday: {
    color: '#BD632F',
    fontWeight: '700',
  },
});
