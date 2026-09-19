import React, { useState, useEffect } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVerifyPaymentMethodOtpMutation } from '@/store/paymentMethodsApi';

type OtpStep = 'input' | 'success';

export default function OtpVerificationScreen() {
  const router = useRouter();
  const { paymentMethodId, phone, provider } = useLocalSearchParams<{
    paymentMethodId: string;
    phone: string;
    provider: string;
  }>();
  const isDoctor = useRequireDoctor();
  const [step, setStep] = useState<OtpStep>('input');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(23);
  const [activeIndex, setActiveIndex] = useState(0);

  const [verifyOtp, { isLoading: isVerifying }] = useVerifyPaymentMethodOtpMutation();

  useEffect(() => {
    if (step !== 'input') return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  if (!isDoctor) return null;

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) text = text.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 3) {
      setActiveIndex(index + 1);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      setActiveIndex(index - 1);
    }
  };

  const handleVerify = async () => {
    if (!paymentMethodId) {
      Alert.alert('Error', 'Payment method ID not found');
      return;
    }

    try {
      await verifyOtp({
        id: parseInt(paymentMethodId, 10),
        code: otp.join(''),
      }).unwrap();
      setStep('success');
    } catch {
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    }
  };

  if (step === 'success') {
    const maskedPhone = phone ? phone.replace(/(\d{2})\d+(\d{2})/, '$1•••••$2') : '••••••••';
    const providerName = provider || 'Payment Method';
    const providerInitial = providerName.charAt(0).toLowerCase();
    const providerColors: Record<string, string> = {
      bKash: '#E53935',
      Nagad: '#FF9800',
      Upay: '#4CAF50',
    };
    const providerColor = providerColors[providerName] || '#BD632F';

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.successContent} showsVerticalScrollIndicator={false}>
          <View style={styles.successCheckCircle}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>

          <View style={styles.successBadge}>
            <Text style={styles.successBadgeText}>{providerName} Linked Successfully</Text>
          </View>

          <Text style={styles.successTitle}>Account Linked!</Text>
          <Text style={styles.successDesc}>
            Your {providerName} account ending in {maskedPhone.replace(/.*•+/, '')} has been successfully linked. You can now use it for rides and payments.
          </Text>

          <View style={styles.linkedCard}>
            <View style={styles.linkedLeft}>
              <View style={[styles.linkedIcon, { backgroundColor: providerColor }]}>
                <Text style={styles.linkedIconText}>{providerInitial}</Text>
              </View>
              <View>
                <Text style={styles.linkedType}>{providerName}</Text>
                <Text style={styles.linkedDetail}>{maskedPhone} · Verified</Text>
              </View>
            </View>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          </View>

          <TouchableOpacity
            style={styles.addAnotherBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/add-payment-method')}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addAnotherBtnText}>Add another method</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OTP Verifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationBg}>
            <View style={styles.phoneIllustration}>
              <Ionicons name="shield-checkmark" size={40} color="#BD632F" />
              <Text style={styles.illustrationTitle}>Verification</Text>
              <Text style={styles.illustrationSubtitle}>Your code is</Text>
              <View style={styles.dotsRow}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <View key={i} style={styles.dot} />
                ))}
              </View>
            </View>
            <Ionicons name="chatbubble" size={20} color="#FF9800" style={styles.bubbleIcon} />
            <Ionicons name="lock-closed" size={20} color="#FF9800" style={styles.lockIcon} />
          </View>
        </View>

        <Text style={styles.instructionText}>
          Enter the verification code we just sent on your phone number
        </Text>

        {/* OTP Input */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              style={[styles.otpBox, activeIndex === index && styles.otpBoxActive]}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={activeIndex === index}
              textAlign="center"
            />
          ))}
        </View>

        {/* Resend */}
        <Text style={styles.resendQuestion}>Didn't receive an OTP?</Text>
        {timer > 0 ? (
          <Text style={styles.timerText}>Resend OTP in {timer}s</Text>
        ) : (
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
        )}

        {/* Verify */}
        <TouchableOpacity
          style={[styles.verifyBtn, (otp.some((d) => !d) || isVerifying) && styles.verifyBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleVerify}
          disabled={otp.some((d) => !d) || isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyBtnText}>Verify</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },

  // Illustration
  illustrationContainer: { alignItems: 'center', marginVertical: 24 },
  illustrationBg: { width: 200, height: 180, backgroundColor: '#FFF2EB', borderRadius: 24, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  phoneIllustration: { alignItems: 'center', gap: 4 },
  illustrationTitle: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  illustrationSubtitle: { fontSize: 11, fontWeight: '500', color: '#7C7672' },
  dotsRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#BD632F' },
  bubbleIcon: { position: 'absolute', top: 20, right: 20 },
  lockIcon: { position: 'absolute', bottom: 30, right: 30 },

  instructionText: { fontSize: 14, fontWeight: '600', color: '#BD632F', textAlign: 'center', marginBottom: 24 },

  // OTP Input
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  otpBox: { width: 56, height: 56, borderRadius: 14, borderWidth: 2, borderColor: '#E6E1DC', backgroundColor: '#FFFFFF', fontSize: 22, fontWeight: '700', color: '#1A1817' },
  otpBoxActive: { borderColor: '#BD632F' },

  resendQuestion: { fontSize: 14, fontWeight: '600', color: '#7C7672', textAlign: 'center', marginBottom: 8 },
  timerText: { fontSize: 13, fontWeight: '500', color: '#7C7672', textAlign: 'center', marginBottom: 24 },
  resendText: { fontSize: 13, fontWeight: '700', color: '#BD632F', textAlign: 'center', marginBottom: 24, textDecorationLine: 'underline' },

  verifyBtn: { backgroundColor: '#BD632F', borderRadius: 26, paddingVertical: 16, alignItems: 'center' },
  verifyBtnDisabled: { backgroundColor: '#E6E1DC' },
  verifyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Success
  successContent: { paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' },
  successCheckCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginTop: 40, marginBottom: 16 },
  successBadge: { backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16 },
  successBadgeText: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817', marginBottom: 8 },
  successDesc: { fontSize: 13, fontWeight: '500', color: '#7C7672', textAlign: 'center', lineHeight: 19, marginBottom: 24 },
  linkedCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, width: '100%', marginBottom: 24 },
  linkedLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkedIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  linkedIconText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  linkedType: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  linkedDetail: { fontSize: 11, fontWeight: '500', color: '#9C9690' },
  addAnotherBtn: { flexDirection: 'row', backgroundColor: '#BD632F', borderRadius: 26, paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', gap: 6 },
  addAnotherBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
