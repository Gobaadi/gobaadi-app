import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  location: string;
  rating: number;
  reviews: number;
  image: any;
}

export default function BillingDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const doctors: Record<string, Doctor> = {
    '1': {
      id: '1',
      name: 'Dr. David Patel',
      specialty: 'Veterinary Surgery',
      location: 'Cardiology Center, USA',
      rating: 5,
      reviews: 1872,
      image: require('@/assets/images/doctor.png'),
    },
    '2': {
      id: '2',
      name: 'Dr. Jessica Turner',
      specialty: 'Veterinary Medicine',
      location: "Women's Clinic, Seattle, USA",
      rating: 4.9,
      reviews: 127,
      image: require('@/assets/images/jessica_doctor.png'),
    },
    '3': {
      id: '3',
      name: 'Dr. Michael Johnson',
      specialty: 'Avian & Exotic Medicine',
      location: 'Maple Associates, NY, USA',
      rating: 4.7,
      reviews: 5223,
      image: require('@/assets/images/michael_doctor.png'),
    },
  };

  const doctor = doctors[String(params.id)] || doctors['1'];
  
  // Format Date value nicely
  const selectedDay = params.day ? String(params.day) : '28';
  const selectedMonthYear = 'December 2026';
  const selectedTime = params.timeSlot ? String(params.timeSlot) : '09.00 AM';
  const selectedVisitType = params.visitType ? String(params.visitType) : 'Online';

  const fullDateDisplay = `Mon, ${selectedDay} ${selectedMonthYear}`;

  // Custom flexbox barcode generator (array of widths for stripes)
  const barcodePattern = [
    2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 2, 3, 1, 4, 
    2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 2, 3, 1, 4, 2, 1, 3
  ];

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
        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.billCard}>
          <Text style={styles.billTitle}>Billing Details</Text>
          <View style={styles.divider} />

          {/* Doctor Info Row */}
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

          {/* Your Slot Section */}
          <Text style={styles.sectionHeader}>Booking Reason</Text>
          <Text style={styles.reasonText}>{params.reason || '—'}</Text>

          <View style={styles.divider} />

          {/* Your Slot Section */}
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

          <View style={styles.divider} />

          {/* Fees Details Section */}
          <Text style={styles.sectionHeader}>Fees Details</Text>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>Doctor's Fee</Text>
            <Text style={styles.feeValue}>৳ 100</Text>
          </View>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>Apps fee</Text>
            <Text style={styles.feeValue}>৳ 20</Text>
          </View>

          <View style={styles.slotDetailRow}>
            <Text style={styles.totalLabel}>Total Fees</Text>
            <Text style={styles.totalValue}>৳ 120</Text>
          </View>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>Status</Text>
            <Text style={[styles.slotValue, styles.paidText]}>Paid</Text>
          </View>

          {/* Custom flexbox barcode */}
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

      {/* Floating Bottom Back to home Button */}
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
  reasonText: {
    fontSize: 13,
    color: '#7C7672',
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 18,
  },
  paidText: {
    color: '#2E7D32',
  },
  feeValue: {
    fontSize: 13,
    color: '#1A1817',
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1817',
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
