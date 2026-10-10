import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetMyReferralQuery } from '@/store/referralsApi';
import { useTranslation } from 'react-i18next';

export default function ReferEarnScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: referralInfo, isLoading, isError } = useGetMyReferralQuery();

  async function handleShare() {
    try {
      const message = referralInfo?.shareLink
        ? t('referEarn.shareWithLink', { link: referralInfo.shareLink })
        : t('referEarn.shareWithCode', { code: referralInfo?.referralCode || '' });
      await Share.share({ message });
    } catch (err) {
      console.log('Error sharing:', err);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('referEarn.title')}</Text>
          <View style={{ width: 42 }} />
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('referEarn.title')}</Text>
          <View style={{ width: 42 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#9C9690" />
          <Text style={styles.errorText}>{t('referEarn.loadError')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('referEarn.title')}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCard}>
          <Text style={styles.cardHeading}>{t('referEarn.heading')}</Text>
          <Text style={styles.rewardSubtitle}>{t('referEarn.subtitle')}</Text>

          <View style={styles.illustrationCircle}>
            <Text style={styles.farmerEmoji}>👨‍🌾</Text>
          </View>

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>{t('referEarn.codeLabel')}</Text>
            <Text style={styles.codeValue}>{referralInfo?.referralCode || t('referEarn.codeFallback')}</Text>
          </View>

          <View style={styles.dashedDivider} />

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{referralInfo?.referralCount ?? 0}</Text>
              <Text style={styles.statLabel}>{t('referEarn.referrals')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>${referralInfo?.totalEarned ?? 0}</Text>
              <Text style={styles.statLabel}>{t('referEarn.totalEarned')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>${referralInfo?.pendingAmount ?? 0}</Text>
              <Text style={styles.statLabel}>{t('referEarn.pending')}</Text>
            </View>
          </View>

          <View style={styles.dashedDivider} />

          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <Text style={styles.stepText}>
                {t('referEarn.step1')}
              </Text>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <Text style={styles.stepText}>
                {t('referEarn.step2')}
              </Text>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <Text style={styles.stepText}>
                {t('referEarn.step3')}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.85}>
          <Text style={styles.actionBtnText}>{t('referEarn.action')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  scrollContainer: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, marginBottom: 20 },
  backBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1817' },
  mainCard: { backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E6E1DC', padding: 24, alignItems: 'center', marginBottom: 24 },
  cardHeading: { fontSize: 18, fontWeight: '700', color: '#1A1817', marginBottom: 8 },
  rewardSubtitle: { fontSize: 13, color: '#7C7672', marginBottom: 20 },
  illustrationCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#687834', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  farmerEmoji: { fontSize: 54 },
  codeBox: { width: '100%', backgroundColor: '#FFF2EB', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  codeLabel: { fontSize: 12, color: '#7C7672', fontWeight: '500', marginBottom: 4 },
  codeValue: { fontSize: 22, fontWeight: '800', color: '#1A1817', letterSpacing: 1 },
  dashedDivider: { width: '100%', height: 1, borderWidth: 1, borderColor: '#E6E1DC', borderStyle: 'dashed', marginBottom: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#BD632F', marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '500', color: '#9C9690' },
  statDivider: { width: 1, backgroundColor: '#E6E1DC', marginVertical: 4 },
  stepsList: { width: '100%', gap: 16 },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start' },
  stepBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  stepNumber: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, color: '#1A1817', fontWeight: '500', lineHeight: 18 },
  actionBtn: { backgroundColor: '#BD632F', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500', color: '#9C9690' },
});
