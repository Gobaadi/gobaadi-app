import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetNotificationsQuery, useMarkNotificationReadMutation } from '@/store/notificationsApi';
import type { Notification } from '@/store/notificationsApi';

type FilterTab = 'all' | 'tasks' | 'hygiene' | 'health' | 'help';

const TYPE_CONFIG: Record<string, { icon: string; iconBg: string; iconColor: string }> = {
  order: { icon: 'cart', iconBg: '#E3F2FD', iconColor: '#2196F3' },
  booking: { icon: 'calendar', iconBg: '#FFF2EB', iconColor: '#BD632F' },
  payment: { icon: 'wallet', iconBg: '#E8F5E9', iconColor: '#4CAF50' },
  delivery: { icon: 'bicycle', iconBg: '#E3F2FD', iconColor: '#2196F3' },
  reminder: { icon: 'alarm', iconBg: '#FFF2EB', iconColor: '#BD632F' },
  ai_ready: { icon: 'sparkles', iconBg: '#F3E5F5', iconColor: '#9C27B0' },
  prescription_ready: { icon: 'medkit', iconBg: '#E8F5E9', iconColor: '#4CAF50' },
  promotion: { icon: 'pricetag', iconBg: '#FFF9C4', iconColor: '#F9A825' },
  system: { icon: 'information-circle', iconBg: '#E8F5E9', iconColor: '#4CAF50' },
  message: { icon: 'chatbubble', iconBg: '#FFF2EB', iconColor: '#BD632F' },
  referral: { icon: 'people', iconBg: '#E8F5E9', iconColor: '#4CAF50' },
};

const TAB_FILTER_MAP: Record<FilterTab, string[]> = {
  all: [],
  tasks: ['reminder'],
  hygiene: ['system'],
  health: ['ai_ready', 'prescription_ready'],
  help: ['system', 'promotion'],
};

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return date >= weekAgo && !isToday(dateStr);
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(dateStr)) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  return date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const { data: notifications, isLoading, isError } = useGetNotificationsQuery();
  const [markAsRead] = useMarkNotificationReadMutation();

  const filteredNotifications = useMemo(() => {
    if (!notifications) return { today: [], thisWeek: [], older: [] };

    let filtered = notifications;
    const tabTypes = TAB_FILTER_MAP[activeTab];
    if (tabTypes.length > 0) {
      filtered = notifications.filter((n) => tabTypes.includes(n.type));
    }

    const today: Notification[] = [];
    const thisWeek: Notification[] = [];
    const older: Notification[] = [];

    for (const notif of filtered) {
      if (isToday(notif.createdAt)) {
        today.push(notif);
      } else if (isThisWeek(notif.createdAt)) {
        thisWeek.push(notif);
      } else {
        older.push(notif);
      }
    }

    return { today, thisWeek, older };
  }, [notifications, activeTab]);

  const handlePress = (notif: Notification) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
  };

  const renderNotification = (item: Notification) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.system;
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.notificationCard, !item.isRead && styles.notificationCardUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.notifIcon, { backgroundColor: config.iconBg }]}>
          <Ionicons name={config.icon as any} size={20} color={config.iconColor} />
        </View>
        <View style={styles.notifInfo}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifDesc}>{item.body}</Text>
          <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/notification-preferences')} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/notification-preferences')} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#9C9690" />
          <Text style={styles.errorText}>Failed to load notifications</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasNotifications =
    filteredNotifications.today.length > 0 ||
    filteredNotifications.thisWeek.length > 0 ||
    filteredNotifications.older.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/notification-preferences')} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {(['all', 'tasks', 'hygiene', 'health', 'help'] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {!hasNotifications && (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color="#9C9690" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        )}

        {filteredNotifications.today.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today</Text>
            {filteredNotifications.today.map(renderNotification)}
          </>
        )}

        {filteredNotifications.thisWeek.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>This Week</Text>
            {filteredNotifications.thisWeek.map(renderNotification)}
          </>
        )}

        {filteredNotifications.older.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Earlier</Text>
            {filteredNotifications.older.map(renderNotification)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  settingsBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E6E1DC' },
  tabActive: { backgroundColor: '#FFFFFF', borderColor: '#BD632F' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#9C9690' },
  tabTextActive: { color: '#BD632F' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1817', marginBottom: 12 },
  notificationCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 10, gap: 12, alignItems: 'center' },
  notificationCardUnread: { backgroundColor: '#FFF8F4', borderColor: '#F0D9C8' },
  notifIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#1A1817', marginBottom: 2 },
  notifDesc: { fontSize: 12, fontWeight: '500', color: '#7C7672', marginBottom: 4 },
  notifTime: { fontSize: 11, fontWeight: '500', color: '#9C9690' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#BD632F' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500', color: '#9C9690' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500', color: '#9C9690' },
});
