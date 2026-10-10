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

export default function PaymentMethodScreen() {
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

        <Text style={styles.headerTitle}>{t('paymentMethod.title')}</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.mainContent}>
        <Text style={styles.sectionTitle}>{t('paymentMethod.sectionTitle')}</Text>

        {/* Selected bKash Card Option */}
        <TouchableOpacity style={styles.methodCardActive} activeOpacity={0.9}>
          <View style={styles.cardLeft}>
            {/* Custom bKash Logo Badge */}
            <View style={styles.bkashLogoBadge}>
              <Text style={styles.bkashLogoText}>b</Text>
            </View>
            <Text style={styles.methodName}>{t('paymentMethod.bkash')}</Text>
          </View>

          {/* Active Check Circle indicator */}
          <View style={styles.checkCircle}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Floating Bottom Pay Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.payButton}
          onPress={() =>
            router.push({
              pathname: '/bkash-number',
              params: params,
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.payButtonIcon}>💵</Text>
          <Text style={styles.payButtonText}>{t('paymentMethod.payNow')}</Text>
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
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 16,
  },
  methodCardActive: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8F4',
    borderWidth: 1.5,
    borderColor: '#BD632F',
    borderRadius: 20,
    padding: 16,
    height: 72,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bkashLogoBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E2136E', // bKash official brand color
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  bkashLogoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    lineHeight: 28,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
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
  payButton: {
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
  payButtonIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    marginRight: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
