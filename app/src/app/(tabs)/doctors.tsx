import { useState, useMemo, useCallback, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import {
  languageGlobeSvg,
  doctorNotificationSvg,
  locationPinSvg,
  locationChevronSvg,
  treatmentCalendarSvg,
  searchSvg,
  messageSvg,
  videoCallSvg,
  scanCameraSvg,
  categoryGeneralSvg,
  categoryMedicineSvg,
  categorySurgerySvg,
  categoryGynaecologySvg,
  categoryAvianSvg,
  doctorCardLocationSvg,
  doctorCardStarSvg,
  doctorCardBookSlotSvg,
  doctorCardDetailsSvg,
  tintNavSvg,
  tintSvg,
} from '@/components/icons/svg-icon-sources';
import { useGetClinicsQuery } from '@/store/clinicsApi';
import { useGetDoctorBookingsQuery } from '@/store/doctorPortalApi';
import { useGetDoctorsQuery } from '@/store/doctorsApi';
import { useGetConversationsQuery, useCreateConversationMutation } from '@/store/chatApi';
import { useDebounce } from '@/hooks/use-debounce';
import { useGetForAppointmentQuery } from '@/store/consultationsApi';
import { useCallSignalingContext } from '@/components/IncomingCallProvider';
import { useLanguage } from '@/hooks/use-language';
import { useLocation } from '@/hooks/use-location';
import LocationBottomSheet from '@/components/LocationBottomSheet';
import { DoctorAvatar } from '@/components/doctor-avatar';
import { useTranslation } from '@/hooks/use-translation';

interface Category {
  id: string;
  name: string;
  labelKey: string;
  svg: string;
}

function clinicImageSource(avatar?: string) {
  return avatar && avatar.startsWith('http')
    ? { uri: avatar }
    : require('@/assets/images/clinic_lobby.webp');
}

interface DoctorView {
  id: number;
  name: string;
  specialty: string;
  location: string;
  rating: number;
  reviews: number;
  avatar: string;
}

export default function DoctorsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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

  const upcomingTreatments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter(
        (a) =>
          (a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'RESCHEDULED') &&
          new Date(a.endAt) > now,
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [appointments]);

  // Carousel layout: one slide per upcoming appointment, AI banner last.
  const treatmentCount = upcomingTreatments.length;
  const slideCount = treatmentCount + 1;
  const effectiveSlide =
    activeSlide >= 0 && activeSlide < slideCount ? activeSlide : 0;

  // The appointment shown on the current treatment slide (slides 0..treatmentCount-1).
  const activeTreatment = upcomingTreatments[effectiveSlide] ?? null;

  const treatmentDoctor = useMemo(() => {
    if (!activeTreatment) return null;
    return doctors.find((d) => d.id === activeTreatment.doctorId) ?? null;
  }, [activeTreatment, doctors]);

  const { data: conversations = [] } = useGetConversationsQuery();
  const [createConversation] = useCreateConversationMutation();

  const handleOpenChat = useCallback(async () => {
    if (!activeTreatment) return;
    const appointment = activeTreatment;
    const existing = conversations.find(
      (c) =>
        c.appointmentId === appointment.id ||
        (c.doctorId === appointment.doctorId && c.patientId === appointment.patientId),
    );
    let conversationId = existing?.id;
    if (!conversationId) {
      try {
        const created = await createConversation({
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
        }).unwrap();
        conversationId = created.id;
      } catch {
        Alert.alert(t('doctors.alerts.startChatError.title'), t('doctors.alerts.startChatError.msg'));
        return;
      }
    }
    router.push({
      pathname: '/chat',
      params: {
        conversationId: String(conversationId),
        appointmentId: String(appointment.id),
        patientName: appointment.patientName || t('doctors.fallback.patient'),
        peerName: appointment.doctorName || treatmentDoctor?.name || t('doctors.fallback.doctor'),
        animalImage: appointment.animalImage || '',
        theirAvatar: appointment.doctorAvatar || '',
      },
    });
  }, [activeTreatment, conversations, treatmentDoctor, createConversation, router, t]);

  const { ringCall } = useCallSignalingContext();

  // Calls are gated on an active (ONGOING) consultation — same rule as chat.
  const { data: treatmentConsultation } = useGetForAppointmentQuery(
    activeTreatment ? String(activeTreatment.id) : '',
    { skip: !activeTreatment },
  );

  /**
   * Ring the doctor (socket callStarted), then join the call screen and
   * wait in the Agora channel until the doctor accepts.
   */
  const handleStartCall = useCallback(() => {
    if (!activeTreatment) return;
    if (treatmentConsultation?.status !== 'ONGOING') {
      Alert.alert(
        t('doctors.alerts.consultationNotStarted.title'),
        t('doctors.alerts.consultationNotStarted.msg'),
      );
      return;
    }
    ringCall(activeTreatment.id);
    router.push({
      pathname: '/video-call',
      params: { appointmentId: String(activeTreatment.id) },
    });
  }, [activeTreatment, treatmentConsultation, ringCall, router, t]);

  // Keep the slide index in range when the list shrinks (e.g. an appointment
  // is completed/cancelled while the user is on a later treatment slide).
  // Corrected during render — not in an effect — so the visible slide is never
  // stale; React re-runs the render immediately with the fixed index.
  if (activeSlide > slideCount - 1) {
    setActiveSlide(0);
  }

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

  // One dot per slide (each upcoming appointment + the AI banner).
  const renderDots = () => {
    if (slideCount <= 1) return null;
    return (
      <View style={styles.slideDots}>
        {Array.from({ length: slideCount }, (_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setActiveSlide(i)}
            disabled={i === effectiveSlide}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            accessibilityLabel={`Go to slide ${i + 1}`}
          >
            <View
              style={[
                styles.slideDot,
                i === effectiveSlide ? styles.slideDotActive : styles.slideDotInactive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  function formatTreatmentDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  function formatTreatmentTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  const categories: Category[] = [
    { id: '1', name: 'General', labelKey: 'doctors.categories.general', svg: categoryGeneralSvg },
    { id: '2', name: 'Medicine', labelKey: 'doctors.categories.medicine', svg: categoryMedicineSvg },
    { id: '3', name: 'Surgery', labelKey: 'doctors.categories.surgery', svg: categorySurgerySvg },
    { id: '4', name: 'Gynaecology', labelKey: 'doctors.categories.gynaecology', svg: categoryGynaecologySvg },
    { id: '5', name: 'Avian & Co.', labelKey: 'doctors.categories.avian', svg: categoryAvianSvg },
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
        avatar: d.avatar ?? '',
      }));
  }, [doctors, debouncedSearch, activeCategory]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF9F6" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('doctors.title')}</Text>
          <View style={styles.headerRightControls}>
            <TouchableOpacity
              style={styles.langBadge}
              activeOpacity={0.8}
              onPress={() => router.push('/select-language')}
            >
              <SvgXml width={16} height={16} xml={tintSvg(languageGlobeSvg, 'white', '#BD632F')} />
              <Text style={styles.langText}>{languageCode}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notificationButton}
              activeOpacity={0.8}
              onPress={() => router.push('/notifications')}
            >
              <SvgXml width={20} height={20} xml={doctorNotificationSvg} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Location selector and My Treatment button */}
        <View style={styles.locationContainer}>
          <View>
            <Text style={styles.locationLabel}>{t('doctors.locationLabel')}</Text>
            <TouchableOpacity
              style={styles.locationSelector}
              activeOpacity={0.7}
              onPress={() => setLocationSheetOpen(true)}
            >
              <SvgXml width={15} height={17} xml={locationPinSvg} style={{ marginRight: 6 }} />
              <Text style={styles.locationText}>{location}</Text>
              <SvgXml width={12} height={12} xml={locationChevronSvg} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.myTreatmentButton} activeOpacity={0.8} onPress={() => router.push('/my-treatment')}>
            <SvgXml width={14} height={14} xml={treatmentCalendarSvg} style={{ marginRight: 6 }} />
            <Text style={styles.treatmentText}>{t('doctors.myTreatment')}</Text>
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
          <SvgXml width={18} height={18} xml={searchSvg} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('doctors.searchPlaceholder')}
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
              {upcomingTreatments.map((appointment, index) =>
                effectiveSlide === index ? (
                  /* Slide: Upcoming Treatment (one per booked appointment) */
                  <TouchableOpacity
                    key={appointment.id}
                    style={styles.upcomingCard}
                    activeOpacity={0.95}
                    onPress={handleOpenChat}
                  >
                    <View style={styles.upcomingHeader}>
                      <Text style={styles.upcomingTitle}>{t('doctors.upcomingTreatment')}</Text>
                      <View style={styles.upcomingActions}>
                        <TouchableOpacity
                          style={styles.chatButton}
                          onPress={handleOpenChat}
                        >
                          <SvgXml width={16} height={16} xml={messageSvg} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.callButton}
                          activeOpacity={0.8}
                          onPress={handleStartCall}
                        >
                          <SvgXml width={14} height={14} xml={videoCallSvg} style={{ marginRight: 4 }} />
                          <Text style={styles.callText}>{t('doctors.startCall')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.cardDividerDashed} />

                    <View style={styles.doctorQuickInfo}>
                      <DoctorAvatar
                        name={treatmentDoctor?.name}
                        avatar={treatmentDoctor?.avatar}
                        size={48}
                        radius={18}
                        style={styles.doctorThumb}
                      />
                      <View style={styles.doctorMeta}>
                        <Text style={styles.quickDocName}>
                          {treatmentDoctor?.name ?? t('doctors.fallback.doctor')}
                        </Text>
                        <Text style={styles.quickDocSpecialty}>
                          {treatmentDoctor?.specialty ?? ''}
                        </Text>
                        <Text style={styles.quickDocTime}>
                          {formatTreatmentTime(appointment.startAt)} •{' '}
                          {formatTreatmentDate(appointment.startAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Dots */}
                    {renderDots()}
                  </TouchableOpacity>
                ) : null,
              )}

              {effectiveSlide === treatmentCount && (
                /* Slide: Analyze with AI */
                <TouchableOpacity
                  key="ai-banner"
                  style={styles.aiCard}
                  activeOpacity={0.95}
                  disabled={slideCount <= 1}
                  onPress={() => {
                    if (slideCount > 1) setActiveSlide(0);
                  }}
                >
                  <View style={styles.aiCardContent}>
                    <View style={styles.aiLeftColumn}>
                      <Text style={styles.aiCardTitle}>{t('doctors.ai.title')}</Text>
                      <Text style={styles.aiCardSubtitle}>
                        {t('doctors.ai.subtitle')}
                      </Text>
                      <TouchableOpacity
                        style={styles.scanNowButton}
                        activeOpacity={0.8}
                        onPress={() => router.push('/ai-scan')}
                      >
                        <SvgXml width={14} height={14} xml={scanCameraSvg} style={{ marginRight: 6 }} />
                        <Text style={styles.scanNowText}>{t('doctors.ai.scanNow')}</Text>
                      </TouchableOpacity>
                    </View>

                    <Image source={require('@/assets/images/analyzewithai.webp')} style={styles.aiCowImage} />
                  </View>

                  {/* Dots */}
                  {renderDots()}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('doctors.sections.categories')}</Text>
          <TouchableOpacity onPress={() => router.push('/all-doctors')}>
            <Text style={styles.viewAllText}>{t('doctors.viewAll')}</Text>
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
                  <SvgXml
                    width={26}
                    height={26}
                    xml={isActive ? tintNavSvg(cat.svg, '#BD632F') : cat.svg}
                  />
                </View>
                <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                  {t(cat.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Nearby Doctors Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('doctors.sections.nearbyDoctors')}</Text>
          <TouchableOpacity onPress={() => router.push('/all-doctors')}>
            <Text style={styles.viewAllText}>{t('doctors.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        {nearbyDoctors.length === 0 ? (
          <View style={styles.emptyDoctorsContainer}>
            <Text style={styles.emptyDoctorsIcon}>👨‍⚕️</Text>
            <Text style={styles.emptyDoctorsText}>{t('doctors.empty.noDoctors')}</Text>
            <Text style={styles.emptyDoctorsSubtext}>
              {debouncedSearch.trim()
                ? t('doctors.empty.searchSubtext')
                : doctors.length > 0
                  ? t('doctors.empty.categorySubtext')
                  : t('doctors.empty.checkBack')}
            </Text>
          </View>
        ) : (
          nearbyDoctors.map((doc) => (
            <View key={doc.id} style={styles.doctorCard}>
              <DoctorAvatar
                name={doc.name}
                avatar={doc.avatar}
                size={100}
                radius={18}
                style={styles.doctorPortrait}
              />
              <View style={styles.doctorDetails}>
                <Text style={styles.doctorName}>{doc.name}</Text>

                <View style={styles.doctorCardDivider} />

                <Text style={styles.doctorSpecialty}>{doc.specialty}</Text>

                <View style={styles.ratingLocationRow}>
                  <SvgXml width={12} height={12} xml={doctorCardLocationSvg} style={{ marginRight: 4 }} />
                  <Text style={styles.locationTextMeta}>{doc.location}</Text>
                </View>

                <View style={styles.ratingRow}>
                  <SvgXml width={12} height={12} xml={doctorCardStarSvg} style={{ marginRight: 4 }} />
                  <Text style={styles.ratingValue}>{doc.rating}</Text>
                  <Text style={styles.reviewsText}>| {t('doctors.reviews', { count: doc.reviews })}</Text>
                </View>

                <View style={styles.doctorCardButtons}>
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => router.push({ pathname: '/book-slot', params: { id: doc.id } })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.bookButtonContent}>
                      <SvgXml width={14} height={14} xml={doctorCardBookSlotSvg} style={{ marginRight: 6 }} />
                      <Text style={styles.bookButtonText}>{t('doctors.bookSlot')}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() => router.push({ pathname: '/doctor-detail', params: { id: doc.id } })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.bookButtonContent}>
                      <SvgXml width={14} height={14} xml={doctorCardDetailsSvg} style={{ marginRight: 6 }} />
                      <Text style={styles.detailsButtonText}>{t('doctors.details')}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Nearby Medical Centers Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('doctors.sections.nearbyCenters')}</Text>
          <TouchableOpacity onPress={() => router.push('/all-clinics')}>
            <Text style={styles.viewAllText}>{t('doctors.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        {clinicsLoading ? (
          <View style={styles.emptyDoctorsContainer}>
            <ActivityIndicator size="small" color="#BD632F" />
          </View>
        ) : clinics.length === 0 ? (
          <View style={styles.emptyDoctorsContainer}>
            <Text style={styles.emptyDoctorsIcon}>🏥</Text>
            <Text style={styles.emptyDoctorsText}>{t('doctors.empty.noCenters')}</Text>
            <Text style={styles.emptyDoctorsSubtext}>
              {t('doctors.empty.centersCheckBack')}
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
                    <SvgXml width={11} height={11} xml={doctorCardLocationSvg} style={{ marginRight: 3 }} />
                    <Text style={styles.clinicLocation} numberOfLines={1}>{clinic.location}</Text>
                  </View>
                  <View style={styles.clinicRatingRow}>
                    <SvgXml width={11} height={11} xml={doctorCardStarSvg} style={{ marginRight: 3 }} />
                    <Text style={styles.clinicRatingValue}>{clinic.rating}</Text>
                    <Text style={styles.clinicDoctorCount}>| {t('doctors.clinicDoctors', { count: clinic.doctors?.length || 0 })}</Text>
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
  locationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 4,
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
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 34,
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
  bookButtonContent: {
    flexDirection: 'row',
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
  clinicLocation: {
    fontSize: 11,
    color: '#9C9690',
    flex: 1,
  },
  clinicRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
