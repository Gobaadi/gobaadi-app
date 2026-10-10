import React from 'react';
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
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetMyTicketsQuery, type Ticket } from '@/store/supportApi';
import { apiErrorMessage } from '@/utils/api-error';

type Translate = ReturnType<typeof useTranslation>['t'];

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const STATUS_META: Record<string, { labelKey: string; bg: string; fg: string }> = {
  open: { labelKey: 'myReports.status.open', bg: '#EEF3F9', fg: '#1565C0' },
  'in-progress': { labelKey: 'myReports.status.inProgress', bg: '#FFF2EB', fg: '#BD632F' },
  closed: { labelKey: 'myReports.status.closed', bg: '#EAF5EB', fg: '#2E7D32' },
};

function formatDate(iso: string, t: Translate): string {
  const d = new Date(iso);
  return `${t(`myReports.months.${MONTH_KEYS[d.getMonth()]}`)} ${d.getDate()}, ${d.getFullYear()}`;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const meta = STATUS_META[status] ?? {
    labelKey: status,
    bg: '#F5F2EC',
    fg: '#7C7672',
  };
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.fg }]}>{t(meta.labelKey)}</Text>
    </View>
  );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardSubject} numberOfLines={2}>
          {ticket.subject}
        </Text>
        <StatusBadge status={ticket.status} />
      </View>
      <Text style={styles.cardDate}>{formatDate(ticket.createdAt, t)}</Text>
      {!!ticket.message && (
        <Text style={styles.cardMessage} numberOfLines={3}>
          {ticket.message}
        </Text>
      )}
      {!!ticket.attachmentFileName && (
        <View style={styles.attachmentRow}>
          <Ionicons name="document-attach-outline" size={15} color="#BD632F" />
          <Text style={styles.attachmentName} numberOfLines={1}>
            {ticket.attachmentFileName}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function MyReportsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    data: tickets,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGetMyTicketsQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('myReports.title')}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#BD632F"
            style={{ marginTop: 40 }}
          />
        ) : isError ? (
          <View style={styles.stateContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color="#E6E1DC" />
            <Text style={styles.stateText}>
              {apiErrorMessage(error, t('myReports.loadError'))}
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => refetch()}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>{t('myReports.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : !tickets?.length ? (
          <View style={styles.stateContainer}>
            <Ionicons name="flag-outline" size={48} color="#E6E1DC" />
            <Text style={styles.stateTitle}>{t('myReports.empty.title')}</Text>
            <Text style={styles.stateText}>{t('myReports.empty.description')}</Text>
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => router.push('/report-issues')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.reportBtnText}>{t('myReports.reportIssue')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.countText}>
              {t('myReports.count', { count: tickets.length })}
              {isFetching ? ` ${t('myReports.updating')}` : ''}
            </Text>
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    marginBottom: 20,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1817',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9C9690',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardSubject: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDate: {
    fontSize: 12,
    color: '#9C9690',
    fontWeight: '500',
    marginTop: 4,
  },
  cardMessage: {
    fontSize: 13,
    color: '#7C7672',
    lineHeight: 19,
    marginTop: 8,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#FFF8F4',
    borderWidth: 1,
    borderColor: '#F0DFD4',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  attachmentName: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1817',
  },
  stateContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginTop: 4,
  },
  stateText: {
    fontSize: 14,
    color: '#9C9690',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#BD632F',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#BD632F',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  reportBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
