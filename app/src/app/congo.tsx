import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';

export default function CongoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleSignIn = () => {
    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Illustration */}
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.illustration}
          resizeMode="contain"
        />

        {/* Title */}
        <Text style={styles.title}>{t('congo.title')}</Text>

        {/* Subtitle / Copy */}
        <View style={styles.textContainer}>
          <Text style={styles.bodyText}>
            {t('congo.body')}
          </Text>
          <Text style={styles.thankYouText}>
            {t('congo.thankYou')}
          </Text>
        </View>

        {/* Sign In Button */}
        <TouchableOpacity style={styles.signInButton} activeOpacity={0.8} onPress={handleSignIn}>
          <Text style={styles.signInButtonText}>{t('congo.signIn')}</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  illustration: {
    width: '100%',
    height: 240,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#BD632F',
    marginBottom: 20,
    textAlign: 'center',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 40,
  },
  bodyText: {
    fontSize: 16,
    color: '#7C7672',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  thankYouText: {
    fontSize: 16,
    color: '#7C7672',
    textAlign: 'center',
    fontWeight: '600',
  },
  signInButton: {
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
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
