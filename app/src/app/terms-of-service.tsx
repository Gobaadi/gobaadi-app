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
import { Ionicons } from '@expo/vector-icons';
import { openSupportEmail, SUPPORT_EMAIL } from '@/lib/contact';

const LAST_UPDATED = 'October 1, 2026';

type Section = {
  heading: string;
  body?: string;
  bullets?: string[];
  contact?: { label: string; value: string };
};

const SECTIONS: Section[] = [
  {
    heading: '1. Use of Gobaadi',
    body:
      'Gobaadi provides agricultural technology services, including AI-powered tools, animal ' +
      'health information, professional consultations, marketplace services, tracking, and task ' +
      'management.\n\nYou agree to provide accurate information and use the app only for lawful purposes.',
  },
  {
    heading: '2. AI Information',
    body:
      'Gobaadi may provide AI-generated animal health or agricultural information. AI results are ' +
      'for informational purposes only and are not a substitute for a qualified veterinarian or ' +
      'agricultural professional.\n\nGobaadi does not guarantee that AI results will always be accurate.',
  },
  {
    heading: '3. Professional Consultation',
    body:
      'Information or advice provided by veterinarians or other professionals is the responsibility ' +
      'of the respective professional. For emergencies, contact an appropriate local professional or ' +
      'service directly.',
  },
  {
    heading: '4. Marketplace',
    body:
      'Products and services may be provided by third-party sellers. Gobaadi does not guarantee the ' +
      'quality, safety, availability, or suitability of third-party products or services.\n\n' +
      'Users are responsible for reviewing product and seller information before making a purchase.',
  },
  {
    heading: '5. Payments and Refunds',
    bullets: [
      'Payments, cancellations, refunds, and returns are subject to the applicable transaction, seller, or Gobaadi policy.',
      'Additional charges will be shown before applicable transactions.',
    ],
  },
  {
    heading: '6. User Content',
    body:
      'You are responsible for information, images, videos, and other content you submit to Gobaadi. ' +
      'You must have the necessary rights or permission to submit such content.',
  },
  {
    heading: '7. Prohibited Use',
    body:
      'You must not use Gobaadi for illegal activities, fraud, harassment, unauthorized access, ' +
      'spreading malicious software, or activities that may harm other users or the Platform.',
  },
  {
    heading: '8. Privacy',
    body: 'Your personal information is handled according to the Gobaadi Privacy Policy and applicable law.',
  },
  {
    heading: '9. Availability',
    body:
      'We aim to keep Gobaadi available and reliable, but we do not guarantee uninterrupted or ' +
      'error-free service.',
  },
  {
    heading: '10. Changes and Termination',
    body:
      'We may update these Terms or modify, suspend, or discontinue features when necessary. ' +
      'We may also suspend or terminate accounts that violate these Terms.',
  },
  {
    heading: '11. Contact',
    body: 'For questions or support:',
    contact: { label: 'Email:', value: SUPPORT_EMAIL },
  },
];

export default function TermsOfServiceScreen() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          By using the Gobaadi app, you agree to these Terms & Conditions.
        </Text>
        <Text style={styles.lastUpdated}>Last Updated: {LAST_UPDATED}</Text>

        {SECTIONS.map((section) => (
          <View key={section.heading}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>

            {section.body ? <Text style={styles.paragraph}>{section.body}</Text> : null}

            {section.bullets?.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}

            {section.contact ? (
              <View style={styles.contactRow}>
                <Text style={styles.paragraph}>{section.contact.label} </Text>
                <TouchableOpacity activeOpacity={0.7} onPress={openSupportEmail}>
                  <Text style={styles.contactLink}>{section.contact.value}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))}

        <Text style={styles.closing}>
          By continuing to use Gobaadi, you acknowledge that you have read and agreed to these
          Terms & Conditions.
        </Text>
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
