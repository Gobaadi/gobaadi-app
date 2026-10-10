import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';

import { useRegisterMutation } from '@/store/authApi';
import { PasswordField } from '@/components/password-field';

export default function PasswordSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    identifier?: string;
    role?: string;
    bvcNumber?: string;
  }>();
  
  const doctorName = params.name || t('passwordSetup.doctorFallback');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [registerApi, { isLoading }] = useRegisterMutation();

  const handleContinue = async () => {
    setErrorMessage('');

    if (!password) {
      setErrorMessage(t('passwordSetup.passwordRequired'));
      return;
    }
    if (password.length < 8) {
      setErrorMessage(t('passwordSetup.passwordLength'));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t('passwordSetup.passwordMismatch'));
      return;
    }

    try {
      const payload = {
        name: params.name || '',
        identifier: params.identifier || '',
        password,
        role: params.role || 'doctor',
        bvcRegistrationNumber: params.bvcNumber,
      };
      console.log('[1/8][FE password-setup.tsx] Doctor register submit →', payload);
      await registerApi(payload).unwrap();
      console.log('[1/8][FE password-setup.tsx] Register API success → navigating to /otp');
      router.push({
        pathname: '/otp',
        params: {
          phone: params.identifier,
          purpose: 'verify',
          role: 'doctor',
          name: params.name,
          bvcNumber: params.bvcNumber,
        }
      });
    } catch (err: any) {
      console.log('[1/8][FE password-setup.tsx] Register API FAILED →', err?.data ?? err?.message ?? err);
      setErrorMessage(err?.data?.message || t('passwordSetup.createAccountError'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
          {/* Logo */}
          <Image
            source={require('@/assets/images/splash-icon.png')}
            style={styles.logo}
            contentFit="contain"
          />

          {/* Welcome Text */}
          <Text style={styles.title}>{t('passwordSetup.welcome')}</Text>
          <Text style={styles.doctorName}>{doctorName}</Text>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('passwordSetup.passwordLabel')}</Text>
            <PasswordField value={password} onChangeText={setPassword} />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('passwordSetup.confirmLabel')}</Text>
            <PasswordField value={confirmPassword} onChangeText={setConfirmPassword} />
          </View>

          {/* Error message */}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleContinue}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>{t('passwordSetup.continue')}</Text>
            )}
          </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1817',
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#BD632F',
    marginBottom: 40,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1817',
    marginBottom: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  continueButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#BD632F',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
