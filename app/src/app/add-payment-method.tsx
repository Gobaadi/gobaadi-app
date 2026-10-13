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
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreatePaymentMethodMutation } from '@/store/paymentMethodsApi';
import { useTranslation } from '@/hooks/use-translation';

type Step = 'select' | 'mobile_banking' | 'debit_card' | 'credit_card' | 'bank_account';

interface PaymentOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'mobile', title: 'addPayment.options.mobile.title', subtitle: 'addPayment.options.mobile.subtitle', icon: 'phone-portrait-outline' },
  { id: 'debit', title: 'addPayment.options.debit.title', subtitle: 'addPayment.options.debit.subtitle', icon: 'card-outline' },
  { id: 'credit', title: 'addPayment.options.credit.title', subtitle: 'addPayment.options.credit.subtitle', icon: 'card-outline' },
  { id: 'bank', title: 'addPayment.options.bank.title', subtitle: 'addPayment.options.bank.subtitle', icon: 'business-outline' },
];

interface Provider {
  id: string;
  name: string;
  labelKey?: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

const PROVIDERS: Provider[] = [
  { id: 'bkash', name: 'bKash', icon: 'b', iconBg: '#E53935', iconColor: '#FFFFFF' },
  { id: 'nagad', name: 'Nagad', icon: 'n', iconBg: '#FF9800', iconColor: '#FFFFFF' },
  { id: 'upay', name: 'Upay', icon: 'u', iconBg: '#4CAF50', iconColor: '#FFFFFF' },
  { id: 'more', name: 'More', labelKey: 'addPayment.providers.more', icon: '+', iconBg: '#F5F2EC', iconColor: '#7C7672' },
];

export default function AddPaymentMethodScreen() {
  const { t } = useTranslation();
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
      Alert.alert(t('addPayment.alerts.error'), t('addPayment.alerts.enterPhone'));
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
      Alert.alert(t('addPayment.alerts.error'), t('addPayment.alerts.methodFailed'));
    }
  };

  const handleCardSubmit = async (cardType: 'debit' | 'credit') => {
    if (!cardNumber.trim() || !cardHolder.trim() || !expiryDate.trim() || !cvv.trim()) {
      Alert.alert(t('addPayment.alerts.error'), t('addPayment.alerts.fillCard'));
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

      Alert.alert(
        t('addPayment.alerts.success'),
        cardType === 'debit' ? t('addPayment.alerts.cardAddedDebit') : t('addPayment.alerts.cardAddedCredit'),
        [{ text: t('addPayment.alerts.ok'), onPress: () => router.back() }],
      );
    } catch {
      Alert.alert(t('addPayment.alerts.error'), t('addPayment.alerts.cardFailed'));
    }
  };

  const handleBankAccountSubmit = async () => {
    if (!accountNumber.trim() || !routingNumber.trim() || !bankName.trim()) {
      Alert.alert(t('addPayment.alerts.error'), t('addPayment.alerts.fillBank'));
      return;
    }

    const maskedAccount = accountNumber.replace(/\d(?=\d{4})/g, '•');

    try {
      await createPaymentMethod({
        type: 'cash',
        provider: bankName,
        maskedNumber: maskedAccount,
      }).unwrap();

      Alert.alert(t('addPayment.alerts.success'), t('addPayment.alerts.bankAdded'), [
        { text: t('addPayment.alerts.ok'), onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t('addPayment.alerts.error'), t('addPayment.alerts.bankFailed'));
    }
  };

  if (step === 'mobile_banking') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('select')} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('addPayment.header')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                  {p.labelKey ? t(p.labelKey) : p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>{t('addPayment.phoneLabel')}</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.flagText}>🇧🇩</Text>
              <Text style={styles.codeText}>+88</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder={t('addPayment.phonePlaceholder')}
              placeholderTextColor="#A39E99"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>

          <Text style={styles.fieldLabel}>{t('addPayment.pinLabel')}</Text>
          <View style={styles.pinRow}>
            <TextInput
              style={styles.pinInput}
              placeholder={t('addPayment.pinPlaceholder')}
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
              {t('addPayment.security.pin')}
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
              <Text style={styles.continueBtnText}>{t('addPayment.continue')}</Text>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
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
          <Text style={styles.headerTitle}>
            {isDebit ? t('addPayment.addDebitCard') : t('addPayment.addCreditCard')}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>{t('addPayment.cardNumberLabel')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor="#A39E99"
            keyboardType="numeric"
            value={cardNumber}
            onChangeText={(text) => setCardNumber(text.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim())}
            maxLength={19}
          />

          <Text style={styles.fieldLabel}>{t('addPayment.cardHolderLabel')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('addPayment.cardHolderPlaceholder')}
            placeholderTextColor="#A39E99"
            value={cardHolder}
            onChangeText={setCardHolder}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>{t('addPayment.expiryLabel')}</Text>
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
              <Text style={styles.fieldLabel}>{t('addPayment.cvvLabel')}</Text>
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
              {t('addPayment.security.card')}
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
              <Text style={styles.continueBtnText}>{t('addPayment.addCard')}</Text>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
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
          <Text style={styles.headerTitle}>{t('addPayment.addBankAccount')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>{t('addPayment.bankNameLabel')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('addPayment.bankNamePlaceholder')}
            placeholderTextColor="#A39E99"
            value={bankName}
            onChangeText={setBankName}
          />

          <Text style={styles.fieldLabel}>{t('addPayment.accountNumberLabel')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('addPayment.accountNumberPlaceholder')}
            placeholderTextColor="#A39E99"
            keyboardType="numeric"
            value={accountNumber}
            onChangeText={setAccountNumber}
          />

          <Text style={styles.fieldLabel}>{t('addPayment.routingLabel')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('addPayment.routingPlaceholder')}
            placeholderTextColor="#A39E99"
            keyboardType="numeric"
            value={routingNumber}
            onChangeText={setRoutingNumber}
          />

          <View style={styles.securityNotice}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#BD632F" />
            <Text style={styles.securityText}>
              {t('addPayment.security.bank')}
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
              <Text style={styles.continueBtnText}>{t('addPayment.addBankAccount')}</Text>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('addPayment.header')}</Text>
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
                <Text style={styles.optionTitle}>{t(option.title)}</Text>
                <Text style={styles.optionSubtitle}>{t(option.subtitle)}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9C9690" />
          </TouchableOpacity>
        ))}

        <View style={styles.securityNoticeBottom}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#BD632F" />
          <Text style={styles.securityText}>
            {t('addPayment.security.payment')}
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
