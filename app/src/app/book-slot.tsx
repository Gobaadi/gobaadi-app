import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetDoctorByIdQuery, useGetSlotsQuery, useBookSlotMutation } from '@/store/doctorsApi';
import { useRescheduleBookingMutation } from '@/store/doctorPortalApi';
import { useGetAnimalsQuery } from '@/store/animalsApi';
import { DoctorAvatar } from '@/components/doctor-avatar';
import { SvgXml } from 'react-native-svg';

import {
  backButtonSvg,
  confirmBookSvg,
  doctorCardLocationSvg,
  doctorCardStarSvg,
  doctorNotificationSvg,
} from '@/components/icons/svg-icon-sources';
import { useTranslation } from 'react-i18next';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

const VISIT_TYPES = [
  { value: 'Online', labelKey: 'bookSlot.visitTypes.online' },
  { value: 'Physical', labelKey: 'bookSlot.visitTypes.physical' },
] as const;

function visitTypeLabelKey(value: string): string {
  return VISIT_TYPES.find((type) => type.value === value)?.labelKey ?? value;
}

export default function BookSlotScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, appointmentId, mode } = useLocalSearchParams();
  const doctorId = String(id || '');
  const isReschedule = mode === 'reschedule' && !!appointmentId;
  const today = new Date();
  const [selectedVisitType, setSelectedVisitType] = useState('Online');
  const [showVisitTypeOptions, setShowVisitTypeOptions] = useState(false);
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingSymptoms, setBookingSymptoms] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [showAnimalOptions, setShowAnimalOptions] = useState(false);

  const { data: animals = [] } = useGetAnimalsQuery();

  // Auto-select when the farmer owns a single animal — derived during render
  // (no effect), so it updates as soon as the animals query resolves.
  const effectiveAnimalId =
    selectedAnimalId ?? (animals.length === 1 ? animals[0].id : null);

  const selectedDateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(selectedDay)}`;

  const { data: availableSlots = [], refetch: refetchSlots } = useGetSlotsQuery(
    { doctorId, date: selectedDateStr },
    { skip: !doctorId },
  );

  // Refetch slots when page opens
  React.useEffect(() => {
    if (doctorId) {
      refetchSlots();
    }
  }, [doctorId, refetchSlots]);

  React.useEffect(() => {
    if (availableSlots.length > 0 && !availableSlots.includes(selectedTimeSlot)) {
      setSelectedTimeSlot(availableSlots[0]);
    } else if (availableSlots.length === 0) {
      setSelectedTimeSlot('');
    }
  }, [availableSlots]);

  const { data: doctorData, isLoading: doctorLoading, isError: doctorError } = useGetDoctorByIdQuery(doctorId, { skip: !doctorId });
  const [bookSlot] = useBookSlotMutation();
  const [rescheduleBooking] = useRescheduleBookingMutation();

  const { data: myAnimals = [] } = useGetAnimalsQuery();

  const doctor = useMemo(() => {
    if (!doctorData) return null;
    return {
      id: String(doctorData.id),
      name: doctorData.name,
      specialty: doctorData.specialty,
      location: doctorData.location || '',
      rating: doctorData.rating,
      reviews: doctorData.reviewCount ?? 0,
      avatar: doctorData.avatar ?? '',
    };
  }, [doctorData]);

  const handleConfirmSlot = async () => {
    if (!selectedTimeSlot || !doctor) return;

    console.log("selectedTimeSlot", selectedTimeSlot)

    // Require booking reason
    if (!bookingReason.trim()) {
      Alert.alert(t('bookSlot.alerts.required'), t('bookSlot.alerts.enterReason'));
      return;
    }

    // Prescription / consultation flow needs the animal this visit is for.
    if (animals.length > 0 && !effectiveAnimalId) {
      Alert.alert(t('bookSlot.alerts.required'), t('bookSlot.alerts.selectPet'));
      return;
    }

    try {
      if (isReschedule) {
        await rescheduleBooking({
          id: String(appointmentId),
          date: selectedDateStr,
          time: selectedTimeSlot,
        }).unwrap();
        router.back();
        return;
      }
      await bookSlot({
        doctorId: doctor.id,
        date: selectedDateStr,
        time: selectedTimeSlot,
        animalId: effectiveAnimalId ?? undefined,
        consultationType: selectedVisitType === 'Online' ? 'online_video' : 'physical',
        ...(effectiveAnimalId ? { animalId: effectiveAnimalId } : {}),
        reasonForConsultation: bookingReason.trim(),
        symptoms: bookingSymptoms
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }).unwrap();
    } catch (err) {
      console.log('Error booking slot:', err);
      return;
    }
    router.push({
      pathname: '/confirm-booking',
      params: {
        id: doctor.id,
        timeSlot: selectedTimeSlot,
        day: selectedDay,
        visitType: selectedVisitType,
        reason: bookingReason,
      },
    });
  };

  // Custom Dec 2026 calendar data
  // Dec 1, 2026 starts on Tuesday
  const daysOfWeek = ['bookSlot.weekdays.sun', 'bookSlot.weekdays.mon', 'bookSlot.weekdays.tue', 'bookSlot.weekdays.wed', 'bookSlot.weekdays.thu', 'bookSlot.weekdays.fri', 'bookSlot.weekdays.sat'];

  // Grid layout helper:
  // Week rows representing Dec 2026:
  const calendarRows = [
    [26, 27, 28, 1, 2, 3, 4],     // Nov 26-28, Dec 1-4
    [5, 6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17, 18],
    [19, 20, 21, 22, 23, 24, 25],
    [26, 27, 28, 29, 30, 31, 1],  // Dec 26-31, Jan 1
  ];

  const handleDaySelect = (dayNum: number, rowIndex: number) => {
    // Prevent selecting previous/next month overflow dates
    if (rowIndex === 0 && dayNum > 20) return;
    if (rowIndex === 4 && dayNum === 1) return;
    setSelectedDay(dayNum);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{isReschedule ? t('bookSlot.reschedule') : t('bookSlot.title')}</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <SvgXml width={24} height={24} xml={doctorNotificationSvg} />
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {doctorLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BD632F" />
          <Text style={styles.loadingText}>{t('bookSlot.loading')}</Text>
        </View>
      )}

      {/* Error State */}
      {doctorError && !doctorLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.loadingText}>{t('bookSlot.doctorNotFound')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>{t('bookSlot.goBack')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {doctor && (
        <>
          <KeyboardAwareScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Doctor Summary Card */}
            <View style={styles.doctorCard}>
              <DoctorAvatar
                name={doctor.name}
                avatar={doctor.avatar}
                size={64}
                radius={14}
                style={styles.doctorPortrait}
              />
              <View style={styles.doctorDetails}>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                {doctor.location ? (
                  <View style={styles.ratingLocationRow}>
                    <SvgXml width={11} height={11} xml={doctorCardLocationSvg} style={styles.locationPin} />
                    <Text style={styles.locationTextMeta}>{doctor.location}</Text>
                  </View>
                ) : null}
                <View style={styles.ratingRow}>
                  <SvgXml width={11} height={11} xml={doctorCardStarSvg} style={styles.starIcon} />
                  <Text style={styles.ratingValue}>{doctor.rating}</Text>
                  {doctor.reviews > 0 && (
                    <Text style={styles.reviewsText}>{t('bookSlot.reviews', { count: doctor.reviews })}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Visit Type */}
            <Text style={styles.sectionTitle}>{t('bookSlot.visitType')}</Text>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              activeOpacity={0.8}
              onPress={() => setShowVisitTypeOptions((v) => !v)}
            >
              <Text style={styles.dropdownValue}>{t(visitTypeLabelKey(selectedVisitType))}</Text>
              <Text style={styles.dropdownArrow}>{showVisitTypeOptions ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showVisitTypeOptions && (
              <View style={styles.visitTypeMenu}>
                {VISIT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.visitTypeItem,
                      selectedVisitType === type.value && styles.visitTypeItemActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedVisitType(type.value);
                      setShowVisitTypeOptions(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.visitTypeItemText,
                        selectedVisitType === type.value && styles.visitTypeItemTextActive,
                      ]}
                    >
                      {t(type.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Select Pet — needed so doctor-side prescriptions link the right animal */}
            {animals.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t('bookSlot.selectPet')}</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  activeOpacity={0.8}
                  onPress={() => setShowAnimalOptions((v) => !v)}
                >
                  <Text style={styles.dropdownValue}>
                    {effectiveAnimalId
                      ? animals.find((a) => a.id === effectiveAnimalId)?.name || t('bookSlot.petFallback')
                      : t('bookSlot.choosePet')}
                  </Text>
                  <Text style={styles.dropdownArrow}>{showAnimalOptions ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showAnimalOptions && (
                  <View style={styles.visitTypeMenu}>
                    {animals.map((animal) => {
                      const isSelected = animal.id === effectiveAnimalId;
                      return (
                        <TouchableOpacity
                          key={animal.id}
                          style={[styles.visitTypeItem, isSelected && styles.visitTypeItemActive]}
                          activeOpacity={0.8}
                          onPress={() => {
                            setSelectedAnimalId(animal.id);
                            setShowAnimalOptions(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.visitTypeItemText,
                              isSelected && styles.visitTypeItemTextActive,
                            ]}
                          >
                            {animal.name}
                            {animal.breed ? ` · ${animal.breed}` : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {/* Booking Reason */}
            <Text style={styles.sectionTitle}>
              {t('bookSlot.bookingReason')} <Text style={{ color: '#E53935' }}>{t('bookSlot.required')}</Text>
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder={t('bookSlot.reasonPlaceholder')}
              placeholderTextColor="#A39E99"
              value={bookingReason}
              onChangeText={setBookingReason}
              multiline
              textAlignVertical="top"
            />

            {/* Symptoms (optional, comma-separated) */}
            <Text style={styles.sectionTitle}>{t('bookSlot.symptomsLabel')}</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder={t('bookSlot.symptomsPlaceholder')}
              placeholderTextColor="#A39E99"
              value={bookingSymptoms}
              onChangeText={setBookingSymptoms}
              multiline
              textAlignVertical="top"
            />

            {/* Date Selection */}
            <Text style={styles.sectionTitle}>{t('bookSlot.selectDate')}</Text>

            <View style={styles.calendarContainer}>
              {/* Calendar Month Header */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity><Text style={styles.navArrow}>‹</Text></TouchableOpacity>
                <Text style={styles.calendarMonthTitle}>{t('bookSlot.calendarMonth')}</Text>
                <TouchableOpacity><Text style={styles.navArrow}>›</Text></TouchableOpacity>
              </View>

              {/* Days of Week Header */}
              <View style={styles.weekdaysRow}>
                {daysOfWeek.map((day) => (
                  <Text key={day} style={styles.weekdayLabel}>{t(day)}</Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {calendarRows.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.calendarGridRow}>
                    {row.map((dayNum, colIndex) => {
                      const isCurrentMonth = !(
                        (rowIndex === 0 && dayNum > 20) ||
                        (rowIndex === 4 && dayNum === 1)
                      );
                      const isSelected = isCurrentMonth && dayNum === selectedDay;

                      return (
                        <TouchableOpacity
                          key={colIndex}
                          style={[
                            styles.calendarDayCell,
                            isSelected && styles.calendarDayCellSelected
                          ]}
                          onPress={() => handleDaySelect(dayNum, rowIndex)}
                          disabled={!isCurrentMonth}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.calendarDayText,
                              !isCurrentMonth && styles.calendarDayTextDisabled,
                              isSelected && styles.calendarDayTextSelected
                            ]}
                          >
                            {dayNum}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            {/* Time Slot Selection */}
            <View style={styles.timeSlotsHeader}>
              <Text style={styles.timeSlotsTitle}>{t('bookSlot.selectTimeSlot')}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeSlotsRow}
            >
              {availableSlots.length === 0 ? (
                <Text style={styles.noSlotsText}>{t('bookSlot.noSlots')}</Text>
              ) : null}
              {availableSlots.map((slot) => {
                const isSelected = slot === selectedTimeSlot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.timeSlotChip, isSelected && styles.timeSlotChipSelected]}
                    onPress={() => setSelectedTimeSlot(slot)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextSelected]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </KeyboardAwareScrollView>

          {/* Floating Bottom Confirm Button */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.confirmButton, (!selectedTimeSlot || !bookingReason.trim() || !doctor || (animals.length > 0 && !effectiveAnimalId)) && { opacity: 0.5 }]}
              onPress={handleConfirmSlot}
              disabled={!selectedTimeSlot || !bookingReason.trim() || !doctor || (animals.length > 0 && !effectiveAnimalId)}
              activeOpacity={0.85}
            >
              <SvgXml width={20} height={20} xml={confirmBookSvg} style={styles.confirmButtonIcon} />
              <Text style={styles.confirmButtonText}>
                {isReschedule ? t('bookSlot.confirmReschedule') : t('bookSlot.confirmSlot')}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#7C7672',
    marginTop: 12,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  backButton: {
    marginTop: 16,
    backgroundColor: '#BD632F',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 20,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    flexDirection: 'row',
  },
  doctorPortrait: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#7C7672',
    marginBottom: 4,
  },
  ratingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  locationPin: {
    marginRight: 4,
  },
  locationTextMeta: {
    fontSize: 10,
    color: '#9C9690',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 4,
  },
  ratingValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 4,
  },
  reviewsText: {
    fontSize: 10,
    color: '#9C9690',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 12,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  dropdownValue: {
    fontSize: 15,
    color: '#1A1817',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#BD632F',
  },
  visitTypeMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    marginTop: -14,
    marginBottom: 20,
    paddingVertical: 6,
    elevation: 3,
    zIndex: 10,
  },
  visitTypeItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F2EC',
  },
  visitTypeItemActive: {
    backgroundColor: '#FFF8F4',
  },
  visitTypeItemText: {
    fontSize: 14,
    color: '#1A1817',
    fontWeight: '500',
  },
  visitTypeItemTextActive: {
    color: '#BD632F',
    fontWeight: '700',
  },
  reasonInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 100,
    paddingHorizontal: 16,
    paddingTop: 14,
    fontSize: 14,
    color: '#1A1817',
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navArrow: {
    fontSize: 22,
    color: '#BD632F',
    fontWeight: '700',
    paddingHorizontal: 10,
  },
  calendarMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#9C9690',
  },
  calendarGrid: {
    gap: 8,
  },
  calendarGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayCellSelected: {
    backgroundColor: '#BD632F',
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1817',
  },
  calendarDayTextDisabled: {
    color: '#E0DCD8',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timeSlotsHeader: {
    marginBottom: 12,
  },
  timeSlotsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
  },
  timeSlotsRow: {
    gap: 8,
    paddingBottom: 8,
  },
  timeSlotChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E6E1DC',
  },
  timeSlotChipSelected: {
    backgroundColor: '#FFF8F4',
    borderColor: '#BD632F',
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
  },
  timeSlotTextSelected: {
    color: '#BD632F',
    fontWeight: '700',
  },
  noSlotsText: {
    fontSize: 13,
    color: '#9C9690',
    paddingVertical: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9E5DF',
  },
  confirmButton: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonIcon: {
    marginRight: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  animalChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  animalChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  animalChipSelected: {
    backgroundColor: '#BD632F',
    borderColor: '#BD632F',
  },
  animalChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1817',
  },
  animalChipTextSelected: {
    color: '#FFFFFF',
  },
});
