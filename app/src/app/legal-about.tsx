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

export default function LegalAboutScreen() {
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
        <Text style={styles.headerTitle}>Legal & About</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Terms of Service Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => router.push('/terms-of-service')}
        >
          <View style={styles.cardLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name="document-text-outline" size={22} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Terms of Service</Text>
              <Text style={styles.cardSubtitle}>Terms and Conditions</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9C9690" />
        </TouchableOpacity>

        {/* Privacy Policy Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => router.push('/privacy-policy')}
        >
          <View style={styles.cardLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#10B981" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Privacy Policy</Text>
              <Text style={styles.cardSubtitle}>How we protect your data</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9C9690" />
        </TouchableOpacity>

        {/* About App Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => router.push('/about-app')}
        >
          <View style={styles.cardLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name="globe-outline" size={22} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.cardTitle}>About App</Text>
              <Text style={styles.cardSubtitle}>Our Vision & Mission</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9C9690" />
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EDE8E3',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7C7672',
    marginTop: 2,
  },
});
