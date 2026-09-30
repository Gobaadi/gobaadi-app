import { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetClinicsQuery } from '@/store/clinicsApi';
import { useGetDoctorBookingsQuery } from '@/store/doctorPortalApi';
import { useGetDoctorsQuery } from '@/store/doctorsApi';
import { useDebounce } from '@/hooks/use-debounce';
import { useLanguage } from '@/hooks/use-language';
import { useLocation } from '@/hooks/use-location';
import LocationBottomSheet from '@/components/LocationBottomSheet';

interface Category {
  id: string;
  name: string;
  icon: string;
}

function clinicImageSource(avatar?: string) {
  return avatar && avatar.startsWith('http')
    ? { uri: avatar }
    : require('@/assets/images/clinic_lobby.png');
}

interface DoctorView {
  id: number;
  name: string;
  specialty: string;
  location: string;
  rating: number;
  reviews: number;
  image: any;
}

export default function DoctorsScreen() {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState('General');
  const { data: clinics = [], isLoading: clinicsLoading } = useGetClinicsQuery();
  const { languageCode } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { location, setLocation } = useLocation();
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);

  const { data: appointments = [], isLoading: appointmentsLoading } = useGetDoctorBookingsQuery();
  const { data: doctors = [] } = useGetDoctorsQuery();

  const upcomingTreatment = useMemo(() => {
    const now = new Date();
    return appointments
      .filter(
        (a) =>
          (a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'RESCHEDULED') &&
          new Date(a.startAt) > now,
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null;
  }, [appointments]);

  const treatmentDoctor = useMemo(() => {
    if (!upcomingTreatment) return null;
    return doctors.find((d) => d.id === upcomingTreatment.doctorId) ?? null;
  }, [upcomingTreatment, doctors]);

  const hasUpcoming = upcomingTreatment !== null;

  const slideCount = hasUpcoming ? 2 : 1;
  const effectiveSlide = hasUpcoming ? activeSlide : 0;

  useEffect(() => {
    if (slideCount <= 1) return;
    const timer = setTimeout(
      () => setActiveSlide((prev) => (prev + 1) % slideCount),
      4000,
    );
    return () => clearTimeout(timer);
  }, [slideCount, activeSlide]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (slideCount <= 1) return;
          if (gestureState.dx < -40 && activeSlide < slideCount - 1) {
            setActiveSlide((prev) => prev + 1);
          } else if (gestureState.dx > 40 && activeSlide > 0) {
            setActiveSlide((prev) => prev - 1);
          }
        },
      }),
    [slideCount, activeSlide],
  );

  function formatTreatmentDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  function formatTreatmentTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  const categories: Category[] = [
    { id: '1', name: 'General', icon: '🩺' },
    { id: '2', name: 'Medicine', icon: '💊' },
    { id: '3', name: 'Surgery', icon: '🔪' },
    { id: '4', name: 'Gynaecology', icon: '🤰' },
    { id: '5', name: 'Avian & Co.', icon: '🐦' },
  ];

  const nearbyDoctors: DoctorView[] = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const category = activeCategory.toLowerCase();
    return doctors
      .filter(
        (d) =>
          (!q ||
            d.name.toLowerCase().includes(q) ||
            d.specialty.toLowerCase().includes(q)) &&
          d.specialty.toLowerCase().includes(category),
      )
      .map((d) => ({
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
  }, [doctors, debouncedSearch, activeCategory]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF9F6" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Doctors</Text>
          <View style={styles.headerRightControls}>
            <TouchableOpacity
              style={styles.langBadge}
              activeOpacity={0.8}
              onPress={() => router.push('/select-language')}
            >
              <Ionicons name="globe-outline" size={16} color="#BD632F" />
              <Text style={styles.langText}>{languageCode}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notificationButton}
              activeOpacity={0.8}
              onPress={() => router.push('/notifications')}
            >
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Location selector and My Treatment button */}
        <View style={styles.locationContainer}>
          <View>
            <Text style={styles.locationLabel}>Location</Text>
            <TouchableOpacity
              style={styles.locationSelector}
              activeOpacity={0.7}
              onPress={() => setLocationSheetOpen(true)}
            >
              <Text style={styles.pinIcon}>📍</Text>
              <Text style={styles.locationText}>{location}</Text>
              <Text style={styles.dropdownArrow}>∨</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.myTreatmentButton} activeOpacity={0.8} onPress={() => router.push('/my-treatment')}>
            <Text style={styles.treatmentIcon}>📅</Text>
            <Text style={styles.treatmentText}>My Treatment</Text>
          </TouchableOpacity>
        </View>

        <LocationBottomSheet
          visible={locationSheetOpen}
          selectedLocation={location}
          onClose={() => setLocationSheetOpen(false)}
          onSave={setLocation}
        />

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors..."
            placeholderTextColor="#A39E99"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#A39E99" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sliding Banners Section */}
        <View style={styles.sliderContainer}>
          {appointmentsLoading ? (
            <View style={styles.sliderLoading}>
              <ActivityIndicator size="small" color="#BD632F" />
            </View>
          ) : (
            <View {...(slideCount > 1 ? panResponder.panHandlers : {})}>
              {effectiveSlide === 0 && hasUpcoming && (
                /* Slide: Upcoming Treatment */
                <TouchableOpacity
                  style={styles.upcomingCard}
                  activeOpacity={0.95}
                  disabled
                >
                  <View style={styles.upcomingHeader}>
                    <Text style={styles.upcomingTitle}>Upcoming Treatment</Text>
                    <View style={styles.upcomingActions}>
                      <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() =>
                          router.push({ pathname: '/chat', params: { conversationId: String(upcomingTreatment?.doctorId) } })
                        }
                      >
                        <Text style={styles.actionEmoji}>💬</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.callButton}
                        activeOpacity={0.8}
                        onPress={() =>
                          router.push({
                            pathname: '/video-call',
                            params: { appointmentId: String(upcomingTreatment?.id) },
                          })
                        }
                      >
                        <Text style={styles.callIcon}>📹</Text>
                        <Text style={styles.callText}>Start Call</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.cardDividerDashed} />

                  <View style={styles.doctorQuickInfo}>
                    {treatmentDoctor?.avatar ? (
                      <Image source={{ uri: treatmentDoctor.avatar }} style={styles.doctorThumb} />
                    ) : (
                      <View style={[styles.doctorThumb, styles.doctorThumbPlaceholder]}>
                        <Text style={{ fontSize: 20 }}>👨‍⚕️</Text>
                      </View>
                    )}
                    <View style={styles.doctorMeta}>
                      <Text style={styles.quickDocName}>
                        {treatmentDoctor?.name ?? 'Doctor'}
                      </Text>
                      <Text style={styles.quickDocSpecialty}>
                        {treatmentDoctor?.specialty ?? ''}
                      </Text>
                      {upcomingTreatment && (
                        <Text style={styles.quickDocTime}>
                          {formatTreatmentTime(upcomingTreatment.startAt)} •{' '}
                          {formatTreatmentDate(upcomingTreatment.startAt)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Dots */}
                  {slideCount > 1 && (
                    <View style={styles.slideDots}>
                      <View style={[styles.slideDot, styles.slideDotActive]} />
                      <TouchableOpacity onPress={() => setActiveSlide(1)}>
                        <View style={[styles.slideDot, styles.slideDotInactive]} />
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {(effectiveSlide === 1 || !hasUpcoming) && (
                /* Slide: Analyze with AI */
                <TouchableOpacity
                  style={styles.aiCard}
                  activeOpacity={0.95}
                  disabled={slideCount <= 1}
                  onPress={() => {
                    if (slideCount > 1) setActiveSlide(0);
                  }}
                >
                  <View style={styles.aiCardContent}>
                    <View style={styles.aiLeftColumn}>
                      <Text style={styles.aiCardTitle}>Analyze with AI</Text>
                      <Text style={styles.aiCardSubtitle}>
                        Analyze your animals instantly with our latest AI Module
                      </Text>
                      <TouchableOpacity
                        style={styles.scanNowButton}
                        activeOpacity={0.8}
                        onPress={() => router.push('/ai-scan')}
                      >
                        <Text style={styles.scanNowIcon}>📷</Text>
                        <Text style={styles.scanNowText}>Scan Now</Text>
                      </TouchableOpacity>
                    </View>

                    <Image source={require('@/assets/images/analyzewithai.png')} style={styles.aiCowImage} />
                  </View>

                  {/* Dots */}
                  {slideCount > 1 && (
                    <View style={styles.slideDots}>
                      <TouchableOpacity onPress={() => setActiveSlide(0)}>
                        <View style={[styles.slideDot, styles.slideDotInactive]} />
                      </TouchableOpacity>
                      <View style={[styles.slideDot, styles.slideDotActive]} />
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={() => router.push('/all-doctors')}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {categories.map((cat) => {
            const isActive = cat.name === activeCategory;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, isActive && styles.categoryCardActive]}
                onPress={() => setActiveCategory(cat.name)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIconCircle, isActive && styles.categoryIconCircleActive]}>
                  <Text style={styles.categoryIconText}>{cat.icon}</Text>
                </View>
                <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Nearby Doctors Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Doctors</Text>
          <TouchableOpacity onPress={() => router.push('/all-doctors')}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        {nearbyDoctors.length === 0 ? (
          <View style={styles.emptyDoctorsContainer}>
            <Text style={styles.emptyDoctorsIcon}>👨‍⚕️</Text>
            <Text style={styles.emptyDoctorsText}>No doctors found</Text>
            <Text style={styles.emptyDoctorsSubtext}>
              {debouncedSearch.trim()
                ? 'Try a different name or specialty.'
                : doctors.length > 0
                  ? 'No doctors found in this category.'
                  : 'Check back soon — new vets are added regularly.'}
            </Text>
          </View>
        ) : (
          nearbyDoctors.map((doc) => (
            <View key={doc.id} style={styles.doctorCard}>
              <Image source={doc.image} style={styles.doctorPortrait} />
              <View style={styles.doctorDetails}>
                <Text style={styles.doctorName}>{doc.name}</Text>

                <View style={styles.doctorCardDivider} />

                <Text style={styles.doctorSpecialty}>{doc.specialty}</Text>

                <View style={styles.ratingLocationRow}>
                  <Text style={styles.locationPin}>📍</Text>
                  <Text style={styles.locationTextMeta}>{doc.location}</Text>
                </View>

                <View style={styles.ratingRow}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={styles.ratingValue}>{doc.rating}</Text>
                  <Text style={styles.reviewsText}>| {doc.reviews.toLocaleString()} Reviews</Text>
                </View>

                <View style={styles.doctorCardButtons}>
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => router.push({ pathname: '/book-slot', params: { id: doc.id } })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.bookButtonText}>📅 Book Slot</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() => router.push({ pathname: '/doctor-detail', params: { id: doc.id } })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.detailsButtonText}>📄 Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Nearby Medical Centers Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Medical Centers</Text>
          <TouchableOpacity onPress={() => router.push('/all-clinics')}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        {clinicsLoading ? (
          <View style={styles.emptyDoctorsContainer}>
            <ActivityIndicator size="small" color="#BD632F" />
          </View>
        ) : clinics.length === 0 ? (
          <View style={styles.emptyDoctorsContainer}>
            <Text style={styles.emptyDoctorsIcon}>🏥</Text>
            <Text style={styles.emptyDoctorsText}>No medical centers found</Text>
            <Text style={styles.emptyDoctorsSubtext}>
              Check back soon — new medical centers are added regularly.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.clinicsRow}
          >
            {clinics.map((clinic) => (
              <TouchableOpacity
                key={clinic.id}
                style={styles.clinicCard}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/doctor-detail', params: { id: String(clinic.doctors?.[0]?.id || clinic.id) } })}
              >
                <Image source={clinicImageSource(clinic.avatar)} style={styles.clinicCoverImage} />
                <View style={styles.clinicInfo}>
                  <View style={styles.clinicNameRow}>
                    <Text style={styles.clinicName} numberOfLines={1}>{clinic.name}</Text>
                    {clinic.isVerified && (
                      <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                    )}
                  </View>
                  <View style={styles.clinicLocationRow}>
                    <Text style={styles.clinicLocationPin}>📍</Text>
                    <Text style={styles.clinicLocation} numberOfLines={1}>{clinic.location}</Text>
                  </View>
                  <View style={styles.clinicRatingRow}>
                    <Text style={styles.clinicStarIcon}>⭐</Text>
                    <Text style={styles.clinicRatingValue}>{clinic.rating}</Text>
                    <Text style={styles.clinicDoctorCount}>| {clinic.doctors?.length || 0} Doctors</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1817',
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 40,
    gap: 6,
  },
  langGlobe: {
    fontSize: 14,
  },
  langText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BD632F',
  },
  notificationButton: {
    width: 40,
    height: 40,
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
  bellIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 11,
    color: '#9C9690',
    marginBottom: 2,
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
  dropdownArrow: {
    fontSize: 10,
    color: '#BD632F',
  },
  myTreatmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BD632F',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 38,
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  treatmentIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    marginRight: 6,
  },
  treatmentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 50,
    marginHorizontal: 24,
    paddingHorizontal: 16,
    marginBottom: 20,
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
  sliderContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sliderLoading: {
    height: 165,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorThumbPlaceholder: {
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingCard: {
    backgroundColor: '#BD632F',
    borderRadius: 24,
    padding: 18,
    position: 'relative',
    height: 165,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upcomingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  upcomingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionEmoji: {
    fontSize: 15,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 34,
  },
  callIcon: {
    fontSize: 12,
    marginRight: 4,
    color: '#BD632F',
  },
  callText: {
    color: '#BD632F',
    fontSize: 12,
    fontWeight: '700',
  },
  cardDividerDashed: {
    height: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  doctorCardDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E8E1D8',
    borderStyle: 'solid',
    marginVertical: 4,
  },
  doctorQuickInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorThumb: {
    width: 48,
    height: 48,
    borderRadius: 18,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorMeta: {
    flex: 1,
  },
  quickDocName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  quickDocSpecialty: {
    color: '#F4ECE6',
    fontSize: 12,
    marginTop: 2,
  },
  quickDocTime: {
    color: '#F4ECE6',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  slideDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
  },
  slideDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  slideDotActive: {
    backgroundColor: '#FFFFFF',
    width: 14,
  },
  slideDotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  aiCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 24,
    padding: 18,
    position: 'relative',
    height: 165,
    overflow: 'hidden',
  },
  aiCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
  },
  aiLeftColumn: {
    flex: 1.2,
    justifyContent: 'center',
    paddingRight: 130,
  },
  aiCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#BD632F',
    marginBottom: 4,
  },
  aiCardSubtitle: {
    fontSize: 11,
    color: '#7C7672',
    lineHeight: 15,
    marginBottom: 10,
  },
  scanNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BD632F',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 36,
    alignSelf: 'flex-start',
  },
  scanNowIcon: {
    fontSize: 12,
    color: '#FFFFFF',
    marginRight: 6,
  },
  scanNowText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  aiCowImage: {
    position: 'absolute',
    right: 0,
    top: 7,
    width: 241,
    height: 149,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
  },
  viewAllText: {
    fontSize: 14,
    color: '#BD632F',
    fontWeight: '600',
  },
  categoriesRow: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  categoryCard: {
    width: 80,
    height: 94,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCardActive: {
    borderColor: '#BD632F',
    borderWidth: 1.5,
    backgroundColor: '#FFF8F4',
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF9F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconCircleActive: {
    backgroundColor: '#FFFFFF',
  },
  categoryIconText: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: 11,
    color: '#9C9690',
    fontWeight: '600',
  },
  categoryLabelActive: {
    color: '#BD632F',
    fontWeight: '700',
  },
  emptyDoctorsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    marginBottom: 16,
  },
  emptyDoctorsIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyDoctorsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 4,
  },
  emptyDoctorsSubtext: {
    fontSize: 13,
    color: '#9C9690',
  },
  doctorCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  doctorPortrait: {
    width: 100,
    height: 115,
    borderRadius: 18,
    marginRight: 14,
  },
  doctorDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  doctorName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1817',
  },
  doctorSpecialty: {
    fontSize: 12.5,
    color: '#7C7672',
    marginTop: 2,
  },
  ratingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
    marginTop: 4,
    marginBottom: 8,
  },
  starIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 6,
  },
  reviewsText: {
    fontSize: 11,
    color: '#9C9690',
  },
  doctorCardButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#BD632F',
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  detailsButton: {
    flex: 1,
    backgroundColor: '#FFF8F5',
    borderWidth: 1,
    borderColor: '#BD632F',
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#BD632F',
    fontSize: 11.5,
    fontWeight: '700',
  },
  clinicsRow: {
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 8,
  },
  clinicCard: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  clinicCoverImage: {
    width: '100%',
    height: 130,
  },
  clinicInfo: {
    padding: 14,
  },
  clinicNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  clinicName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
    flex: 1,
  },
  clinicLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  clinicLocationPin: {
    fontSize: 10,
    color: '#9C9690',
    marginRight: 3,
  },
  clinicLocation: {
    fontSize: 11,
    color: '#9C9690',
    flex: 1,
  },
  clinicRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clinicStarIcon: {
    fontSize: 11,
    marginRight: 3,
  },
  clinicRatingValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 6,
  },
  clinicDoctorCount: {
    fontSize: 11,
    color: '#9C9690',
  },
});
