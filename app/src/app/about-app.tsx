import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

const LAST_UPDATED = 'October 1, 2026';

type Feature = {
  emoji: string;
  titleKey: string;
  descriptionKey: string;
};

const FEATURES: Feature[] = [
  {
    emoji: '🐄',
    titleKey: 'aboutApp.features.livestock.title',
    descriptionKey: 'aboutApp.features.livestock.description',
  },
  {
    emoji: '🩺',
    titleKey: 'aboutApp.features.vets.title',
    descriptionKey: 'aboutApp.features.vets.description',
  },
  {
    emoji: '🤖',
    titleKey: 'aboutApp.features.ai.title',
    descriptionKey: 'aboutApp.features.ai.description',
  },
  {
    emoji: '🛒',
    titleKey: 'aboutApp.features.market.title',
    descriptionKey: 'aboutApp.features.market.description',
  },
  {
    emoji: '🔔',
    titleKey: 'aboutApp.features.reminders.title',
    descriptionKey: 'aboutApp.features.reminders.description',
  },
];

const FOOTER_LINKS: { labelKey: string; href: Href }[] = [
  { labelKey: 'aboutApp.links.privacy', href: '/privacy-policy' },
  { labelKey: 'aboutApp.links.terms', href: '/terms-of-service' },
  { labelKey: 'aboutApp.links.help', href: '/help-support' },
];

export default function AboutAppScreen() {
  const router = useRouter();
  const { t } = useTranslation();

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
        <Text style={styles.headerTitle}>{t('aboutApp.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.docTitle}>{t('aboutApp.docTitle')}</Text>
        <Text style={styles.tagline}>{t('aboutApp.tagline')}</Text>
        <Text style={styles.lastUpdated}>{t('aboutApp.lastUpdated', { date: LAST_UPDATED })}</Text>

        <Text style={styles.paragraph}>{t('aboutApp.intro')}</Text>
        <Text style={styles.subheading}>{t('aboutApp.canDo')}</Text>

        {FEATURES.map((feature) => (
          <View key={feature.titleKey} style={styles.featureRow}>
            <Text style={styles.featureEmoji}>{feature.emoji}</Text>
            <View style={styles.featureBody}>
              <Text style={styles.featureTitle}>{t(feature.titleKey)}</Text>
              <Text style={styles.paragraph}>{t(feature.descriptionKey)}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionHeading}>{t('aboutApp.mission.title')}</Text>
        <Text style={styles.paragraph}>{t('aboutApp.mission.body')}</Text>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Gobaadi</Text>
          <Text style={styles.footerTagline}>{t('aboutApp.tagline')}</Text>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>{t('aboutApp.appVersion')}</Text>
            <Text style={styles.versionValue}>1.0.0</Text>
          </View>

          <View style={styles.linksRow}>
            {FOOTER_LINKS.map((link, index) => (
              <React.Fragment key={link.labelKey}>
                {index > 0 ? <Text style={styles.linkSeparator}>·</Text> : null}
                <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(link.href)}>
                  <Text style={styles.link}>{t(link.labelKey)}</Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>
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
  docTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
    marginTop: 8,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#BD632F',
    marginTop: 4,
  },
  lastUpdated: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9C9690',
    marginTop: 6,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1817',
    marginTop: 14,
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 14,
  },
  featureEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  featureBody: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginTop: 24,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#7C7672',
    lineHeight: 22,
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EDE8E3',
    alignItems: 'center',
  },
  footerBrand: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
  },
  footerTagline: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#7C7672',
    marginTop: 2,
  },
  versionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  versionLabel: {
    fontSize: 13,
    color: '#9C9690',
  },
  versionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1817',
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  linkSeparator: {
    fontSize: 14,
    color: '#9C9690',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BD632F',
    textDecorationLine: 'underline',
  },
});
