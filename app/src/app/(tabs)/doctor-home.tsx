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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, SvgXml } from 'react-native-svg';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import {
  useGetDoctorBookingsQuery,
  useGetTodayStatsQuery,
  useGetMyDoctorProfileQuery,
} from '@/store/doctorPortalApi';
import { useGetConversationsQuery, useCreateConversationMutation } from '@/store/chatApi';
import { useLanguage } from '@/hooks/use-language';
import { PatientAvatar } from '@/components/patient-avatar';
import { formatTime12h } from '@/utils/date';
import {
  languageGlobeSvg,
  notificationBellSvg,
  doctorHomeAppointmentsSvg,
  doctorHomeScheduleSvg,
  doctorHomePatientsSvg,
  doctorHomeApplyDiscountSvg,
  doctorHomeAppointmentMessageSquareSvg,
} from '@/components/icons/svg-icon-sources';
import { useTranslation } from '@/hooks/use-translation';

type T = ReturnType<typeof useTranslation>['t'];

function getGreeting(t: T): string {
  const h = new Date().getHours();
  if (h < 12) return t('doctorHome.greeting.morning');
  if (h < 17) return t('doctorHome.greeting.afternoon');
  return t('doctorHome.greeting.evening');
}

function formatBookingTime(iso: string): string {
  return formatTime12h(iso);
}

const PENDING_RING_RADIUS = 31;
const PENDING_RING_CIRCUMFERENCE = 2 * Math.PI * PENDING_RING_RADIUS;

const QUICK_TILES = [
  { id: 'appointments', labelKey: 'doctorHome.tiles.appointments', icon: doctorHomeAppointmentsSvg, route: '/appointments' },
  { id: 'schedule', labelKey: 'doctorHome.tiles.schedule', icon: doctorHomeScheduleSvg, route: '/schedule' },
  { id: 'patients', labelKey: 'doctorHome.tiles.patients', icon: doctorHomePatientsSvg, route: '/doctor-patients' },
  { id: 'discount', labelKey: 'doctorHome.tiles.discount', icon: doctorHomeApplyDiscountSvg, route: '/apply-discount' },
];

export default function DoctorHomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDoctor = useRequireDoctor();
  const user = useSelector((state: RootState) => state.auth.user);
  const { languageCode } = useLanguage();

  const { data: doctorProfile } = useGetMyDoctorProfileQuery(undefined, { skip: !isDoctor });
  const { data: bookings = [], isLoading } = useGetDoctorBookingsQuery();
  const { data: todayStats } = useGetTodayStatsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: conversations = [] } = useGetConversationsQuery();
  const [createConversation] = useCreateConversationMutation();

  const baseName = (doctorProfile?.name || user?.name || '').trim();
  const doctorDisplayName = baseName
    ? /^(?:dr|ডা)\.?(?:\s|$)/iu.test(baseName)
      ? baseName
      : `${t('doctorHome.doctorTitle')} ${baseName}`
    : t('doctorHome.fallback.doctor');

  const openPatientChat = async (booking: (typeof bookings)[number]) => {
    try {
      const existing = conversations.find((c) => c.patientId === booking.patientId);
      let conversationId = existing?.id;
      if (!conversationId) {
        const created = await createConversation({
          patientId: booking.patientId,
        }).unwrap();
        conversationId = created.id;
      }
      router.push({
        pathname: '/chat',
        params: {
          conversationId: String(conversationId),
          patientName: booking.patientName || t('doctorHome.patientWithId', { id: booking.patientId }),
          theirAvatar: booking.patientAvatar,
          appointmentId: String(booking.id),
          animalId: booking.animalId != null ? String(booking.animalId) : undefined,
          animalName: booking.animalName,
          appointmentTime: booking.startAt,
        },
      });
    } catch {
      Alert.alert(t('doctorHome.alerts.openChatError.title'), t('doctorHome.alerts.openChatError.msg'));
    }
  };

  if (!isDoctor) return null;

  const realOngoing = bookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'RESCHEDULED'
  );

  const ongoingPatients = realOngoing;

  const totalConsults = todayStats?.totalToday ?? 0;
  const completedToday = todayStats?.completedToday ?? 0;
  const pendingCount = Math.max(totalConsults - completedToday, 0);
  const displayTotalConsults = totalConsults;
  const pendingFraction =
    totalConsults > 0 ? Math.min(Math.max(pendingCount / totalConsults, 0), 1) : 0;

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
            source={require('@/assets/Top BG.webp')}
            style={[styles.headerBanner, { paddingTop: insets.top + 20 }]}
            resizeMode="cover"
          >
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greetingText}>{getGreeting(t)}</Text>
                <Text style={styles.doctorName}>{doctorDisplayName}</Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.langPill}
                  onPress={() => router.push('/select-language')}
                  activeOpacity={0.8}
                >
                  <SvgXml width={16} height={16} xml={languageGlobeSvg} />
                  <Text style={styles.langPillText}>{languageCode}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.notifBtnWhite}
                  onPress={() => router.push('/doctor-notifications')}
                  activeOpacity={0.8}
                >
                  <SvgXml width={20} height={20} xml={notificationBellSvg} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.ongoingLabel}>{t('doctorHome.ongoingPatients')}</Text>
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
                <Text style={styles.emptyPatientText}>{t('doctorHome.emptyPatients')}</Text>
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
                    <PatientAvatar
                      name={b.patientName}
                      image={b.patientAvatar}
                      size={50}
                    />
                  </View>

                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{b.patientName || b.animalName || t('doctorHome.fallback.patient')}</Text>
                    {b.reasonForConsultation || b.patientPhone ? (
                      <Text style={styles.patientDetail}>
                        {b.reasonForConsultation || b.patientPhone}
                      </Text>
                    ) : null}
                  </View>

                  <TouchableOpacity style={styles.chatBtn} activeOpacity={0.8} onPress={() => openPatientChat(b)}>
                    <SvgXml width={26} height={24} xml={doctorHomeAppointmentMessageSquareSvg} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Consults for Today */}
          <View style={styles.consultsCard}>
            <View style={styles.consultsLeft}>
              <Text style={styles.consultsTitle}>
                <Text style={styles.consultsTitleOrange}>{t('doctorHome.consultsOrange')}</Text>{' '}
                {t('doctorHome.consultsForToday')}
              </Text>
              <Text style={styles.consultsSubtitle}>
                <Text style={styles.consultsSubtitleDark}>
                  {t('doctorHome.completedOf', { completed: completedToday, total: displayTotalConsults })}
                </Text>{' '}
                {t('doctorHome.completed')}
              </Text>
            </View>

            {/* Pending Circle */}
            <View style={styles.pendingCircle}>
              <Svg width={68} height={68}>
                <Circle cx={34} cy={34} r={PENDING_RING_RADIUS} stroke="#E6E1DC" strokeWidth={3} fill="none" />
                <Circle
                  cx={34}
                  cy={34}
                  r={PENDING_RING_RADIUS}
                  stroke="#BD632F"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={PENDING_RING_CIRCUMFERENCE}
                  strokeDashoffset={PENDING_RING_CIRCUMFERENCE * (1 - pendingFraction)}
                  transform="rotate(-90 34 34)"
                />
              </Svg>
              <View style={styles.pendingContent}>
                <Text style={styles.pendingCount}>{pendingCount}</Text>
                <Text style={styles.pendingLabel}>{t('doctorHome.pending')}</Text>
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
                  <SvgXml width={40} height={40} xml={tile.icon} />
                </View>
                <Text style={styles.tileLabel}>{t(tile.labelKey)}</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
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
    justifyContent: 'center',
    gap: 16,
  },
  tile: {
    width: '40%',
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
    width: 70,
    height: 70,
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

