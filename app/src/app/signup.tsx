import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useRegisterMutation } from '@/store/authApi';
import { useSocialAuth } from '@/hooks/use-social-auth';
import { apiErrorMessage } from '@/utils/api-error';
import { isValidEmailSyntax, isAllowedEmail } from '@/utils/email';
import { useTranslation } from '@/hooks/use-translation';
import { RegistrationBackground } from '@/components/registration-background';
import { PasswordRequirements } from '@/components/password-requirements';
import { getUnmetPasswordRules, PASSWORD_RULE_I18N_KEYS } from '@/utils/password';

const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

export default function SignUpScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'doctor' | 'farmer' | ''>('');
  const [bvcNumber, setBvcNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  // Dropdown Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    options: string[];
    onSelect: (val: string) => void;
  }>({ title: '', options: [], onSelect: () => { } });

  const [register, { isLoading }] = useRegisterMutation();
  const { withGoogle, withFacebook, isLoading: isSocialLoading, error: socialError } = useSocialAuth(
    () => router.replace('/(tabs)'),
  );

  const openRoleDropdown = () => {
    setModalData({
      title: t('signup.roleSelect'),
      options: ['doctor', 'farmer'],
      onSelect: (val) => setRole(val === 'doctor' ? 'doctor' : 'farmer'),
    });
    setModalVisible(true);
  };

  const handleSignUp = async () => {
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage(t('signup.errors.nameRequired'));
      return;
    }

    let identifier = '';

    if (authMethod === 'phone') {
      if (!phone.trim()) {
        setErrorMessage(t('signup.errors.phoneRequired'));
        return;
      }
      if (!BD_PHONE_REGEX.test(phone)) {
        setErrorMessage(t('signup.errors.invalidPhone'));
        return;
      }
      identifier = `+880${phone.trim()}`;
    } else {
      const emailValue = email.trim();
      if (!emailValue) {
        setErrorMessage(t('signup.errors.emailRequired'));
        return;
      }
      if (!isValidEmailSyntax(emailValue)) {
        setErrorMessage(t('signup.errors.invalidEmail'));
        return;
      }
      if (!isAllowedEmail(emailValue)) {
        setErrorMessage(t('signup.errors.emailNotAllowed'));
        return;
      }
      identifier = emailValue;
    }

    if (!agreedToTerms) {
      setErrorMessage(t('signup.errors.termsRequired'));
      return;
    }

    if (!role) {
      setErrorMessage(t('signup.errors.roleRequired'));
      return;
    }
    if (role === 'doctor') {
      if (!bvcNumber.trim()) {
        setErrorMessage(t('signup.errors.bvcRequired'));
        return;
      }
    } else {
      if (!password) {
        setErrorMessage(t('signup.errors.passwordRequired'));
        return;
      }
      const unmetRules = getUnmetPasswordRules(password);
      if (unmetRules.length > 0) {
        setErrorMessage(
          `${t('passwordRules.notMet')} ${unmetRules
            .map((rule) => t(PASSWORD_RULE_I18N_KEYS[rule]))
            .join(', ')}`,
        );
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage(t('signup.errors.passwordMismatch'));
        return;
      }
    }

    if (role === 'doctor') {
      router.push({
        pathname: '/password-setup',
        params: {
          name: name.trim(),
          identifier,
          role,
          bvcNumber: bvcNumber.trim(),
        },
      });
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        identifier,
        password,
        role: 'user',
        bvcRegistrationNumber: undefined,
      };
      console.log('[1/8][FE signup.tsx] Register submit →', payload);
      await register(payload).unwrap();
      console.log('[1/8][FE signup.tsx] Register API success → navigating to /otp');
      router.push({ pathname: '/otp', params: { phone: identifier, purpose: 'verify', role: role || 'user' } });
    } catch (err: any) {
      console.log('[1/8][FE signup.tsx] Register API FAILED →', err?.data ?? err?.message ?? err);
      setErrorMessage(apiErrorMessage(err, t('signup.errors.createFailed')));
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <RegistrationBackground />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Section */}
        <View>
          <Image
            source={require('@/assets/images/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Heading */}
        <Text style={styles.title}>{t('signup.title')}</Text>

        {/* Toggle Phone/Email */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, authMethod === 'phone' && styles.toggleButtonActive]}
            onPress={() => setAuthMethod('phone')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, authMethod === 'phone' && styles.toggleTextActive]}>{t('common.identifierTabs.phone')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, authMethod === 'email' && styles.toggleButtonActive]}
            onPress={() => setAuthMethod('email')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, authMethod === 'email' && styles.toggleTextActive]}>{t('common.identifierTabs.email')}</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('signup.nameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('signup.namePlaceholder')}
              placeholderTextColor="#A39E99"
            />
          </View>

          {/* Phone Number or Email */}
          {authMethod === 'phone' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('signup.phoneLabel')}</Text>
              <View style={styles.phoneInputContainer}>
                <TouchableOpacity style={styles.countryCodeSelector} activeOpacity={0.7}>
                  <Text style={styles.flagEmoji}>🇧🇩</Text>
                  <Text style={styles.countryCode}>+88</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                <View style={styles.phoneDivider} />
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t('signup.phonePlaceholder')}
                  placeholderTextColor="#A39E99"
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('signup.emailLabel')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('signup.emailPlaceholder')}
                placeholderTextColor="#A39E99"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Role */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('signup.roleLabel')}</Text>
            <TouchableOpacity style={styles.dropdownSelector} activeOpacity={0.7} onPress={openRoleDropdown}>
              <Text style={[styles.dropdownValue, !role && styles.placeholderText]}>
                {role === 'doctor' ? t('signup.roleDoctor') : role === 'farmer' ? t('signup.roleFarmer') : t('signup.roleSelect')}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Password Fields - Only for Users */}
          {role !== 'doctor' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('signup.passwordLabel')}</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••••••"
                    placeholderTextColor="#A39E99"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} activeOpacity={0.7}>
                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#A39E99" />
                  </TouchableOpacity>
                </View>
                <PasswordRequirements value={password} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('signup.confirmLabel')}</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••••••"
                    placeholderTextColor="#A39E99"
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon} activeOpacity={0.7}>
                    <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#A39E99" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* BVC Registration Number - Only for Doctors */}
          {role === 'doctor' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('signup.bvcLabel')}</Text>
              <TextInput
                style={styles.input}
                value={bvcNumber}
                onChangeText={setBvcNumber}
                placeholder={t('signup.bvcPlaceholder')}
                placeholderTextColor="#A39E99"
                keyboardType="number-pad"
              />
            </View>
          )}

          {/* Terms of Service */}
          <TouchableOpacity
            style={styles.termsRow}
            activeOpacity={0.7}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.termsText}>
              {t('signup.termsPrefix')}{' '}
              <Text
                style={styles.termsHighlight}
                onPress={() => router.push('/terms-of-service')}
              >
                {t('signup.termsLink')}
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Error message */}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {/* Continue/Sign Up Button */}
          <TouchableOpacity
            style={[styles.signUpButton, isLoading && styles.signUpButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signUpButtonText}>{role === 'doctor' ? t('signup.submitDoctor') : t('signup.submitUser')}</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('signup.divider')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social login error */}
          {socialError ? <Text style={styles.errorText}>{socialError}</Text> : null}

          {/* Social Logins */}
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              activeOpacity={0.7}
              onPress={withGoogle}
              disabled={isSocialLoading}
            >
              <Image
                source={require('@/assets/images/Google.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              activeOpacity={0.7}
              onPress={withFacebook}
              disabled={isSocialLoading}
            >
              <Image
                source={require('@/assets/images/selfhst_facebook.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              {t('signup.footerPrefix')}{' '}
              <Text style={styles.signInLink} onPress={() => router.push('/login')}>
                {t('signup.signIn')}
              </Text>
            </Text>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Role Selector Dropdown Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalData.title}</Text>
            <FlatList
              data={modalData.options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    modalData.onSelect(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item === 'doctor' ? t('signup.roleDoctor') : t('signup.roleFarmer')}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#BD632F',
    marginBottom: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E1DC',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  toggleButtonActive: {
    borderBottomColor: '#BD632F',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9C9690',
  },
  toggleTextActive: {
    color: '#BD632F',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1817',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1817',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 12,
    height: 52,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1817',
  },
  eyeIcon: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    height: '100%',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 12,
    height: 52,
  },
  countryCodeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
  },
  flagEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  countryCode: {
    fontSize: 16,
    color: '#1A1817',
    marginRight: 4,
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#7C7672',
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E6E1DC',
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1817',
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
  },
  dropdownValue: {
    fontSize: 16,
    color: '#1A1817',
  },
  placeholderText: {
    color: '#A39E99',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#A39E99',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  termsText: {
    fontSize: 13,
    color: '#9C9690',
    flex: 1,
  },
  termsHighlight: {
    color: '#BD632F',
    fontWeight: '600',
  },
  signUpButton: {
    backgroundColor: '#BD632F',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  signUpButtonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: '#E53935',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E6E1DC',
  },
  dividerText: {
    marginHorizontal: 6,
    color: '#9C9690',
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  footerContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9C9690',
  },
  signInLink: {
    color: '#BD632F',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF9F6',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1A1817',
    textAlign: 'center',
  },
});
