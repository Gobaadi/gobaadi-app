import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useGetDoctorByIdQuery } from '@/store/doctorsApi';
import { DoctorAvatar } from '@/components/doctor-avatar';
import { useTranslation } from 'react-i18next';

function visitTypeLabelKey(value: string): string {
  if (value === 'Online') return 'confirmPay.visitTypes.online';
  if (value === 'Physical') return 'confirmPay.visitTypes.physical';
  return value;
}

export default function ConfirmPayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const doctorId = String(params.id || '');

  const { data: doctorData, isLoading: doctorLoading } = useGetDoctorByIdQuery(doctorId, { skip: !doctorId });

  const doctor = doctorData
    ? {
      id: String(doctorData.id),
      name: doctorData.name,
      specialty: doctorData.specialty,
      location: doctorData.location || '',
      rating: doctorData.rating,
      reviews: doctorData.reviewCount ?? 0,
      avatar: doctorData.avatar ?? '',
    }
    : {
      id: doctorId || '1',
      name: t('confirmPay.doctorFallback'),
      specialty: '',
      location: '',
      rating: 0,
      reviews: 0,
      avatar: null,
    };

  // Format Date value nicely
  const selectedDay = params.day ? String(params.day) : '28';
  const selectedMonthYear = t('confirmPay.monthYear');
  const selectedTime = params.timeSlot ? String(params.timeSlot) : '09.00 AM';
  const selectedVisitType = params.visitType ? String(params.visitType) : 'Online';

  const fullDateDisplay = t('confirmPay.fullDate', { day: selectedDay, monthYear: selectedMonthYear });

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

        <Text style={styles.headerTitle}>{t('confirmPay.title')}</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Main Info Card */}
      <View style={styles.mainContent}>
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
                {doctorLoading ? t('confirmPay.loading') : doctor.name}
              </Text>
              {!!doctor.specialty && (
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
              )}
              {!!doctor.location && (
                <View style={styles.ratingLocationRow}>
                  <Text style={styles.locationPin}>📍</Text>
                  <Text style={styles.locationTextMeta}>{doctor.location}</Text>
                </View>
              )}
              {!!doctorData && (
                <View style={styles.ratingRow}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={styles.ratingValue}>{doctor.rating}</Text>
                  {doctor.reviews > 0 && (
                    <Text style={styles.reviewsText}>{t('confirmPay.reviews', { count: doctor.reviews })}</Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Your Slot Section */}
          <Text style={styles.sectionHeader}>{t('confirmPay.bookingReason')}</Text>
          <Text style={styles.reasonText}>{params.reason || '—'}</Text>

          <View style={styles.dashedDivider} />

          {/* Your Slot Section */}
          <Text style={styles.sectionHeader}>{t('confirmPay.yourSlot')}</Text>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>{t('confirmPay.hour')}</Text>
            <Text style={styles.slotValue}>{selectedTime}</Text>
          </View>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>{t('confirmPay.dates')}</Text>
            <Text style={styles.slotValue}>{fullDateDisplay}</Text>
          </View>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>{t('confirmPay.visitType')}</Text>
            <Text style={[styles.slotValue, styles.onlineText]}>{t(visitTypeLabelKey(selectedVisitType))}</Text>
          </View>

          <View style={styles.dashedDivider} />

          {/* Fees Details Section */}
          <Text style={styles.sectionHeader}>{t('confirmPay.feesDetails')}</Text>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>{t('confirmPay.doctorsFee')}</Text>
            <Text style={styles.feeValue}>৳ 100</Text>
          </View>

          <View style={styles.slotDetailRow}>
            <Text style={styles.slotLabel}>{t('confirmPay.appsFee')}</Text>
            <Text style={styles.feeValue}>৳ 20</Text>
          </View>

          <View style={styles.slotDetailRow}>
            <Text style={styles.totalLabel}>{t('confirmPay.totalFees')}</Text>
            <Text style={styles.totalValue}>৳ 120</Text>
          </View>
        </View>
      </View>

      {/* Sticky Bottom Confirm Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() =>
            router.push({
              pathname: '/payment-method',
              params: {
                id: doctor.id,
                timeSlot: selectedTime,
                day: selectedDay,
                visitType: selectedVisitType,
                reason: params.reason || '',
              },
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.confirmButtonIcon}>💵</Text>
          <Text style={styles.confirmButtonText}>{t('confirmPay.confirmBooking')}</Text>
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
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
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
  dashedDivider: {
    height: 1.5,
    backgroundColor: '#FAF9F6',
    marginVertical: 16,
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
