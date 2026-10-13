import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { Image } from 'expo-image';

function formatPhone(raw: string): string {
  // +8801717897845 → +01717-897845
  const digits = raw.replace(/\D/g, '');
  // digits like 8801717897845
  if (digits.length >= 13) {
    // strip country code 880, keep 01717897845
    const local = digits.slice(3); // 01717897845
    return `+0${local.slice(1, 5)}-${local.slice(5)}`;
  }
  if (digits.length >= 11) {
    const local = digits.slice(-11); // 01717897845
    return `+0${local.slice(1, 5)}-${local.slice(5)}`;
  }
  return raw;
}

export default function AccountDetailsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const params = useLocalSearchParams<{
    name?: string;
    bvcNumber?: string;
    phone?: string;
  }>();

  const doctorName = params.name || t('accountDetails.defaults.doctor');
  const bvcNumber = params.bvcNumber || '';
  const phoneDisplay = params.phone ? formatPhone(params.phone) : '';

  const steps = [
    { labelKey: 'accountDetails.steps.submitApplication', completed: true },
    { labelKey: 'accountDetails.steps.verification', completed: false },
    { labelKey: 'accountDetails.steps.created', completed: false },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>
        {/* GOBAADI Logo */}
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.logo}
          contentFit="contain"
        />

        {/* Account Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('accountDetails.title')}</Text>

          <Text style={styles.doctorName}>{t('accountDetails.doctorName', { name: doctorName })}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('accountDetails.bvcLabel')}</Text>
            <Text style={styles.detailValue}>{bvcNumber}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('accountDetails.phoneLabel')}</Text>
            <Text style={styles.detailValue}>{phoneDisplay}</Text>
          </View>

          {/* Application Status */}
          <Text style={styles.statusTitle}>{t('accountDetails.statusTitle')}</Text>

          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <Text style={[styles.stepLabel, step.completed && styles.stepLabelCompleted]}>
                {t(step.labelKey)}
              </Text>
              {step.completed ? (
                <View style={styles.checkCircle}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
              ) : (
                <View style={styles.pendingCircle} />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Close Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            if (!user) {
              router.replace('/login');
            } else if (user.role === 'doctor') {
              router.replace('/(tabs)/doctor-home');
            } else {
              router.replace('/(tabs)');
            }
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.closeButtonText}>{t('accountDetails.close')}</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 20,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: '#9C9690',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#1A1817',
    fontWeight: '600',
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#BD632F',
    marginTop: 20,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepLabel: {
    fontSize: 13,
    color: '#9C9690',
    fontWeight: '500',
  },
  stepLabelCompleted: {
    color: '#1A1817',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pendingCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#E6E1DC',
    backgroundColor: '#FFFFFF',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  closeButton: {
    backgroundColor: '#BD632F',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
