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
import { Image } from 'expo-image';
import { RegistrationBackground } from '@/components/registration-background';

export default function DoctorRegistrationSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    bvcNumber?: string;
    phone?: string;
  }>();

  return (
    <SafeAreaView style={styles.container}>
      <RegistrationBackground />
      {/* Main Content */}
      <View style={styles.content}>
        {/* GOBAADI Logo */}
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.logo}
          contentFit="contain"
        />

        {/* Large green success circle badge */}
        <View style={styles.successOuterCircle}>
          <View style={styles.successInnerCircle}>
            <Text style={styles.checkmarkIcon}>✓</Text>
          </View>
        </View>

        <Text style={styles.successTitle}>{t('doctorRegistrationSuccess.successTitle')}</Text>

        <Text style={styles.successSubtitle}>
          {t('doctorRegistrationSuccess.successSubtitle')}
        </Text>
      </View>

      {/* Action Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() =>
            router.replace({
              pathname: '/account-details',
              params: {
                name: params.name,
                bvcNumber: params.bvcNumber,
                phone: params.phone,
              },
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>{t('doctorRegistrationSuccess.checkStatus')}</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 32,
  },
  successOuterCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  successInnerCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkIcon: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#7C7672',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  continueButton: {
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
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
