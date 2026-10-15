import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { useGetBookingByIdQuery, useGetDoctorBookingsQuery } from '@/store/doctorPortalApi';
import { appointmentCancelCalendarSvg } from '@/components/icons/svg-icon-sources';
import { formatAnimalDetails } from '@/utils/appointment';
import { RegistrationBackground } from '@/components/registration-background';

export default function AppointmentCancelledScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDoctor = useSelector((state: RootState) => state.auth.user?.role) === 'doctor';
  const { data: fetchedAppointment } = useGetBookingByIdQuery(String(id ?? ''), {
    skip: !id,
  });
  const { data: bookings = [] } = useGetDoctorBookingsQuery();
  const appointment = fetchedAppointment ?? bookings.find((b) => String(b.id) === id);

  const displayName = appointment
    ? appointment.animalName || appointment.patientName || t('appointmentCancelled.patient')
    : t('appointmentCancelled.unknown');
  const animalDetails = appointment ? formatAnimalDetails(appointment) : null;

  return (
    <SafeAreaView style={styles.container}>
      <RegistrationBackground />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('appointmentCancelled.headerTitle')}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <SvgXml width={44} height={44} xml={appointmentCancelCalendarSvg} />
          </View>
        </View>

        <Text style={styles.title}>{t('appointmentCancelled.title')}</Text>
        <Text style={styles.subtitle}>
          {t('appointmentCancelled.subtitle')}
        </Text>

        {appointment && (
          <View style={styles.infoCard}>
            <Text style={styles.cancelledLabel}>{t('appointmentCancelled.cancelledLabel')}</Text>
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
                {animalDetails && (
                  <Text style={styles.cardDetail}>{animalDetails}</Text>
                )}
                {appointment.patientName && (
                  <View style={styles.ownerBlock}>
                    <Text style={styles.ownerLabel}>{t('appointmentCancelled.ownerLabel')}</Text>
                    <Text style={styles.ownerName}>{appointment.patientName}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace(isDoctor ? '/doctor-home' : '/')}
          activeOpacity={0.8}
        >
          <Text style={styles.homeBtnText}>{t('appointmentCancelled.goHome')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
  iconContainer: { marginTop: 40, marginBottom: 20 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9C9690',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 16,
  },
  cancelledLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1817',
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 14 },
  avatarPlaceholder: {
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1A1817', marginBottom: 2 },
  cardDetail: { fontSize: 13, fontWeight: '500', color: '#7C7672', marginBottom: 2 },
  ownerBlock: { marginTop: 2 },
  ownerLabel: { fontSize: 12, fontWeight: '600', color: '#BD632F', marginBottom: 2 },
  ownerName: { fontSize: 13, fontWeight: '600', color: '#1A1817' },
  bottomContainer: { paddingHorizontal: 20, paddingVertical: 16 },
  homeBtn: {
    backgroundColor: '#BD632F',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  homeBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
