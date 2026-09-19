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

export default function HelpSupportScreen() {
  const router = useRouter();

  const options = [
    { id: 'faqs', title: 'FAQs', subtitle: 'Common Question and Answer', icon: 'help-circle-outline' as const, route: '/faqs' },
    { id: 'contact', title: 'Contact Support', subtitle: 'Get Help From Our Team', icon: 'chatbubble-ellipses-outline' as const, route: '/contact-support' },
    { id: 'report', title: 'Report Issues', subtitle: 'Report Issues or Abuse', icon: 'flag-outline' as const, route: '/report-issues' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {options.map((item, idx) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuCard, idx < options.length - 1 && styles.menuCardBorder]}
            onPress={() => item.route && router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={22} color="#171717" />
              </View>
              <View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9C9690" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  menuCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6E1DC', padding: 16, marginBottom: 12 },
  menuCardBorder: {},
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E4EAF2', justifyContent: 'center', alignItems: 'center' },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#1A1817' },
  menuSubtitle: { fontSize: 12, fontWeight: '500', color: '#7C7672', marginTop: 2 },
});