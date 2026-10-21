import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import {
  useGetDoctorBookingsQuery,
  type DoctorAppointment,
} from '@/store/doctorPortalApi';
import { PatientAvatar } from '@/components/patient-avatar';
import { formatAnimalDetails } from '@/utils/appointment';
import ScheduleWeekStrip from '@/components/schedule-week-strip';
import { backButtonSvg, doctorScheduleVideoSvg, bgPatternSvg } from '@/components/icons/svg-icon-sources';

const MONTH_NAMES = [
  'schedule.months.january', 'schedule.months.february', 'schedule.months.march', 'schedule.months.april',
  'schedule.months.may', 'schedule.months.june', 'schedule.months.july', 'schedule.months.august',
  'schedule.months.september', 'schedule.months.october', 'schedule.months.november', 'schedule.months.december',
];
const DAY_FULL = [
  'schedule.dayFull.sunday', 'schedule.dayFull.monday', 'schedule.dayFull.tuesday',
  'schedule.dayFull.wednesday', 'schedule.dayFull.thursday', 'schedule.dayFull.friday',
  'schedule.dayFull.saturday',
];

const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 22;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${String(h).padStart(2, '0')}:00 ${ampm}`;
}

function formatClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateParam(value?: string): Date {
  if (!value) return new Date();
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function DayAppointmentCard({
  appointment,
  isPast,
  isUpcoming,
}: {
  appointment: DoctorAppointment;
  isPast?: boolean;
  isUpcoming?: boolean;
}) {
  const { t } = useTranslation();
  const animalDetails = formatAnimalDetails({
    animalBreed: appointment.animalBreed,
    animalAge: appointment.animalAge,
  });
  const symptomsText = Array.isArray(appointment.symptoms)
    ? appointment.symptoms.join(', ').trim()
    : appointment.symptoms?.trim();
  return (
    <View style={[styles.apptCard, isPast && styles.apptCardPast]}>
      <View style={styles.apptAvatar}>
        <PatientAvatar
          name={appointment.animalName || appointment.patientName || t('schedule.patient')}
          image={appointment.animalImage || appointment.patientAvatar}
          size={52}
        />
        {isUpcoming && (
          <View style={styles.greenDot}>
            <SvgXml width={11} height={11} xml={doctorScheduleVideoSvg} />
          </View>
        )}
      </View>
      <View style={styles.apptInfo}>
        <Text style={styles.apptName}>
          {appointment.animalName || appointment.patientName || t('schedule.patient')}
        </Text>
        {animalDetails && <Text style={styles.apptDetail}>{animalDetails}</Text>}
        {symptomsText && (
          <Text style={styles.apptSymptoms} numberOfLines={2}>
            {symptomsText}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function DailyScheduleScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ date?: string }>();
  const selectedDate = useMemo(() => parseDateParam(params.date), [params.date]);

  const { data: bookings = [], isLoading } = useGetDoctorBookingsQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const dayAppointments = useMemo(
    () =>
      bookings
        .filter((a) => isSameDay(new Date(a.startAt), selectedDate))
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [bookings, selectedDate],
  );

  const monthAppointmentDates = useMemo(() => {
    const dates = new Set<string>();
    bookings.forEach((b) => dates.add(formatDateKey(new Date(b.startAt))));
    return dates;
  }, [bookings]);

  const handleSelectDate = useCallback(
    (date: Date) => {
      router.replace({
        pathname: '/daily-schedule',
        params: { date: formatDateKey(date) },
      });
    },
    [router],
  );

  const now = new Date();
  const isToday = isSameDay(selectedDate, now);
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  const hourRange = useMemo(() => {
    let start = DEFAULT_START_HOUR;
    let end = DEFAULT_END_HOUR;
    dayAppointments.forEach((a) => {
      const h = new Date(a.startAt).getHours();
      if (h < start) start = h;
      if (h > end) end = h;
    });
    if (isSameDay(selectedDate, new Date())) {
      const h = new Date().getHours();
      if (h < start) start = h;
      if (h > end) end = h;
    }
    const hours: number[] = [];
    for (let h = start; h <= end; h++) hours.push(h);
    return hours;
  }, [dayAppointments, selectedDate]);

  const appointmentsByHour = useMemo(() => {
    const map = new Map<number, DoctorAppointment[]>();
    dayAppointments.forEach((a) => {
      const h = new Date(a.startAt).getHours();
      if (!map.has(h)) map.set(h, []);
      map.get(h)!.push(a);
    });
    return map;
  }, [dayAppointments]);

  const dayName = t(DAY_FULL[selectedDate.getDay()]);
  const monthName = t(MONTH_NAMES[selectedDate.getMonth()]);
  const dayCardTitle = `${dayName}, ${selectedDate.getDate()} ${monthName}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgPattern} pointerEvents="none">
        <SvgXml width="100%" height="100%" xml={bgPatternSvg} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('schedule.title')}
        </Text>
      </View>

      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleButton, styles.viewToggleButtonActive]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={[styles.viewToggleText, styles.viewToggleTextActive]}>
            {t('schedule.fullCalendar')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewToggleButton}
          onPress={() => router.push('/schedule')}
          activeOpacity={0.8}
        >
          <Text style={styles.viewToggleText}>
            {t('schedule.listView')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calendarSection}>
        <Text style={styles.monthLabel}>
          {monthName} {selectedDate.getFullYear()}
        </Text>
        <ScheduleWeekStrip
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          appointmentDates={monthAppointmentDates}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#BD632F" style={styles.loader} />
      ) : dayAppointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#E6E1DC" />
          <Text style={styles.emptyText}>{t('schedule.empty.day')}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.timelineScroll}
        >
          <View style={styles.dayCard}>
            <View style={styles.dayCardHeaderRow}>
              <Text style={styles.dayCardTitle}>{dayCardTitle}</Text>
              <Text style={styles.dayCardCount}>
                {t('schedule.appointmentCount', { count: dayAppointments.length })}
              </Text>
            </View>
            {hourRange.map((hour) => {
              const hourAppts = appointmentsByHour.get(hour) ?? [];
              return (
                <View key={hour}>
                  {isToday && hour === currentHour && (
                    <View style={styles.currentTimeRow}>
                      <View style={styles.currentTimeLine} />
                      <View style={styles.currentTimeDot} />
                      <Text style={styles.currentTimeLabel}>
                        {formatClock(currentHour, currentMinutes)}
                      </Text>
                      <View style={styles.currentTimeLineRight} />
                    </View>
                  )}
                  <View style={styles.hourRow}>
                    <Text style={styles.timeLabel}>{formatHourLabel(hour)}</Text>
                    <View style={styles.trackColumn}>
                      <View
                        style={[
                          styles.trackDot,
                          hourAppts.length > 0 && styles.trackDotActive,
                        ]}
                      />
                      <View style={styles.trackBar} />
                    </View>
                    <View style={styles.hourContent}>
                      {hourAppts.map((appt, idx) => (
                        <DayAppointmentCard
                          key={appt.id}
                          appointment={appt}
                          isPast={new Date(appt.endAt) < now}
                          isUpcoming={idx === 0 && new Date(appt.startAt) >= now}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  bgPattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  headerTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1817',
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFF2EB',
    borderRadius: 20,
    padding: 4,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
  },
  viewToggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6F6863',
  },
  viewToggleTextActive: {
    color: '#1A1817',
    fontWeight: '700',
  },
  calendarSection: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 4,
  },
  loader: { marginTop: 40 },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#9C9690', fontWeight: '500' },
  timelineScroll: { paddingHorizontal: 20, paddingBottom: 100 },

  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
  },
  dayCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
    flex: 1,
    minWidth: 0,
  },
  dayCardCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
    marginLeft: 8,
  },
  hourRow: { flexDirection: 'row', minHeight: 56, paddingBottom: 12 },
  timeLabel: {
    width: 64,
    fontSize: 11,
    fontWeight: '600',
    color: '#9C9690',
    paddingTop: 2,
  },
  trackColumn: { width: 24, alignItems: 'center' },
  trackDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E6E1DC',
    marginTop: 4,
  },
  trackDotActive: { backgroundColor: '#BD632F' },
  trackBar: { width: 2, flex: 1, backgroundColor: '#E6E1DC', marginTop: 2 },
  hourContent: { flex: 1, paddingLeft: 10 },

  currentTimeRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  currentTimeLine: { flex: 1, height: 2, backgroundColor: '#1565C0' },
  currentTimeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1565C0',
    marginHorizontal: 8,
  },
  currentTimeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1565C0',
    marginRight: 8,
  },
  currentTimeLineRight: { flex: 1, height: 2, backgroundColor: '#1565C0' },

  apptCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FDF4EE',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  apptCardPast: { opacity: 0.6 },
  apptAvatar: { position: 'relative' },
  apptAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFF2EB',
  },
  apptInfo: { flex: 1 },
  apptName: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  apptDetail: { fontSize: 12, color: '#9C9690', fontWeight: '500', marginTop: 2 },
  apptSymptoms: {
    fontSize: 12,
    color: '#9C9690',
    fontWeight: '500',
    marginTop: 2,
  },
  greenDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
