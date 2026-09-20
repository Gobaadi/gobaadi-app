import React, { useMemo } from 'react';
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
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/store/authApi';
import { useGetMyProfileQuery } from '@/store/usersApi';
import { useGetMyDoctorProfileQuery, useGetDoctorBookingsQuery } from '@/store/doctorPortalApi';
import { useGetAnimalsQuery } from '@/store/animalsApi';
import { useGetBalanceQuery } from '@/store/walletApi';
import type { RootState, AppDispatch } from '@/store/store';

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const isDoctor = user?.role === 'doctor';

  // Farmer data
  const { data: userProfile } = useGetMyProfileQuery(undefined, { skip: isDoctor });
  const { data: animals = [] } = useGetAnimalsQuery(undefined, { skip: isDoctor });

  // Doctor data
  const { data: doctorProfile } = useGetMyDoctorProfileQuery(undefined, { skip: !isDoctor });
  const { data: doctorBookings = [] } = useGetDoctorBookingsQuery(undefined, { skip: !isDoctor });

  // Wallet data
  const { data: walletBalance } = useGetBalanceQuery();

  const uniquePatients = useMemo(() => {
    const patientIds = new Set(doctorBookings.map((b) => b.patientId));
    return patientIds.size;
  }, [doctorBookings]);

  const completedConsultations = useMemo(() => {
    return doctorBookings.filter((b) => b.status === 'COMPLETED').length;
  }, [doctorBookings]);

  // Animal counts for farmer
  const cowCount = animals.filter((a) => a.breed?.toLowerCase().includes('cow') || !a.breed?.toLowerCase().includes('buffalo') && !a.breed?.toLowerCase().includes('goat')).length || 0;
  const goatCount = animals.filter((a) => a.breed?.toLowerCase().includes('goat')).length || 0;
  const buffaloCount = animals.filter((a) => a.breed?.toLowerCase().includes('buffalo')).length || 0;

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
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
        <Text style={styles.headerTitle}>Profile</Text>

        {isDoctor ? (
          /* ==================== DOCTOR PROFILE ==================== */
          <>
            {/* Doctor Info Card */}
            <View style={styles.card}>
              <View style={styles.doctorInfoRow}>
                <View style={styles.avatarWrapper}>
                  <Image
                    source={doctorProfile?.avatar ? { uri: doctorProfile.avatar } : require('@/assets/images/doctor_avatar.png')}
                    style={styles.doctorAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.onlineBadge} />
                </View>
                <View style={styles.doctorDetails}>
                  <Text style={styles.doctorName}>
                    {doctorProfile?.name || user?.name || 'Dr. David Patel'}
                  </Text>
                  <Text style={styles.doctorSpecialty}>
                    {doctorProfile?.specialty || 'Veterinary Surgery'}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingScore}>{doctorProfile?.rating ?? '4.8'}</Text>
                    <Text style={styles.ratingCount}>({completedConsultations} reviews)</Text>
                  </View>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Patients</Text>
                  <Text style={styles.statNumber}>{uniquePatients}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Consultations</Text>
                  <Text style={styles.statNumber}>{completedConsultations}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Years Experience</Text>
                  <Text style={styles.statNumber}>
                    {doctorProfile?.experience || 0}
                  </Text>
                </View>
              </View>
            </View>

            {/* Wallet Section */}
            <Text style={styles.sectionTitle}>Wallet</Text>
            <TouchableOpacity
              style={styles.walletCard}
              activeOpacity={0.85}
              onPress={() => router.push('/wallet')}
            >
              <View style={styles.walletLeft}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="wallet-outline" size={20} color="#BD632F" />
                </View>
                <Text style={styles.walletLabel}>Total Earnings</Text>
              </View>
              <View style={styles.walletRight}>
                <Text style={styles.walletAmount}>${(walletBalance?.balance ?? 0).toFixed(2)}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9C9690" />
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
                  <Text style={styles.menuLabel}>Personal Information</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9C9690" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push(isDoctor ? '/doctor-notifications' : '/notifications')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="notifications-outline" size={20} color="#BD632F" />
                  </View>
                  <Text style={styles.menuLabel}>Notification</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9C9690" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/select-language')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="language-outline" size={20} color="#BD632F" />
                  </View>
                  <Text style={styles.menuLabel}>Language</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9C9690" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/help-support')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="chat-question-outline" size={20} color="#BD632F" />
                  </View>
                  <Text style={styles.menuLabel}>Help & Support</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9C9690" />
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
                  <Text style={[styles.menuLabel, styles.logoutLabel]}>Log Out</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#DC2626" />
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
                  source={require('@/assets/images/user_profile.png')}
                  style={styles.farmerAvatar}
                  contentFit="cover"
                />
                <View style={styles.farmerDetails}>
                  <Text style={styles.farmerName}>
                    {userProfile?.name || user?.name || 'Michal Wilson'}
                  </Text>
                  <Text style={styles.farmerLocation} numberOfLines={1}>
                    {userProfile?.phone || 'Location not added'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editBtn}
                  activeOpacity={0.8}
                  onPress={() => router.push('/edit-profile')}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                  <Ionicons name="pencil-outline" size={13} color="#4A4543" />
                </TouchableOpacity>
              </View>

              <View style={styles.cardDottedDivider} />

              {/* Animal Count Badges */}
              <View style={styles.animalCountRow}>
                <View style={[styles.countBadge, styles.cowBadge]}>
                  <Text style={[styles.countNumber, styles.cowNumber]}>
                    {String(cowCount).padStart(2, '0')}
                  </Text>
                  <Text style={styles.countLabel}>Cow</Text>
                </View>

                <View style={[styles.countBadge, styles.goatBadge]}>
                  <Text style={[styles.countNumber, styles.goatNumber]}>
                    {String(goatCount).padStart(2, '0')}
                  </Text>
                  <Text style={styles.countLabel}>Goat</Text>
                </View>

                <View style={[styles.countBadge, styles.buffaloBadge]}>
                  <Text style={[styles.countNumber, styles.buffaloNumber]}>
                    {String(buffaloCount).padStart(2, '0')}
                  </Text>
                  <Text style={styles.countLabel}>Buffalo</Text>
                </View>
              </View>
            </View>

            {/* Current Plan Card */}
            <TouchableOpacity
              style={styles.planCard}
              activeOpacity={0.85}
              onPress={() => router.push('/subscription')}
            >
              <View style={styles.planLeft}>
                <Text style={styles.planTitle}>Current Plan</Text>
                <Text style={styles.planPrice}>$99.00</Text>
                <Text style={styles.planBilling}>
                  Next Billing : <Text style={styles.planBillingBold}>Oct 15, 2026</Text>
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#7C7672" />
            </TouchableOpacity>

            {/* Farmer Menu Items */}
            <View >
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/my-task')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="calendar-outline" size={20} color="#BD632F" />
                  </View>
                  <Text style={styles.menuLabel}>My Task</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9C9690" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push(isDoctor ? '/doctor-notifications' : '/notifications')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="notifications-outline" size={20} color="#BD632F" />
                  </View>
                  <Text style={styles.menuLabel}>Notification</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9C9690" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/select-language')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="language-outline" size={20} color="#BD632F" />
                  </View>
                  <Text style={styles.menuLabel}>Language</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9C9690" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/refer-earn')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="gift-outline" size={20} color="#BD632F" />
                  </View>
                  <Text style={styles.menuLabel}>Refer & Earn</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9C9690" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/help-support')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="chat-question-outline" size={20} color="#BD632F" />
                  </View>
                  <Text style={styles.menuLabel}>Help & Support</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9C9690" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/legal-about')}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#BD632F" />
                  </View>
                  <Text style={styles.menuLabel}>Legal & About</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9C9690" />
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
                  <Text style={[styles.menuLabel, styles.logoutLabel]}>Log Out</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#DC2626" />
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
  planBillingBold: {
    fontWeight: '600',
    color: '#3D3835',
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
    fontSize: 14,
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
