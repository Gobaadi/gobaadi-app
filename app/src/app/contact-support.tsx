import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ContactSupportScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Email Card */}
        <TouchableOpacity
          style={styles.contactCard}
          activeOpacity={0.8}
          onPress={() =>
            Linking.openURL('mailto:support@gobaadi.com').catch(() =>
              Alert.alert('No email app', 'Please contact us at support@gobaadi.com'),
            )
          }
        >
          <View style={styles.contactIcon}>
            <Ionicons name="mail-outline" size={22} color="#BD632F" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>support@gobaadi.com</Text>
          </View>
        </TouchableOpacity>

        {/* Phone Card */}
        <TouchableOpacity
          style={styles.contactCard}
          activeOpacity={0.8}
          onPress={() =>
            Linking.openURL('tel:+8801911418977').catch(() =>
              Alert.alert('No phone app', 'Please call customer service at +8801911418977'),
            )
          }
        >
          <View style={styles.contactIcon}>
            <Ionicons name="call-outline" size={22} color="#BD632F" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Customer Service</Text>
            <Text style={styles.contactValue}>+8801911418977</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6E1DC', padding: 16, marginBottom: 12, gap: 14 },
  contactIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center' },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 12, fontWeight: '500', color: '#9C9690', marginBottom: 2 },
  contactValue: { fontSize: 15, fontWeight: '700', color: '#1A1817' },
});
