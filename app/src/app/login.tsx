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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { API_URL } from '@/constants/api';
import { useLoginMutation } from '@/store/authApi';
import { useSocialAuth } from '@/hooks/use-social-auth';
import { PasswordField } from '@/components/password-field';
import { IdentifierTabs, IdentifierMode } from '@/components/identifier-tabs';
import { store } from '@/store/store';
import { setCredentials } from '@/store/authSlice';
import { jwtToAuthUser } from '@/store/decode-jwt';

const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<IdentifierMode>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [login, { isLoading }] = useLoginMutation();
  const goToTabs = () => {
    const currentUser = store.getState().auth.user;
    if (currentUser?.role === 'doctor') {
      router.replace('/(tabs)/doctor-home');
    } else {
      router.replace('/(tabs)');
    }
  };
  const { withGoogle, withFacebook, isLoading: isSocialLoading, error: socialError } = useSocialAuth(goToTabs);

  const handleLogin = async () => {
    setErrorMessage('');
    // console.log('[LOGIN] API_URL =', API_URL);
    const identifier = mode === 'phone' ? phone : email;
    if (mode === 'phone' && !BD_PHONE_REGEX.test(phone)) {
      setErrorMessage('Please enter a valid 11-digit Bangladeshi phone number (e.g., 01712345678).');
      return;
    }
    if (mode === 'email' && !EMAIL_REGEX.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    try {
      const data = await login({ identifier, password, rememberMe }).unwrap();
      const user = (data.user as any) ?? jwtToAuthUser(data.accessToken);
      store.dispatch(setCredentials({
        user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
      }));
      goToTabs();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Heading */}
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Welcome Back!</Text>

          {/* Form Fields */}
          <View style={styles.form}>
            <IdentifierTabs mode={mode} onChange={setMode} />

            {mode === 'phone' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number*</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCodeSelector}>
                    <Text style={styles.flagEmoji}>🇧🇩</Text>
                    <Text style={styles.countryCode}>+880</Text>
                  </View>
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
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.emailInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="johndoe@email.com"
                  placeholderTextColor="#A39E99"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
              </View>
            )}

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password*</Text>
              <PasswordField value={password} onChangeText={setPassword} />
              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={() => router.push('/forgot')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Keep me signed in */}
            <TouchableOpacity
              style={styles.rememberMeRow}
              activeOpacity={0.7}
              onPress={() => setRememberMe((v) => !v)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.rememberMeText}>Keep me signed in</Text>
            </TouchableOpacity>

            {/* Error message */}
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign in with</Text>
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
                Don't have any account?{' '}
                <Text style={styles.signUpLink} onPress={() => router.push('/signup')}>
                  Sign Up
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#BD632F',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1817',
    alignSelf: 'flex-start',
    marginBottom: 24,
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
  emailInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1817',
  },
  loginButton: {
    backgroundColor: '#BD632F',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: '#E53935',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E6E1DC',
  },
  dividerText: {
    marginHorizontal: 12,
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
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9C9690',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#BD632F',
    fontSize: 13,
    fontWeight: '600',
  },
  signUpLink: {
    color: '#BD632F',
    fontWeight: '600',
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#BD632F',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#1A1817',
    fontWeight: '500',
  },
});
