import React from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export default function CalendarSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDoctor = useRequireDoctor();
  if (!isDoctor) return null;

  const menuItems = [
    { id: 'working-hours', labelKey: 'calendarSettings.workingHours', icon: 'hourglass-outline' as const, route: '/working-hours' },
    // Note: Ionicons doesn't have a crossed-out hourglass, so falling back to a standard hourglass/timer aesthetic
    { id: 'block-time', labelKey: 'calendarSettings.blockTime', icon: 'hourglass-outline' as const, route: '/block-time-off' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('calendarSettings.title')}</Text>
      </View>

      <View style={styles.content}>
        {menuItems.map((item) => (
          <View key={item.id}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={24} color="#BD632F" />
              </View>
              <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9C9690" />
            </TouchableOpacity>
            {/* Dotted separator line */}
            <View style={styles.separator} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 16 // Aligns title directly next to the back button
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1817'
  },
  content: {
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 16
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center'
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1817'
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#E6E0D8',
    borderStyle: 'dotted',
  }
});