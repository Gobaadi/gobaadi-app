import React, { useState, useMemo, useCallback } from 'react';
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
  type DoctorAppointment,
} from '@/store/doctorPortalApi';

type Tab = 'upcoming' | 'past';

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

function formatDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'CONFIRMED':
      return { bg: '#E8F5E9', text: '#2E7D32', label: 'Upcoming' };
    case 'COMPLETED':
      return { bg: '#E3F2FD', text: '#1565C0', label: 'Completed' };
    case 'CANCELLED':
      return { bg: '#FFEBEE', text: '#C62828', label: 'Cancelled' };
    case 'RESCHEDULED':
      return { bg: '#FFF3E0', text: '#E65100', label: 'Rescheduled' };
    default:
      return { bg: '#FFF3E0', text: '#E65100', label: status };
  }
}

interface AppointmentCardProps {
  appointment: DoctorAppointment;
  onPress: () => void;
}

function AppointmentCard({ appointment, onPress }: AppointmentCardProps) {
  const statusStyle = getStatusStyle(appointment.status);
  const displayName =
    appointment.animalName || `Animal #${appointment.animalId}`;
  const doctorDisplayName =
    appointment.doctorName || `Doctor #${appointment.doctorId}`;

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
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {statusStyle.label}
            </Text>
          </View>
          <Text style={styles.cardTime}>
            {formatTimeRange(appointment.startAt, appointment.endAt)}
          </Text>
        </View>

        <Text style={styles.cardName}>{doctorDisplayName}</Text>

        {appointment.doctorSpecialty && (
          <Text style={styles.cardSpecialty}>{appointment.doctorSpecialty}</Text>
        )}

        <Text style={styles.cardAnimal}>{displayName}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MyAppointmentsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');

  const { data: bookings = [], isLoading } = useGetDoctorBookingsQuery();

  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const upcoming: DoctorAppointment[] = [];
    const past: DoctorAppointment[] = [];
    const now = new Date();

    bookings.forEach((b) => {
      const start = new Date(b.startAt);
      if (b.status === 'CANCELLED' || start < now) {
        past.push(b);
      } else {
        upcoming.push(b);
      }
    });

    upcoming.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    past.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [bookings]);

  const groupedPast = useMemo(() => {
    const groups: { label: string; data: DoctorAppointment[] }[] = [];
    const map = new Map<string, DoctorAppointment[]>();

    pastAppointments.forEach((b) => {
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
      groups.push({ label: formatDateLabel(date), data });
    });

    return groups;
  }, [pastAppointments]);

  const handleAppointmentPress = useCallback(
    (appointment: DoctorAppointment) => {
      router.push({
        pathname: '/appointment-details',
        params: { id: String(appointment.id) },
      });
    },
    [router]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#BD632F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'upcoming' && styles.tabTextActive,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'past' && styles.tabTextActive,
            ]}
          >
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'upcoming' ? (
          <>
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  onPress={() => handleAppointmentPress(appt)}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#E6E1DC" />
                <Text style={styles.emptyText}>No upcoming appointments</Text>
              </View>
            )}
          </>
        ) : (
          <>
            {groupedPast.length > 0 ? (
              groupedPast.map((group) => (
                <View key={group.label}>
                  <Text style={styles.sectionTitle}>{group.label}</Text>
                  {group.data.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      onPress={() => handleAppointmentPress(appt)}
                    />
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#E6E1DC" />
                <Text style={styles.emptyText}>No past appointments</Text>
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
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1817' },
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
  cardImageContainer: { position: 'relative' },
  cardImage: { width: 56, height: 56, borderRadius: 14 },
  cardImagePlaceholder: {
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardTime: { fontSize: 12, fontWeight: '500', color: '#9C9690' },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1A1817', marginBottom: 2 },
  cardSpecialty: { fontSize: 13, fontWeight: '500', color: '#BD632F', marginBottom: 2 },
  cardAnimal: { fontSize: 13, fontWeight: '500', color: '#7C7672' },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500', color: '#9C9690' },
});
