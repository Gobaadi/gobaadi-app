import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/store/authApi';
import { useGetMyProfileQuery } from '@/store/usersApi';
import { useGetMyDoctorProfileQuery, useGetDashboardStatsQuery } from '@/store/doctorPortalApi';
import { useGetReviewsQuery } from '@/store/reviewsApi';
import { useGetAnimalsQuery } from '@/store/animalsApi';
import { useGetBalanceQuery } from '@/store/walletApi';
import type { RootState, AppDispatch } from '@/store/store';
import { DoctorAvatar } from '@/components/doctor-avatar';
import {
  profileEditSvg,
  profileArrowRightSvg,
  profileMyTaskSvg,
  profileNotificationSvg,
  profileLanguageSvg,
  profileHelpAndSupportSvg,
  profilePrivacyPolicySvg,
  profileLegalAndAboutSvg,
  tintSvg,
} from '@/components/icons/svg-icon-sources';
import { useTranslation } from '@/hooks/use-translation';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const isDoctor = user?.role === 'doctor';

  // Farmer data
  const { data: userProfile } = useGetMyProfileQuery(undefined, { skip: isDoctor });
  const { data: animals = [] } = useGetAnimalsQuery(undefined, { skip: isDoctor });

  // Doctor data
  const { data: doctorProfile } = useGetMyDoctorProfileQuery(undefined, { skip: !isDoctor });
  const { data: dashboardStats } = useGetDashboardStatsQuery(undefined, { skip: !isDoctor });
  const { data: doctorReviews = [] } = useGetReviewsQuery(
    { targetType: 'doctor', targetId: doctorProfile?.id ??0 },
    { skip: !isDoctor || !doctorProfile?.id },
  );

  // Wallet data
  const { data: walletBalance } = useGetBalanceQuery();

  // Subscription UI is intentionally hidden until the billing feature ships.

  const uniquePatients = dashboardStats?.totalPatients ?? 0;
  const completedConsultations = dashboardStats?.totalConsultations ?? 0;

  // Animal counts for farmer
  const cowCount = animals.filter((a) => a.breed?.toLowerCase().includes('cow') || !a.breed?.toLowerCase().includes('buffalo') && !a.breed?.toLowerCase().includes('goat')).length || 0;
  const goatCount = animals.filter((a) => a.breed?.toLowerCase().includes('goat')).length || 0;
  const buffaloCount = animals.filter((a) => a.breed?.toLowerCase().includes('buffalo')).length || 0;

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout.title'),
      t('profile.logout.msg'),
      [
        { text: t('profile.logout.cancel'), style: 'cancel' },
        {
          text: t('profile.logout.confirm'),
          style: 'destructive',
          onPress: async () => {
            await logout(dispatch);
            router.replace('/login');
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>{t('profile.header')}</Text>

        {isDoctor ? (
          /* ==================== DOCTOR PROFILE ==================== */
          <>
            {/* Doctor Info Card */}
            <View style={styles.card}>
              <View style={styles.doctorInfoRow}>
                <View style={styles.avatarWrapper}>
                  <DoctorAvatar
                    name={doctorProfile?.name || user?.name}
                    avatar={doctorProfile?.avatar}
                    size={68}
                    radius={34}
                    style={styles.doctorAvatar}
                  />
                  <View style={styles.onlineBadge} />
                </View>
                <View style={styles.doctorDetails}>
                  <Text style={styles.doctorName}>
                    {doctorProfile?.name || user?.name || t('profile.doctor.nameFallback')}
                  </Text>
                  <Text style={styles.doctorSpecialty}>
                    {doctorProfile?.specialty || t('profile.doctor.specialtyFallback')}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingScore}>{doctorProfile?.rating ?? '4.8'}</Text>
                    <Text style={styles.ratingCount}>{t('profile.doctor.reviews', { count: doctorReviews.length })}</Text>
                  </View>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t('profile.stats.patients')}</Text>
                  <Text style={styles.statNumber}>{uniquePatients}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t('profile.stats.consultations')}</Text>
                  <Text style={styles.statNumber}>{completedConsultations}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t('profile.stats.yearsExperience')}</Text>
                  <Text style={styles.statNumber}>
                    {doctorProfile?.experience || 0}
                  </Text>
                </View>
              </View>
            </View>

            {/* Wallet Section */}
            <Text style={styles.sectionTitle}>{t('profile.wallet.section')}</Text>
            <TouchableOpacity
              style={styles.walletCard}
              activeOpacity={0.85}
              onPress={() => router.push('/wallet')}
            >
              <View style={styles.walletLeft}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="wallet-outline" size={20} color="#BD632F" />
                </View>
                <Text style={styles.walletLabel}>{t('profile.wallet.totalEarnings')}</Text>
              </View>
              <View style={styles.walletRight}>
                <Text style={styles.walletAmount}>${(walletBalance?.balance ?? 0).toFixed(2)}</Text>
                <SvgXml width={9} height={18} xml={tintSvg(profileArrowRightSvg, '#737373', '#9C9690')} />
              </View>
            </TouchableOpacity>

            {/* Doctor Menu Items */}
            <View >
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/profile-details')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="person-outline" size={20} color="#BD632F" />
                  </View>
                  <Text style={styles.menuLabel}>{t('profile.menu.personalInformation')}</Text>
                </View>
                <SvgXml width={9} height={18} xml={tintSvg(profileArrowRightSvg, '#737373', '#9C9690')} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push(isDoctor ? '/doctor-notifications' : '/notifications')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <SvgXml width={22} height={22} xml={profileNotificationSvg} />
                  </View>
                  <Text style={styles.menuLabel}>{t('profile.menu.notification')}</Text>
                </View>
                <SvgXml width={9} height={18} xml={tintSvg(profileArrowRightSvg, '#737373', '#9C9690')} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/select-language')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <SvgXml width={22} height={22} xml={profileLanguageSvg} />
                  </View>
                  <Text style={styles.menuLabel}>{t('profile.menu.language')}</Text>
                </View>
                <SvgXml width={9} height={18} xml={tintSvg(profileArrowRightSvg, '#737373', '#9C9690')} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/help-support')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <SvgXml width={22} height={22} xml={profileHelpAndSupportSvg} />
                  </View>
                  <Text style={styles.menuLabel}>{t('profile.menu.helpSupport')}</Text>
                </View>
                <SvgXml width={9} height={18} xml={tintSvg(profileArrowRightSvg, '#737373', '#9C9690')} />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Farmer Log Out */}
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={handleLogout}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.iconCircle, styles.logoutCircle]}>
                    <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                  </View>
                  <Text style={[styles.menuLabel, styles.logoutLabel]}>{t('profile.menu.logout')}</Text>
                </View>
                <SvgXml width={9} height={18} xml={tintSvg(profileArrowRightSvg, '#737373', '#DC2626')} />
              </TouchableOpacity>

            </View>
          </>
        ) : (
          /* ==================== FARMER PROFILE ==================== */
          <>
            {/* Farmer Info Card */}
            <View style={styles.card}>
              <View style={styles.farmerTopRow}>
                <Image
                  source={
                    userProfile?.profilePhoto
                      ? { uri: userProfile.profilePhoto }
                      : userProfile?.avatar
                        ? { uri: userProfile.avatar }
                        : require('@/assets/images/user_profile.webp')
                  }
                  style={styles.farmerAvatar}
                  contentFit="cover"
                />
                <View style={styles.farmerDetails}>
                  <Text style={styles.farmerName}>
                    {userProfile?.name || user?.name || t('profile.farmer.nameFallback')}
                  </Text>
                  <Text style={styles.farmerLocation} numberOfLines={1}>
                    {userProfile?.phone || t('profile.farmer.locationFallback')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editBtn}
                  activeOpacity={0.8}
                  onPress={() => router.push('/edit-profile')}
                >
                  <Text style={styles.editBtnText}>{t('profile.menu.edit')}</Text>
                  <SvgXml width={13} height={13} xml={profileEditSvg} />
                </TouchableOpacity>
              </View>

              <View style={styles.cardDottedDivider} />

              {/* Animal Count Badges */}
              <View style={styles.animalCountRow}>
                <View style={[styles.countBadge, styles.cowBadge]}>
                  <Text style={[styles.countNumber, styles.cowNumber]}>
                    {String(cowCount).padStart(2, '0')}
                  </Text>
                  <Text style={styles.countLabel}>{t('profile.counts.cow')}</Text>
                </View>

                <View style={[styles.countBadge, styles.goatBadge]}>
                  <Text style={[styles.countNumber, styles.goatNumber]}>
                    {String(goatCount).padStart(2, '0')}
                  </Text>
                  <Text style={styles.countLabel}>{t('profile.counts.goat')}</Text>
                </View>

                <View style={[styles.countBadge, styles.buffaloBadge]}>
                  <Text style={[styles.countNumber, styles.buffaloNumber]}>
                    {String(buffaloCount).padStart(2, '0')}
                  </Text>
                  <Text style={styles.countLabel}>{t('profile.counts.buffalo')}</Text>
                </View>
              </View>
            </View>

            {/* Subscription section intentionally hidden until billing ships. */}

            {/* Farmer Menu Items */}
            <View >
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/my-task')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <SvgXml width={22} height={22} xml={profileMyTaskSvg} />
                  </View>
                  <Text style={styles.menuLabel}>{t('profile.menu.myTask')}</Text>
                </View>
                <SvgXml width={9} height={18} xml={tintSvg(profileArrowRightSvg, '#737373', '#9C9690')} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push(isDoctor ? '/doctor-notifications' : '/notifications')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <SvgXml width={22} height={22} xml={profileNotificationSvg} />
                  </View>
                  <Text style={styles.menuLabel}>{t('profile.menu.notification')}</Text>
                </View>
                <SvgXml width={9} height={18} xml={tintSvg(profileArrowRightSvg, '#737373', '#9C9690')} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/select-language')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <SvgXml width={22} height={22} xml={profileLanguageSvg} />
                  </View>
                  <Text style={styles.menuLabel}>{t('profile.menu.language')}</Text>
                </View>
                <SvgXml width={9} height={18} xml={tintSvg(profileArrowRightSvg, '#737373', '#9C9690')} />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Refer & Earn menu item intentionally hidden until the
                  referrals feature is functional (backend incomplete). */}

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/help-support')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <SvgXml width={22} height={22} xml={profileHelpAndSupportSvg} />
                  </View>
                  <Text style={styles.menuLabel}>{t('profile.menu.helpSupport')}</Text>
                </View>
                <SvgXml width={9} height={18} xml={tintSvg(profileArrowRightSvg, '#737373', '#9C9690')} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/privacy-policy')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <SvgXml width={22} height={22} xml={profilePrivacyPolicySvg} />
                  </View>
                  <Text style={styles.menuLabel}>{t('profile.menu.privacyPolicy')}</Text>
                </View>
                <SvgXml width={9} height={18} xml={tintSvg(profileArrowRightSvg, '#737373', '#9C9690')} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/legal-about')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <SvgXml width={22} height={22} xml={profileLegalAndAboutSvg} />
                  </View>
                  <Text style={styles.menuLabel}>{t('profile.menu.legalAbout')}</Text>
                </View>
                <SvgXml width={9} height={18} xml={tintSvg(profileArrowRightSvg, '#737373', '#9C9690')} />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Farmer Log Out */}
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={handleLogout}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.iconCircle, styles.logoutCircle]}>
                    <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                  </View>
                  <Text style={[styles.menuLabel, styles.logoutLabel]}>{t('profile.menu.logout')}</Text>
                </View>
                <SvgXml width={9} height={18} xml={tintSvg(profileArrowRightSvg, '#737373', '#DC2626')} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1817',
    marginBottom: 16,
  },

  /* Card Container */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EDE8E3',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  /* Doctor Card Styles */
  doctorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  doctorAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF2EB',
  },
  onlineBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1817',
  },
  doctorSpecialty: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7C7672',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  ratingScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1817',
  },
  ratingCount: {
    fontSize: 12,
    color: '#7C7672',
  },
  doctorLocation: {
    fontSize: 12,
    color: '#9C9690',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2EFEB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8C8682',
    marginBottom: 3,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1817',
  },

  /* Wallet */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 10,
    marginTop: 4,
  },
  subscriptionSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#BD632F',
    marginBottom: 8,
    marginTop: 4,
  },
  subscriptionDashedDivider: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E8E1D8',
    marginBottom: 12,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EDE8E3',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1817',
    marginLeft: 12,
  },
  walletRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#BD632F',
  },

  /* Farmer Card Styles */
  farmerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  farmerAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginRight: 12,
  },
  farmerDetails: {
    flex: 1,
  },
  farmerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1817',
  },
  farmerLocation: {
    fontSize: 12,
    color: '#7C7672',
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3EFEA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D3835',
  },
  cardDottedDivider: {
    height: 1,
    backgroundColor: '#EDE8E3',
    marginVertical: 14,
  },
  animalCountRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countBadge: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  cowBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  cowNumber: {
    color: '#2563EB',
  },
  goatBadge: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  goatNumber: {
    color: '#EA580C',
  },
  buffaloBadge: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FBCFE8',
  },
  buffaloNumber: {
    color: '#DB2777',
  },
  countNumber: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  countLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },

  /* Current Plan Card */
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EDE8E3',
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  planLeft: {
    flex: 1,
  },
  planTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#524D49',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1817',
    marginVertical: 2,
  },
  planBilling: {
    fontSize: 12,
    color: '#7C7672',
  },

  /* Menu Items */
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1817',
  },
  divider: {
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: '#E8E1D8'
  },
  logoutCircle: {
    backgroundColor: '#FEE2E2',
  },
  logoutLabel: {
    color: '#DC2626',
  },
});
