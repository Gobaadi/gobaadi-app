import React from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { useGetDoctorBookingsQuery, useGetTodayStatsQuery } from '@/store/doctorPortalApi';
import { useLanguage } from '@/hooks/use-language';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatBookingTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

const QUICK_TILES = [
  { id: 'appointments', label: 'Appointments', icon: 'document-text-outline' as const, route: '/appointments' },
  { id: 'schedule', label: 'Schedule', icon: 'calendar-outline' as const, route: '/schedule' },
  { id: 'patients', label: 'Patients', icon: 'clipboard-outline' as const, route: '/doctor-patients' },
  { id: 'discount', label: 'Apply Discount', icon: 'ticket-outline' as const, route: '/apply-discount' },
];

export default function DoctorHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDoctor = useRequireDoctor();
  const user = useSelector((state: RootState) => state.auth.user);
  const { languageCode } = useLanguage();

  const { data: bookings = [], isLoading } = useGetDoctorBookingsQuery();
  const { data: todayStats } = useGetTodayStatsQuery();

  if (!isDoctor) return null;

  const realOngoing = bookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'RESCHEDULED'
  );

  const ongoingPatients = realOngoing;

  const totalConsults = todayStats?.totalToday ?? 0;
  const completedToday = todayStats?.completedToday ?? 0;
  const pendingCount = totalConsults - completedToday;
  const displayTotalConsults = totalConsults;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Orange Header Banner - Inside ScrollView so it scrolls, or keep it fixed? Figma usually scrolls everything. Let's make it fixed at top and scroll below it for a cooler effect, or just scroll together. We'll scroll together. */}
        <View style={styles.headerBannerWrapper}>
          <ImageBackground
            source={require('@/assets/Top BG.png')}
            style={[styles.headerBanner, { paddingTop: insets.top + 20 }]}
            resizeMode="cover"
          >
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greetingText}>{getGreeting()}</Text>
                <Text style={styles.doctorName}>Dr. {user?.name || 'Nirmala Azalea'}</Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.langPill}
                  onPress={() => router.push('/select-language')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="globe-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.langPillText}>EN</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.notifBtnWhite}
                  onPress={() => router.push('/doctor-notifications')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="notifications-outline" size={20} color="#BD632F" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.ongoingLabel}>Ongoing Patients</Text>
          </ImageBackground>
        </View>

        <View style={styles.contentWrapper}>
          {/* Ongoing Patient Cards - Overlapping the header */}
          <View style={styles.patientsContainer}>
            {isLoading ? (
              <View style={styles.patientCard}>
                <ActivityIndicator size="small" color="#BD632F" />
              </View>
            ) : ongoingPatients.length === 0 ? (
              <View style={styles.emptyPatientCard}>
                <Ionicons name="person-outline" size={32} color="#E6E1DC" />
                <Text style={styles.emptyPatientText}>No ongoing patients right now</Text>
              </View>
            ) : (
              ongoingPatients.slice(0, 3).map((b) => (
                <View key={b.id} style={styles.patientCard}>
                  <View style={styles.patientTimeCol}>
                    <Text style={styles.patientTimeText}>
                      {formatBookingTime(b.startAt).substring(0, 5)}
                    </Text>
                    <View style={styles.timeDivider} />
                    <Text style={styles.patientTimeText}>
                      {formatBookingTime(b.endAt).substring(0, 5)}
                    </Text>
                  </View>

                  <View style={styles.patientAvatar}>
                    <Image
                      source={{ uri: 'https://i.pravatar.cc/150?img=44' }}
                      style={styles.avatarImage}
                      contentFit="cover"
                    />
                  </View>

                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{b.patientName || `Patient #${b.patientId}`}</Text>
                    <Text style={styles.patientDetail}>{b.patientPhone || 'Backache'}</Text>
                  </View>

                  <TouchableOpacity style={styles.chatBtn} activeOpacity={0.8} onPress={() => router.push({ pathname: '/chat', params: { conversationId: String(b.patientId) } })}>
                    <Ionicons name="chatbubble" size={22} color="#3B82F6" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Consults for Today */}
          <View style={styles.consultsCard}>
            <View style={styles.consultsLeft}>
              <Text style={styles.consultsTitle}>
                <Text style={styles.consultsTitleOrange}>Consults </Text>
                for today
              </Text>
              <Text style={styles.consultsSubtitle}>
                <Text style={styles.consultsSubtitleDark}>{completedToday} of {displayTotalConsults}</Text> completed
              </Text>
            </View>

            {/* Pending Circle */}
            <View style={styles.pendingCircle}>
              <View style={styles.pendingContent}>
                <Text style={styles.pendingCount}>{pendingCount}</Text>
                <Text style={styles.pendingLabel}>pending</Text>
              </View>
            </View>
          </View>

          {/* Quick Access Tiles */}
          <View style={styles.tilesGrid}>
            {QUICK_TILES.map((tile) => (
              <TouchableOpacity
                key={tile.id}
                style={styles.tile}
                onPress={() => router.push(tile.route as any)}
                activeOpacity={0.85}
              >
                <View style={styles.tileIconCircle}>
                  <Ionicons name={tile.icon} size={28} color="#BD632F" />
                </View>
                <Text style={styles.tileLabel}>{tile.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  scrollContainer: {
    paddingBottom: 110,
  },
  headerBannerWrapper: {
    backgroundColor: '#BD632F',
  },
  headerBanner: {
    paddingHorizontal: 24,
    paddingBottom: 70, // Extra padding to allow card overlap
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
  },
  langPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  notifBtnWhite: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ongoingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  contentWrapper: {
    paddingHorizontal: 20,
    marginTop: -45, // Pulls the content up to overlap the header
  },
  patientsContainer: {
    marginBottom: 16,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  patientTimeCol: {
    alignItems: 'center',
    width: 45,
  },
  patientTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  timeDivider: {
    height: 12,
    borderLeftWidth: 1.5,
    borderColor: '#D4D4D4',
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EAEAEA',
    marginLeft: 12,
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  patientInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 4,
  },
  patientDetail: {
    fontSize: 13,
    color: '#8A92A6',
    fontWeight: '500',
  },
  chatBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPatientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyPatientText: {
    fontSize: 14,
    color: '#9C9690',
    fontWeight: '500',
    marginTop: 8,
  },
  consultsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  consultsLeft: {
    gap: 6,
  },
  consultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1817',
  },
  consultsTitleOrange: {
    color: '#BD632F',
    fontWeight: '700',
  },
  consultsSubtitle: {
    fontSize: 14,
    color: '#8A92A6',
    fontWeight: '500',
  },
  consultsSubtitleDark: {
    color: '#1A1817',
    fontWeight: '600',
  },
  pendingCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: '#BD632F',
    borderBottomColor: '#E6E1DC',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  pendingContent: {
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
  },
  pendingCount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1817',
  },
  pendingLabel: {
    fontSize: 10,
    color: '#8A92A6',
    fontWeight: '600',
    marginTop: -2,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  tile: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  tileIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FFF6F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1817',
  },
});

