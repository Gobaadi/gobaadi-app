import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SvgXml } from 'react-native-svg';

import {
  backButtonSvg,
  doctorCardLocationSvg,
  doctorCardStarSvg,
  doctorDetailArrowRightSvg,
  doctorDetailAvailabilitySvg,
  doctorDetailConfirmSlotSvg,
  doctorNotificationSvg,
} from '@/components/icons/svg-icon-sources';
import { useGetDoctorByIdQuery } from '@/store/doctorsApi';
import { useGetServicesQuery } from '@/store/servicesApi';
import { DoctorAvatar } from '@/components/doctor-avatar';

export default function DoctorDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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
        specialty: t('doctorDetail.defaults.specialty'),
        location: 'Cardiology Center, USA',
        rating: 5,
        reviews: 1872,
        avatar: '',
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
      avatar: doctorData.avatar ?? '',
      availability: doctorData.avatar === 'jessica_doctor.png' ? '8 AM - 5 PM' : '6 AM - 9 PM',
    };
  }, [doctorData, t]);

  const specializations = [
    'doctorDetail.specializations.clinicalMedicine',
    'doctorDetail.specializations.geriatrics',
    'doctorDetail.specializations.emergency',
    'doctorDetail.specializations.contrastRadiography',
    'doctorDetail.specializations.dermatology',
    'doctorDetail.specializations.felineManagement',
    'doctorDetail.specializations.canineBehaviour',
    'doctorDetail.specializations.renalMedicine',
    'doctorDetail.specializations.pediatrics',
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
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('doctorDetail.title')}</Text>

        <TouchableOpacity
          style={styles.circleButton}
          activeOpacity={0.8}
          onPress={() => router.push('/notifications')}
        >
          <SvgXml width={20} height={20} xml={doctorNotificationSvg} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Doctor Main Card */}
        <View style={styles.doctorCard}>
          <DoctorAvatar
            name={doctor.name}
            avatar={doctor.avatar}
            size={88}
            radius={20}
            style={styles.doctorPortrait}
          />
          <View style={styles.doctorDetails}>
            <Text style={styles.doctorName}>{doctor.name}</Text>
            <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
            <View style={styles.ratingLocationRow}>
              <SvgXml width={11} height={11} xml={doctorCardLocationSvg} style={styles.locationPin} />
              <Text style={styles.locationTextMeta}>{doctor.location}</Text>
            </View>
            <View style={styles.ratingRow}>
              <SvgXml width={11} height={11} xml={doctorCardStarSvg} style={styles.starIcon} />
              <Text style={styles.ratingValue}>{doctor.rating}</Text>
              <Text style={styles.reviewsText}>{t('doctorDetail.reviews', { count: doctor.reviews })}</Text>
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
              <SvgXml width={28} height={28} xml={doctorDetailAvailabilitySvg} />
            </View>
            <View style={styles.availabilityMeta}>
              <Text style={styles.availabilityTitle}>{t('doctorDetail.availability')}</Text>
              <Text style={styles.availabilityTime}>{doctor.availability}</Text>
            </View>
          </View>
          <SvgXml width={9} height={15} xml={doctorDetailArrowRightSvg} />
        </TouchableOpacity>

        {/* Specializations list */}
        <View style={styles.specCard}>
          <Text style={styles.specTitle}>{t('doctorDetail.specializationsTitle')}</Text>
          {specializations.map((spec, index) => (
            <View key={index} style={styles.specBulletRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>{t(spec)}</Text>
            </View>
          ))}
        </View>

        {/* Services offered */}
        {services.length > 0 && (
          <View style={[styles.specCard, { marginTop: 20 }]}>
            <Text style={styles.specTitle}>{t('doctorDetail.servicesTitle')}</Text>
            {services.map((service) => (
              <View key={service.id} style={styles.availabilityCard}>
                <View style={styles.availabilityMeta}>
                  <Text style={styles.availabilityTitle}>{service.name}</Text>
                  <Text style={styles.availabilityTime}>{t('doctorDetail.serviceMeta', { price: service.price, minutes: service.durationMinutes })}</Text>
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
          <SvgXml width={20} height={20} xml={doctorDetailConfirmSlotSvg} style={styles.bookButtonIcon} />
          <Text style={styles.bookButtonText}>{t('doctorDetail.bookSlot')}</Text>
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  bookButtonIcon: {
    marginRight: 8,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
