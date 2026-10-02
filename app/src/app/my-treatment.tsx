import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { useGetDoctorsQuery } from '@/store/doctorsApi';
import { useLocation } from '@/hooks/use-location';
import LocationBottomSheet from '@/components/LocationBottomSheet';
import {
  useGetDoctorBookingsQuery,
  useCancelBookingMutation,
  type DoctorAppointment,
  type AppointmentStatus,
} from '@/store/doctorPortalApi';
import { useCreateSessionMutation } from '@/store/videoCallApi';
import { useLazyGetForAppointmentQuery } from '@/store/consultationsApi';
import { useCallSignalingContext } from '@/components/IncomingCallProvider';
import { apiErrorMessage } from '@/utils/api-error';
import { DoctorAvatar } from '@/components/doctor-avatar';

interface Treatment {
  id: string;
  appointmentId: number;
  doctorId: number;
  name: string;
  specialty: string;
  rating: number;
  avatar: string;
  date: string;
  bookedOn: string;
  status: AppointmentStatus;
  consultationType: string;
  startAt: string;
  endAt: string;
  raw: DoctorAppointment;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isUpcoming(status: AppointmentStatus): boolean {
  return status === 'PENDING' || status === 'CONFIRMED' || status === 'RESCHEDULED';
}

export default function MyTreatmentScreen() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const { startCall, outgoingState, resetOutgoingState } = useCallSignalingContext();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Upcoming' | 'Medicine'>('All');
  const [activeVisitTab, setActiveVisitTab] = useState<'online' | 'physical'>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const [callingAppointmentId, setCallingAppointmentId] = useState<number | null>(null);
  const { location, setLocation } = useLocation();
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);

  const { data: appointments = [] } = useGetDoctorBookingsQuery();
  const { data: doctors = [] } = useGetDoctorsQuery();
  const [cancelBookingMutation] = useCancelBookingMutation();
  const [createSession] = useCreateSessionMutation();
  const [getConsultation] = useLazyGetForAppointmentQuery();

  const doctorsById = useMemo(
    () => Object.fromEntries(doctors.map((d) => [d.id, d])),
    [doctors],
  );

  async function cancelBooking(id: number) {
    try {
      await cancelBookingMutation({
        id: String(id),
        reason: 'Cancelled by patient',
      }).unwrap();
    } catch (err) {
      Alert.alert(
        'Could not cancel',
        apiErrorMessage(err, 'Failed to cancel appointment. Please try again.'),
      );
    }
  }

  const handleStartCall = useCallback(
    async (appointment: DoctorAppointment) => {
      if (!user) return;

      try {
        setCallingAppointmentId(appointment.id);
        const consultation = await getConsultation(String(appointment.id))
          .unwrap()
          .catch(() => null);
        if (consultation?.status !== 'ONGOING') {
          setCallingAppointmentId(null);
          Alert.alert(
            'Consultation not started',
            'Start the consultation in the chat before placing a call.',
          );
          return;
        }
        const session = await createSession(appointment.id).unwrap();
        const callerRole =
          user.role === 'doctor' ? ('DOCTOR' as const) : ('PATIENT' as const);

        startCall(
          appointment.id,
          user.id,
          user.name || (callerRole === 'DOCTOR' ? 'Doctor' : 'Patient'),
          callerRole,
          session.channelName,
        );
      } catch (err: any) {
        setCallingAppointmentId(null);
        const message = err?.data?.message || 'Could not start the call. Please try again.';
        Alert.alert('Call Failed', Array.isArray(message) ? message[0] : message);
      }
    },
    [user, createSession, getConsultation, startCall],
  );

  useEffect(() => {
    if (outgoingState === 'idle' || outgoingState === 'calling') return;
    setCallingAppointmentId(null);
    if (outgoingState === 'rejected') {
      Alert.alert('Call Declined', 'The doctor declined the call.');
    } else if (outgoingState === 'timeout') {
      Alert.alert('No Response', 'The doctor did not respond. Please try again later.');
    } else if (outgoingState === 'error') {
      Alert.alert('Call Failed', 'Something went wrong. Please try again.');
    }
    resetOutgoingState();
  }, [outgoingState, resetOutgoingState]);

  const treatments: Treatment[] = useMemo(
    () =>
      appointments.map((a) => {
        const doctor = doctorsById[a.doctorId];
        return {
          id: String(a.id),
          appointmentId: a.id,
          doctorId: a.doctorId,
          name: a.doctorName || doctor?.name || 'Doctor',
          specialty: a.doctorSpecialty || doctor?.specialty || '',
          rating: doctor?.rating || 0,
          avatar: a.doctorAvatar || doctor?.avatar || '',
          date: formatDate(a.startAt),
          bookedOn: formatDate(a.createdAt),
          status: a.status,
          consultationType: a.consultationType || 'online_video',
          startAt: a.startAt,
          endAt: a.endAt,
          raw: a,
        };
      }),
    [appointments, doctorsById],
  );

  const filteredTreatments = treatments.filter((item) => {
    if (activeFilter === 'Upcoming' && !isUpcoming(item.status)) return false;
    if (activeFilter === 'Medicine' && !item.specialty?.toLowerCase().includes('medicine')) return false;

    // Filter by visit type tab
    if (activeVisitTab === 'online') {
      const isOnline = item.consultationType?.startsWith('online_') || item.consultationType === 'online';
      if (!isOnline) return false;
    } else if (activeVisitTab === 'physical') {
      if (item.consultationType !== 'physical') return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matches =
        item.name.toLowerCase().includes(query) ||
        item.specialty.toLowerCase().includes(query);
      if (!matches) return false;
    }

    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Treatment</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Location selector */}
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>Location</Text>
          <TouchableOpacity
            style={styles.locationSelector}
            activeOpacity={0.7}
            onPress={() => setLocationSheetOpen(true)}
          >
            <Text style={styles.locationPin}>📍</Text>
            <Text style={styles.locationText}>{location}</Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <LocationBottomSheet
          visible={locationSheetOpen}
          selectedLocation={location}
          onClose={() => setLocationSheetOpen(false)}
          onSave={setLocation}
        />

        {/* Search Field */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Search doctor"
            placeholderTextColor="#A39E99"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Online / Physical Visit Tabs */}
        <View style={styles.visitTabsContainer}>
          <TouchableOpacity
            style={[styles.visitTab, activeVisitTab === 'online' && styles.visitTabActive]}
            onPress={() => setActiveVisitTab('online')}
            activeOpacity={0.7}
          >
            <Text style={[styles.visitTabText, activeVisitTab === 'online' && styles.visitTabTextActive]}>
              Online Visit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.visitTab, activeVisitTab === 'physical' && styles.visitTabActive]}
            onPress={() => setActiveVisitTab('physical')}
            activeOpacity={0.7}
          >
            <Text style={[styles.visitTabText, activeVisitTab === 'physical' && styles.visitTabTextActive]}>
              Physical Visit
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips row */}
        <View style={styles.filtersRow}>
          {(['All', 'Upcoming', 'Medicine'] as const).map((filter) => {
            const isSelected = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Treatment card List */}
        <View style={styles.listContainer}>
          {filteredTreatments.length === 0 ? (
            <Text style={styles.emptyText}>
              {appointments.length === 0
                ? 'No appointments yet.'
                : searchQuery
                  ? 'No appointments match your search.'
                  : 'No appointments found.'}
            </Text>
          ) : (
            filteredTreatments.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.treatmentCard}
                onPress={() => router.push({ pathname: '/doctor-detail', params: { id: String(item.doctorId) } })}
                activeOpacity={0.9}
              >
                {/* Top Card Row */}
                <View style={styles.cardHeader}>
                  <DoctorAvatar
                    name={item.name}
                    avatar={item.avatar}
                    size={68}
                    radius={16}
                    style={styles.cardImage}
                  />
                  <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.doctorName}>{item.name}</Text>
                    </View>

                    <Text style={styles.doctorSpecialty}>{item.specialty}</Text>

                    <View style={styles.ratingLocationRow}>
                      <Text style={styles.metaLabel}>⭐ {item.rating.toFixed(1)}</Text>
                    </View>

                    {/* Detail Info Grid */}
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailsCol}>
                        <Text style={styles.gridLabel}>Appointment</Text>
                        <Text style={styles.gridValue}>{item.date}</Text>
                      </View>
                      <View style={styles.detailsColRight}>
                        <Text style={styles.gridLabelRight}>Booked on</Text>
                        <Text style={styles.gridValueRight}>{item.bookedOn}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Bottom Card Row */}
                <View style={styles.cardFooter}>
                  <View
                    style={[
                      styles.statusIndicatorBadge,
                      isUpcoming(item.status) ? styles.statusUpcoming : styles.statusCompleted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusIndicatorText,
                        isUpcoming(item.status) ? styles.statusTextUpcoming : styles.statusTextCompleted,
                      ]}
                    >
                      {isUpcoming(item.status) ? 'Upcoming' : 'Completed'}
                    </Text>
                  </View>
                  <View style={styles.cardFooterRight}>
                    <View style={styles.priceContainer}>
                      <Text style={styles.currencySymbol}>৳</Text>
                      <Text style={styles.priceAmount}> 120 </Text>
                      <Text style={styles.paidBadge}>(Paid)</Text>
                    </View>
                    {isUpcoming(item.status) &&
                      item.consultationType?.startsWith('online_') && (
                        <TouchableOpacity
                          style={[
                            styles.videoCallBtn,
                            callingAppointmentId === item.appointmentId &&
                              styles.videoCallBtnLoading,
                          ]}
                          activeOpacity={0.8}
                          disabled={callingAppointmentId !== null}
                          onPress={() => handleStartCall(item.raw)}
                        >
                          {callingAppointmentId === item.appointmentId ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Ionicons name="videocam" size={16} color="#FFFFFF" />
                          )}
                          <Text style={styles.videoCallBtnText}>
                            {callingAppointmentId === item.appointmentId
                              ? 'Calling...'
                              : 'Video Call'}
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 20,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
  },
  locationContainer: {
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 12,
    color: '#9C9690',
    fontWeight: '500',
    marginBottom: 4,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationPin: {
    fontSize: 14,
    marginRight: 6,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 4,
  },
  dropdownArrow: {
    fontSize: 8,
    color: '#BD632F',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    color: '#9C9690',
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#1A1817',
  },
  visitTabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E1DC',
  },
  visitTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  visitTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#BD632F',
    marginBottom: -1,
  },
  visitTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C9690',
  },
  visitTabTextActive: {
    color: '#BD632F',
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E6E1DC',
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#BD632F',
    marginBottom: -2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9C9690',
  },
  tabTextActive: {
    color: '#BD632F',
    fontWeight: '700',
  },
  filtersRow: {
    gap: 8,
    paddingBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  filterChipActive: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 16,
  },
  treatmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF9F6',
    paddingBottom: 16,
  },
  cardImage: {
    width: 68,
    height: 68,
    borderRadius: 16,
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeOnline: {
    backgroundColor: '#E8F5E9',
  },
  badgePhysical: {
    backgroundColor: '#F3E5F5',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextOnline: {
    color: '#2E7D32',
  },
  badgeTextPhysical: {
    color: '#7B1FA2',
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#7C7672',
    marginBottom: 6,
  },
  ratingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 11,
    color: '#9C9690',
  },
  metaDot: {
    fontSize: 11,
    color: '#9C9690',
    marginHorizontal: 6,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailsCol: {
    flex: 1.2,
  },
  detailsColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  gridLabel: {
    fontSize: 11,
    color: '#9C9690',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1817',
  },
  gridLabelRight: {
    fontSize: 11,
    color: '#9C9690',
    marginBottom: 2,
    textAlign: 'right',
  },
  gridValueRight: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1817',
    textAlign: 'right',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  statusIndicatorBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusUpcoming: {
    backgroundColor: '#FFF8F4',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  statusIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextUpcoming: {
    color: '#BD632F',
  },
  statusTextCompleted: {
    color: '#2E7D32',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1817',
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1817',
  },
  paidBadge: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: '#9C9690',
    textAlign: 'center',
    paddingVertical: 40,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E53935',
  },
  bookingActionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  rescheduleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BD632F',
  },
  cardFooterRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  videoCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BD632F',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  videoCallBtnLoading: {
    opacity: 0.7,
  },
  videoCallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
