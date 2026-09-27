import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetDoctorByIdQuery, useGetSlotsQuery, useBookSlotMutation } from '@/store/doctorsApi';
import { useRescheduleBookingMutation } from '@/store/doctorPortalApi';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function BookSlotScreen() {
  const router = useRouter();
  const { id, appointmentId, mode } = useLocalSearchParams();
  const doctorId = String(id || '');
  const isReschedule = mode === 'reschedule' && !!appointmentId;
  const today = new Date();
  const [selectedVisitType, setSelectedVisitType] = useState('Online');
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [bookingReason, setBookingReason] = useState('');

  const selectedDateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(selectedDay)}`;

  const { data: availableSlots = [], refetch: refetchSlots } = useGetSlotsQuery(
    { doctorId, date: selectedDateStr },
    { skip: !doctorId },
  );

  // Refetch slots when page opens
  React.useEffect(() => {
    if (doctorId) {
      refetchSlots();
    }
  }, [doctorId, refetchSlots]);

  React.useEffect(() => {
    if (availableSlots.length > 0 && !availableSlots.includes(selectedTimeSlot)) {
      setSelectedTimeSlot(availableSlots[0]);
    } else if (availableSlots.length === 0) {
      setSelectedTimeSlot('');
    }
  }, [availableSlots]);

  const { data: doctorData, isLoading: doctorLoading, isError: doctorError } = useGetDoctorByIdQuery(doctorId, { skip: !doctorId });
  const [bookSlot] = useBookSlotMutation();
  const [rescheduleBooking] = useRescheduleBookingMutation();

  const doctor = useMemo(() => {
    if (!doctorData) return null;
    return {
      id: String(doctorData.id),
      name: doctorData.name,
      specialty: doctorData.specialty,
      location: 'Uttar Badda, Dhaka',
      rating: doctorData.rating || 4.8,
      reviews: 124,
      image: doctorData.avatar === 'jessica_doctor.png'
        ? require('@/assets/images/jessica_doctor.png')
        : require('@/assets/images/michael_doctor.png'),
    };
  }, [doctorData]);

  const handleConfirmSlot = async () => {
    if (!selectedTimeSlot || !doctor) return;

    console.log("selectedTimeSlot", selectedTimeSlot)

    // Require booking reason
    if (!bookingReason.trim()) {
      Alert.alert('Required', 'Please enter a booking reason before proceeding.');
      return;
    }

    try {
      if (isReschedule) {
        await rescheduleBooking({
          id: String(appointmentId),
          date: selectedDateStr,
          time: selectedTimeSlot,
        }).unwrap();
        router.back();
        return;
      }
      await bookSlot({
        doctorId: doctor.id,
        date: selectedDateStr,
        time: selectedTimeSlot,
        consultationType: selectedVisitType === 'Online' ? 'online_video' : 'physical',
      }).unwrap();
    } catch (err) {
      console.log('Error booking slot:', err);
      return;
    }
    router.push({
      pathname: '/confirm-booking',
      params: {
        id: doctor.id,
        timeSlot: selectedTimeSlot,
        day: selectedDay,
        visitType: selectedVisitType,
        reason: bookingReason,
      },
    });
  };

  // Custom Dec 2026 calendar data
  // Dec 1, 2026 starts on Tuesday
  const daysOfWeek = ['SUM', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Grid layout helper:
  // Week rows representing Dec 2026:
  const calendarRows = [
    [26, 27, 28, 1, 2, 3, 4],     // Nov 26-28, Dec 1-4
    [5, 6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17, 18],
    [19, 20, 21, 22, 23, 24, 25],
    [26, 27, 28, 29, 30, 31, 1],  // Dec 26-31, Jan 1
  ];

  const handleDaySelect = (dayNum: number, rowIndex: number) => {
    // Prevent selecting previous/next month overflow dates
    if (rowIndex === 0 && dayNum > 20) return;
    if (rowIndex === 4 && dayNum === 1) return;
    setSelectedDay(dayNum);
  };

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

        <Text style={styles.headerTitle}>{isReschedule ? 'Reschedule' : 'Book Slot'}</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {doctorLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BD632F" />
          <Text style={styles.loadingText}>Loading doctor info...</Text>
        </View>
      )}

      {/* Error State */}
      {doctorError && !doctorLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.loadingText}>Doctor not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {doctor && (
        <>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Doctor Summary Card */}
            <View style={styles.doctorCard}>
              <Image source={doctor.image} style={styles.doctorPortrait} />
              <View style={styles.doctorDetails}>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                <View style={styles.ratingLocationRow}>
                  <Text style={styles.locationPin}>📍</Text>
                  <Text style={styles.locationTextMeta}>{doctor.location}</Text>
                </View>
                <View style={styles.ratingRow}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={styles.ratingValue}>{doctor.rating}</Text>
                  <Text style={styles.reviewsText}>| {doctor.reviews} Reviews</Text>
                </View>
              </View>
            </View>

            {/* Visit Type */}
            <Text style={styles.sectionTitle}>Visit Type</Text>
            <TouchableOpacity style={styles.dropdownTrigger} activeOpacity={0.8}>
              <Text style={styles.dropdownValue}>{selectedVisitType}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            {/* Booking Reason */}
            <Text style={styles.sectionTitle}>Booking Reason</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Description of symptoms"
              placeholderTextColor="#A39E99"
              value={bookingReason}
              onChangeText={setBookingReason}
              multiline
              textAlignVertical="top"
            />

            {/* Date Selection */}
            <Text style={styles.sectionTitle}>Select Date</Text>

            <View style={styles.calendarContainer}>
              {/* Calendar Month Header */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity><Text style={styles.navArrow}>‹</Text></TouchableOpacity>
                <Text style={styles.calendarMonthTitle}>December 2026</Text>
                <TouchableOpacity><Text style={styles.navArrow}>›</Text></TouchableOpacity>
              </View>

              {/* Days of Week Header */}
              <View style={styles.weekdaysRow}>
                {daysOfWeek.map((day) => (
                  <Text key={day} style={styles.weekdayLabel}>{day}</Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {calendarRows.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.calendarGridRow}>
                    {row.map((dayNum, colIndex) => {
                      const isCurrentMonth = !(
                        (rowIndex === 0 && dayNum > 20) ||
                        (rowIndex === 4 && dayNum === 1)
                      );
                      const isSelected = isCurrentMonth && dayNum === selectedDay;

                      return (
                        <TouchableOpacity
                          key={colIndex}
                          style={[
                            styles.calendarDayCell,
                            isSelected && styles.calendarDayCellSelected
                          ]}
                          onPress={() => handleDaySelect(dayNum, rowIndex)}
                          disabled={!isCurrentMonth}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.calendarDayText,
                              !isCurrentMonth && styles.calendarDayTextDisabled,
                              isSelected && styles.calendarDayTextSelected
                            ]}
                          >
                            {dayNum}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            {/* Time Slot Selection */}
            <View style={styles.timeSlotsHeader}>
              <Text style={styles.timeSlotsTitle}>Select Time Slot</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeSlotsRow}
            >
              {availableSlots.length === 0 ? (
                <Text style={styles.noSlotsText}>No open slots for this date.</Text>
              ) : null}
              {availableSlots.map((slot) => {
                const isSelected = slot === selectedTimeSlot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.timeSlotChip, isSelected && styles.timeSlotChipSelected]}
                    onPress={() => setSelectedTimeSlot(slot)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextSelected]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ScrollView>

          {/* Floating Bottom Confirm Button */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.confirmButton, (!selectedTimeSlot || !bookingReason.trim() || !doctor) && { opacity: 0.5 }]}
              onPress={handleConfirmSlot}
              disabled={!selectedTimeSlot || !bookingReason.trim() || !doctor}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmButtonText}>
                {isReschedule ? '📅 Confirm Reschedule' : '📅 Confirm Slot'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#7C7672',
    marginTop: 12,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  backButton: {
    marginTop: 16,
    backgroundColor: '#BD632F',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
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
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    flexDirection: 'row',
  },
  doctorPortrait: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#7C7672',
    marginBottom: 4,
  },
  ratingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  locationPin: {
    fontSize: 10,
    color: '#9C9690',
    marginRight: 4,
  },
  locationTextMeta: {
    fontSize: 10,
    color: '#9C9690',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  ratingValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 4,
  },
  reviewsText: {
    fontSize: 10,
    color: '#9C9690',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 12,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  dropdownValue: {
    fontSize: 15,
    color: '#1A1817',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#BD632F',
  },
  reasonInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 100,
    paddingHorizontal: 16,
    paddingTop: 14,
    fontSize: 14,
    color: '#1A1817',
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navArrow: {
    fontSize: 22,
    color: '#BD632F',
    fontWeight: '700',
    paddingHorizontal: 10,
  },
  calendarMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#9C9690',
  },
  calendarGrid: {
    gap: 8,
  },
  calendarGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayCellSelected: {
    backgroundColor: '#BD632F',
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1817',
  },
  calendarDayTextDisabled: {
    color: '#E0DCD8',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timeSlotsHeader: {
    marginBottom: 12,
  },
  timeSlotsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
  },
  timeSlotsRow: {
    gap: 8,
    paddingBottom: 8,
  },
  timeSlotChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E6E1DC',
  },
  timeSlotChipSelected: {
    backgroundColor: '#FFF8F4',
    borderColor: '#BD632F',
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
  },
  timeSlotTextSelected: {
    color: '#BD632F',
    fontWeight: '700',
  },
  noSlotsText: {
    fontSize: 13,
    color: '#9C9690',
    paddingVertical: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9E5DF',
  },
  confirmButton: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
