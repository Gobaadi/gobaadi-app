import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetDoctorByIdQuery } from '@/store/doctorsApi';
import { DoctorAvatar } from '@/components/doctor-avatar';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function BookingDetailsScreen() {
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
        avatar: '',
      };
    }
    return {
      id: String(doctorData.id),
      name: doctorData.name,
      specialty: doctorData.specialty,
      location: 'Uttar Badda, Dhaka',
      rating: doctorData.rating || 4.8,
      reviews: 124,
      avatar: doctorData.avatar ?? '',
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

  const barcodePattern = [
    2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 2, 3, 1, 4,
    2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 2, 3, 1, 4, 2, 1, 3,
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Bell icon top right */}
      <View style={styles.topBar}>
        <View />
        <TouchableOpacity style={styles.bellButton} activeOpacity={0.8}>
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Main Card */}
        <View style={styles.billCard}>
          <Text style={styles.billTitle}>Booking Details</Text>
          <View style={styles.divider} />

          {/* Doctor Row */}
          <View style={styles.doctorRow}>
            <DoctorAvatar
              name={doctor.name}
              avatar={doctor.avatar}
              size={68}
              radius={14}
              style={styles.doctorPortrait}
            />
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
          <Text style={styles.reasonText}>{bookingReason || '—'}</Text>

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

          {/* Barcode */}
          <View style={styles.barcodeContainer}>
            <View style={styles.barcodeStripes}>
              {barcodePattern.map((widthVal, index) => (
                <View
                  key={index}
                  style={[
                    styles.barcodeStripe,
                    {
                      width: widthVal,
                      backgroundColor: index % 2 === 0 ? '#1A1817' : '#FFFFFF',
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.barcodeCode}>PC123456789</Text>
          </View>
        </View>
      </ScrollView>

      {/* Back to home button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.85}
        >
          <Text style={styles.homeButtonText}>← Back to home</Text>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 8,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    fontSize: 18,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  billTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 16,
  },
  divider: {
    height: 1.5,
    backgroundColor: '#FAF9F6',
    marginVertical: 16,
  },
  doctorRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  doctorPortrait: {
    width: 68,
    height: 68,
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
  barcodeContainer: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1.5,
    borderTopColor: '#FAF9F6',
  },
  barcodeStripes: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'stretch',
    marginBottom: 8,
  },
  barcodeStripe: {
    height: '100%',
  },
  barcodeCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C7672',
    letterSpacing: 2,
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
  homeButton: {
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
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
