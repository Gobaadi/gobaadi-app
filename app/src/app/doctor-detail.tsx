import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetDoctorByIdQuery } from '@/store/doctorsApi';
import { useGetServicesQuery } from '@/store/servicesApi';

export default function DoctorDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const doctorId = String(id || '');

  const { data: doctorData } = useGetDoctorByIdQuery(doctorId, { skip: !doctorId });
  const { data: services = [] } = useGetServicesQuery(
    { providerType: 'doctor', providerId: doctorId ? parseInt(doctorId, 10) : undefined },
    { skip: !doctorId },
  );

  const doctor = useMemo(() => {
    if (!doctorData) {
      return {
        id: '1',
        name: 'Dr. David Patel',
        specialty: 'Veterinary Surgery',
        location: 'Cardiology Center, USA',
        rating: 5,
        reviews: 1872,
        image: require('@/assets/images/doctor.png'),
        availability: '6 AM - 9 PM',
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
      availability: doctorData.avatar === 'jessica_doctor.png' ? '8 AM - 5 PM' : '6 AM - 9 PM',
    };
  }, [doctorData]);

  const specializations = [
    'Veterinary clinical medicine',
    'Veterinary geriatrics',
    'Emergency and TRUMA CURE',
    'Trained in Contrast Radiography by TANUVAS',
    'Trained in Advance medical management of a major Dermatological Challenges in Dogs',
    'Trained in Advance Feline Management by FCI',
    'Trained in Canine Behaviour Management',
    'Trained in Advance in Small Animal Renal Medicine and Renal Critical Care by TANUVAS',
    'Trained in Pediatrics Health Management of Dogs and Cats by Dept of Vet Medicine, PGIVER, Jaipur Rajasthan',
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

        <Text style={styles.headerTitle}>Doctor Detail</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Doctor Main Card */}
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

        {/* Availability Card */}
        <TouchableOpacity
          style={styles.availabilityCard}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: '/book-slot', params: { id: doctor.id } })}
        >
          <View style={styles.availabilityLeft}>
            <View style={styles.clockCircle}>
              <Text style={styles.clockIcon}>🕐</Text>
            </View>
            <View style={styles.availabilityMeta}>
              <Text style={styles.availabilityTitle}>Availability</Text>
              <Text style={styles.availabilityTime}>{doctor.availability}</Text>
            </View>
          </View>
          <Text style={styles.chevronRight}>❯</Text>
        </TouchableOpacity>

        {/* Specializations list */}
        <View style={styles.specCard}>
          <Text style={styles.specTitle}>Specializations</Text>
          {specializations.map((spec, index) => (
            <View key={index} style={styles.specBulletRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>{spec}</Text>
            </View>
          ))}
        </View>

        {/* Services offered */}
        {services.length > 0 && (
          <View style={[styles.specCard, { marginTop: 20 }]}>
            <Text style={styles.specTitle}>Services</Text>
            {services.map((service) => (
              <View key={service.id} style={styles.availabilityCard}>
                <View style={styles.availabilityMeta}>
                  <Text style={styles.availabilityTitle}>{service.name}</Text>
                  <Text style={styles.availabilityTime}>৳ {service.price} · {service.durationMinutes} min</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Book Slot Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => router.push({ pathname: '/book-slot', params: { id: doctor.id } })}
          activeOpacity={0.85}
        >
          <Text style={styles.bookButtonText}>📅 Book Slot</Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    flexDirection: 'row',
  },
  doctorPortrait: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginRight: 16,
  },
  doctorDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: '#7C7672',
    marginBottom: 8,
  },
  ratingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationPin: {
    fontSize: 11,
    color: '#9C9690',
    marginRight: 4,
  },
  locationTextMeta: {
    fontSize: 11,
    color: '#9C9690',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  ratingValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 4,
  },
  reviewsText: {
    fontSize: 11,
    color: '#9C9690',
  },
  availabilityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  availabilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF1E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clockIcon: {
    fontSize: 18,
    color: '#BD632F',
  },
  availabilityMeta: {
    justifyContent: 'center',
  },
  availabilityTitle: {
    fontSize: 12,
    color: '#9C9690',
    fontWeight: '600',
    marginBottom: 2,
  },
  availabilityTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
  },
  chevronRight: {
    fontSize: 16,
    color: '#BD632F',
    fontWeight: '700',
  },
  specCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 24,
    padding: 20,
  },
  specTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 16,
  },
  specBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    fontWeight: '700',
    color: '#BD632F',
    marginRight: 8,
    marginTop: -2,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#4C4844',
    lineHeight: 18,
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
  bookButton: {
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
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
