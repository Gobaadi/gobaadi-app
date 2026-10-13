import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { useGetDoctorsQuery } from '@/store/doctorsApi';
import { useLocation } from '@/hooks/use-location';
import LocationBottomSheet from '@/components/LocationBottomSheet';
import {
  useGetDoctorBookingsQuery,
  type DoctorAppointment,
  type AppointmentStatus,
} from '@/store/doctorPortalApi';
import { useGetServiceQuery } from '@/store/servicesApi';
import { useGetReviewsQuery } from '@/store/reviewsApi';
import { DoctorAvatar } from '@/components/doctor-avatar';
import {
  doctorCardStarSvg,
  locationChevronSvg,
  locationPinSvg,
  searchSvg,
} from '@/components/icons/svg-icon-sources';
import { useTranslation } from 'react-i18next';

interface Treatment {
  id: string;
  appointmentId: number;
  doctorId: number;
  name: string;
  specialty: string;
  rating: number;
  avatar: string;
  location?: string;
  date: string;
  bookedOn: string;
  status: AppointmentStatus;
  consultationType: string;
  serviceId?: number;
  price: number;
  paymentStatus?: string;
  startAt: string;
  endAt: string;
  raw: DoctorAppointment;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isUpcoming(status: AppointmentStatus): boolean {
  return status === 'PENDING' || status === 'CONFIRMED' || status === 'RESCHEDULED';
}

function isOnlineConsultation(consultationType?: string): boolean {
  return (
    !!consultationType &&
    (consultationType.startsWith('online_') || consultationType === 'online')
  );
}

function formatPrice(price: number): string {
  return Number.isInteger(price) ? String(price) : price.toFixed(2);
}

function formatCount(count: number): string {
  return String(count).padStart(2, '0');
}

function TreatmentCard({ item, onPress }: { item: Treatment; onPress: () => void }) {
  const { t } = useTranslation();
  const { data: service } = useGetServiceQuery(item.serviceId ?? 0, {
    skip: !item.serviceId,
  });
  const { data: reviews = [] } = useGetReviewsQuery(
    { targetType: 'doctor', targetId: item.doctorId },
    { skip: !item.doctorId },
  );

  const online = isOnlineConsultation(item.consultationType);
  const upcoming = isUpcoming(item.status);
  const serviceName = service?.name || t('myTreatment.consultation');

  return (
    <TouchableOpacity
      style={styles.treatmentCard}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Top Card Row */}
      <View style={styles.cardHeader}>
        <DoctorAvatar
          name={item.name}
          avatar={item.avatar}
          size={68}
          radius={16}
          style={styles.cardImage}
        />
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.doctorName}>{item.name}</Text>
            <View
              style={[styles.typeBadge, online ? styles.badgeOnline : styles.badgePhysical]}
            >
              <Text
                style={[
                  styles.badgeText,
                  online ? styles.badgeTextOnline : styles.badgeTextPhysical,
                ]}
              >
                {online ? t('myTreatment.online') : t('myTreatment.physical')}
              </Text>
            </View>
          </View>

          <Text style={styles.doctorSpecialty}>{item.specialty}</Text>

          <View style={styles.ratingLocationRow}>
            {item.location ? (
              <View style={styles.cardLocationRow}>
                <SvgXml width={12} height={14} xml={locationPinSvg} />
                <Text style={styles.cardLocationText} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            ) : null}
            <View style={styles.cardRatingRow}>
              <SvgXml width={13} height={13} xml={doctorCardStarSvg} />
              <Text style={styles.cardRatingText}>
                {item.rating.toFixed(1)} ({reviews.length})
              </Text>
            </View>
          </View>

          {/* Detail Info Rows */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <Text style={styles.gridLabel}>{t('myTreatment.service')}</Text>
              <Text style={styles.gridValue}>{serviceName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.gridLabel}>{t('myTreatment.date')}</Text>
              <Text style={styles.gridValue}>{item.date}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.gridLabel}>{t('myTreatment.bookedOn')}</Text>
              <Text style={styles.gridValue}>{item.bookedOn}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Card Row */}
      <View style={styles.cardFooter}>
        <View
          style={[
            styles.statusIndicatorBadge,
            upcoming ? styles.statusUpcoming : styles.statusCompleted,
          ]}
        >
          <Text
            style={[
              styles.statusIndicatorText,
              upcoming ? styles.statusTextUpcoming : styles.statusTextCompleted,
            ]}
          >
            {upcoming ? t('myTreatment.status.upcoming') : t('myTreatment.status.completed')}
          </Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.currencySymbol}>৳</Text>
          <Text style={styles.priceAmount}>{formatPrice(item.price)}</Text>
          {item.paymentStatus === 'paid' && (
            <Text style={styles.paidBadge}>{t('myTreatment.paid')}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MyTreatmentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Upcoming' | 'Medicine'>('All');
  const [activeVisitTab, setActiveVisitTab] = useState<'online' | 'physical'>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const { location, setLocation } = useLocation();
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);

  const { data: appointments = [] } = useGetDoctorBookingsQuery();
  const { data: doctors = [] } = useGetDoctorsQuery();

  const doctorsById = useMemo(
    () => Object.fromEntries(doctors.map((d) => [d.id, d])),
    [doctors],
  );

  const treatments: Treatment[] = useMemo(
    () =>
      appointments.map((a) => {
        const doctor = doctorsById[a.doctorId];
        return {
          id: String(a.id),
          appointmentId: a.id,
          doctorId: a.doctorId,
          name: a.doctorName || doctor?.name || t('myTreatment.defaultDoctor'),
          specialty: a.doctorSpecialty || doctor?.specialty || '',
          rating: doctor?.rating || 0,
          avatar: a.doctorAvatar || doctor?.avatar || '',
          location: doctor?.location,
          date: formatDate(a.startAt),
          bookedOn: formatDate(a.createdAt),
          status: a.status,
          consultationType: a.consultationType || 'online_video',
          serviceId: a.serviceId ?? undefined,
          price: a.price ?? 0,
          paymentStatus: a.paymentStatus,
          startAt: a.startAt,
          endAt: a.endAt,
          raw: a,
        };
      }),
    [appointments, doctorsById, t],
  );

  const filterCounts = useMemo(
    () => ({
      All: treatments.length,
      Upcoming: treatments.filter((item) => isUpcoming(item.status)).length,
      Medicine: treatments.filter((item) =>
        item.specialty?.toLowerCase().includes('medicine'),
      ).length,
    }),
    [treatments],
  );

  const filteredTreatments = treatments.filter((item) => {
    if (activeFilter === 'Upcoming' && !isUpcoming(item.status)) return false;
    if (activeFilter === 'Medicine' && !item.specialty?.toLowerCase().includes('medicine')) return false;

    // Filter by visit type tab
    if (activeVisitTab === 'online') {
      if (!isOnlineConsultation(item.consultationType)) return false;
    } else if (activeVisitTab === 'physical') {
      if (item.consultationType !== 'physical') return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matches =
        item.name.toLowerCase().includes(query) ||
        item.specialty.toLowerCase().includes(query);
      if (!matches) return false;
    }

    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerSquareBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('myTreatment.title')}</Text>

        <TouchableOpacity
          style={styles.headerSquareBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Location selector */}
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>{t('myTreatment.location')}</Text>
          <TouchableOpacity
            style={styles.locationSelector}
            activeOpacity={0.7}
            onPress={() => setLocationSheetOpen(true)}
          >
            <SvgXml width={14} height={16} xml={locationPinSvg} style={{ marginRight: 6 }} />
            <Text style={styles.locationText}>{location}</Text>
            <SvgXml width={14} height={14} xml={locationChevronSvg} />
          </TouchableOpacity>
        </View>

        <LocationBottomSheet
          visible={locationSheetOpen}
          selectedLocation={location}
          onClose={() => setLocationSheetOpen(false)}
          onSave={setLocation}
        />

        {/* Search Field */}
        <View style={styles.searchBar}>
          <SvgXml width={20} height={20} xml={searchSvg} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.textInput}
            placeholder={t('myTreatment.searchPlaceholder')}
            placeholderTextColor="#A39E99"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Online / Physical Visit Tabs */}
        <View style={styles.visitTabsContainer}>
          <TouchableOpacity
            style={[styles.visitTab, activeVisitTab === 'online' && styles.visitTabActive]}
            onPress={() => setActiveVisitTab('online')}
            activeOpacity={0.7}
          >
            <Text style={[styles.visitTabText, activeVisitTab === 'online' && styles.visitTabTextActive]}>
              {t('myTreatment.onlineVisit')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.visitTab, activeVisitTab === 'physical' && styles.visitTabActive]}
            onPress={() => setActiveVisitTab('physical')}
            activeOpacity={0.7}
          >
            <Text style={[styles.visitTabText, activeVisitTab === 'physical' && styles.visitTabTextActive]}>
              {t('myTreatment.physicalVisit')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {(['All', 'Upcoming', 'Medicine'] as const).map((filter) => {
            const isSelected = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {t(`myTreatment.filters.${filter.toLowerCase()}`)} ({formatCount(filterCounts[filter])})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Treatment card List */}
        <View style={styles.listContainer}>
          {filteredTreatments.length === 0 ? (
            <Text style={styles.emptyText}>
              {appointments.length === 0
                ? t('myTreatment.empty.none')
                : searchQuery
                  ? t('myTreatment.empty.noMatch')
                  : t('myTreatment.empty.notFound')}
            </Text>
          ) : (
            filteredTreatments.map((item) => (
              <TreatmentCard
                key={item.id}
                item={item}
                onPress={() =>
                  router.push({ pathname: '/doctor-detail', params: { id: String(item.doctorId) } })
                }
              />
            ))
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 20,
  },
  headerSquareBtn: {
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
    flex: 1,
    marginLeft: 12,
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
  },
  locationContainer: {
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 12,
    color: '#9C9690',
    fontWeight: '500',
    marginBottom: 4,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#1A1817',
  },
  visitTabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E1DC',
  },
  visitTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  visitTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#BD632F',
    marginBottom: -1,
  },
  visitTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C9690',
  },
  visitTabTextActive: {
    color: '#BD632F',
    fontWeight: '700',
  },
  filtersScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  filterChipActive: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 16,
  },
  treatmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF9F6',
    paddingBottom: 16,
  },
  cardImage: {
    width: 68,
    height: 68,
    borderRadius: 16,
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 2,
  },
  doctorName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeOnline: {
    backgroundColor: '#E3F2FD',
  },
  badgePhysical: {
    backgroundColor: '#F3E5F5',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextOnline: {
    color: '#1976D2',
  },
  badgeTextPhysical: {
    color: '#7B1FA2',
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#7C7672',
    marginBottom: 6,
  },
  ratingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 8,
    gap: 4,
  },
  cardLocationText: {
    fontSize: 11,
    color: '#9C9690',
    flexShrink: 1,
  },
  cardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  cardRatingText: {
    fontSize: 11,
    color: '#9C9690',
  },
  detailsGrid: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 11,
    color: '#9C9690',
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1817',
    textAlign: 'right',
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  statusIndicatorBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusUpcoming: {
    backgroundColor: '#FFF8F4',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  statusIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextUpcoming: {
    color: '#BD632F',
  },
  statusTextCompleted: {
    color: '#2E7D32',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1817',
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1817',
  },
  paidBadge: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#9C9690',
    textAlign: 'center',
    paddingVertical: 40,
  },
});
