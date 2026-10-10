import React, { useState } from 'react';
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
import { useGetFaqsQuery } from '@/store/faqsApi';

type FaqTab = 'general' | 'doctor' | 'photo';

const TAB_MAP: Record<FaqTab, string> = {
  general: 'general',
  doctor: 'doctor',
  photo: 'photo',
};

const TAB_LABELS: Record<FaqTab, string> = {
  general: 'faqs.tabs.general',
  doctor: 'faqs.tabs.doctor',
  photo: 'faqs.tabs.photo',
};

export default function FAQsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<FaqTab>('general');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data: faqs, isLoading, isError } = useGetFaqsQuery({ category: TAB_MAP[activeTab] });

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('faqs.title')}</Text>
          <View style={{ width: 40 }} />
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
          <Text style={styles.headerTitle}>{t('faqs.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#9C9690" />
          <Text style={styles.errorText}>{t('faqs.loadError')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sortedFaqs = faqs ? [...faqs].sort((a, b) => a.sortOrder - b.sortOrder) : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('faqs.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabRow}>
        {(['general', 'doctor', 'photo'] as FaqTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => { setActiveTab(tab); setExpandedId(null); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {t(TAB_LABELS[tab])}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {sortedFaqs.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#9C9690" />
            <Text style={styles.emptyText}>{t('faqs.empty')}</Text>
          </View>
        )}

        {sortedFaqs.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.faqCard}
            onPress={() => toggleExpand(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Ionicons
                name={expandedId === item.id ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#7C7672"
              />
            </View>
            {expandedId === item.id && (
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabActive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BD632F' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#9C9690' },
  tabTextActive: { color: '#BD632F' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  faqCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 16, marginBottom: 10 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontSize: 14, fontWeight: '700', color: '#1A1817', flex: 1, marginRight: 8 },
  faqAnswer: { fontSize: 13, fontWeight: '500', color: '#7C7672', lineHeight: 19, marginTop: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500', color: '#9C9690' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500', color: '#9C9690' },
});
