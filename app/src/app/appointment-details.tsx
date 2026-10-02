import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetBookingByIdQuery,
  useGetDoctorBookingsQuery,
} from '@/store/doctorPortalApi';
import { DoctorAvatar } from '@/components/doctor-avatar';

function formatTimeRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${fmt(s)} - ${fmt(e)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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

function consultationTypeLabel(value?: string): string | null {
  switch (value) {
    case 'online_video':
      return 'Online - Video';
    case 'online_voice':
      return 'Online - Voice';
    case 'online_chat':
      return 'Online - Chat';
    case 'physical':
      return 'In Person';
    case undefined:
    case null:
    case '':
      return null;
    default:
      return value;
  }
}

function formatSymptoms(symptoms?: string | string[]): string | null {
  if (!symptoms) return null;
  const text = Array.isArray(symptoms) ? symptoms.filter(Boolean).join(', ') : symptoms;
  return text.trim() ? text.trim() : null;
}

function paymentStatusStyle(status?: string): { label: string; color: string } {
  switch (status) {
    case 'paid':
      return { label: 'Paid', color: '#4CAF50' };
    case 'pending':
      return { label: 'Pending', color: '#E65100' };
    case 'failed':
      return { label: 'Failed', color: '#C62828' };
    case 'refunded':
      return { label: 'Refunded', color: '#1565C0' };
    default:
      return { label: '—', color: '#9C9690' };
  }
}

export default function AppointmentDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: fetchedAppointment,
    isLoading: idLoading,
  } = useGetBookingByIdQuery(String(id ?? ''), { skip: !id });
  const { data: bookings = [], isLoading: listLoading } = useGetDoctorBookingsQuery();

  const appointment = fetchedAppointment ?? bookings.find((b) => String(b.id) === id);

  if (!appointment && (idLoading || listLoading)) {
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
          <Text style={styles.headerTitle}>Appointment Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color="#BD632F" />
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
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
          <Text style={styles.headerTitle}>Appointment Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#E6E1DC" />
          <Text style={styles.emptyText}>Appointment not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = getStatusStyle(appointment.status);
  const displayName =
    appointment.animalName || appointment.patientName || 'Patient';
  const consultationType = consultationTypeLabel(appointment.consultationType);
  const reason = (appointment.reasonForConsultation ?? '').trim();
  const symptoms = formatSymptoms(appointment.symptoms);
  const payment = paymentStatusStyle(appointment.paymentStatus);

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
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.dateText}>{formatDate(appointment.startAt)}</Text>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {formatTimeRange(appointment.startAt, appointment.endAt)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardRow}>
            {appointment.animalImage ? (
              <Image source={{ uri: appointment.animalImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="paw" size={24} color="#BD632F" />
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{displayName}</Text>
              {(appointment.animalSpecies || appointment.animalBreed || appointment.animalAge) && (
                <Text style={styles.cardDetail}>
                  {[
                    appointment.animalSpecies,
                    appointment.animalAge,
                    appointment.animalBreed,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              )}
              {appointment.animalName && appointment.patientName && (
                <Text style={styles.cardOwner}>Owner: {appointment.patientName}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <DoctorAvatar
              name={appointment.doctorName || 'Doctor'}
              avatar={appointment.doctorAvatar}
              size={56}
              radius={28}
              style={styles.doctorAvatar}
            />
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>DOCTOR</Text>
              <Text style={styles.cardName}>
                {appointment.doctorName || 'Doctor'}
              </Text>
              {appointment.doctorSpecialty && (
                <Text style={styles.cardDetail}>{appointment.doctorSpecialty}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {consultationType && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Consultation Type</Text>
              <Text style={styles.detailValue}>{consultationType}</Text>
            </View>
          )}

          {reason && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reason for Consultation</Text>
                <Text style={styles.detailValue}>{reason}</Text>
              </View>
            </>
          )}

          {symptoms && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Symptoms</Text>
                <Text style={styles.detailValue}>{symptoms}</Text>
              </View>
            </>
          )}

          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment</Text>
            <Text style={[styles.detailValue, { color: payment.color }]}>
              {payment.label}
            </Text>
          </View>

          {appointment.price != null && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fee</Text>
                <Text style={styles.detailValue}>
                  ৳ {appointment.price.toLocaleString()}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED' && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() =>
              router.push({
                pathname: '/appointment-cancel',
                params: { id: String(appointment.id) },
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rescheduleBtn}
            onPress={() =>
              router.push({
                pathname: '/appointment-reschedule',
                params: { id: String(appointment.id) },
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.rescheduleBtnText}>Reschedule</Text>
          </TouchableOpacity>
        </View>
      )}
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  dateText: { fontSize: 14, fontWeight: '500', color: '#9C9690', marginBottom: 4 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  timeText: { fontSize: 15, fontWeight: '600', color: '#1A1817' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 13, fontWeight: '600' },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 14,
  },
  cardRow: { flexDirection: 'row', gap: 12 },
  avatar: { width: 68, height: 68, borderRadius: 14 },
  avatarPlaceholder: {
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1A1817', marginBottom: 2 },
  doctorAvatar: { width: 56, height: 56, borderRadius: 28 },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9C9690',
    marginBottom: 2,
  },
  cardDetail: { fontSize: 13, fontWeight: '500', color: '#7C7672', marginBottom: 2 },
  cardOwner: { fontSize: 13, fontWeight: '500', color: '#7C7672' },
  divider: { height: 1, backgroundColor: '#F0EAE1', marginVertical: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 2 },
  detailLabel: { fontSize: 14, fontWeight: '500', color: '#9C9690', flex: 1 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1A1817', flex: 1, textAlign: 'right' },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500', color: '#9C9690' },
  bottomContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E74C3C',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#E74C3C' },
  rescheduleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#BD632F',
    alignItems: 'center',
  },
  rescheduleBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
