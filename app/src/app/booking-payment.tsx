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

export default function BookingPaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();

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

        <Text style={styles.headerTitle}>{t('bookingPayment.title')}</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>{t('bookingPayment.sectionTitle')}</Text>

        {/* bKash select block */}
        <TouchableOpacity
          style={styles.paymentMethodCard}
          onPress={() => router.push({ pathname: '/booking-bkash-number', params })}
          activeOpacity={0.9}
        >
          <View style={styles.bkashRow}>
            {/* Mock bKash logo */}
            <View style={styles.bkashLogoContainer}>
              <Text style={styles.bkashLogoText}>b</Text>
            </View>
            <Text style={styles.paymentMethodName}>{t('bookingPayment.bkash')}</Text>
          </View>
          {/* Custom Check Icon */}
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => router.push({ pathname: '/booking-bkash-number', params })}
          activeOpacity={0.85}
        >
          <Text style={styles.payIcon}>🎟️</Text>
          <Text style={styles.payText}>{t('bookingPayment.payNow')}</Text>
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
    marginBottom: 24,
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 16,
  },
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#BD632F',
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bkashRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bkashLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#D12053',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bkashLogoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  payButton: {
    flexDirection: 'row',
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
  },
  payText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
