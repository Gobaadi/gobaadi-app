import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetDoctorsQuery } from '@/store/doctorsApi';
import { EmptyState } from '@/components/ui/empty-state';
import { MediaCardSkeleton } from '@/components/ui/skeleton';
import { useLocation } from '@/hooks/use-location';
import LocationBottomSheet from '@/components/LocationBottomSheet';

interface DoctorView {
  id: number;
  name: string;
  specialty: string;
  location: string;
  rating: number;
  reviews: number;
  image: any;
}

export default function AllDoctorsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const { location, setLocation } = useLocation();
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const { data: doctorList = [], isLoading } = useGetDoctorsQuery();

  const doctors: DoctorView[] = useMemo(() => {
    let filtered = doctorList.map((d) => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      location: 'Uttar Badda, Dhaka',
      rating: d.rating || 4.8,
      reviews: 124,
      image: d.avatar === 'jessica_doctor.png'
        ? require('@/assets/images/jessica_doctor.png')
        : require('@/assets/images/michael_doctor.png'),
    }));

    if (activeFilter !== 'All') {
      filtered = filtered.filter((d) =>
        d.specialty.toLowerCase().includes(activeFilter.toLowerCase())
      );
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [doctorList, activeFilter, searchText]);

  const totalCount = doctorList.length;
  const medicineCount = doctorList.filter((d) =>
    d.specialty?.toLowerCase().includes('medicine')
  ).length;
  const gynaeCount = doctorList.filter((d) =>
    d.specialty?.toLowerCase().includes('gynaecol') || d.specialty?.toLowerCase().includes('gynecol')
  ).length;

  const filterOptions = [
    { label: 'Filter', value: 'filter', icon: 'options-outline' as const },
    { label: `All (${totalCount})`, value: 'All', icon: null },
    { label: `Medicine(${medicineCount})`, value: 'Medicine', icon: null },
    { label: `Gynaecology(${gynaeCount})`, value: 'Gynaecology', icon: null },
  ];

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

        <Text style={styles.headerTitle}>All Doctors</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
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
          placeholder="Search doctor"
          placeholderTextColor="#A39E99"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Filter Chips Row */}
      <View style={styles.filterOuterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          {filterOptions.map((opt) => {
            const isActive = opt.value === activeFilter;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                  opt.value === 'filter' && styles.filterSettingsChip
                ]}
                onPress={() => {
                  if (opt.value === 'filter') {
                    setFilterModalVisible(true);
                  } else {
                    setActiveFilter(opt.value);
                  }
                }}
                activeOpacity={0.7}
              >
                {opt.icon && (
                  <Ionicons
                    name={opt.icon}
                    size={14}
                    color={isActive ? '#FFFFFF' : '#7C7672'}
                    style={styles.filterChipIcon}
                  />
                )}
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Doctor Cards Scroll List */}
      <ScrollView contentContainerStyle={styles.cardsScroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <>
            <MediaCardSkeleton imageSize={80} />
            <MediaCardSkeleton imageSize={80} />
            <MediaCardSkeleton imageSize={80} />
          </>
        ) : doctors.length === 0 ? (
          <EmptyState
            title="No doctors available"
            description="Check back soon — new vets are added regularly."
          />
        ) : (
        doctors.map((doc) => (
          <View key={doc.id} style={styles.doctorCard}>
            <View style={styles.doctorCardMain}>
              <Image source={doc.image} style={styles.doctorPortrait} />
              <View style={styles.doctorDetails}>
                <Text style={styles.doctorName}>{doc.name}</Text>
                <Text style={styles.doctorSpecialty}>{doc.specialty}</Text>
                <View style={styles.ratingLocationRow}>
                  <Ionicons name="location" size={12} color="#9C9690" style={styles.locationPin} />
                  <Text style={styles.locationTextMeta}>{doc.location}</Text>
                </View>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#F5A623" style={styles.starIcon} />
                  <Text style={styles.ratingValue}>{doc.rating}</Text>
                  <Text style={styles.reviewsText}>| {doc.reviews} Reviews</Text>
                </View>
              </View>
            </View>

            <View style={styles.doctorCardButtons}>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => router.push({ pathname: '/book-slot', params: { id: doc.id } })}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={14} color="#BD632F" style={styles.buttonIcon} />
                <Text style={styles.bookButtonText}>Book Slot</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => router.push({ pathname: '/doctor-detail', params: { id: doc.id } })}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={14} color="#BD632F" style={styles.buttonIcon} />
                <Text style={styles.detailsButtonText}>Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )))}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#1A1817" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filter Doctors</Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedSpecialties([]);
                setActiveFilter('All');
                setFilterModalVisible(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalClearBtn}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            <Text style={styles.modalSectionTitle}>Specialty</Text>
            <View style={styles.modalChipRow}>
              {['All', 'Medicine', 'Gynaecology', 'Surgery', 'Dermatology'].map((spec) => {
                const isActive = activeFilter === spec || selectedSpecialties.includes(spec);
                return (
                  <TouchableOpacity
                    key={spec}
                    style={[styles.modalChip, isActive && styles.modalChipActive]}
                    onPress={() => {
                      if (spec === 'All') {
                        setActiveFilter('All');
                        setSelectedSpecialties([]);
                      } else {
                        setActiveFilter(spec);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalChipText, isActive && styles.modalChipTextActive]}>
                      {spec}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalApplyBtn}
              onPress={() => setFilterModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalApplyBtnText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
    fontSize: 16,
    marginRight: 6,
    color: '#BD632F',
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
    fontSize: 16,
    marginRight: 10,
    color: '#7C7672',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#1A1817',
  },
  filterOuterContainer: {
    marginBottom: 20,
  },
  filterChipsRow: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterSettingsChip: {
    backgroundColor: '#FFFFFF',
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
  filterChipIcon: {
    marginRight: 4,
  },
  cardsScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0EAE1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorCardMain: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  doctorPortrait: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 16,
  },
  doctorDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: '#7C7672',
    marginBottom: 6,
  },
  ratingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationPin: {
    fontSize: 11,
    color: '#9C9690',
    marginRight: 4,
  },
  locationTextMeta: {
    fontSize: 11,
    color: '#9C9690',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  ratingValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 4,
  },
  reviewsText: {
    fontSize: 11,
    color: '#9C9690',
  },
  doctorCardButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  bookButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BD632F',
    height: 40,
    borderRadius: 20,
  },
  bookButtonText: {
    color: '#BD632F',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BD632F',
    height: 40,
    borderRadius: 20,
  },
  detailsButtonText: {
    color: '#BD632F',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonIcon: {
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E1DC',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
  },
  modalClearBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BD632F',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 12,
  },
  modalChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  modalChipActive: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  modalChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
  },
  modalChipTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E6E1DC',
  },
  modalApplyBtn: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
