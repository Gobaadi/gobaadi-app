import React, { useState, useMemo, useCallback } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import {
  useGetDoctorBookingsQuery,
  type DoctorAppointment,
} from '@/store/doctorPortalApi';
import { PatientAvatar } from '@/components/patient-avatar';
import {
  backButtonSvg,
  doctorScheduleFilterSvg,
  doctorScheduleVideoSvg,
  bgPatternSvg,
} from '@/components/icons/svg-icon-sources';
import ScheduleWeekStrip from '@/components/schedule-week-strip';

type ViewMode = 'calendar' | 'list';
type CalendarGranularity = 'yearly' | 'monthly';

type FilterStatus = 'all' | 'upcoming' | 'completed' | 'cancelled';
type FilterConsultation = 'all' | 'video' | 'voice' | 'chat' | 'physical';

const STATUS_FILTER_OPTIONS: { value: FilterStatus; labelKey: string }[] = [
  { value: 'all', labelKey: 'schedule.filters.status.all' },
  { value: 'upcoming', labelKey: 'schedule.filters.status.upcoming' },
  { value: 'completed', labelKey: 'schedule.filters.status.completed' },
  { value: 'cancelled', labelKey: 'schedule.filters.status.cancelled' },
];

const CONSULTATION_FILTER_OPTIONS: { value: FilterConsultation; labelKey: string }[] = [
  { value: 'all', labelKey: 'schedule.filters.consultation.all' },
  { value: 'video', labelKey: 'schedule.filters.consultation.video' },
  { value: 'voice', labelKey: 'schedule.filters.consultation.voice' },
  { value: 'chat', labelKey: 'schedule.filters.consultation.chat' },
  { value: 'physical', labelKey: 'schedule.filters.consultation.physical' },
];

const CONSULTATION_TYPE_VALUE: Record<Exclude<FilterConsultation, 'all'>, string> = {
  video: 'online_video',
  voice: 'online_voice',
  chat: 'online_chat',
  physical: 'physical',
};

const UPCOMING_STATUSES = ['PENDING', 'CONFIRMED', 'RESCHEDULED'];

const MONTH_NAMES = [
  'schedule.months.january', 'schedule.months.february', 'schedule.months.march', 'schedule.months.april',
  'schedule.months.may', 'schedule.months.june', 'schedule.months.july', 'schedule.months.august',
  'schedule.months.september', 'schedule.months.october', 'schedule.months.november', 'schedule.months.december',
];
const DAY_LETTERS = ['schedule.dayLetters.sun', 'schedule.dayLetters.mon', 'schedule.dayLetters.tue', 'schedule.dayLetters.wed', 'schedule.dayLetters.thu', 'schedule.dayLetters.fri', 'schedule.dayLetters.sat'];
const DAY_SHORT = ['schedule.dayShort.sun', 'schedule.dayShort.mon', 'schedule.dayShort.tue', 'schedule.dayShort.wed', 'schedule.dayShort.thu', 'schedule.dayShort.fri', 'schedule.dayShort.sat'];

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

function MonthGrid({
  year,
  month,
  appointmentDates,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  appointmentDates: Set<string>;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const { t } = useTranslation();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <View style={styles.monthGrid}>
      <Text style={styles.monthTitle}>{t(MONTH_NAMES[month])} {year}</Text>
      <View style={styles.dayHeaderRow}>
        {DAY_LETTERS.map((d, i) => (
          <Text key={i} style={styles.dayHeaderText}>{t(d)}</Text>
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
          const isToday = isSameDay(date, new Date());

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
                ]}
              >
                <Text
                  style={[
                    styles.dayNumberText,
                    hasAppointment && styles.dayNumberTextAppointment,
                    isToday && !hasAppointment && styles.dayNumberTextToday,
                  ]}
                >
                  {day}
                </Text>
              </View>
              {isToday && !hasAppointment && (
                <View style={styles.todayDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ListView({
  appointments,
}: {
  appointments: DoctorAppointment[];
}) {
  const { t } = useTranslation();
  const grouped = useMemo(() => {
    const map = new Map<string, DoctorAppointment[]>();
    appointments.forEach((a) => {
      const key = formatDateKey(new Date(a.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [appointments]);

  const totalCount = appointments.length;
  const firstGroupDate = grouped.length > 0 ? new Date(grouped[0][0] + 'T12:00:00') : new Date();
  const currentMonth = firstGroupDate.getMonth();
  const currentYear = firstGroupDate.getFullYear();

  if (grouped.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={48} color="#E6E1DC" />
        <Text style={styles.emptyText}>{t('schedule.empty.list')}</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listScrollContainer}>
      <View style={styles.listMonthHeader}>
        <Text style={styles.listMonthTitle}>{t(MONTH_NAMES[currentMonth])} {currentYear}</Text>
        <Text style={styles.listMonthCount}>{t('schedule.appointmentCount', { count: totalCount })}</Text>
      </View>

      {grouped.map(([dateKey, appts]) => {
        const date = new Date(dateKey + 'T12:00:00');
        return (
          <View key={dateKey} style={styles.listDateGroup}>
            <View style={styles.listDateSide}>
              <Text style={styles.listDateDayName}>{t(DAY_SHORT[date.getDay()])}</Text>
              <Text style={styles.listDateDayNumber}>{date.getDate()}</Text>
            </View>
            <View style={styles.listDateCards}>
              {appts.map((appt) => (
                <ListAppointmentCard key={appt.id} appointment={appt} />
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function ListAppointmentCard({ appointment }: { appointment: DoctorAppointment }) {
  const { t } = useTranslation();
  const router = useRouter();
  const startDate = new Date(appointment.startAt);

  const formatTimeShort = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h < 12 ? 'AM' : 'PM';
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const metaParts = [
    appointment.animalSpecies || appointment.animalBreed,
    appointment.animalAge,
  ].filter((v): v is string => Boolean(v));

  const symptomsText = Array.isArray(appointment.symptoms)
    ? appointment.symptoms.join(', ').trim()
    : appointment.symptoms
      ? String(appointment.symptoms).trim()
      : '';

  return (
    <TouchableOpacity
      style={styles.listAppointmentCard}
      activeOpacity={0.8}
      onPress={() =>
        router.push({
          pathname: '/appointment-details',
          params: { id: String(appointment.id) },
        })
      }
    >
      <View style={styles.listAppointmentDateBadge}>
        <Ionicons name="time-outline" size={14} color="#FFFFFF" />
        <Text style={styles.listAppointmentDateBadgeText}>
          {t(DAY_SHORT[startDate.getDay()])} {t(MONTH_NAMES[startDate.getMonth()])} {startDate.getDate()} · {formatTimeShort(appointment.startAt)} - {formatTimeShort(appointment.endAt)}
        </Text>
      </View>
      <View style={styles.listAppointmentCardBody}>
        <View style={styles.listAppointmentAvatar}>
          <PatientAvatar
            name={appointment.animalName || appointment.patientName || t('schedule.patient')}
            image={appointment.animalImage || appointment.patientAvatar}
            size={52}
          />
          <View style={styles.greenDot}><SvgXml width={11} height={11} xml={doctorScheduleVideoSvg} /></View>
        </View>
        <View style={styles.listAppointmentInfo}>
          <Text style={styles.listAppointmentName} numberOfLines={1}>
            {appointment.animalName || appointment.patientName || t('schedule.patient')}
          </Text>
          {metaParts.length > 0 && (
            <Text style={styles.listAppointmentDetail} numberOfLines={1}>
              {metaParts.join(' • ')}
            </Text>
          )}
          {symptomsText && (
            <Text style={styles.listAppointmentSymptoms} numberOfLines={1}>
              {symptomsText}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ScheduleScreen() {
  const isDoctor = useRequireDoctor();
  const router = useRouter();
  const { t } = useTranslation();

  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [granularity, setGranularity] = useState<CalendarGranularity>('yearly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterConsultation, setFilterConsultation] = useState<FilterConsultation>('all');

  const { data: bookings = [], isLoading } = useGetDoctorBookingsQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const statusOk =
        filterStatus === 'all' ||
        (filterStatus === 'upcoming' && UPCOMING_STATUSES.includes(b.status)) ||
        (filterStatus === 'completed' && b.status === 'COMPLETED') ||
        (filterStatus === 'cancelled' && b.status === 'CANCELLED');
      const consultationOk =
        filterConsultation === 'all' ||
        b.consultationType === CONSULTATION_TYPE_VALUE[filterConsultation];
      return statusOk && consultationOk;
    });
  }, [bookings, filterStatus, filterConsultation]);

  const activeFilterCount =
    (filterStatus !== 'all' ? 1 : 0) + (filterConsultation !== 'all' ? 1 : 0);

  const clearFilters = useCallback(() => {
    setFilterStatus('all');
    setFilterConsultation('all');
  }, []);

  const appointmentDates = useMemo(() => {
    const dates = new Set<string>();
    filteredBookings.forEach((b) => {
      dates.add(formatDateKey(new Date(b.startAt)));
    });
    return dates;
  }, [filteredBookings]);

  const handleSelectDate = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
      setShowFilter(false);
      router.push({
        pathname: '/daily-schedule',
        params: { date: formatDateKey(date) },
      });
    },
    [router],
  );

  const navigateMonth = useCallback((direction: number) => {
    setCurrentMonth((prev) => {
      let next = prev + direction;
      if (next < 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      if (next > 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return next;
    });
  }, []);

  if (!isDoctor) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgPattern} pointerEvents="none">
        <SvgXml width="100%" height="100%" xml={bgPatternSvg} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('schedule.title')}
        </Text>
      </View>

      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'calendar' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('calendar')}
          activeOpacity={0.8}
        >
          <Text style={[styles.viewToggleText, viewMode === 'calendar' && styles.viewToggleTextActive]}>
            {t('schedule.fullCalendar')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('list')}
          activeOpacity={0.8}
        >
          <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
            {t('schedule.listView')}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#BD632F" style={styles.loader} />
      ) : viewMode === 'list' ? (
        <ListView appointments={filteredBookings} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
              onPress={() => setShowFilter(!showFilter)}
              activeOpacity={0.8}
            >
              <SvgXml width={16} height={16} xml={doctorScheduleFilterSvg} />
              <Text style={styles.filterBtnText}>
                {t('schedule.filter')}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Text>
            </TouchableOpacity>
            <View style={styles.granularityToggle}>
              <TouchableOpacity
                style={[styles.granularityBtn, granularity === 'yearly' && styles.granularityBtnActive]}
                onPress={() => setGranularity('yearly')}
                activeOpacity={0.8}
              >
                <Text style={[styles.granularityText, granularity === 'yearly' && styles.granularityTextActive]}>
                  {t('schedule.yearly')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.granularityBtn, granularity === 'monthly' && styles.granularityBtnActive]}
                onPress={() => setGranularity('monthly')}
                activeOpacity={0.8}
              >
                <Text style={[styles.granularityText, granularity === 'monthly' && styles.granularityTextActive]}>
                  {t('schedule.monthly')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showFilter && (
            <View style={styles.filterPanel}>
              <View style={styles.filterPanelHeader}>
                <Text style={styles.filterPanelTitle}>{t('schedule.filterPanelTitle')}</Text>
                <TouchableOpacity onPress={clearFilters} activeOpacity={0.7}>
                  <Text style={styles.clearFilterText}>{t('schedule.clear')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.filterGroupLabel}>{t('schedule.statusLabel')}</Text>
              <View style={styles.filterChipRow}>
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.filterChip, filterStatus === opt.value && styles.filterChipActive]}
                    onPress={() => setFilterStatus(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterStatus === opt.value && styles.filterChipTextActive,
                      ]}
                    >
                      {t(opt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterGroupLabel}>{t('schedule.consultationTypeLabel')}</Text>
              <View style={styles.filterChipRow}>
                {CONSULTATION_FILTER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.filterChip,
                      filterConsultation === opt.value && styles.filterChipActive,
                    ]}
                    onPress={() => setFilterConsultation(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterConsultation === opt.value && styles.filterChipTextActive,
                      ]}
                    >
                      {t(opt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {granularity === 'yearly' ? (
            <>
              {Array.from({ length: 12 }, (_, i) => (
                <MonthGrid
                  key={i}
                  year={currentYear}
                  month={i}
                  appointmentDates={appointmentDates}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                />
              ))}
            </>
          ) : (
            <>
              <View style={styles.monthNavigation}>
                <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navBtn} activeOpacity={0.7}>
                  <Ionicons name="chevron-back" size={18} color="#BD632F" />
                </TouchableOpacity>
                <Text style={styles.monthNavTitle}>{t(MONTH_NAMES[currentMonth])} {currentYear}</Text>
                <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navBtn} activeOpacity={0.7}>
                  <Ionicons name="chevron-forward" size={18} color="#BD632F" />
                </TouchableOpacity>
              </View>
              <MonthGrid
                year={currentYear}
                month={currentMonth}
                appointmentDates={appointmentDates}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
              />
              <ScheduleWeekStrip selectedDate={selectedDate} onSelectDate={handleSelectDate} />
            </>
        )}
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  bgPattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  loader: {
    marginTop: 40,
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
  calendarScroll: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1817',
  },
  filterBtnActive: {
    borderColor: '#BD632F',
    backgroundColor: '#FDF2EA',
  },
  filterPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 14,
    marginBottom: 16,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterPanelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1817',
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BD632F',
  },
  filterGroupLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C7672',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    backgroundColor: '#FAF9F6',
  },
  filterChipActive: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#7C7672',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  granularityToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    overflow: 'hidden',
  },
  granularityBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  granularityBtnActive: {
    backgroundColor: '#BD632F',
  },
  granularityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
  },
  granularityTextActive: {
    color: '#FFFFFF',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
  },
  monthGrid: {
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 8,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: 0,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#BD632F',
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#BD632F',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayNumber: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayNumberHasAppointment: {
    backgroundColor: '#BD632F',
    borderRadius: 9999,
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1817',
  },
  dayNumberTextAppointment: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayNumberTextToday: {
    color: '#BD632F',
    fontWeight: '700',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#BD632F',
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
  listScrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listMonthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  listMonthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
  },
  listMonthCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BD632F',
  },
  listDateGroup: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  listDateSide: {
    width: 50,
    alignItems: 'center',
    marginRight: 12,
  },
  listDateDayName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BD632F',
    textTransform: 'uppercase',
  },
  listDateDayNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1817',
  },
  listDateCards: {
    flex: 1,
  },
  listAppointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    marginBottom: 10,
    overflow: 'hidden',
  },
  listAppointmentDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BD632F',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  listAppointmentDateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listAppointmentCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  listAppointmentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listAppointmentInfo: {
    flex: 1,
    gap: 4,
  },
  listAppointmentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  listAppointmentDetail: {
    fontSize: 12,
    color: '#9C9690',
    fontWeight: '500',
  },
  listAppointmentSymptoms: {
    fontSize: 12,
    color: '#9C9690',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9C9690',
    fontWeight: '500',
  },
});
