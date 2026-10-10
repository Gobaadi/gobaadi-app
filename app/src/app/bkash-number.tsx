import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useCreatePaymentIntentMutation, useSimulateSuccessMutation } from '@/store/paymentsApi';

export default function BkashNumberScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [createPaymentIntent, { isLoading: isCreating }] = useCreatePaymentIntentMutation();
  const [simulateSuccess, { isLoading: isConfirming }] = useSimulateSuccessMutation();
  const isPaying = isCreating || isConfirming;

  const handlePay = async () => {
    if (!phoneNumber.trim()) return;
    try {
      const intent = await createPaymentIntent({ provider: 'bkash' }).unwrap();
      await simulateSuccess(intent.transactionId).unwrap();
    } catch (err) {
      console.log('Error confirming payment:', err);
    }
    router.push({ pathname: '/payment-success', params });
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
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('bkashNumber.title')}</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <Text style={styles.sectionTitle}>{t('bkashNumber.sectionTitle')}</Text>

        {/* Custom Input Wrapper */}
        <View style={styles.inputContainer}>
          {/* Country flag selector */}
          <TouchableOpacity style={styles.countrySelector} activeOpacity={0.7}>
            <Text style={styles.flagText}>🇧🇩</Text>
            <Text style={styles.countryCode}>+88</Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          <View style={styles.verticalDivider} />

          {/* Actual text field */}
          <TextInput
            style={styles.textInput}
            placeholder={t('bkashNumber.placeholder')}
            placeholderTextColor="#A39E99"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>
      </View>

      {/* Floating Bottom Pay Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.payButton, (!phoneNumber.trim() || isPaying) && { opacity: 0.6 }]}
          onPress={handlePay}
          disabled={!phoneNumber.trim() || isPaying}
          activeOpacity={0.85}
        >
          {isPaying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.payButtonIcon}>💵</Text>
              <Text style={styles.payButtonText}>{t('bkashNumber.payNow')}</Text>
            </>
          )}
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
    marginBottom: 32,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagText: {
    fontSize: 18,
    marginRight: 6,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1817',
    marginRight: 4,
  },
  dropdownArrow: {
    fontSize: 8,
    color: '#7C7672',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E6E1DC',
    marginHorizontal: 12,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
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
