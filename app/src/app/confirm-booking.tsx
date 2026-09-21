import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetDoctorByIdQuery } from '@/store/doctorsApi';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function ConfirmBookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const doctorId = String(params.id || '');
  const selectedDay = params.day ? String(params.day) : '28';
  const selectedTime = params.timeSlot ? String(params.timeSlot) : '09.00 AM';
  const selectedVisitType = params.visitType ? String(params.visitType) : 'Online';
  const bookingReason = params.reason ? String(params.reason) : '';

  const { data: doctorData } = useGetDoctorByIdQuery(doctorId, { skip: !doctorId });

  const doctor = useMemo(() => {
    if (!doctorData) {
      return {
        id: doctorId || '1',
        name: 'Dr. David Patel',
        specialty: 'Veterinary Surgery',
        location: 'Cardiology Center, USA',
        rating: 5,
        reviews: 1872,
        image: require('@/assets/images/doctor.png'),
      };
    }
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
  }, [doctorData, doctorId]);

  const today = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dateObj = new Date(today.getFullYear(), today.getMonth(), Number(selectedDay));
  const fullDateDisplay = `${dayNames[dateObj.getDay()]}, ${pad(Number(selectedDay))} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;

  const handleConfirmPayment = () => {
    router.push({
      pathname: '/booking-details',
      params: {
        id: doctor.id,
        timeSlot: selectedTime,
        day: selectedDay,
        visitType: selectedVisitType,
        reason: bookingReason,
      },
    });
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

        <Text style={styles.headerTitle}>Confirm Booking</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          {/* Doctor Row */}
          <View style={styles.doctorRow}>
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

          {/* Booking Reason */}
          <Text style={styles.sectionHeader}>Booking Reason</Text>
          <Text style={styles.reasonText}>{bookingReason || 'The symptom was extreme fever'}</Text>

          <View style={styles.divider} />

          {/* Your Slot */}
          <Text style={styles.sectionHeader}>Your Slot</Text>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>Hour</Text>
            <Text style={styles.slotValue}>{selectedTime}</Text>
          </View>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>Dates</Text>
            <Text style={styles.slotValue}>{fullDateDisplay}</Text>
          </View>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>Visit Type</Text>
            <Text style={[styles.slotValue, styles.onlineText]}>{selectedVisitType}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Confirm Payment Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmPayment}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmButtonIcon}>💵</Text>
          <Text style={styles.confirmButtonText}>Confirm Payment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
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
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
    marginTop: 8,
  },
  doctorRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  doctorPortrait: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginRight: 14,
  },
  doctorDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: 16,
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 12,
  },
  reasonText: {
    fontSize: 13,
    color: '#7C7672',
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 18,
  },
  divider: {
    height: 1.5,
    backgroundColor: '#FAF9F6',
    marginVertical: 16,
  },
  slotDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  slotLabel: {
    fontSize: 13,
    color: '#9C9690',
    fontWeight: '500',
  },
  slotValue: {
    fontSize: 13,
    color: '#1A1817',
    fontWeight: '600',
  },
  onlineText: {
    color: '#2E7D32',
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
    flexDirection: 'row',
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
  confirmButtonIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    marginRight: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
