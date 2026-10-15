import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useVerifyOtpMutation, useSendOtpMutation } from '@/store/authApi';
import { RegistrationBackground } from '@/components/registration-background';

export default function OTPScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const phone = String(params.phone || '+88 01712-345678');
  const otpHint = params.otpHint || '';
  const purpose = (params.purpose as 'login' | 'verify' | 'reset' | undefined) ?? 'verify';
  const role = (params.role as string) || '';

  const OTP_LENGTH = 4;
  const [otp, setOtp] = useState([otpHint ? otpHint[0] || '' : '', '', '', '']); // First prefilled with hint or '5' per mockup
  const [errorMessage, setErrorMessage] = useState('');
  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [sendOtp, { isLoading: isResending }] = useSendOtpMutation();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleOtpChange = (rawValue: string, index: number) => {
    const digits = rawValue.replace(/\D/g, '');

    if (digits.length > 1) {
      // A paste (or SMS autofill) delivers the whole code at once — distribute
      // it across boxes starting at whichever box received it.
      const newOtp = [...otp];
      let cursor = index;
      for (const digit of digits) {
        if (cursor >= OTP_LENGTH) break;
        newOtp[cursor] = digit;
        cursor += 1;
      }
      setOtp(newOtp);
      const nextEmptyIndex = newOtp.findIndex((d) => !d);
      const focusIndex = nextEmptyIndex === -1 ? OTP_LENGTH - 1 : nextEmptyIndex;
      inputRefs[focusIndex].current?.focus();
      if (nextEmptyIndex === -1) {
        inputRefs[OTP_LENGTH - 1].current?.blur();
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digits;
    setOtp(newOtp);

    // Auto-focus next input
    if (digits && index < OTP_LENGTH - 1) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    setErrorMessage('');

    try {
      console.log('[7/8][FE otp.tsx] Verify OTP submit →', { phone, code, purpose });
      const res = await verifyOtp({ phone, code, purpose }).unwrap();
      console.log('[7/8][FE otp.tsx] Verify OTP success ←', res);
      if (!res.verified) {
        setErrorMessage(res.message);
        return;
      }
      if (purpose === 'reset' && res.resetToken) {
        router.replace({ pathname: '/reset-password', params: { resetToken: res.resetToken } });
        return;
      }
      if (role === 'doctor') {
        router.replace({
          pathname: '/doctor-registration-success',
          params: {
            name: params.name,
            bvcNumber: params.bvcNumber,
            phone: phone,
          },
        });
        return;
      }
      router.replace('/congo');
    } catch (err: any) {
      console.log('[7/8][FE otp.tsx] Verify OTP FAILED ←', err?.data ?? err?.message ?? err);
      setErrorMessage(err?.data?.message || t('otp.verifyFailed'));
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setErrorMessage('');
    try {
      console.log('[7/8][FE otp.tsx] Resend OTP →', { phone, purpose });
      await sendOtp({ phone, purpose }).unwrap();
      console.log('[7/8][FE otp.tsx] Resend OTP success');
      setCooldown(30);
    } catch (err: any) {
      console.log('[7/8][FE otp.tsx] Resend OTP FAILED ←', err?.data ?? err?.message ?? err);
      setErrorMessage(err?.data?.message || t('otp.resendFailed'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <RegistrationBackground />
      {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
        </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
          {/* Title */}
          <Text style={styles.title}>{t('otp.title')}</Text>

          {/* Illustration */}
          <Image
            source={require('@/assets/images/gobadi-otp-verification-image.webp')}
            style={styles.illustration}
            resizeMode="contain"
          />

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {t('otp.subtitle', {
              target: phone.includes('@') ? t('otp.email') : t('otp.phoneNumber'),
            })}
          </Text>
          {phone && <Text style={styles.phoneNumber}>{phone}</Text>}

          {/* OTP Code Inputs */}
          <View style={styles.otpContainer}>
            {otp.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={inputRefs[idx]}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputActive : styles.otpInputInactive,
                ]}
                value={digit}
                onChangeText={(val) => handleOtpChange(val, idx)}
                onKeyPress={(e) => handleKeyPress(e, idx)}
                keyboardType="number-pad"
                // maxLength is intentionally OTP_LENGTH, not 1: RN truncates
                // pasted/autofilled text to maxLength before onChangeText ever
                // sees it, so a 1-char cap would silently eat a pasted code.
                // handleOtpChange does the real per-box single-digit capping.
                maxLength={OTP_LENGTH}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Resend text */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>{t('otp.didNotReceive')}</Text>
            <TouchableOpacity onPress={handleResend} activeOpacity={0.7} disabled={cooldown > 0 || isResending}>
              <Text style={[styles.resendLink, (cooldown > 0 || isResending) && styles.resendLinkDisabled]}>
                {cooldown > 0
                  ? t('otp.resendIn', { seconds: cooldown })
                  : isResending
                    ? t('otp.resending')
                    : t('otp.resend')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error message */}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </KeyboardAwareScrollView>

      {/* Verify Button - pinned near bottom of screen */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.verifyButton, isVerifying && styles.verifyButtonDisabled]}
          activeOpacity={0.8}
          onPress={handleVerify}
          disabled={isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>{t('otp.verify')}</Text>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 34,
    marginTop: -2,
  },
  scrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexGrow: 1,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#BD632F',
    marginTop: 10,
    marginBottom: 20,
  },
  illustration: {
    width: '100%',
    height: 220,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#BD632F',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 16,
    color: '#1A1817',
    fontWeight: '600',
    marginBottom: 24,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
    width: '100%',
  },
  otpInput: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1817',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  otpInputActive: {
    borderColor: '#BD632F',
  },
  otpInputInactive: {
    borderColor: '#E6E1DC',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#7C7672',
    marginBottom: 4,
  },
  resendLink: {
    fontSize: 14,
    color: '#BD632F',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  resendLinkDisabled: {
    color: '#9C9690',
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#BD632F',
    width: '100%',
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
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: '#E53935',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
});
