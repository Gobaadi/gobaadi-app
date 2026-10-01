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

const LAST_UPDATED = 'October 1, 2026';

type Section = {
  heading: string;
  body: string;
};

const SECTIONS: Section[] = [
  {
    heading: '1. Types of Data We Collect',
    body:
      'Gobaadi may collect information you provide when creating an account or using our services, ' +
      'including your name, phone number, email address, farm details, livestock information, ' +
      'location, photos, videos, and other information related to your farming activities. We may ' +
      'also collect information about livestock health, vaccination, feeding, treatment, marketplace ' +
      'listings, purchases, sales, and interactions with veterinarians or service providers. ' +
      'Technical information such as device type, operating system, app usage, and diagnostic data ' +
      'may also be collected to maintain and improve the app.',
  },
  {
    heading: '2. Use of Your Personal Data',
    body:
      'We use your information to provide, operate, maintain, and improve Gobaadi and its features. ' +
      'This may include managing your account, maintaining livestock records, providing reminders ' +
      'and personalized livestock management information, facilitating communication with ' +
      'veterinarians and service providers, supporting marketplace activities, processing ' +
      'transactions, improving our AI-powered features, and providing customer support. We may also ' +
      'use information to understand how users interact with the app, improve our services, prevent ' +
      'misuse, and maintain the security and reliability of Gobaadi.',
  },
  {
    heading: '3. Disclosure of Your Personal Data',
    body:
      'Gobaadi may share relevant information with veterinarians, marketplace sellers or buyers, ' +
      'delivery and payment service providers, technology and cloud service providers, analytics ' +
      'providers, and other trusted service partners when necessary to provide our services. We only ' +
      'share information where it is reasonably necessary for the relevant service or business ' +
      'purpose. We may also disclose information when required by law, legal process, or to protect ' +
      'the rights, safety, and security of Gobaadi, our users, livestock, or other parties. We do ' +
      'not sell your personal information to third parties for their independent marketing purposes.',
  },
];

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: {LAST_UPDATED}</Text>

        {SECTIONS.map((section) => (
          <View key={section.heading}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.paragraph}>{section.body}</Text>
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
