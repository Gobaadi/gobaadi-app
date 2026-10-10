import React, { useMemo } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
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
import { useGetBalanceQuery, useGetTransactionsQuery } from '@/store/walletApi';
import { useTranslation } from 'react-i18next';

const MAX_BAR_HEIGHT = 120;

const MOCK_WEEKLY_DATA = [
  { day: 'MON', labelKey: 'wallet.days.mon', value: 0.35 },
  { day: 'TUE', labelKey: 'wallet.days.tue', value: 0.55 },
  { day: 'WED', labelKey: 'wallet.days.wed', value: 0.45 },
  { day: 'THU', labelKey: 'wallet.days.thu', value: 0.7 },
  { day: 'FRI', labelKey: 'wallet.days.fri', value: 0.6 },
  { day: 'SAT', labelKey: 'wallet.days.sat', value: 0.9 },
  { day: 'SUN', labelKey: 'wallet.days.sun', value: 0.5 },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTransactionIcon(type: string): 'medkit' | 'shield-checkmark' | 'clipboard' | 'wallet' {
  switch (type) {
    case 'consultation': return 'medkit';
    case 'vaccination': return 'shield-checkmark';
    case 'checkup': return 'clipboard';
    default: return 'wallet';
  }
}

export default function WalletScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDoctor = useRequireDoctor();

  const {
    data: balanceData,
    isLoading: balanceLoading,
    isError: balanceError,
    refetch: refetchBalance,
  } = useGetBalanceQuery();
  const {
    data: transactionsData,
    isLoading: txLoading,
    isError: txError,
    refetch: refetchTransactions,
  } = useGetTransactionsQuery({ page: '1', limit: '10' });

  const totalEarnings = balanceData?.balance ?? 0;
  const thisMonthEarnings = useMemo(() => {
    if (!transactionsData) return 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactionsData
      .filter((tx) => new Date(tx.createdAt) >= startOfMonth && tx.type === 'credit')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactionsData]);

  const lastTransactionAmount = useMemo(() => {
    if (!transactionsData || transactionsData.length === 0) return 0;
    return transactionsData[0].amount;
  }, [transactionsData]);

  if (!isDoctor) return null;

  if (balanceLoading || txLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('wallet.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BD632F" />
        </View>
      </SafeAreaView>
    );
  }

  if (balanceError || txError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('wallet.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorText}>{t('wallet.loadError')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            activeOpacity={0.8}
            onPress={() => {
              if (balanceError) refetchBalance();
              if (txError) refetchTransactions();
            }}
          >
            <Text style={styles.retryBtnText}>{t('wallet.retry')}</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>{t('wallet.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.totalLabel}>{t('wallet.totalEarnings')}</Text>
          <Text style={styles.totalAmount}>${totalEarnings.toFixed(2)}</Text>

          <View style={styles.earningsRow}>
            <View>
              <Text style={styles.earningsLabel}>{t('wallet.thisMonth')}</Text>
              <View style={styles.earningsValue}>
                <Ionicons name="arrow-up" size={14} color="#4CAF50" />
                <Text style={styles.earningsGreen}>${thisMonthEarnings.toFixed(2)}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.earningsLabel}>{t('wallet.lastTransactions')}</Text>
              <Text style={styles.earningsValueText}>${lastTransactionAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <TouchableOpacity
          style={styles.paymentMethodRow}
          onPress={() => router.push('/payment-methods')}
          activeOpacity={0.8}
        >
          <Text style={styles.paymentMethodLabel}>{t('wallet.paymentMethod')}</Text>
          <View style={styles.paymentIcons}>
            <View style={[styles.paymentIcon, { backgroundColor: '#E53935' }]}>
              <Text style={styles.paymentIconText}>b</Text>
            </View>
            <View style={[styles.paymentIcon, { backgroundColor: '#FF9800' }]}>
              <Text style={styles.paymentIconText}>n</Text>
            </View>
            <View style={[styles.paymentIcon, { backgroundColor: '#1A1F71' }]}>
              <Text style={styles.paymentIconText}>V</Text>
            </View>
            <View style={[styles.paymentIcon, { backgroundColor: '#EB001B' }]}>
              <Text style={styles.paymentIconText}>M</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9C9690" />
        </TouchableOpacity>

        {/* 7 Days Performance */}
        <View style={styles.performanceSection}>
          <View style={styles.performanceHeader}>
            <Text style={styles.performanceTitle}>{t('wallet.performance')}</Text>
            <View style={styles.weeklyBadge}>
              <Text style={styles.weeklyText}>{t('wallet.weekly')}</Text>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {MOCK_WEEKLY_DATA.map((item, index) => (
              <View key={item.day} style={styles.barColumn}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(item.value * MAX_BAR_HEIGHT, 4),
                        backgroundColor: index === 5 ? '#8B5E3C' : '#BD632F',
                        opacity: index === 5 ? 1 : 0.7,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{t(item.labelKey)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <Text style={styles.sectionTitle}>{t('wallet.recentTransactions')}</Text>
        {!transactionsData || transactionsData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#9C9690" />
            <Text style={styles.emptyText}>{t('wallet.empty')}</Text>
          </View>
        ) : (
          transactionsData.slice(0, 5).map((tx) => (
            <View key={tx.id} style={styles.transactionCard}>
              <View style={styles.transactionLeft}>
                <View style={styles.transactionAvatar}>
                  <Ionicons name={getTransactionIcon(tx.description)} size={18} color="#BD632F" />
                </View>
                <View>
                  <Text style={styles.transactionName}>{tx.description || tx.type}</Text>
                  <Text style={styles.transactionDate}>{formatDate(tx.createdAt)}</Text>
                </View>
              </View>
              <Text style={[styles.transactionAmount, tx.type === 'debit' && styles.transactionAmountDebit]}>
                {tx.type === 'debit' ? '-' : '+'}${tx.amount.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500', color: '#DC2626', marginTop: 8 },
  retryBtn: { backgroundColor: '#BD632F', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 24, marginTop: 8 },
  retryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  totalLabel: { fontSize: 14, fontWeight: '500', color: '#7C7672', marginBottom: 4 },
  totalAmount: { fontSize: 36, fontWeight: '800', color: '#BD632F', marginBottom: 12 },
  earningsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6E1DC', padding: 16, marginBottom: 20 },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  earningsLabel: { fontSize: 12, fontWeight: '500', color: '#9C9690', marginBottom: 4 },
  earningsValue: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  earningsGreen: { fontSize: 16, fontWeight: '700', color: '#4CAF50' },
  earningsValueText: { fontSize: 16, fontWeight: '700', color: '#1A1817' },
  paymentMethodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6E1DC', padding: 16, marginBottom: 24 },
  paymentMethodLabel: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  paymentIcons: { flexDirection: 'row', gap: 6 },
  paymentIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  paymentIconText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  performanceSection: { marginBottom: 24 },
  performanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  performanceTitle: { fontSize: 16, fontWeight: '700', color: '#1A1817' },
  weeklyBadge: { backgroundColor: '#FFF2EB', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  weeklyText: { fontSize: 11, fontWeight: '700', color: '#BD632F' },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6E1DC', padding: 16 },
  barColumn: { alignItems: 'center', flex: 1 },
  barWrapper: { height: MAX_BAR_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: 24, borderRadius: 10 },
  barLabel: { fontSize: 10, fontWeight: '600', color: '#9C9690', marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1817', marginBottom: 12 },
  transactionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 10 },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  transactionAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center' },
  transactionName: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  transactionDate: { fontSize: 11, fontWeight: '500', color: '#9C9690' },
  transactionAmount: { fontSize: 15, fontWeight: '800', color: '#4CAF50' },
  transactionAmountDebit: { color: '#DC2626' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500', color: '#9C9690' },
});
