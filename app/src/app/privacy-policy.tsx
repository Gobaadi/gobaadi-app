import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

const LAST_UPDATED = 'October 1, 2026';

type Section = {
  headingKey: string;
  bodyKey: string;
};

const SECTIONS: Section[] = [
  { headingKey: 'privacyPolicy.s1.heading', bodyKey: 'privacyPolicy.s1.body' },
  { headingKey: 'privacyPolicy.s2.heading', bodyKey: 'privacyPolicy.s2.body' },
  { headingKey: 'privacyPolicy.s3.heading', bodyKey: 'privacyPolicy.s3.body' },
];

export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('privacyPolicy.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>
          {t('privacyPolicy.lastUpdated', { date: LAST_UPDATED })}
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.headingKey}>
            <Text style={styles.sectionHeading}>{t(section.headingKey)}</Text>
            <Text style={styles.paragraph}>{t(section.bodyKey)}</Text>
          </View>
        ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1817',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9C9690',
    marginTop: 6,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginTop: 18,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#7C7672',
    lineHeight: 22,
  },
});
