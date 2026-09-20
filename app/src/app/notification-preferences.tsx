import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
} from '@/store/notificationPreferencesApi';
import type { NotificationPreference } from '@/store/notificationPreferencesApi';

type FilterTab = 'all' | 'appointments' | 'patients' | 'messages';

interface PreferenceItem {
  key: keyof Pick<NotificationPreference, 'appointmentReminders' | 'chatMessages' | 'followUpReminders' | 'hygieneReminders' | 'systemUpdates'>;
  title: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  tab: FilterTab;
}

const PREFERENCES: PreferenceItem[] = [
  { key: 'appointmentReminders', title: 'Appointments Reminders', description: 'Get notified about upcoming appointments', icon: 'calendar', iconBg: '#FFF2EB', iconColor: '#BD632F', tab: 'appointments' },
  { key: 'chatMessages', title: 'Patient Messages', description: 'Get notified when patients send messages', icon: 'chatbubble-ellipses', iconBg: '#FFF2EB', iconColor: '#BD632F', tab: 'patients' },
  { key: 'followUpReminders', title: 'Follow-up Reminders', description: 'Reminders for scheduled follow-ups', icon: 'notifications', iconBg: '#E8F5E9', iconColor: '#4CAF50', tab: 'appointments' },
  { key: 'hygieneReminders', title: 'Hygiene Reminder', description: 'Get notified about consultation payments', icon: 'medical', iconBg: '#E8F5E9', iconColor: '#4CAF50', tab: 'patients' },
  { key: 'systemUpdates', title: 'System Updates', description: 'Important updates from the platform', icon: 'volume-high', iconBg: '#F3E5F5', iconColor: '#9C27B0', tab: 'messages' },
];

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const { data: preferences, isLoading, isError } = useGetPreferencesQuery();
  const [updatePreferences, { isLoading: isUpdating }] = useUpdatePreferencesMutation();

  const filteredPreferences = useMemo(() => {
    if (activeTab === 'all') return PREFERENCES;
    return PREFERENCES.filter((p) => p.tab === activeTab);
  }, [activeTab]);

  const handleToggle = useCallback(
    async (pref: PreferenceItem) => {
      if (!preferences) return;
      try {
        await updatePreferences({ [pref.key]: !preferences[pref.key] }).unwrap();
      } catch {
        Alert.alert('Error', 'Failed to update preference');
      }
    },
    [preferences, updatePreferences]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BD632F" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#9C9690" />
          <Text style={styles.errorText}>Failed to load preferences</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabRow}>
        {(['all', 'appointments', 'patients', 'messages'] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'all' ? 'All' : tab === 'appointments' ? 'Appointments' : tab === 'patients' ? 'Patients' : 'Messages'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {filteredPreferences.map((pref) => (
          <View key={pref.key} style={styles.prefCard}>
            <View style={styles.prefLeft}>
              <View style={[styles.prefIcon, { backgroundColor: pref.iconBg }]}>
                <Ionicons name={pref.icon as any} size={20} color={pref.iconColor} />
              </View>
              <View style={styles.prefInfo}>
                <Text style={styles.prefTitle}>{pref.title}</Text>
                <Text style={styles.prefDesc}>{pref.description}</Text>
              </View>
            </View>
            <Switch
              value={preferences ? preferences[pref.key] : false}
              onValueChange={() => handleToggle(pref)}
              disabled={isUpdating}
              trackColor={{ true: '#BD632F', false: '#E6E1DC' }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  placeholder: { width: 40, height: 40 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E6E1DC' },
  tabActive: { backgroundColor: '#FFFFFF', borderColor: '#BD632F' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#9C9690' },
  tabTextActive: { color: '#BD632F' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  prefCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 10 },
  prefLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  prefIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  prefInfo: { flex: 1 },
  prefTitle: { fontSize: 14, fontWeight: '700', color: '#1A1817', marginBottom: 2 },
  prefDesc: { fontSize: 11, fontWeight: '500', color: '#7C7672' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500', color: '#9C9690' },
});
