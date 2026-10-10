import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetClinicsQuery } from '@/store/clinicsApi';
import { EmptyState } from '@/components/ui/empty-state';
import { MediaCardSkeleton } from '@/components/ui/skeleton';
import { useLocation } from '@/hooks/use-location';
import LocationBottomSheet from '@/components/LocationBottomSheet';

function clinicImageSource(avatar?: string) {
  return avatar && avatar.startsWith('http')
    ? { uri: avatar }
    : require('@/assets/images/clinic_lobby.webp');
}

export default function AllClinicsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const { location, setLocation } = useLocation();
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const { data: clinicList = [], isLoading } = useGetClinicsQuery();

  const clinics = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return clinicList;
    return clinicList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q),
    );
  }, [clinicList, searchText]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('allClinics.title')}</Text>

        <TouchableOpacity
          style={styles.circleButton}
          activeOpacity={0.8}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Location bar */}
      <View style={styles.locationContainer}>
        <TouchableOpacity
          style={styles.locationSelector}
          activeOpacity={0.7}
          onPress={() => setLocationSheetOpen(true)}
        >
          <Ionicons name="location" size={16} color="#BD632F" style={styles.pinIcon} />
          <Text style={styles.locationText}>{location}</Text>
          <Ionicons name="chevron-down" size={14} color="#7C7672" />
        </TouchableOpacity>
      </View>

      <LocationBottomSheet
        visible={locationSheetOpen}
        selectedLocation={location}
        onClose={() => setLocationSheetOpen(false)}
        onSave={setLocation}
      />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#7C7672" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('allClinics.searchPlaceholder')}
          placeholderTextColor="#A39E99"
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchText('')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color="#A39E99" />
          </TouchableOpacity>
        )}
      </View>

      {/* Clinic Cards List */}
      <ScrollView contentContainerStyle={styles.cardsScroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <>
            <MediaCardSkeleton imageSize={120} />
            <MediaCardSkeleton imageSize={120} />
            <MediaCardSkeleton imageSize={120} />
          </>
        ) : clinics.length === 0 ? (
          <EmptyState
            title={t('allClinics.emptyTitle')}
            description={
              searchText.trim()
                ? t('allClinics.emptySearch')
                : t('allClinics.emptyNoSearch')
            }
          />
        ) : (
          clinics.map((clinic) => (
            <TouchableOpacity
              key={clinic.id}
              style={styles.clinicCard}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/doctor-detail',
                  params: { id: String(clinic.doctors?.[0]?.id || clinic.id) },
                })
              }
            >
              <Image source={clinicImageSource(clinic.avatar)} style={styles.clinicCoverImage} />
              <View style={styles.clinicInfo}>
                <View style={styles.clinicNameRow}>
                  <Text style={styles.clinicName} numberOfLines={1}>{clinic.name}</Text>
                  {clinic.isVerified && (
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  )}
                </View>
                <View style={styles.clinicLocationRow}>
                  <Ionicons name="location" size={12} color="#9C9690" style={styles.locationPin} />
                  <Text style={styles.clinicLocation} numberOfLines={1}>{clinic.location}</Text>
                </View>
                <View style={styles.clinicRatingRow}>
                  <Ionicons name="star" size={12} color="#F5A623" style={styles.starIcon} />
                  <Text style={styles.clinicRatingValue}>{clinic.rating}</Text>
                  <Text style={styles.clinicDoctorCount}>
                    {t('allClinics.doctors', { count: clinic.doctors?.length || 0 })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 12,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
  },
  locationContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIcon: {
    marginRight: 6,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 52,
    marginHorizontal: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#1A1817',
  },
  cardsScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  clinicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0EAE1',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  clinicCoverImage: {
    width: '100%',
    height: 150,
  },
  clinicInfo: {
    padding: 16,
  },
  clinicNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    flex: 1,
  },
  clinicLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationPin: {
    marginRight: 4,
  },
  clinicLocation: {
    fontSize: 13,
    color: '#9C9690',
    flex: 1,
  },
  starIcon: {
    marginRight: 4,
  },
  clinicRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clinicRatingValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 6,
  },
  clinicDoctorCount: {
    fontSize: 12,
    color: '#9C9690',
  },
});
