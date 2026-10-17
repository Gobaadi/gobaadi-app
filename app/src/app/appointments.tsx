import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import {
  useGetDoctorBookingsQuery,
  type DoctorAppointment,
} from '@/store/doctorPortalApi';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  backButtonSvg,
  appointmentsFilterSvg,
  appointmentsSearchSvg,
  appointmentsConsultationCardChatSvg,
} from '@/components/icons/svg-icon-sources';
import { RegistrationBackground } from '@/components/registration-background';

type Tab = 'today' | 'previous';

type FilterParamKey = 'filterDate' | 'filterStatus' | 'filterConsultationType';

type Translate = ReturnType<typeof useTranslation>['t'];

const FILTER_LABEL_KEYS: Record<FilterParamKey, Record<string, string>> = {
  filterDate: {
    today: 'appointments.filters.date.today',
    tomorrow: 'appointments.filters.date.tomorrow',
    this_week: 'appointments.filters.date.thisWeek',
  },
  filterStatus: {
    CONFIRMED: 'appointments.filters.status.upcoming',
    COMPLETED: 'appointments.filters.status.completed',
    CANCELLED: 'appointments.filters.status.cancelled',
  },
  filterConsultationType: {
    video: 'appointments.filters.type.video',
    voice: 'appointments.filters.type.voice',
    chat: 'appointments.filters.type.chat',
    physical: 'appointments.filters.type.physical',
  },
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  PENDING: 'appointments.status.pending',
  CONFIRMED: 'appointments.status.confirmed',
  RESCHEDULED: 'appointments.status.rescheduled',
  CANCELLED: 'appointments.status.cancelled',
  COMPLETED: 'appointments.status.completed',
};

const CONSULTATION_TYPE_MAP: Record<string, string> = {
  video: 'online_video',
  voice: 'online_voice',
  chat: 'online_chat',
  physical: 'physical',
};

const CONSULTATION_TYPE_LABEL_KEYS: Record<string, string> = {
  online_video: 'appointments.filters.type.video',
  online_voice: 'appointments.filters.type.voice',
  online_chat: 'appointments.filters.type.chat',
  physical: 'appointments.filters.type.physical',
};

const STATUS_PILL_LABEL_KEYS: Record<string, string> = {
  COMPLETED: 'appointments.pill.completed',
  CANCELLED: 'appointments.pill.cancelled',
  RESCHEDULED: 'appointments.pill.rescheduled',
  CONFIRMED: 'appointments.filters.status.upcoming',
};

const STATUS_PILL_TONES: Record<string, { bg: string; color: string }> = {
  COMPLETED: { bg: '#E7F6EC', color: '#2E7D32' },
  CANCELLED: { bg: '#FDECEA', color: '#D64545' },
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function isYesterday(date: Date): boolean {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return isSameDay(date, y);
}

function formatTimeRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${fmt(s)} - ${fmt(e)}`;
}

function formatDateLabel(date: Date, t: Translate): string {
  if (isToday(date)) return t('appointments.dates.today');
  if (isYesterday(date)) return t('appointments.dates.yesterday');
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatMinutesRemaining(start: string, t: Translate): string {
  const now = new Date();
  const startMs = new Date(start).getTime();
  const diffMs = startMs - now.getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  return t('appointments.minsLeft', { mins });
}

interface AppointmentCardProps {
  appointment: DoctorAppointment;
  onPress: () => void;
  variant?: 'today' | 'previous';
}

function AppointmentCard({ appointment, onPress, variant = 'today' }: AppointmentCardProps) {
  const { t } = useTranslation();
  const now = new Date();
  const startAt = new Date(appointment.startAt);
  const endAt = new Date(appointment.endAt);
  const isOngoing =
    appointment.status === 'CONFIRMED' &&
    startAt <= now &&
    endAt >= now;

  const displayName =
    appointment.animalName || appointment.patientName || t('appointments.fallback.patient');

  if (variant === 'previous') {
    const typeLabelKey = appointment.consultationType
      ? CONSULTATION_TYPE_LABEL_KEYS[appointment.consultationType]
      : undefined;
    const typeLabel = typeLabelKey ? t(typeLabelKey) : t('appointments.liveChat');
    const pillLabelKey = STATUS_PILL_LABEL_KEYS[appointment.status];
    const pillTone = STATUS_PILL_TONES[appointment.status] ?? {
      bg: '#FFF2EB',
      color: '#BD632F',
    };

    return (
      <TouchableOpacity
        style={[styles.card, styles.cardPrevious]}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={styles.cardImageContainer}>
          {appointment.animalImage ? (
            <Image source={{ uri: appointment.animalImage }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Ionicons name="paw" size={22} color="#BD632F" />
            </View>
          )}
          <View style={styles.cardImageOverlay}>
            <SvgXml width={22} height={22} xml={appointmentsConsultationCardChatSvg} />
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardType}>{typeLabel}</Text>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: pillTone.bg },
              ]}
            >
              <Text style={[styles.statusPillText, { color: pillTone.color }]}>
                {pillLabelKey
                  ? t(pillLabelKey)
                  : appointment.status}
              </Text>
            </View>
          </View>

          <Text style={styles.cardName}>{displayName}</Text>

          {appointment.animalSpecies && (
            <Text style={styles.cardSpecies}>
              {appointment.animalSpecies}
              {appointment.animalAge ? ` · ${appointment.animalAge}` : ''}
              {appointment.animalBreed ? ` · ${appointment.animalBreed}` : ''}
            </Text>
          )}

          {appointment.patientName && (
            <View style={styles.ownerRow}>
              <Text style={styles.ownerLabel}>{t('appointments.ownerLabel')}</Text>
              <Text style={styles.ownerName}>{appointment.patientName}</Text>
            </View>
          )}

          <Text style={styles.cardTime}>
            {formatTimeRange(appointment.startAt, appointment.endAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.cardImageContainer}>
        {appointment.animalImage ? (
          <Image source={{ uri: appointment.animalImage }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="paw" size={22} color="#BD632F" />
          </View>
        )}
        <View style={styles.cardImageOverlay}>
          <SvgXml width={22} height={22} xml={appointmentsConsultationCardChatSvg} />
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardType}>{t('appointments.liveChat')}</Text>
          <Text style={styles.dot}> · </Text>
          <Text
            style={[
              styles.cardStatus,
              isOngoing ? styles.statusInProgress : styles.statusUpcoming,
            ]}
          >
            {isOngoing
              ? t('appointments.stillInProgress')
              : STATUS_LABEL_KEYS[appointment.status]
                ? t(STATUS_LABEL_KEYS[appointment.status])
                : appointment.status}
          </Text>
          {isOngoing && (
            <Text style={styles.timeRemaining}>
              {formatMinutesRemaining(appointment.startAt, t)}
            </Text>
          )}
        </View>

        <Text style={styles.cardName}>{displayName}</Text>

        {appointment.animalSpecies && (
          <Text style={styles.cardSpecies}>
            {appointment.animalSpecies}
            {appointment.animalAge ? ` · ${appointment.animalAge}` : ''}
            {appointment.animalBreed ? ` · ${appointment.animalBreed}` : ''}
          </Text>
        )}

        {appointment.patientName && (
          <Text style={styles.cardOwner}>{t('appointments.owner', { name: appointment.patientName })}</Text>
        )}

        <Text style={styles.cardTime}>
          {formatTimeRange(appointment.startAt, appointment.endAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    filterDate?: string;
    filterStatus?: string;
    filterConsultationType?: string;
  }>();
  const isDoctor = useRequireDoctor();

  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [tabTouched, setTabTouched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const selectTab = (tab: Tab) => {
    setTabTouched(true);
    setActiveTab(tab);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Date ranges are always filtered client-side (see filteredBookings) so the
  // result is consistent with what the tabs show, regardless of server timezone.
  const apiFilter = useMemo(() => {
    if (params.filterStatus === 'COMPLETED') return 'completed';
    if (params.filterStatus === 'CANCELLED') return 'cancelled';
    return undefined;
  }, [params.filterStatus]);

  const apiConsultationType = useMemo(() => {
    if (params.filterConsultationType && params.filterConsultationType !== 'all') {
      return CONSULTATION_TYPE_MAP[params.filterConsultationType] ?? params.filterConsultationType;
    }
    return undefined;
  }, [params.filterConsultationType]);

  const activeFilters: { key: FilterParamKey; label: string }[] = [];
  if (params.filterDate) {
    const labelKey = FILTER_LABEL_KEYS.filterDate[params.filterDate];
    activeFilters.push({
      key: 'filterDate',
      label: labelKey ? t(labelKey) : params.filterDate,
    });
  }
  if (params.filterStatus && params.filterStatus !== 'all') {
    const labelKey = FILTER_LABEL_KEYS.filterStatus[params.filterStatus];
    activeFilters.push({
      key: 'filterStatus',
      label: labelKey ? t(labelKey) : params.filterStatus,
    });
  }
  if (params.filterConsultationType && params.filterConsultationType !== 'all') {
    const labelKey = FILTER_LABEL_KEYS.filterConsultationType[params.filterConsultationType];
    activeFilters.push({
      key: 'filterConsultationType',
      label: labelKey ? t(labelKey) : params.filterConsultationType,
    });
  }
  const hasActiveFilters = activeFilters.length > 0;

  const clearFilter = (key: FilterParamKey) => {
    router.setParams({ [key]: '' });
  };

  const clearAllFilters = () => {
    router.setParams({
      filterDate: '',
      filterStatus: '',
      filterConsultationType: '',
    });
  };

  const { data: bookings = [] } = useGetDoctorBookingsQuery({
    filter: apiFilter,
    consultationType: apiConsultationType,
    search: debouncedSearch.trim() || undefined,
  });

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (params.filterDate === 'today') {
      const now = new Date();
      result = result.filter((b) => isSameDay(new Date(b.startAt), now));
    } else if (params.filterDate === 'tomorrow') {
      const tmr = new Date();
      tmr.setDate(tmr.getDate() + 1);
      result = result.filter((b) => isSameDay(new Date(b.startAt), tmr));
    } else if (params.filterDate === 'this_week') {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      result = result.filter((b) => {
        const d = new Date(b.startAt);
        return d >= startOfWeek && d <= endOfWeek;
      });
    }

    if (params.filterStatus === 'CONFIRMED') {
      result = result.filter((b) => b.status === 'CONFIRMED');
    }

    return result;
  }, [bookings, params.filterDate, params.filterStatus]);

  const { todayAppointments, previousAppointments } = useMemo(() => {
    const today: DoctorAppointment[] = [];
    const previous: DoctorAppointment[] = [];
    const now = new Date();

    filteredBookings.forEach((b) => {
      const start = new Date(b.startAt);
      // Completed and cancelled sessions are history — including ones
      // scheduled today — so the Today tab stays an active queue only
      // (Next Consults / In Progress) and Previous surfaces the rest
      // (same-day completions and cancellations too).
      if (b.status === 'COMPLETED' || b.status === 'CANCELLED') {
        previous.push(b);
      } else if (start >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        today.push(b);
      } else {
        previous.push(b);
      }
    });

    today.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    previous.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

    return { todayAppointments: today, previousAppointments: previous };
  }, [filteredBookings]);

  const groupedPrevious = useMemo(() => {
    const groups: { label: string; data: DoctorAppointment[] }[] = [];
    const map = new Map<string, DoctorAppointment[]>();

    previousAppointments.forEach((b) => {
      const date = new Date(b.startAt);
      const key = getDateKey(date);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(b);
    });

    map.forEach((data, key) => {
      const [y, m, d] = key.split('-').map(Number);
      const date = new Date(y, m, d);
      groups.push({ label: formatDateLabel(date, t), data });
    });

    return groups;
  }, [previousAppointments, t]);

  // A freshly pushed (filtered) screen opens on "Today's". If that tab has no
  // matches but "Previous" does, show "Previous" until the user picks a tab —
  // pure derivation so a filtered result never looks empty.
  const displayedTab: Tab =
    !tabTouched &&
    hasActiveFilters &&
    todayAppointments.length === 0 &&
    previousAppointments.length > 0
      ? 'previous'
      : activeTab;

  const inProgressCount = todayAppointments.filter(
    (b) =>
      b.status === 'CONFIRMED' &&
      new Date(b.startAt) <= new Date() &&
      new Date(b.endAt) >= new Date()
  ).length;

  const upcomingCount = todayAppointments.length - inProgressCount;

  const handleAppointmentPress = useCallback(
    (appointment: DoctorAppointment) => {
      router.push({
        pathname: '/appointment-details',
        params: { id: String(appointment.id) },
      });
    },
    [router]
  );

  if (!isDoctor) return null;

  return (
    <SafeAreaView style={styles.container}>
      <RegistrationBackground />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('appointments.title')}</Text>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => router.push('/appointment-filter')}
          activeOpacity={0.7}
        >
          <SvgXml width={20} height={20} xml={appointmentsFilterSvg} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SvgXml width={18} height={18} xml={appointmentsSearchSvg} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('appointments.searchPlaceholder')}
          placeholderTextColor="#9C9690"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {activeFilters.length > 0 && (
        <View style={styles.activeFilterRow}>
          {activeFilters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={styles.activeFilterChip}
              onPress={() => clearFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.activeFilterChipText}>{f.label}</Text>
              <Ionicons name="close" size={14} color="#BD632F" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, displayedTab === 'today' && styles.tabActive]}
          onPress={() => selectTab('today')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              displayedTab === 'today' && styles.tabTextActive,
            ]}
          >
            {t('appointments.tabs.today')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, displayedTab === 'previous' && styles.tabActive]}
          onPress={() => selectTab('previous')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              displayedTab === 'previous' && styles.tabTextActive,
            ]}
          >
            {t('appointments.tabs.previous')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayedTab === 'today' ? (
          <>
            {inProgressCount > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t('appointments.sections.inProgress')}</Text>
                {todayAppointments
                  .filter(
                    (b) =>
                      b.status === 'CONFIRMED' &&
                      new Date(b.startAt) <= new Date() &&
                      new Date(b.endAt) >= new Date()
                  )
                  .map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      onPress={() => handleAppointmentPress(appt)}
                    />
                  ))}
              </>
            )}

            {upcomingCount > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  {t('appointments.sections.nextConsults', { upcomingCount })}
                </Text>
                {todayAppointments
                  .filter(
                    (b) =>
                      !(
                        b.status === 'CONFIRMED' &&
                        new Date(b.startAt) <= new Date() &&
                        new Date(b.endAt) >= new Date()
                      )
                  )
                  .map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      onPress={() => handleAppointmentPress(appt)}
                    />
                  ))}
              </>
            )}

            {todayAppointments.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#E6E1DC" />
                <Text style={styles.emptyText}>
                  {hasActiveFilters
                    ? t('appointments.empty.noMatch')
                    : t('appointments.empty.today')}
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    style={styles.clearFiltersBtn}
                    onPress={clearAllFilters}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearFiltersText}>{t('appointments.empty.clearFilters')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        ) : (
          <>
            {groupedPrevious.length > 0 ? (
              groupedPrevious.map((group, groupIndex) => (
                <View key={group.label}>
                  <Text
                    style={[
                      styles.dateHeader,
                      groupIndex === 0 && styles.dateHeaderFirst,
                    ]}
                  >
                    {group.label}
                  </Text>
                  {group.data.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      variant="previous"
                      onPress={() => handleAppointmentPress(appt)}
                    />
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#E6E1DC" />
                <Text style={styles.emptyText}>
                  {hasActiveFilters
                    ? t('appointments.empty.noMatch')
                    : t('appointments.empty.previous')}
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    style={styles.clearFiltersBtn}
                    onPress={clearAllFilters}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearFiltersText}>{t('appointments.empty.clearFilters')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1817',
    marginLeft: 10,
    paddingVertical: 0,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFF2EB',
    borderRadius: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9C9690' },
  tabTextActive: { color: '#1A1817', fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 12,
    marginTop: 8,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
    marginTop: 16,
    marginBottom: 10,
  },
  dateHeaderFirst: { marginTop: 4 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  cardPrevious: { borderRadius: 16 },
  cardImageContainer: { position: 'relative' },
  cardImage: { width: 56, height: 56, borderRadius: 14 },
  cardImagePlaceholder: {
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImageOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  cardContent: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardType: { fontSize: 13, fontWeight: '500', color: '#7C7672' },
  dot: { fontSize: 13, color: '#7C7672' },
  cardStatus: { fontSize: 13, fontWeight: '600' },
  statusInProgress: { color: '#4CAF50' },
  statusUpcoming: { color: '#BD632F' },
  statusPill: {
    marginLeft: 'auto',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  ownerLabel: { fontSize: 12, fontWeight: '600', color: '#BD632F' },
  ownerName: { fontSize: 13, fontWeight: '600', color: '#1A1817' },
  timeRemaining: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9C9690',
    marginLeft: 'auto',
  },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1A1817', marginBottom: 2 },
  cardSpecies: { fontSize: 13, fontWeight: '500', color: '#7C7672', marginBottom: 2 },
  cardOwner: { fontSize: 13, fontWeight: '500', color: '#7C7672', marginBottom: 2 },
  cardTime: { fontSize: 12, fontWeight: '500', color: '#9C9690' },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500', color: '#9C9690' },
  activeFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF2EB',
    borderColor: '#BD632F',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeFilterChipText: { fontSize: 13, fontWeight: '600', color: '#BD632F' },
  clearFiltersBtn: {
    marginTop: 4,
    backgroundColor: '#FFF2EB',
    borderColor: '#BD632F',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  clearFiltersText: { fontSize: 14, fontWeight: '700', color: '#BD632F' },
});
