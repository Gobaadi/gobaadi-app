import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useRegisterMutation } from '@/store/authApi';
import { useSocialAuth } from '@/hooks/use-social-auth';
import { apiErrorMessage } from '@/utils/api-error';

const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

export default function SignUpScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'doctor' | 'user' | ''>('');
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
      title: 'Select your role',
      options: ['Doctor', 'User'],
      onSelect: (val) => setRole(val === 'Doctor' ? 'doctor' : 'user'),
    });
    setModalVisible(true);
  };

  const handleSignUp = async () => {
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Name is required.');
      return;
    }

    let identifier = '';

    if (authMethod === 'phone') {
      if (!phone.trim()) {
        setErrorMessage('Phone number is required.');
        return;
      }
      if (!BD_PHONE_REGEX.test(phone)) {
        setErrorMessage('Please enter a valid 11-digit Bangladeshi phone number (e.g., 01712345678).');
        return;
      }
      identifier = `+880${phone.trim()}`;
    } else {
      if (!email.trim()) {
        setErrorMessage('Email is required.');
        return;
      }
      if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      identifier = email.trim();
    }

    if (!agreedToTerms) {
      setErrorMessage('You must agree to the Terms of Service.');
      return;
    }

    if (!role) {
      setErrorMessage('Please select a role.');
      return;
    }
    if (role === 'doctor') {
      if (!bvcNumber.trim()) {
        setErrorMessage('BVC Registration Number is required for doctors.');
        return;
      }
    } else {
      if (!password) {
        setErrorMessage('Password is required.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
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
        role: role || 'user',
        bvcRegistrationNumber: undefined,
      };
      console.log('[1/8][FE signup.tsx] Register submit →', payload);
      await register(payload).unwrap();
      console.log('[1/8][FE signup.tsx] Register API success → navigating to /otp');
      router.push({ pathname: '/otp', params: { phone: identifier, purpose: 'verify', role: role || 'user' } });
    } catch (err: any) {
      console.log('[1/8][FE signup.tsx] Register API FAILED →', err?.data ?? err?.message ?? err);
      setErrorMessage(apiErrorMessage(err, 'Could not create account. Please try again.'));
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Logo Section */}
          <View>
            <Image
              source={require('@/assets/images/splash-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <Text style={styles.title}>Create Your Account</Text>

          {/* Toggle Phone/Email */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, authMethod === 'phone' && styles.toggleButtonActive]}
              onPress={() => setAuthMethod('phone')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, authMethod === 'phone' && styles.toggleTextActive]}>Phone Number</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, authMethod === 'email' && styles.toggleButtonActive]}
              onPress={() => setAuthMethod('email')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, authMethod === 'email' && styles.toggleTextActive]}>Email</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#A39E99"
              />
            </View>

            {/* Phone Number or Email */}
            {authMethod === 'phone' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number*</Text>
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
                    placeholder="Phone number"
                    placeholderTextColor="#A39E99"
                    keyboardType="phone-pad"
                    maxLength={11}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address*</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#A39E99"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Role */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role*</Text>
              <TouchableOpacity style={styles.dropdownSelector} activeOpacity={0.7} onPress={openRoleDropdown}>
                <Text style={[styles.dropdownValue, !role && styles.placeholderText]}>
                  {role === 'doctor' ? 'Doctor' : role === 'user' ? 'User' : 'Select your role'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Password Fields - Only for Users */}
            {role !== 'doctor' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password*</Text>
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
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password*</Text>
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
                <Text style={styles.label}>BVC Registration Number*</Text>
                <TextInput
                  style={styles.input}
                  value={bvcNumber}
                  onChangeText={setBvcNumber}
                  placeholder="Enter BVC registration number"
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
                By continuing, you agree to our{' '}
                <Text
                  style={styles.termsHighlight}
                  onPress={() => router.push('/terms-of-service')}
                >
                  terms of services
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
                <Text style={styles.signUpButtonText}>{role === 'doctor' ? 'Continue' : 'Sign Up'}</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
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
                Already have an account?{' '}
                <Text style={styles.signInLink} onPress={() => router.push('/login')}>
                  Sign In
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
                  <Text style={styles.modalItemText}>{item}</Text>
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
