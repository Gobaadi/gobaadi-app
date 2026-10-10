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

export default function OrderSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View />
        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Large green success circle badge */}
        <View style={styles.successOuterCircle}>
          <View style={styles.successInnerCircle}>
            <Text style={styles.checkmarkIcon}>✓</Text>
          </View>
        </View>

        <Text style={styles.successTitle}>{t('orderSuccess.successTitle')}</Text>
        
        <Text style={styles.successSubtitle}>
          {t('orderSuccess.successSubtitle')}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.detailButton}
          onPress={() => router.push({ pathname: '/animal-billing-details', params: { orderId } })}
          activeOpacity={0.85}
        >
          <Text style={styles.detailButtonIcon}>📄</Text>
          <Text style={styles.detailButtonText}>{t('orderSuccess.detailBill')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/market')}
          activeOpacity={0.85}
        >
          <Text style={styles.backButtonText}>{t('orderSuccess.back')}</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#7C7672',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  detailButton: {
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
  detailButtonIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    marginRight: 8,
  },
  detailButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#BD632F',
    fontSize: 16,
    fontWeight: '700',
  },
});
