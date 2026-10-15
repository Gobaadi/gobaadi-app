import React, { useState } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useGetMyPatientsQuery } from '@/store/discountsApi';
import { useGetDoctorBookingsQuery } from '@/store/doctorPortalApi';
import { getLastAppointmentText } from '@/utils/last-appointment';
import { PatientAvatar } from '@/components/patient-avatar';
import { RegistrationBackground } from '@/components/registration-background';
import {
  backButtonSvg,
  discountDetailsMessageSvg,
  searchSvg,
} from '@/components/icons/svg-icon-sources';

type TabType = 'all' | 'discountGiven';

export default function ApplyDiscountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDoctor = useRequireDoctor();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: patients, isLoading } = useGetMyPatientsQuery({
    search: searchQuery || undefined,
    discountGiven: activeTab === 'discountGiven' ? 'true' : undefined,
  });
  const { data: bookings = [] } = useGetDoctorBookingsQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  if (!isDoctor) return null;

  const filteredPatients = (patients || []).filter((p) => !p.ownerOnly);
  const discountGivenCount =
    filteredPatients.filter((p) => p.discount?.isActive).length;

  return (
    <SafeAreaView style={styles.container}>
      <RegistrationBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('applyDiscount.title')}</Text>
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchContainer}>
          <SvgXml width={18} height={18} xml={searchSvg} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('applyDiscount.searchPlaceholder')}
            placeholderTextColor="#A39E99"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#BD632F" />
          <Text style={styles.infoText}>
            {t('applyDiscount.info')}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('applyDiscount.recentPatients')}</Text>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              {t('applyDiscount.allTab', { count: filteredPatients.length })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'discountGiven' && styles.tabActive]}
            onPress={() => setActiveTab('discountGiven')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'discountGiven' && styles.tabTextActive]}>
              {t('applyDiscount.discountGivenTab', { count: discountGivenCount })}
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#BD632F" />
          </View>
        ) : (
          filteredPatients.map((patient) => {
            const lastAppointment = getLastAppointmentText(bookings, patient.id);
            return (
              <TouchableOpacity
                key={patient.id}
                style={styles.patientCard}
                onPress={() =>
                  router.push({
                    pathname: '/discount',
                    params: {
                      patientId: patient.id.toString(),
                      patientName: patient.name,
                      ownerName: patient.ownerName || '',
                      patientImage: patient.image || '',
                      existingDiscount: patient.discount?.percent?.toString() || '0',
                    },
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.patientAvatarWrap}>
                  <PatientAvatar name={patient.name} image={patient.image} size={48} />
                  <View style={styles.patientAvatarBadge}>
                    <SvgXml width={18} height={18} xml={discountDetailsMessageSvg} />
                  </View>
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{patient.name}</Text>
                  <Text style={styles.patientOwner}>
                    {t('applyDiscount.owner', { name: patient.ownerName || 'N/A' })}
                  </Text>
                  {lastAppointment ? (
                    <Text style={styles.patientPhone}>
                      {t('applyDiscount.lastAppointment', { date: lastAppointment })}
                    </Text>
                  ) : null}
                </View>
                {patient.discount?.isActive && patient.discount?.percent ? (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>{patient.discount.percent}%</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color="#9C9690" />
              </TouchableOpacity>
            );
          })
        )}
        </KeyboardAwareScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1817',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1817',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF2EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#7C7672',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  tabActive: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C7672',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  patientAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  patientAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
  },
  patientOwner: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7C7672',
    marginTop: 2,
  },
  patientPhone: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9C9690',
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: '#FFF2EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discountBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BD632F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
});
