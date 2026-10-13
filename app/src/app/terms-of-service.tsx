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
import { openSupportEmail, SUPPORT_EMAIL } from '@/lib/contact';

const LAST_UPDATED = 'October 1, 2026';

type Section = {
  headingKey: string;
  bodyKey?: string;
  bulletsKeys?: string[];
  contact?: { labelKey: string; value: string };
};

const SECTIONS: Section[] = [
  { headingKey: 'termsOfService.s1.heading', bodyKey: 'termsOfService.s1.body' },
  { headingKey: 'termsOfService.s2.heading', bodyKey: 'termsOfService.s2.body' },
  { headingKey: 'termsOfService.s3.heading', bodyKey: 'termsOfService.s3.body' },
  { headingKey: 'termsOfService.s4.heading', bodyKey: 'termsOfService.s4.body' },
  {
    headingKey: 'termsOfService.s5.heading',
    bulletsKeys: ['termsOfService.s5.bullet1', 'termsOfService.s5.bullet2'],
  },
  { headingKey: 'termsOfService.s6.heading', bodyKey: 'termsOfService.s6.body' },
  { headingKey: 'termsOfService.s7.heading', bodyKey: 'termsOfService.s7.body' },
  { headingKey: 'termsOfService.s8.heading', bodyKey: 'termsOfService.s8.body' },
  { headingKey: 'termsOfService.s9.heading', bodyKey: 'termsOfService.s9.body' },
  { headingKey: 'termsOfService.s10.heading', bodyKey: 'termsOfService.s10.body' },
  {
    headingKey: 'termsOfService.s11.heading',
    bodyKey: 'termsOfService.s11.body',
    contact: { labelKey: 'termsOfService.contactLabel', value: SUPPORT_EMAIL },
  },
];

export default function TermsOfServiceScreen() {
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
        <Text style={styles.headerTitle}>{t('termsOfService.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{t('termsOfService.intro')}</Text>
        <Text style={styles.lastUpdated}>
          {t('termsOfService.lastUpdated', { date: LAST_UPDATED })}
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.headingKey}>
            <Text style={styles.sectionHeading}>{t(section.headingKey)}</Text>

            {section.bodyKey ? <Text style={styles.paragraph}>{t(section.bodyKey)}</Text> : null}

            {section.bulletsKeys?.map((bulletKey) => (
              <View key={bulletKey} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{t(bulletKey)}</Text>
              </View>
            ))}

            {section.contact ? (
              <View style={styles.contactRow}>
                <Text style={styles.paragraph}>{t(section.contact.labelKey)} </Text>
                <TouchableOpacity activeOpacity={0.7} onPress={openSupportEmail}>
                  <Text style={styles.contactLink}>{section.contact.value}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))}

        <Text style={styles.closing}>{t('termsOfService.closing')}</Text>
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
  intro: {
    fontSize: 14,
    color: '#7C7672',
    lineHeight: 22,
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
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bulletDot: {
    fontSize: 14,
    color: '#7C7672',
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#7C7672',
    lineHeight: 22,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  contactLink: {
    fontSize: 14,
    color: '#BD632F',
    lineHeight: 22,
    textDecorationLine: 'underline',
  },
  closing: {
    fontSize: 14,
    color: '#7C7672',
    lineHeight: 22,
    marginTop: 20,
  },
});
