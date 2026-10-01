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

type ViewMode = 'monthly' | 'weekly';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function formatTime12h(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatHourLabel(hour: number): string {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${String(h).padStart(2, '0')}:00 ${ampm}`;
}

function MonthlyView({
  selectedDate,
  onSelectDate,
  onNavigateMonth,
  appointmentDates,
  blockedDates,
  stats,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onNavigateMonth: (direction: number) => void;
  appointmentDates: Set<string>;
  blockedDates: Set<string>;
  stats: { openDays: number; blockedDays: number; totalAppointments: number };
}) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <View>
      <View style={styles.monthGrid}>
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={() => onNavigateMonth(-1)} style={styles.navBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={18} color="#BD632F" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
          <TouchableOpacity onPress={() => onNavigateMonth(1)} style={styles.navBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={18} color="#BD632F" />
          </TouchableOpacity>
        </View>

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
          <Text style={styles.statLabel}>Open days</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.blockedDays}</Text>
          <Text style={styles.statLabel}>Blocked days</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalAppointments}</Text>
          <Text style={styles.statLabel}>Total appointments</Text>
        </View>
      </View>
    </View>
  );
}

function formatAgendaTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
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
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const dayAppointments = useMemo(() => {
    return bookings
      .filter((a) => isSameDay(new Date(a.startAt), selectedDate))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [bookings, selectedDate]);

  return (
    <View>
      <View style={styles.weekStrip}>
        <View style={styles.weekDayHeader}>
          {DAY_SHORT.map((d, i) => (
            <Text key={i} style={styles.weekDayLabel}>{d}</Text>
          ))}
        </View>
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

      <View style={styles.agendaContainer}>
        <View style={styles.dayTimelineHeaderRow}>
          <Text style={styles.dayTimelineHeader}>
            {DAY_SHORT[selectedDate.getDay()]}, {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]}
          </Text>
          <Text style={styles.appointmentCount}>{dayAppointments.length} Appointments</Text>
        </View>

        {dayAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color="#E6E1DC" />
            <Text style={styles.emptyStateText}>No appointments for this day</Text>
          </View>
        ) : (
          dayAppointments.map((appt) => (
            <TouchableOpacity
              key={appt.id}
              style={styles.agendaCard}
              onPress={() => onAppointmentPress(appt)}
              activeOpacity={0.8}
            >
              <View style={styles.agendaTimeCol}>
                <Text style={styles.agendaTimeText}>
                  {formatAgendaTime(appt.startAt).substring(0, 5)}
                </Text>
                <View style={styles.agendaTimeDivider} />
                <Text style={styles.agendaTimeText}>
                  {formatAgendaTime(appt.endAt).substring(0, 5)}
                </Text>
              </View>

              <View style={styles.agendaAvatar}>
                {appt.animalImage ? (
                  <Image source={{ uri: appt.animalImage }} style={styles.agendaAvatarImage} />
                ) : (
                  <Image source={{ uri: 'https://i.pravatar.cc/150?img=44' }} style={styles.agendaAvatarImage} />
                )}
              </View>

              <View style={styles.agendaInfo}>
                <Text style={styles.agendaName}>
                  {appt.animalName || appt.patientName || `Patient #${appt.patientId}`}
                </Text>
                <Text style={styles.agendaDetail}>
                  {appt.symptoms || 'General Checkup'}
                </Text>
              </View>

              <TouchableOpacity style={styles.agendaChatBtn} activeOpacity={0.8}>
                <Ionicons name="chatbubble" size={22} color="#3B82F6" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
}

export default function DoctorBookingsScreen() {
  const router = useRouter();
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
      .filter((a) => new Date(a.startAt) >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [bookings]);

  const upcomingAppointments = showAllAppointments ? upcomingAll : upcomingAll.slice(0, 2);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setViewMode('weekly');
  }, []);

  const handleNavigateMonth = useCallback((direction: number) => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
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
        <Text style={styles.headerTitle}>Calendar</Text>
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
            Monthly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'weekly' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('weekly')}
          activeOpacity={0.8}
        >
          <Text style={[styles.viewToggleText, viewMode === 'weekly' && styles.viewToggleTextActive]}>
            Weekly
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {viewMode === 'monthly' ? (
          <MonthlyView
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onNavigateMonth={handleNavigateMonth}
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
              <Text style={styles.upcomingTitle}>Upcoming appointments</Text>
              <TouchableOpacity
                onPress={() => setShowAllAppointments(!showAllAppointments)}
                activeOpacity={0.7}
                style={styles.viewAllBtn}
              >
                <Text style={styles.viewAllText}>
                  {showAllAppointments
                    ? 'Show less'
                    : upcomingAll.length > 2
                      ? `View all (${upcomingAll.length})`
                      : 'View all'}
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
                  <Text style={styles.upcomingDate}>
                    {new Date(appt.startAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} · {formatTime12h(appt.startAt)}
                  </Text>
                  <Text style={styles.upcomingName}>
                    {appt.animalName || appt.patientName || `Patient #${appt.patientId}`}
                    {appt.animalSpecies ? ` (${appt.animalSpecies})` : ''}
                  </Text>
                  <Text style={styles.upcomingType}>Physical Consultation</Text>
                </View>
                <View style={[styles.statusBadge, appt.status === 'CONFIRMED' ? styles.statusConfirmed : styles.statusPending]}>
                  <Text style={[styles.statusText, appt.status === 'CONFIRMED' ? styles.statusTextConfirmed : styles.statusTextPending]}>
                    {appt.status === 'CONFIRMED' ? 'Confirmed' : appt.status}
                  </Text>
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
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1817' },
  settingsBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center' },
  viewToggle: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: '#FFF2EB', borderRadius: 20, padding: 4 },
  viewToggleButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 16 },
  viewToggleButtonActive: { backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  viewToggleText: { fontSize: 14, fontWeight: '600', color: '#9C9690' },
  viewToggleTextActive: { color: '#1A1817', fontWeight: '700' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  monthGrid: { marginBottom: 16 },
  monthNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center' },
  monthTitle: { fontSize: 16, fontWeight: '700', color: '#1A1817' },
  dayHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  dayHeaderText: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#BD632F' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  dayNumber: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dayNumberHasAppointment: { backgroundColor: '#BD632F' },
  dayNumberBlocked: { backgroundColor: '#F0EAE1' },
  dayNumberSelected: { backgroundColor: '#BD632F' },
  dayNumberText: { fontSize: 14, fontWeight: '500', color: '#1A1817' },
  dayNumberTextAppointment: { color: '#FFFFFF', fontWeight: '700' },
  dayNumberTextBlocked: { color: '#9C9690' },
  dayNumberTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  statsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6E1DC', padding: 16, marginBottom: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#1A1817' },
  statLabel: { fontSize: 12, fontWeight: '500', color: '#9C9690', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#E6E1DC' },
  weekStrip: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, marginTop: 8, marginBottom: 20, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  weekDayHeader: { flexDirection: 'row', marginBottom: 8 },
  weekDayLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#9C9690' },
  weekDateRow: { flexDirection: 'row' },
  weekDateCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekDateCellSelected: { backgroundColor: '#BD632F', borderRadius: 20 },
  weekDateCellBlocked: { backgroundColor: '#F0EAE1', borderRadius: 20 },
  weekDateNumber: { fontSize: 14, fontWeight: '600', color: '#1A1817' },
  weekDateNumberSelected: { color: '#FFFFFF', fontWeight: '700' },
  weekDateNumberToday: { color: '#BD632F', fontWeight: '700' },
  weekDateNumberBlocked: { color: '#9C9690' },
  dayTimeline: { marginTop: 8 },
  dayTimelineHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dayTimelineHeader: { fontSize: 16, fontWeight: '700', color: '#1A1817' },
  appointmentCount: { fontSize: 14, fontWeight: '600', color: '#BD632F' },
  agendaContainer: { marginTop: 8 },
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
  timelineRow: { flexDirection: 'row', marginBottom: 8 },
  timeLabelContainer: { width: 70 },
  timeLabel: { fontSize: 11, fontWeight: '600', color: '#9C9690' },
  timeLine: { width: 20, alignItems: 'center' },
  timeLineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#BD632F', marginTop: 4 },
  timeLineBar: { width: 2, flex: 1, backgroundColor: '#E6E1DC', marginTop: 4 },
  timeLineContent: { flex: 1, paddingLeft: 8 },
  appointmentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 12, marginBottom: 8, gap: 10 },
  appointmentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  appointmentAvatarImage: { width: 40, height: 40, borderRadius: 20 },
  appointmentInfo: { flex: 1 },
  appointmentName: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  appointmentDetail: { fontSize: 12, color: '#9C9690', fontWeight: '500' },
  appointmentSymptoms: { fontSize: 12, color: '#BD632F', fontWeight: '500', fontStyle: 'italic' },
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
  upcomingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 12, marginBottom: 10, gap: 10 },
  upcomingAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  upcomingAvatarImage: { width: 44, height: 44, borderRadius: 22 },
  upcomingInfo: { flex: 1 },
  upcomingDate: { fontSize: 11, fontWeight: '500', color: '#9C9690' },
  upcomingName: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  upcomingType: { fontSize: 12, fontWeight: '500', color: '#7C7672' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusConfirmed: { backgroundColor: '#E8F5E9' },
  statusPending: { backgroundColor: '#FFF3E0' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusTextConfirmed: { color: '#2E7D32' },
  statusTextPending: { color: '#E65100' },
});
