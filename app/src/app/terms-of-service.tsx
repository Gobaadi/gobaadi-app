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

const LOREM_A =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ' +
  'ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco ' +
  'laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in ' +
  'voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat ' +
  'non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

const LOREM_B =
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, ' +
  'totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae ' +
  'dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, ' +
  'sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt neque porro quisquam ' +
  'est, qui dolorem ipsum quia dolor sit amet.';

const SECTIONS: { heading: string; body: string }[] = [
  { heading: '1. Acceptance of Terms', body: `${LOREM_A} ${LOREM_B}` },
  { heading: '2. Account Registration', body: `${LOREM_A} ${LOREM_B}` },
  { heading: '3. User Responsibilities', body: `${LOREM_A} ${LOREM_B}` },
  { heading: '4. Marketplace & Orders', body: `${LOREM_A} ${LOREM_B}` },
  { heading: '5. Veterinary Consultations', body: `${LOREM_A} ${LOREM_B}` },
  { heading: '6. Limitation of Liability', body: `${LOREM_A} ${LOREM_B}` },
  { heading: '7. Termination & Contact', body: `${LOREM_A} ${LOREM_B}` },
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
