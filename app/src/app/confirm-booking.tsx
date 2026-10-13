import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useGetDoctorByIdQuery } from '@/store/doctorsApi';
import { DoctorAvatar } from '@/components/doctor-avatar';
import { SvgXml } from 'react-native-svg';

import {
  backButtonSvg,
  confirmPaymentSvg,
  doctorCardLocationSvg,
  doctorCardStarSvg,
  doctorNotificationSvg,
} from '@/components/icons/svg-icon-sources';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function ConfirmBookingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const doctorId = String(params.id || '');
  const selectedDay = params.day ? String(params.day) : '28';
  const selectedTime = params.timeSlot ? String(params.timeSlot) : '09.00 AM';
  const selectedVisitType = params.visitType ? String(params.visitType) : 'Online';
  const bookingReason = params.reason ? String(params.reason) : '';

  const { data: doctorData, isLoading: doctorLoading } = useGetDoctorByIdQuery(doctorId, { skip: !doctorId });

  const doctor = useMemo(() => {
    if (!doctorData) {
      return {
        id: doctorId || '1',
        name: t('confirmBooking.defaultDoctor'),
        specialty: '',
        location: '',
        rating: 0,
        reviews: 0,
        avatar: null,
      };
    }
    return {
      id: String(doctorData.id),
      name: doctorData.name,
      specialty: doctorData.specialty,
      location: doctorData.location || '',
      rating: doctorData.rating || 4.8,
      reviews: 124,
      avatar: doctorData.avatar ?? '',
    };
  }, [doctorData, doctorId, t]);

  const today = new Date();
  const monthKeys = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dateObj = new Date(today.getFullYear(), today.getMonth(), Number(selectedDay));
  const fullDateDisplay = t('confirmBooking.fullDate', {
    day: t(`confirmBooking.daysShort.${dayKeys[dateObj.getDay()]}`),
    dayNum: pad(Number(selectedDay)),
    month: t(`confirmBooking.months.${monthKeys[today.getMonth()]}`),
    year: today.getFullYear(),
  });

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
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('confirmBooking.title')}</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <SvgXml width={20} height={20} xml={doctorNotificationSvg} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          {/* Doctor Row */}
          <View style={styles.doctorRow}>
            {doctorLoading ? (
              <View style={[styles.doctorPortrait, styles.doctorPortraitPlaceholder]}>
                <ActivityIndicator size="small" color="#BD632F" />
              </View>
            ) : (
              <DoctorAvatar
                name={doctor.name}
                avatar={doctor.avatar}
                size={72}
                radius={16}
                style={styles.doctorPortrait}
              />
            )}
            <View style={styles.doctorDetails}>
              <Text style={styles.doctorName}>
                {doctorLoading ? t('confirmBooking.loading') : doctor.name}
              </Text>
              {!!doctor.specialty && (
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
              )}
              {!!doctor.location && (
                <View style={styles.ratingLocationRow}>
                  <SvgXml width={11} height={11} xml={doctorCardLocationSvg} style={styles.locationPin} />
                  <Text style={styles.locationTextMeta}>{doctor.location}</Text>
                </View>
              )}
              {!!doctorData && (
                <View style={styles.ratingRow}>
                  <SvgXml width={11} height={11} xml={doctorCardStarSvg} style={styles.starIcon} />
                  <Text style={styles.ratingValue}>{doctor.rating}</Text>
                  <Text style={styles.reviewsText}>{t('confirmBooking.reviews', { reviews: doctor.reviews })}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Booking Reason */}
          <Text style={styles.sectionHeader}>{t('confirmBooking.bookingReason')}</Text>
          <Text style={styles.reasonText}>{bookingReason || '—'}</Text>

          <View style={styles.divider} />

          {/* Your Slot */}
          <Text style={styles.sectionHeader}>{t('confirmBooking.yourSlot')}</Text>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>{t('confirmBooking.hour')}</Text>
            <Text style={styles.slotValue}>{selectedTime}</Text>
          </View>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>{t('confirmBooking.dates')}</Text>
            <Text style={styles.slotValue}>{fullDateDisplay}</Text>
          </View>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>{t('confirmBooking.visitType')}</Text>
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
          <SvgXml width={20} height={20} xml={confirmPaymentSvg} style={styles.confirmButtonIcon} />
          <Text style={styles.confirmButtonText}>{t('confirmBooking.confirmPayment')}</Text>
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
  doctorPortraitPlaceholder: {
    backgroundColor: '#F3EFE9',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginRight: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
