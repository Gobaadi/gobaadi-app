import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  TextInput,
  Alert,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGetAnimalsQuery } from '@/store/animalsApi';
import { useGetTasksQuery, useToggleTaskMutation } from '@/store/tasksApi';
import { useGetDoctorBookingsQuery } from '@/store/doctorPortalApi';
import { useGetWeatherQuery } from '@/store/weatherApi';
import { useGetMyReferralQuery, useClaimReferralMutation } from '@/store/referralsApi';
import { useLanguage } from '@/hooks/use-language';
import { useTranslation } from '@/hooks/use-translation';
import LanguageBottomSheet from '@/components/LanguageBottomSheet';
import Svg, { Path, SvgXml } from 'react-native-svg';
import { EmptyState } from '@/components/ui/empty-state';
import {
  languageGlobeSvg,
  notificationBellSvg,
  homeLocationSvg,
} from '@/components/icons/svg-icon-sources';
import { RowSkeleton, SkeletonBox } from '@/components/ui/skeleton';
import { localDateKey, formatTime12h } from '@/utils/date';
import { DoctorAvatar } from '@/components/doctor-avatar';

const { width } = Dimensions.get('window');

function todayDateKey(): string {
  return localDateKey();
}

function formatFullDate(locale: string): string {
  return new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTaskTime(scheduledTime: string): string {
  return formatTime12h(scheduledTime);
}

function animalImage(breed: string) {
  return breed?.toLowerCase().includes('buffalo')
    ? require('@/assets/images/albino_buffalo.webp')
    : require('@/assets/images/bangladeshi_cow.webp');
}

export default function HomeDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: allAnimals, isLoading: isAnimalsLoading } = useGetAnimalsQuery();
  const { data: tasks = [], isLoading: isTasksLoading } = useGetTasksQuery(todayDateKey(), {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const { data: weather, isLoading: isWeatherLoading } = useGetWeatherQuery();
  const { data: referral } = useGetMyReferralQuery();
  const [claimReferral, { isLoading: isClaiming }] = useClaimReferralMutation();
  const { language, languageCode, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [showLangSheet, setShowLangSheet] = useState(false);

  const [toggleTaskMutation] = useToggleTaskMutation();
  const visibleTasks = tasks.filter((task) => !task.isDone);

  const [showClaimInput, setShowClaimInput] = useState(false);
  const [claimCode, setClaimCode] = useState('');

  const animals = (allAnimals || []).slice(0, 3);

  const { data: allBookings = [] } = useGetDoctorBookingsQuery();
  const upcomingAppointments = allBookings
    .filter((b) => {
      const start = new Date(b.startAt);
      return b.status !== 'CANCELLED' && start >= new Date();
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 3);

  async function shareReferral() {
    if (!referral) return;
    try {
      await Share.share({
        message: t('home.referral.shareMsg', { code: referral.referralCode, link: referral.shareLink }),
      });
    } catch (err) {
      console.log('Error sharing referral:', err);
    }
  }

  async function handleClaimReferral() {
    const code = claimCode.trim();
    if (!code) {
      Alert.alert(t('home.referral.alerts.enterCodeTitle'), t('home.referral.alerts.enterCodeMsg'));
      return;
    }
    if (!/^[A-Z0-9]{4,12}$/.test(code)) {
      Alert.alert(t('home.referral.alerts.invalidCodeTitle'), t('home.referral.alerts.invalidCodeMsg'));
      return;
    }
    try {
      await claimReferral(code).unwrap();
      setClaimCode('');
      setShowClaimInput(false);
      Alert.alert(t('home.referral.alerts.successTitle'), t('home.referral.alerts.successMsg'));
    } catch (err) {
      console.log('Error claiming referral:', err);
      Alert.alert(t('home.referral.alerts.claimFailTitle'), t('home.referral.alerts.claimFailMsg'));
    }
  }

  async function toggleTask(id: number) {
    try {
      await toggleTaskMutation(String(id)).unwrap();
      Alert.alert(t('home.tasks.markedTitle'), t('home.tasks.markedMsg'));
    } catch {
      Alert.alert(t('home.tasks.markFailedTitle'), t('home.tasks.markFailedMsg'));
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#BD632F" translucent />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerWrapper}>
          <ImageBackground
            source={require('@/assets/Top BG.webp')}
            style={[styles.header, { paddingTop: insets.top + 16 }]}
            resizeMode="cover"
          >
            <View style={styles.headerTextContainer}>
              <Text style={styles.greetingTitle}>{t('home.greeting')}</Text>
              <TouchableOpacity style={styles.dateSelector} activeOpacity={0.7} onPress={() => router.push('/schedule')}>
                <Text style={styles.dateText}>{formatFullDate(language === 'bn' ? 'bn-BD' : 'en-US')}</Text>
                <Text style={styles.dropdownArrow}>∨</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.headerRightControls}>
              <TouchableOpacity
                style={styles.langBadgeHeader}
                activeOpacity={0.8}
                onPress={() => setShowLangSheet(true)}
              >
                <SvgXml width={16} height={16} xml={languageGlobeSvg} />
                <Text style={styles.langTextHeader}>{languageCode}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.notifBtnWhite}
                onPress={() => router.push('/notifications')}
                activeOpacity={0.8}
              >
                <SvgXml width={20} height={20} xml={notificationBellSvg} />
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>

        {/* Farm Weather Card */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherCardHeader}>
            <View style={styles.weatherLocationRow}>
              <SvgXml width={16} height={16} xml={homeLocationSvg} />
              <Text style={styles.weatherLocation}>
                {t('home.weather.title', { place: weather?.location || t('home.weather.defaultPlace') })}
              </Text>
            </View>
            <Image
              source={require('@/assets/images/farm_barn.webp')}
              style={styles.barnImage}
              contentFit="cover"
            />
          </View>

          {isWeatherLoading ? (
            <View style={{ paddingVertical: 8 }}>
              <SkeletonBox width={120} height={44} />
              <SkeletonBox width="100%" height={1} style={{ marginTop: 16, marginBottom: 12 }} />
              <View style={styles.metricsGrid}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.metricItem}>
                    <SkeletonBox width={50} height={11} />
                    <SkeletonBox width={36} height={14} style={{ marginTop: 6 }} />
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <>
              <View style={styles.tempRow}>
                <View style={styles.tempMainContainer}>
                  <Text style={styles.tempPlus}>+</Text>
                  <Text style={styles.tempText}>
                    {weather ? Math.round(weather.temperature) : '35'}
                  </Text>
                  <Text style={styles.tempUnit}>°C</Text>
                </View>
                <View style={styles.hiLowContainer}>
                  <Text style={styles.hiLowText}>{t('home.weather.high')} <Text style={styles.hiText}>{weather ? Math.round(weather.highTemp) : '35'}°C</Text></Text>
                  <Text style={styles.hiLowText}>{t('home.weather.low')} <Text style={styles.lowText}>{weather ? Math.round(weather.lowTemp) : '15'}°C</Text></Text>
                </View>
              </View>

              <View style={styles.weatherDivider} />

              {/* Weather Metrics */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{t('home.weather.humidity')}</Text>
                  <Text style={styles.metricValue}>{weather ? `${weather.humidityPercentage}%` : '40%'}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{t('home.weather.precipitation')}</Text>
                  <Text style={styles.metricValue}>{weather ? `${weather.precipitationMl} ml` : '--'}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{t('home.weather.pressure')}</Text>
                  <Text style={styles.metricValue}>{weather ? `${weather.pressureHpa} hpa` : '--'}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{t('home.weather.wind')}</Text>
                  <Text style={styles.metricValue}>{weather ? `${weather.windMps} m/s` : '--'}</Text>
                </View>
              </View>

              {/* Sunrise / Sunset Arc */}
              <View style={styles.arcContainer}>
                <View style={styles.svgArcWrapper}>
                  <Svg height="40" width="100%" viewBox="0 0 280 40">
                    <Path
                      d="M 10 35 Q 140 2 270 35"
                      fill="none"
                      stroke="#D6CEC5"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  </Svg>
                  <View style={styles.sunIconWrapper}>
                    <Text style={styles.sunIcon}>☀️</Text>
                  </View>
                </View>
                <View style={styles.arcLabels}>
                  <View>
                    <Text style={styles.arcTime}>{weather?.sunriseTime || '5:25 am'}</Text>
                    <Text style={styles.arcTypeSunrise}>{t('home.weather.sunrise')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.arcTime}>{weather?.sunsetTime || '6:53 pm'}</Text>
                    <Text style={styles.arcTypeSunset}>{t('home.weather.sunset')}</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        {/* My Animals Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.sections.myAnimals')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/animals')}>
            <Text style={styles.viewAllText}>{t('home.sections.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          {isAnimalsLoading ? (
            <>
              <RowSkeleton />
              <RowSkeleton />
            </>
          ) : animals.length === 0 ? (
            <EmptyState
              compact
              title={t('home.animals.empty')}
              actionLabel={t('home.animals.addFirst')}
              onAction={() => router.push('/(tabs)/animals')}
            />
          ) : (
            animals.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.listItem,
                  idx < animals.length - 1 && styles.listItemBorderDashed,
                ]}
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/my-animal-detail',
                  params: { id: item.id }
                })}
              >
                <View style={styles.listItemLeft}>
                  <Image
                    source={item.image ? { uri: item.image } : animalImage(item.breed)}
                    style={styles.checkeredIcon}
                    contentFit="cover"
                  />
                  <View>
                    <Text style={styles.animalName}>{item.name}</Text>
                    <Text style={styles.animalBreed}>{item.breed}</Text>
                  </View>
                </View>
                <Text style={styles.arrowIcon}>→</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* My Appointments Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.sections.myAppointments')}</Text>
          <TouchableOpacity onPress={() => router.push('/my-appointments')}>
            <Text style={styles.viewAllText}>{t('home.sections.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          {upcomingAppointments.length === 0 ? (
            <EmptyState
              compact
              title={t('home.appointments.empty')}
              actionLabel={t('home.appointments.bookConsult')}
              onAction={() => router.push('/(tabs)/doctors')}
            />
          ) : (
            upcomingAppointments.map((appt, idx) => (
              <TouchableOpacity
                key={appt.id}
                style={[
                  styles.listItem,
                  idx < upcomingAppointments.length - 1 && styles.listItemBorderDashed,
                ]}
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/appointment-details',
                  params: { id: String(appt.id) },
                })}
              >
                <View style={styles.listItemLeft}>
                  <DoctorAvatar
                    name={appt.doctorName || t('home.appointments.doctor')}
                    avatar={appt.doctorAvatar}
                    size={44}
                    radius={22}
                    style={styles.checkeredIcon}
                  />
                  <View>
                    <Text style={styles.animalName}>
                      {appt.doctorName || t('home.appointments.doctor')}
                    </Text>
                    <Text style={styles.animalBreed}>
                      {appt.animalName || t('home.appointments.consultation')} · {new Date(appt.startAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
                <Text style={styles.arrowIcon}>→</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Today's Task Section */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 16, marginLeft: 24 }]}>{t('home.sections.todaysTask')}</Text>

        <View style={styles.listCard}>
          {isTasksLoading ? (
            <>
              <RowSkeleton />
              <RowSkeleton />
            </>
          ) : visibleTasks.length === 0 ? (
            <EmptyState compact title={t('home.tasks.empty')} />
          ) : (
            visibleTasks.map((task, idx) => (
              <View
                key={idx}
                style={[styles.taskItem, idx === visibleTasks.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={styles.taskItemLeft}>
                  <View style={styles.taskTextCol}>
                    <Text style={styles.taskTitle} numberOfLines={1}>
                      {task.title}
                    </Text>
                    {task.detail ? (
                      <Text style={styles.taskDetail} numberOfLines={2} ellipsizeMode="tail">
                        {task.detail}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.taskItemRight}>
                  <Text style={styles.taskTime}>{formatTaskTime(task.scheduledTime)}</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleTask(task.id)}
                    style={[styles.checkbox, task.isDone ? styles.checkboxChecked : styles.checkboxUnchecked]}
                  >
                    {task.isDone ? <Text style={styles.checkIcon}>✓</Text> : null}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.taskActionsRow}>
          <TouchableOpacity
            style={styles.addTaskBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/add-task')}
          >
            <Text style={styles.addTaskBtnText}>{t('home.tasks.add')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewAllTaskBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/my-task')}
          >
            <Text style={styles.viewAllTaskBtnText}>{t('home.tasks.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        {/* Refer to Friend & Earn Banner */}
        <View style={styles.referBanner}>
          <View style={styles.referLeft}>
            <Text style={styles.referTitle}>{t('home.referral.title')}</Text>
            <Text style={styles.referSub}>
              {referral && referral.totalEarned > 0
                ? t('home.referral.earned', { amount: referral.totalEarned, count: referral.referralCount })
                : t('home.referral.perReferral')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.referBtn} activeOpacity={0.8} onPress={shareReferral}>
                <Text style={styles.referBtnText}>{t('home.referral.referNow')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.referBtn}
                activeOpacity={0.8}
                onPress={() => setShowClaimInput((v) => !v)}
              >
                <Text style={styles.referBtnText}>{t('home.referral.haveCode')}</Text>
              </TouchableOpacity>
            </View>
            {showClaimInput ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TextInput
                  style={styles.claimInput}
                  placeholder={t('home.referral.enterCode')}
                  placeholderTextColor="#A39E99"
                  value={claimCode}
                  onChangeText={setClaimCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.referBtn, isClaiming && { opacity: 0.6 }]}
                  activeOpacity={0.8}
                  onPress={handleClaimReferral}
                  disabled={isClaiming}
                >
                  <Text style={styles.referBtnText}>{t('home.referral.claim')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          <Image
            source={require('@/assets/images/referral_badge.png')}
            style={styles.referImage}
            contentFit="contain"
          />
        </View>

      </ScrollView>

      <LanguageBottomSheet
        visible={showLangSheet}
        selectedLanguage={language}
        onClose={() => setShowLangSheet(false)}
        onSave={setLanguage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContainer: {
    paddingBottom: 110,
  },
  headerWrapper: {
    backgroundColor: '#BD632F',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  greetingText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  greetingBold: {
    fontWeight: '700',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginRight: 6,
  },
  dropdownArrow: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 38,
    gap: 6,
  },
  langTextHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notifBtnWhite: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bellIcon: {
    fontSize: 18,
  },
  weatherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 24,
    marginTop: -50,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  weatherCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  weatherLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherLocation: {
    fontSize: 14,
    fontWeight: '700',
    color: '#BD632F',
  },
  barnImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
    marginTop: -10,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -16,
    marginBottom: 14,
  },
  tempMainContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tempPlus: {
    fontSize: 40,
    fontWeight: '300',
    color: '#1A1817',
    marginRight: 2,
    lineHeight: 52,
  },
  tempText: {
    fontSize: 52,
    fontWeight: '600',
    color: '#1A1817',
    lineHeight: 56,
  },
  tempUnit: {
    fontSize: 22,
    fontWeight: '400',
    color: '#1A1817',
    marginTop: 4,
    marginLeft: 2,
  },
  hiLowContainer: {
    marginLeft: 16,
    justifyContent: 'center',
  },
  hiLowText: {
    fontSize: 12,
    color: '#BD632F',
    fontWeight: '600',
    lineHeight: 18,
  },
  hiText: {
    color: '#BD632F',
    fontWeight: '700',
  },
  lowText: {
    color: '#4A6FA5',
    fontWeight: '700',
  },
  weatherDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'flex-start',
  },
  metricLabel: {
    fontSize: 12,
    color: '#BD7D5B',
    fontWeight: '500',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  arcContainer: {
    marginTop: 8,
    position: 'relative',
    height: 65,
    width: '100%',
  },
  svgArcWrapper: {
    position: 'relative',
    width: '100%',
    height: 40,
  },
  sunIconWrapper: {
    position: 'absolute',
    right: '25%',
    top: -2,
  },
  sunIcon: {
    fontSize: 18,
  },
  arcLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  arcTime: {
    fontSize: 12,
    color: '#1A1817',
    fontWeight: '600',
  },
  arcTypeSunrise: {
    fontSize: 12,
    color: '#BD632F',
    fontWeight: '700',
    marginTop: 2,
  },
  arcTypeSunset: {
    fontSize: 12,
    color: '#4A6FA5',
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
  },
  viewAllText: {
    fontSize: 14,
    color: '#BD632F',
    fontWeight: '600',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 24,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  taskActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 12,
  },
  addTaskBtn: {
    flex: 1,
    backgroundColor: '#BD632F',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  addTaskBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  viewAllTaskBtn: {
    flex: 1,
    backgroundColor: '#F0EAE1',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllTaskBtnText: {
    color: '#1A1817',
    fontSize: 16,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  listItemBorderDashed: {
    borderBottomWidth: 1,
    borderBottomColor: '#E6E1DC',
    borderStyle: 'dashed',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkeredIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3EFE9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  animalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
  },
  animalBreed: {
    fontSize: 13,
    color: '#7C7672',
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 18,
    color: '#BD632F',
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE1',
  },
  taskItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  taskTextCol: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
    flexShrink: 1,
  },
  taskDetail: {
    fontSize: 13,
    color: '#7C7672',
    marginTop: 2,
    flexShrink: 1,
  },
  taskItemRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  taskTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1817',
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
  },
  checkboxUnchecked: {
    borderWidth: 1.5,
    borderColor: '#E6E1DC',
    backgroundColor: '#FFFFFF',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  referBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 20,
    marginHorizontal: 24,
    marginTop: 24,
    justifyContent: 'space-between',
  },
  referLeft: {
    flex: 1.5,
  },
  referTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 4,
  },
  referSub: {
    fontSize: 11,
    color: '#7C7672',
    marginBottom: 12,
  },
  referBtn: {
    backgroundColor: '#FFF0EA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  referBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BD632F',
  },
  claimInput: {
    flex: 1,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
    fontSize: 12,
    color: '#1A1817',
  },
  referImage: {
    width: 70,
    height: 70,
    marginLeft: 10,
    flex: 1,
  },
});