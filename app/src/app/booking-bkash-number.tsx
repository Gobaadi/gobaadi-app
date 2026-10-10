import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useCreatePaymentIntentMutation, useSimulateSuccessMutation } from '@/store/paymentsApi';

export default function BookingBkashNumberScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [createPaymentIntent, { isLoading: isCreating }] = useCreatePaymentIntentMutation();
  const [simulateSuccess, { isLoading: isConfirming }] = useSimulateSuccessMutation();
  const isPaying = isCreating || isConfirming;

  const handlePay = async () => {
    if (!phoneNumber.trim()) return;
    try {
      const intent = await createPaymentIntent({
        bookingId: id ? parseInt(id, 10) : undefined,
        provider: 'bkash',
      }).unwrap();
      await simulateSuccess(intent.transactionId).unwrap();
      router.replace('/order-success');
    } catch (err) {
      console.log('Error confirming booking payment:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('bookingBkashNumber.title')}</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <Text style={styles.buttonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>{t('bookingBkashNumber.sectionTitle')}</Text>

        {/* Input box */}
        <View style={styles.phoneInputRow}>
          {/* Bangladesh Flag & Code */}
          <View style={styles.flagCodeRow}>
            {/* Mock Bangladesh Flag using green/red circles or simple emoji */}
            <Text style={styles.flagEmoji}>🇧🇩</Text>
            <Text style={styles.countryCode}>+88</Text>
            <Text style={styles.codeDropdownArrow}>▼</Text>
          </View>
          
          <View style={styles.verticalDivider} />

          <TextInput
            style={styles.textInput}
            placeholder={t('bookingBkashNumber.placeholder')}
            placeholderTextColor="#A39E99"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>
      </View>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.payButton, (!phoneNumber.trim() || isPaying) && { opacity: 0.6 }]}
          disabled={!phoneNumber.trim() || isPaying}
          onPress={handlePay}
          activeOpacity={0.85}
        >
          {isPaying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.payIcon}>🎟️</Text>
              <Text style={styles.payText}>{t('bookingBkashNumber.payNow')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
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
    marginBottom: 28,
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
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
  },
  flagCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  flagEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 4,
  },
  codeDropdownArrow: {
    fontSize: 8,
    color: '#9C9690',
  },
  verticalDivider: {
    width: 1.5,
    height: 24,
    backgroundColor: '#FAF9F6',
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#1A1817',
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
