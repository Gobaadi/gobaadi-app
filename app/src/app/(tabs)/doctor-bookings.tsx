import React, { useState, useMemo, useCallback } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetDoctorBookingsQuery,
  useGetMyDoctorProfileQuery,
  type DoctorAppointment,
} from '@/store/doctorPortalApi';
import { useGetBlockTimesQuery } from '@/store/blockTimesApi';
import { PatientAvatar } from '@/components/patient-avatar';
import { formatTime12h } from '@/utils/date';
import { formatAnimalDetails } from '@/utils/appointment';
import { useTranslation } from '@/hooks/use-translation';

type ViewMode = 'monthly' | 'weekly';

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekDates(reference: Date): Date[] {
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

function formatHourLabel(hour: number): string {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${String(h).padStart(2, '0')}:00 ${ampm}`;
}

function MonthlyView({
  selectedDate,
  onSelectDate,
  appointmentDates,
  blockedDates,
  stats,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  appointmentDates: Set<string>;
  blockedDates: Set<string>;
  stats: { openDays: number; blockedDays: number; totalAppointments: number };
}) {
  const { t } = useTranslation();
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <View>
      <View style={styles.monthGrid}>
        <Text style={styles.monthGridTitle}>{t(`doctorBookings.months.${MONTH_KEYS[month]}`)} {year}</Text>

        <View style={styles.dayHeaderRow}>
          {DAY_LETTERS.map((d, i) => (
            <Text key={i} style={styles.dayHeaderText}>{d}</Text>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {blanks.map((b) => (
            <View key={`blank-${b}`} style={styles.dayCell} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const date = new Date(year, month, day);
            const key = formatDateKey(date);
            const hasAppointment = appointmentDates.has(key);
            const isSelected = isSameDay(date, selectedDate);
            const isBlocked = blockedDates.has(key);

            return (
              <TouchableOpacity
                key={day}
                style={styles.dayCell}
                onPress={() => onSelectDate(date)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.dayNumber,
                    hasAppointment && styles.dayNumberHasAppointment,
                    isBlocked && styles.dayNumberBlocked,
                    isSelected && styles.dayNumberSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumberText,
                      hasAppointment && styles.dayNumberTextAppointment,
                      isBlocked && styles.dayNumberTextBlocked,
                      isSelected && styles.dayNumberTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.openDays}</Text>
          <Text style={styles.statLabel}>{t('doctorBookings.openDays')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.blockedDays}</Text>
          <Text style={styles.statLabel}>{t('doctorBookings.blockedDays')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalAppointments}</Text>
          <Text style={styles.statLabel}>{t('doctorBookings.totalAppointments')}</Text>
        </View>
      </View>
    </View>
  );
}

function formatClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function WeeklyView({
  selectedDate,
  onSelectDate,
  bookings,
  blockedDates,
  onAppointmentPress,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  bookings: DoctorAppointment[];
  blockedDates: Set<string>;
  onAppointmentPress: (appointment: DoctorAppointment) => void;
}) {
  const { t } = useTranslation();
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const dayAppointments = useMemo(() => {
    return bookings
      .filter(
        (a) =>
          a.status !== 'CANCELLED' &&
          isSameDay(new Date(a.startAt), selectedDate),
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [bookings, selectedDate]);

  const hourRange = useMemo(() => {
    let start = 6;
    let end = 22;
    dayAppointments.forEach((a) => {
      const h = new Date(a.startAt).getHours();
      if (h < start) start = h;
      if (h > end) end = h;
    });
    const now = new Date();
    if (isSameDay(selectedDate, now)) {
      const h = now.getHours();
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

  const currentTime = new Date();
  const isToday = isSameDay(selectedDate, currentTime);
  const currentHour = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();

  return (
    <View>
      <View style={styles.weekStrip}>
        <View style={styles.weekDateRow}>
          {weekDates.map((date, i) => {
            const isSelected = isSameDay(date, selectedDate);
            const isTodayDate = isSameDay(date, new Date());
            const isBlocked = blockedDates.has(formatDateKey(date));
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.weekDateCell,
                  isSelected && styles.weekDateCellSelected,
                  isBlocked && !isSelected && styles.weekDateCellBlocked,
                ]}
                onPress={() => onSelectDate(date)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.weekDateLetter,
                    isSelected && styles.weekDateLetterSelected,
                    isBlocked && !isSelected && styles.weekDateLetterBlocked,
                  ]}
                >
                  {DAY_LETTERS[date.getDay()]}
                </Text>
                <Text
                  style={[
                    styles.weekDateNumber,
                    isSelected && styles.weekDateNumberSelected,
                    isTodayDate && !isSelected && styles.weekDateNumberToday,
                    isBlocked && !isSelected && styles.weekDateNumberBlocked,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.dayTimelineCard}>
        <View style={styles.dayTimelineHeaderRow}>
          <Text style={styles.dayTimelineHeader}>
            {t(`schedule.dayFull.${DAY_KEYS[selectedDate.getDay()]}`)}, {selectedDate.getDate()} {t(`doctorBookings.months.${MONTH_KEYS[selectedDate.getMonth()]}`)}
          </Text>
          <Text style={styles.appointmentCount}>{t('doctorBookings.appointmentsCount', { count: dayAppointments.length })}</Text>
        </View>

        {dayAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color="#E6E1DC" />
            <Text style={styles.emptyStateText}>{t('doctorBookings.emptyDay')}</Text>
          </View>
        ) : (
          hourRange.map((hour) => {
            const hourAppts = appointmentsByHour.get(hour) ?? [];
            return (
              <View key={hour}>
                {isToday && hour === currentHour && (
                  <View style={styles.current_time_container}>
                    <View style={styles.current_time_line} />
                    <View style={styles.current_time_dot} />
                    <Text style={styles.current_time_label}>
                      {formatClock(currentHour, currentMinutes)}
                    </Text>
                    <View style={styles.current_time_line_right} />
                  </View>
                )}
                <View style={styles.timelineRow}>
                  <Text style={styles.timeLabel}>{formatHourLabel(hour)}</Text>
                  <View style={styles.timeLine}>
                    <View
                      style={[
                        styles.timeLineDot,
                        hourAppts.length > 0 && styles.timeLineDotActive,
                      ]}
                    />
                    <View style={styles.timeLineBar} />
                  </View>
                  <View style={styles.timeLineContent}>
                    {hourAppts.map((appt, idx) => {
                      const isPast = new Date(appt.endAt) < currentTime;
                      return (
                        <TouchableOpacity
                          key={appt.id}
                          style={[styles.appointmentCard, isPast && { opacity: 0.6 }]}
                          onPress={() => onAppointmentPress(appt)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.appointmentAvatar}>
                            {appt.animalImage ? (
                              <Image source={{ uri: appt.animalImage }} style={styles.appointmentAvatarImage} />
                            ) : (
                              <PatientAvatar name={appt.animalName || appt.patientName} image={appt.patientAvatar} size={40} />
                            )}
                            {idx === 0 && new Date(appt.startAt) >= currentTime && (
                              <View style={styles.greenDot}>
                                <Ionicons name="videocam" size={9} color="#FFFFFF" />
                              </View>
                            )}
                          </View>
                          <View style={styles.appointmentInfo}>
                            <Text style={styles.appointmentName}>
                              {appt.animalName || appt.patientName || t('doctorBookings.fallback.patient')}
                            </Text>
                            <Text style={styles.appointmentDetail}>
                              {formatAnimalDetails({ animalBreed: appt.animalBreed, animalAge: appt.animalAge })}
                            </Text>
                            {appt.symptoms ? (
                              <Text style={styles.appointmentSymptomsPlain} numberOfLines={1}>
                                {String(appt.symptoms)}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

export default function DoctorBookingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const isDoctor = useRequireDoctor();
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAllAppointments, setShowAllAppointments] = useState(false);

  const { data: profile } = useGetMyDoctorProfileQuery();
  const { data: bookings = [] } = useGetDoctorBookingsQuery();
  const { data: blockTimes = [] } = useGetBlockTimesQuery(String(profile?.id ?? 0), { skip: !profile?.id });

  const appointmentDates = useMemo(() => {
    const dates = new Set<string>();
    bookings.forEach((b) => {
      if (b.status === 'CANCELLED') return;
      dates.add(formatDateKey(new Date(b.startAt)));
    });
    return dates;
  }, [bookings]);

  const blockedDates = useMemo(() => {
    const dates = new Set<string>();
    blockTimes.forEach((bt) => {
      const start = new Date(bt.startDate);
      const end = new Date(bt.endDate);
      const current = new Date(start);
      while (current <= end) {
        dates.add(formatDateKey(current));
        current.setDate(current.getDate() + 1);
      }
    });
    return dates;
  }, [blockTimes]);

  const stats = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const monthStartStr = formatDateKey(new Date(year, month, 1));
    const monthEndStr = formatDateKey(new Date(year, month + 1, 0));
    let blockedDays = 0;
    for (const dateStr of blockedDates) {
      if (dateStr >= monthStartStr && dateStr <= monthEndStr) {
        blockedDays++;
      }
    }
    const openDays = daysInMonth - blockedDays;
    return { openDays, blockedDays, totalAppointments: bookings.length };
  }, [bookings.length, blockedDates]);

  const upcomingAll = useMemo(() => {
    const now = new Date();
    return bookings
      .filter(
        (a) => a.status !== 'CANCELLED' && new Date(a.startAt) >= now,
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [bookings]);

  const upcomingAppointments = showAllAppointments ? upcomingAll : upcomingAll.slice(0, 2);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setViewMode('weekly');
  }, []);

  const handleAppointmentPress = useCallback((appointment: DoctorAppointment) => {
    router.push({
      pathname: '/appointment-details',
      params: { id: String(appointment.id) },
    });
  }, [router]);

  if (!isDoctor) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/doctor-home')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#BD632F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('doctorBookings.title')}</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/calendar-settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={20} color="#BD632F" />
        </TouchableOpacity>
      </View>

      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'monthly' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('monthly')}
          activeOpacity={0.8}
        >
          <Text style={[styles.viewToggleText, viewMode === 'monthly' && styles.viewToggleTextActive]}>
            {t('doctorBookings.monthly')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'weekly' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('weekly')}
          activeOpacity={0.8}
        >
          <Text style={[styles.viewToggleText, viewMode === 'weekly' && styles.viewToggleTextActive]}>
            {t('doctorBookings.weekly')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {viewMode === 'monthly' ? (
          <MonthlyView
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            appointmentDates={appointmentDates}
            blockedDates={blockedDates}
            stats={stats}
          />
        ) : (
          <WeeklyView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            bookings={bookings}
            blockedDates={blockedDates}
            onAppointmentPress={handleAppointmentPress}
          />
        )}

        {viewMode === 'monthly' && (
          <View style={styles.upcomingSection}>
            <View style={styles.upcomingHeader}>
              <Text style={styles.upcomingTitle}>{t('doctorBookings.upcoming')}</Text>
              <TouchableOpacity
                onPress={() =>
                  upcomingAll.length > 2
                    ? setShowAllAppointments(!showAllAppointments)
                    : router.push('/schedule')
                }
                activeOpacity={0.7}
                style={styles.viewAllBtn}
              >
                <Text style={styles.viewAllText}>
                  {showAllAppointments
                    ? t('doctorBookings.showLess')
                    : upcomingAll.length > 2
                      ? t('doctorBookings.viewAllCount', { count: upcomingAll.length })
                      : t('doctorBookings.viewAll')}
                </Text>
                <Ionicons
                  name={showAllAppointments ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color="#BD632F"
                />
              </TouchableOpacity>
            </View>

            {upcomingAppointments.map((appt) => (
              <TouchableOpacity
                key={appt.id}
                style={styles.upcomingCard}
                activeOpacity={0.7}
                onPress={() => handleAppointmentPress(appt)}
              >
                <View style={styles.upcomingAvatar}>
                  {appt.animalImage ? (
                    <Image source={{ uri: appt.animalImage }} style={styles.upcomingAvatarImage} />
                  ) : (
                    <Ionicons name="paw" size={20} color="#BD632F" />
                  )}
                </View>
                <View style={styles.upcomingInfo}>
                  <View style={styles.upcomingTopRow}>
                    <Text style={styles.upcomingDate}>
                      {new Date(appt.startAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} · {formatTime12h(appt.startAt)}
                    </Text>
                    <View style={[styles.statusBadge, appt.status === 'CONFIRMED' ? styles.statusConfirmed : styles.statusPending]}>
                      <Text style={[styles.statusText, appt.status === 'CONFIRMED' ? styles.statusTextConfirmed : styles.statusTextPending]}>
                        {appt.status === 'CONFIRMED' ? t('doctorBookings.status.confirmed') : appt.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.upcomingName}>
                  {appt.animalName || appt.patientName || t('doctorBookings.fallback.patient')}
                    {appt.animalSpecies ? ` (${appt.animalSpecies})` : ''}
                  </Text>
                  <Text style={styles.upcomingType}>{t('doctorBookings.physicalConsultation')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9C9690" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1817' },
  settingsBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center' },
  viewToggle: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: '#FFF2EB', borderRadius: 20, padding: 4 },
  viewToggleButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 16 },
  viewToggleButtonActive: { backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  viewToggleText: { fontSize: 14, fontWeight: '600', color: '#9C9690' },
  viewToggleTextActive: { color: '#1A1817', fontWeight: '700' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  monthGrid: { marginBottom: 16 },
  monthGridTitle: { fontSize: 15, fontWeight: '700', color: '#1A1817', marginBottom: 4 },
  dayHeaderRow: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#BD632F' },
  dayHeaderText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#BD632F' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
  dayNumber: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginVertical: 2 },
  dayNumberHasAppointment: {
    backgroundColor: '#BD632F',
  },
  dayNumberBlocked: { backgroundColor: '#F0EAE1' },
  dayNumberSelected: { backgroundColor: '#BD632F' },
  dayNumberText: { fontSize: 13, fontWeight: '500', color: '#1A1817' },
  dayNumberTextAppointment: { color: '#BD632F', fontWeight: '700' },
  dayNumberTextBlocked: { color: '#9C9690' },
  dayNumberTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  statsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 16, fontWeight: '800', color: '#1A1817' },
  statLabel: { fontSize: 11, fontWeight: '500', color: '#9C9690', marginTop: 3 },
  statDivider: { width: 1, backgroundColor: '#E6E1DC' },
  weekStrip: { marginTop: 4, marginBottom: 20 },
  weekDateRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  weekDateCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 4, borderRadius: 20 },
  weekDateCellSelected: { backgroundColor: '#BD632F' },
  weekDateCellBlocked: { backgroundColor: '#F0EAE1' },
  weekDateLetter: { fontSize: 11, fontWeight: '600', color: '#9C9690', marginBottom: 2 },
  weekDateLetterSelected: { color: '#FFFFFF' },
  weekDateLetterBlocked: { color: '#9C9690' },
  weekDateNumber: { fontSize: 14, fontWeight: '600', color: '#1A1817' },
  weekDateNumberSelected: { color: '#FFFFFF', fontWeight: '700' },
  weekDateNumberToday: { color: '#BD632F', fontWeight: '700' },
  weekDateNumberBlocked: { color: '#9C9690' },
  dayTimeline: { marginTop: 8 },
  dayTimelineHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dayTimelineHeader: { fontSize: 16, fontWeight: '700', color: '#1A1817' },
  appointmentCount: { fontSize: 14, fontWeight: '600', color: '#BD632F' },
  dayTimelineCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginTop: 8 },
  agendaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 18, marginBottom: 10, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  agendaTimeCol: { alignItems: 'center', width: 45 },
  agendaTimeText: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  agendaTimeDivider: { height: 12, borderLeftWidth: 1.5, borderColor: '#D4D4D4', borderStyle: 'dashed', marginVertical: 4 },
  agendaAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EAEAEA', marginLeft: 12, marginRight: 14, overflow: 'hidden' },
  agendaAvatarImage: { width: '100%', height: '100%' },
  agendaInfo: { flex: 1, justifyContent: 'center' },
  agendaName: { fontSize: 15, fontWeight: '700', color: '#1A1817', marginBottom: 4 },
  agendaDetail: { fontSize: 13, color: '#8A92A6', fontWeight: '500' },
  agendaChatBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyStateText: { fontSize: 14, fontWeight: '500', color: '#9C9690' },
  timelineRow: { flexDirection: 'row', marginBottom: 8, minHeight: 56 },
  timeLabelContainer: { width: 70 },
  timeLabel: { width: 64, fontSize: 11, fontWeight: '600', color: '#9C9690' },
  timeLine: { width: 20, alignItems: 'center', marginLeft: 8 },
  timeLineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E6E1DC', marginTop: 4 },
  timeLineDotActive: { backgroundColor: '#BD632F' },
  timeLineBar: { width: 2, flex: 1, backgroundColor: '#E6E1DC', marginTop: 4 },
  timeLineContent: { flex: 1, paddingLeft: 8 },
  appointmentCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FDF4EE', borderRadius: 14, padding: 10, marginBottom: 8, gap: 10 },
  appointmentAvatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  appointmentAvatarImage: { width: '100%', height: '100%' },
  greenDot: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  appointmentInfo: { flex: 1 },
  appointmentName: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  appointmentDetail: { fontSize: 12, color: '#9C9690', fontWeight: '500' },
  appointmentSymptomsPlain: { fontSize: 12, color: '#9C9690', fontWeight: '500' },
  current_time_container: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  current_time_line: { flex: 1, height: 2, backgroundColor: '#1565C0' },
  current_time_dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1565C0', marginHorizontal: 8 },
  current_time_label: { fontSize: 11, fontWeight: '700', color: '#1565C0', marginRight: 8 },
  current_time_line_right: { flex: 1, height: 2, backgroundColor: '#1565C0' },
  upcomingSection: { marginTop: 20 },
  upcomingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  upcomingTitle: { fontSize: 16, fontWeight: '700', color: '#1A1817' },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  viewAllText: { fontSize: 14, fontWeight: '600', color: '#BD632F' },
  upcomingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 12, marginBottom: 10, gap: 10, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  upcomingAvatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  upcomingAvatarImage: { width: '100%', height: '100%' },
  upcomingTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  upcomingInfo: { flex: 1 },
  upcomingDate: { fontSize: 11, fontWeight: '500', color: '#9C9690', flexShrink: 1 },
  upcomingName: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  upcomingType: { fontSize: 12, fontWeight: '500', color: '#7C7672' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusConfirmed: { backgroundColor: '#E8F5E9' },
  statusPending: { backgroundColor: '#FFF3E0' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusTextConfirmed: { color: '#2E7D32' },
  statusTextPending: { color: '#E65100' },
});
