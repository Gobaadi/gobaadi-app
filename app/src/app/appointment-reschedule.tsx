import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetDoctorBookingsQuery,
  useRescheduleBookingMutation,
} from '@/store/doctorPortalApi';
import { useGetSlotsQuery } from '@/store/doctorsApi';

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
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LETTERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AppointmentRescheduleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: bookings = [] } = useGetDoctorBookingsQuery();
  const [rescheduleBooking, { isLoading }] = useRescheduleBookingMutation();

  const appointment = bookings.find((b) => String(b.id) === id);

  const [selectedDate, setSelectedDate] = useState<Date | null>(
    appointment ? new Date(appointment.startAt) : new Date()
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const doctorId = appointment ? String(appointment.doctorId) : '';
  const selectedDateStr = selectedDate ? formatDateKey(selectedDate) : '';
  const { data: timeSlots = [], isLoading: slotsLoading } = useGetSlotsQuery(
    { doctorId, date: selectedDateStr },
    { skip: !doctorId || !selectedDateStr }
  );

  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate]);

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
          <Text style={styles.headerTitle}>Appointments Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Appointment not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName =
    appointment.animalName || appointment.patientName || `Patient #${appointment.patientId}`;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const goToPreviousMonth = () => {
    const prev = new Date(year, month - 1, 1);
    setCurrentMonth(prev);
  };

  const goToNextMonth = () => {
    const next = new Date(year, month + 1, 1);
    setCurrentMonth(next);
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Required', 'Please select a date and time.');
      return;
    }
    try {
      const dateStr = formatDateKey(selectedDate);
      await rescheduleBooking({
        id: String(appointment.id),
        date: dateStr,
        time: selectedTime,
      }).unwrap();
      router.replace('/appointments');
    } catch {
      Alert.alert('Error', 'Failed to reschedule appointment. Please try again.');
    }
  };

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
        <Text style={styles.headerTitle}>Appointments Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
              {appointment.animalSpecies && (
                <Text style={styles.cardDetail}>
                  {appointment.animalSpecies}
                  {appointment.animalAge ? ` · ${appointment.animalAge}` : ''}
                  {appointment.animalBreed ? ` · ${appointment.animalBreed}` : ''}
                </Text>
              )}
              {appointment.patientName && (
                <Text style={styles.cardOwner}>Owner: {appointment.patientName}</Text>
              )}
            </View>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>
              {new Date(appointment.startAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <Text style={styles.timeText}>
              {new Date(appointment.startAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Select date</Text>
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={goToPreviousMonth} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color="#1A1817" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={20} color="#1A1817" />
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
              const isTodayDate = isSameDay(date, new Date());
              const isSelected = selectedDate && isSameDay(date, selectedDate);

              return (
                <TouchableOpacity
                  key={day}
                  style={styles.dayCell}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.dayNumber,
                      isTodayDate && styles.dayNumberToday,
                      isSelected && styles.dayNumberSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumberText,
                        isTodayDate && !isSelected && styles.dayNumberTextToday,
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

        <Text style={styles.sectionTitle}>Select time</Text>
        {slotsLoading ? (
          <ActivityIndicator size="small" color="#BD632F" style={{ marginTop: 12 }} />
        ) : timeSlots.length === 0 ? (
          <Text style={styles.emptyText}>No available slots for this date</Text>
        ) : (
          <View style={styles.timeSlotsRow}>
            {timeSlots.map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[
                  styles.timeSlot,
                  selectedTime === slot && styles.timeSlotActive,
                ]}
                onPress={() => setSelectedTime(slot)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    selectedTime === slot && styles.timeSlotTextActive,
                  ]}
                >
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.rescheduleBtn, isLoading && styles.rescheduleBtnDisabled]}
          onPress={handleReschedule}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <Text style={styles.rescheduleBtnText}>
            {isLoading ? 'Rescheduling...' : 'Reschedule'}
          </Text>
        </TouchableOpacity>
      </View>
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
    borderRadius: 20,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 16,
  },
  cardRow: { flexDirection: 'row', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 14 },
  avatarPlaceholder: {
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1A1817', marginBottom: 2 },
  cardDetail: { fontSize: 13, fontWeight: '500', color: '#7C7672', marginBottom: 2 },
  cardOwner: { fontSize: 13, fontWeight: '500', color: '#7C7672' },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E6E1DC',
  },
  dateText: { fontSize: 13, fontWeight: '500', color: '#1A1817' },
  timeText: { fontSize: 13, fontWeight: '500', color: '#1A1817' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginTop: 24,
    marginBottom: 12,
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: { fontSize: 16, fontWeight: '700', color: '#1A1817' },
  dayHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#BD632F',
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  dayNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumberToday: { backgroundColor: '#FFF2EB' },
  dayNumberSelected: { backgroundColor: '#BD632F' },
  dayNumberText: { fontSize: 14, fontWeight: '500', color: '#1A1817' },
  dayNumberTextToday: { color: '#BD632F', fontWeight: '700' },
  dayNumberTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  timeSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    backgroundColor: '#FFFFFF',
  },
  timeSlotActive: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  timeSlotText: { fontSize: 14, fontWeight: '600', color: '#7C7672' },
  timeSlotTextActive: { color: '#FFFFFF' },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500', color: '#9C9690' },
  bottomContainer: { paddingHorizontal: 20, paddingVertical: 16 },
  rescheduleBtn: {
    backgroundColor: '#BD632F',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  rescheduleBtnDisabled: { opacity: 0.6 },
  rescheduleBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
