import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreatePaymentMethodMutation } from '@/store/paymentMethodsApi';

type Step = 'select' | 'mobile_banking' | 'debit_card' | 'credit_card' | 'bank_account';

interface PaymentOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'mobile', title: 'Mobile Banking', subtitle: 'Bkash, Nagad, Rocket & more', icon: 'phone-portrait-outline' },
  { id: 'debit', title: 'Debit Card', subtitle: 'Visa, Mastercard linked to your bank account', icon: 'card-outline' },
  { id: 'credit', title: 'Credit Card', subtitle: 'Pay with any credit card', icon: 'card-outline' },
  { id: 'bank', title: 'Bank Account', subtitle: 'Direct debit from your account', icon: 'business-outline' },
];

interface Provider {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

const PROVIDERS: Provider[] = [
  { id: 'bkash', name: 'bKash', icon: 'b', iconBg: '#E53935', iconColor: '#FFFFFF' },
  { id: 'nagad', name: 'Nagad', icon: 'n', iconBg: '#FF9800', iconColor: '#FFFFFF' },
  { id: 'upay', name: 'Upay', icon: 'u', iconBg: '#4CAF50', iconColor: '#FFFFFF' },
  { id: 'more', name: 'More', icon: '+', iconBg: '#F5F2EC', iconColor: '#7C7672' },
];

export default function AddPaymentMethodScreen() {
  const router = useRouter();
  const isDoctor = useRequireDoctor();
  const [step, setStep] = useState<Step>('select');
  const [selectedProvider, setSelectedProvider] = useState('bkash');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);

  // Bank account form state
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [bankName, setBankName] = useState('');

  const [createPaymentMethod, { isLoading }] = useCreatePaymentMethodMutation();

  if (!isDoctor) return null;

  const handleContinue = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    const providerName = PROVIDERS.find((p) => p.id === selectedProvider)?.name || selectedProvider;

    try {
      const result = await createPaymentMethod({
        type: 'mobile_banking',
        provider: providerName,
        maskedNumber: phoneNumber.replace(/(\d{2})\d+(\d{2})/, '$1•••••$2'),
      }).unwrap();

      router.push({
        pathname: '/otp-verification',
        params: {
          paymentMethodId: result.id.toString(),
          phone: phoneNumber,
          provider: providerName,
        },
      });
    } catch {
      Alert.alert('Error', 'Failed to add payment method');
    }
  };

  const handleCardSubmit = async (cardType: 'debit' | 'credit') => {
    if (!cardNumber.trim() || !cardHolder.trim() || !expiryDate.trim() || !cvv.trim()) {
      Alert.alert('Error', 'Please fill in all card details');
      return;
    }

    const maskedCard = cardNumber.replace(/\d(?=\d{4})/g, '•');
    const providerName = cardType === 'debit' ? 'Visa' : 'Mastercard';

    try {
      await createPaymentMethod({
        type: 'card',
        provider: providerName,
        maskedNumber: maskedCard,
      }).unwrap();

      Alert.alert('Success', `${cardType === 'debit' ? 'Debit' : 'Credit'} card added successfully`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to add card');
    }
  };

  const handleBankAccountSubmit = async () => {
    if (!accountNumber.trim() || !routingNumber.trim() || !bankName.trim()) {
      Alert.alert('Error', 'Please fill in all bank account details');
      return;
    }

    const maskedAccount = accountNumber.replace(/\d(?=\d{4})/g, '•');

    try {
      await createPaymentMethod({
        type: 'cash',
        provider: bankName,
        maskedNumber: maskedAccount,
      }).unwrap();

      Alert.alert('Success', 'Bank account added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to add bank account');
    }
  };

  if (step === 'mobile_banking') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('select')} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Payment Method</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.providerRow}>
            {PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.providerItem, selectedProvider === p.id && styles.providerItemActive]}
                onPress={() => setSelectedProvider(p.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.providerIcon, { backgroundColor: p.iconBg }]}>
                  <Text style={[styles.providerIconText, { color: p.iconColor }]}>{p.icon}</Text>
                </View>
                <Text style={[styles.providerName, selectedProvider === p.id && styles.providerNameActive]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.flagText}>🇧🇩</Text>
              <Text style={styles.codeText}>+88</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="Phone number"
              placeholderTextColor="#A39E99"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>

          <Text style={styles.fieldLabel}>Pin Number</Text>
          <View style={styles.pinRow}>
            <TextInput
              style={styles.pinInput}
              placeholder="Enter PIN"
              placeholderTextColor="#A39E99"
              secureTextEntry={!showPin}
              value={pin}
              onChangeText={setPin}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPin(!showPin)} activeOpacity={0.7}>
              <Ionicons name={showPin ? 'eye-outline' : 'eye-off-outline'} size={18} color="#9C9690" />
            </TouchableOpacity>
          </View>

          <View style={styles.securityNotice}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#BD632F" />
            <Text style={styles.securityText}>
              We only link your account — we never store your PIN or password.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, isLoading && styles.continueBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>Continue</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'debit_card' || step === 'credit_card') {
    const isDebit = step === 'debit_card';
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('select')} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add {isDebit ? 'Debit' : 'Credit'} Card</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Card Number</Text>
          <TextInput
            style={styles.textInput}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor="#A39E99"
            keyboardType="numeric"
            value={cardNumber}
            onChangeText={(text) => setCardNumber(text.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim())}
            maxLength={19}
          />

          <Text style={styles.fieldLabel}>Card Holder Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="John Doe"
            placeholderTextColor="#A39E99"
            value={cardHolder}
            onChangeText={setCardHolder}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Expiry Date</Text>
              <TextInput
                style={styles.textInput}
                placeholder="MM/YY"
                placeholderTextColor="#A39E99"
                keyboardType="numeric"
                value={expiryDate}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '');
                  if (cleaned.length >= 2) {
                    setExpiryDate(cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4));
                  } else {
                    setExpiryDate(cleaned);
                  }
                }}
                maxLength={5}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>CVV</Text>
              <View style={styles.pinRow}>
                <TextInput
                  style={styles.pinInput}
                  placeholder="•••"
                  placeholderTextColor="#A39E99"
                  secureTextEntry={!showCvv}
                  keyboardType="numeric"
                  value={cvv}
                  onChangeText={setCvv}
                  maxLength={4}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCvv(!showCvv)} activeOpacity={0.7}>
                  <Ionicons name={showCvv ? 'eye-outline' : 'eye-off-outline'} size={18} color="#9C9690" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.securityNotice}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#BD632F" />
            <Text style={styles.securityText}>
              Your card information is encrypted and secure. We never store your full card number.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, isLoading && styles.continueBtnDisabled]}
            activeOpacity={0.85}
            onPress={() => handleCardSubmit(isDebit ? 'debit' : 'credit')}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>Add Card</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'bank_account') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('select')} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Bank Account</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Bank Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Dutch-Bangla Bank"
            placeholderTextColor="#A39E99"
            value={bankName}
            onChangeText={setBankName}
          />

          <Text style={styles.fieldLabel}>Account Number</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter account number"
            placeholderTextColor="#A39E99"
            keyboardType="numeric"
            value={accountNumber}
            onChangeText={setAccountNumber}
          />

          <Text style={styles.fieldLabel}>Routing Number</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter routing number"
            placeholderTextColor="#A39E99"
            keyboardType="numeric"
            value={routingNumber}
            onChangeText={setRoutingNumber}
          />

          <View style={styles.securityNotice}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#BD632F" />
            <Text style={styles.securityText}>
              Your bank account information is encrypted and secure. We use industry-standard security protocols.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, isLoading && styles.continueBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleBankAccountSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>Add Bank Account</Text>
            )}
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
        <Text style={styles.headerTitle}>Add Payment Method</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {PAYMENT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.optionCard}
            onPress={() => {
              if (option.id === 'mobile') setStep('mobile_banking');
              else if (option.id === 'debit') setStep('debit_card');
              else if (option.id === 'credit') setStep('credit_card');
              else if (option.id === 'bank') setStep('bank_account');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <Ionicons name={option.icon as any} size={22} color="#BD632F" />
              </View>
              <View>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9C9690" />
          </TouchableOpacity>
        ))}

        <View style={styles.securityNoticeBottom}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#BD632F" />
          <Text style={styles.securityText}>
            Your payment information is protected with 256-bit SSL encryption and PCI DSS compliance.
          </Text>
        </View>
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
  optionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6E1DC', padding: 16, marginBottom: 10 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  optionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center' },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1817' },
  optionSubtitle: { fontSize: 12, fontWeight: '500', color: '#7C7672', marginTop: 2 },
  securityNoticeBottom: { flexDirection: 'row', gap: 8, marginTop: 16 },
  securityText: { flex: 1, fontSize: 12, fontWeight: '500', color: '#BD632F', lineHeight: 17 },
  providerRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  providerItem: { alignItems: 'center', gap: 4, flex: 1 },
  providerItemActive: {},
  providerIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  providerIconText: { fontSize: 20, fontWeight: '800' },
  providerName: { fontSize: 11, fontWeight: '600', color: '#9C9690' },
  providerNameActive: { color: '#1A1817' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#1A1817', marginBottom: 8 },
  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  countryCode: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 12, height: 48, gap: 4 },
  flagText: { fontSize: 16 },
  codeText: { fontSize: 14, fontWeight: '600', color: '#1A1817' },
  phoneInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 14, fontSize: 14, color: '#1A1817', height: 48 },
  pinRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 14, height: 48, marginBottom: 16 },
  pinInput: { flex: 1, fontSize: 14, color: '#1A1817', height: '100%' },
  eyeBtn: { padding: 4 },
  securityNotice: { flexDirection: 'row', gap: 8, backgroundColor: '#FFF2EB', borderRadius: 12, padding: 12, marginBottom: 24 },
  continueBtn: { backgroundColor: '#BD632F', borderRadius: 26, paddingVertical: 16, alignItems: 'center' },
  continueBtnDisabled: { opacity: 0.6 },
  continueBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  textInput: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 14, fontSize: 14, color: '#1A1817', height: 48, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
});
