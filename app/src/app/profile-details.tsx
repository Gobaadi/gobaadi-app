import React, { useState, useMemo } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { profileEditSvg, doctorProfileCardStarSvg } from '@/components/icons/svg-icon-sources';
import * as ImagePicker from 'expo-image-picker';
import { useGetDoctorBookingsQuery, useGetMyDoctorProfileQuery, useUpdateQualificationsMutation, useUpdateSpecializationsMutation, useUploadCredentialDocumentMutation, useUpdateCredentialDocumentsMutation, useUpdateProfileMutation } from '@/store/doctorPortalApi';
import { useGetMyProfileQuery } from '@/store/usersApi';
import { useGetAddressesQuery } from '@/store/addressesApi';
import { useGetReviewsQuery } from '@/store/reviewsApi';
import { compressImageForUpload } from '@/utils/compress-image';
import { DoctorAvatar } from '@/components/doctor-avatar';
import { MonthYearPickerModal } from '@/components/month-year-picker';
import { useTranslation } from '@/hooks/use-translation';

type Tab = 'about' | 'experience' | 'credentials';

export default function ProfileDetailsScreen() {
  // Doctor data
  const { t } = useTranslation();
  const router = useRouter();
  const isDoctor = useRequireDoctor();
  const [activeTab, setActiveTab] = useState<Tab>('about');

  const { data: doctorProfile } = useGetMyDoctorProfileQuery(undefined, { skip: !isDoctor });
  const { data: doctorBookings = [] } = useGetDoctorBookingsQuery(undefined, { skip: !isDoctor });
  const { data: userProfile } = useGetMyProfileQuery(undefined, { skip: !isDoctor });
  const { data: reviews = [] } = useGetReviewsQuery(
    { targetType: 'doctor', targetId: doctorProfile?.id ?? 0 },
    { skip: !isDoctor || !doctorProfile?.id }
  );

  const [updateQualifications] = useUpdateQualificationsMutation();
  const [updateSpecializations] = useUpdateSpecializationsMutation();
  const [uploadCredentialDocument] = useUploadCredentialDocumentMutation();
  const [updateCredentialDocuments] = useUpdateCredentialDocumentsMutation();
  const [updateProfile] = useUpdateProfileMutation();
  const { data: addresses = [] } = useGetAddressesQuery(undefined, { skip: !isDoctor });

  const doctorPhone = userProfile?.phone || t('profileDetails.notProvided');

  const [isCurrentlyStudying, setIsCurrentlyStudying] = useState(false);
  const [startMonth, setStartMonth] = useState('August');
  const [startYear, setStartYear] = useState('2024');
  const [endMonth, setEndMonth] = useState('August');
  const [endYear, setEndYear] = useState('2026');
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [periodSynced, setPeriodSynced] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ uri: string; name: string }[]>([]);
  const [isSavingDocs, setIsSavingDocs] = useState(false);

  // Fill the credential period once, when the profile first arrives. Re-running
  // on a background refetch (e.g. after a photo upload invalidates the profile)
  // would wipe dates the doctor just picked.
  if (!periodSynced && doctorProfile) {
    setPeriodSynced(true);
    const period = doctorProfile.credentialPeriod;
    if (period) {
      if (period.startMonth) setStartMonth(period.startMonth);
      if (period.startYear) setStartYear(period.startYear);
      if (period.endMonth) setEndMonth(period.endMonth);
      if (period.endYear) setEndYear(period.endYear);
      if (period.isCurrentlyStudying) setIsCurrentlyStudying(true);
    }
  }

  const defaultAddress = useMemo(
    () => addresses.find((a) => a.isDefault) ?? addresses[0],
    [addresses]
  );
  const hasLocation = !!defaultAddress;
  const locationText = defaultAddress
    ? [defaultAddress.upazila, defaultAddress.district].filter(Boolean).join(', ')
    : t('profileDetails.noData');
  const locationStyle =
    !hasLocation ? [styles.fieldText, styles.noDataText] : styles.fieldText;

  const savedDocuments = doctorProfile?.credentialDocuments ?? [];
  const displayDocumentUri =
    pendingFiles.length > 0
      ? pendingFiles[pendingFiles.length - 1].uri
      : savedDocuments.length > 0
        ? savedDocuments[savedDocuments.length - 1]
        : undefined;

  // qualifications[0]/[1] back the Certifications / Institute Name fields and may
  // be left blank — hide empty slots from the full list.
  const displayQualifications = (doctorProfile?.qualifications ?? []).filter((q) => q && q.trim());

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthLabel = (value: string) => t(`profileDetails.months.${value}`, { defaultValue: value });
  const YEARS = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 14 }, (_, i) => String(currentYear - 10 + i));
  }, []);

  const handleDeleteCredentials = () => {
    Alert.alert(
      t('profileDetails.alerts.deleteCredentialsTitle'),
      t('profileDetails.alerts.deleteCredentialsMsg'),
      [
        { text: t('profileDetails.actions.cancel'), style: 'cancel' },
        {
          text: t('profileDetails.actions.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await updateQualifications([]).unwrap();
              await updateSpecializations([]).unwrap();
              await updateCredentialDocuments([]).unwrap();
              setPendingFiles([]);
              Alert.alert(t('profileDetails.alerts.successTitle'), t('profileDetails.alerts.credentialsDeletedMsg'));
            } catch {
              Alert.alert(t('profileDetails.alerts.errorTitle'), t('profileDetails.alerts.deleteCredentialsFailedMsg'));
            }
          },
        },
      ],
    );
  };

  const handleUploadDocument = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('profileDetails.alerts.permissionTitle'), t('profileDetails.alerts.permissionMsg'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setPendingFiles((prev) => [...prev, { uri: asset.uri, name: asset.fileName || `document-${Date.now()}.jpg` }]);
  };

  const handleSaveDocuments = async () => {
    if (pendingFiles.length === 0 || isSavingDocs) return;
    setIsSavingDocs(true);
    try {
      for (const file of [...pendingFiles]) {
        const compressed = await compressImageForUpload(file.uri, {
          fileName: `credential-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
        });
        const formData = new FormData();
        formData.append('file', {
          uri: compressed.uri,
          name: compressed.name,
          type: compressed.type,
        } as any);
        await uploadCredentialDocument(formData).unwrap();
        setPendingFiles((prev) => prev.filter((f) => f !== file));
      }
      Alert.alert(t('profileDetails.alerts.successTitle'), t('profileDetails.alerts.credentialSavedMsg'));
    } catch (err: any) {
      Alert.alert(
        t('profileDetails.alerts.saveFailedTitle'),
        err?.status === 413
          ? t('profileDetails.alerts.photoTooLarge')
          : err?.data?.message ||
            err?.message ||
            t('profileDetails.alerts.savePhotoFailedMsg'),
      );
    } finally {
      setIsSavingDocs(false);
    }
  };

  const savePeriod = async (period: {
    startMonth: string;
    startYear: string;
    endMonth: string;
    endYear: string;
    isCurrentlyStudying: boolean;
  }) => {
    try {
      await updateProfile({ credentialPeriod: period }).unwrap();
    } catch {
      Alert.alert(t('profileDetails.alerts.errorTitle'), t('profileDetails.alerts.datesFailedMsg'));
    }
  };

  const confirmPeriodPicker = (month: string, year: string) => {
    if (pickerTarget === 'start') {
      setStartMonth(month);
      setStartYear(year);
      void savePeriod({
        startMonth: month,
        startYear: year,
        endMonth,
        endYear,
        isCurrentlyStudying,
      });
    } else if (pickerTarget === 'end') {
      setEndMonth(month);
      setEndYear(year);
      void savePeriod({
        startMonth,
        startYear,
        endMonth: month,
        endYear: year,
        isCurrentlyStudying,
      });
    }
    setPickerTarget(null);
  };

  const toggleCurrentlyStudying = () => {
    const next = !isCurrentlyStudying;
    setIsCurrentlyStudying(next);
    void savePeriod({
      startMonth,
      startYear,
      endMonth,
      endYear,
      isCurrentlyStudying: next,
    });
  };

  const uniquePatients = useMemo(() => {
    const patientIds = new Set(doctorBookings.map((b) => b.patientId));
    return patientIds.size;
  }, [doctorBookings]);

  const completedConsultations = useMemo(() => {
    return doctorBookings.filter((b) => b.status === 'COMPLETED').length;
  }, [doctorBookings]);

  if (!isDoctor) return null;

  const doctorName = doctorProfile?.name || t('profileDetails.doctorFallback');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profileDetails.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Doctor Card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorInfoRow}>
            <View style={styles.avatarContainer}>
              <DoctorAvatar
                name={doctorProfile?.name || doctorName}
                avatar={doctorProfile?.avatar}
                size={64}
                radius={32}
                style={styles.avatarPlaceholder}
              />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.doctorDetails}>
              <Text style={styles.doctorName}>{`Dr ${doctorName}`}</Text>
              <Text style={styles.doctorSpecialty}>{doctorProfile?.specialty}</Text>
              <View style={styles.ratingRow}>
                <SvgXml width={14} height={14} xml={doctorProfileCardStarSvg} />
                <Text style={styles.ratingText}>{doctorProfile?.rating} ({t('profileDetails.reviews', { count: doctorBookings?.length ?? 0 })})</Text>
              </View>
              <Text style={[styles.doctorLocation, !doctorProfile?.specialty && styles.noDataText]}>
                {doctorProfile?.specialty || t('profileDetails.noLocationAdded')}
              </Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{uniquePatients}</Text>
              <Text style={styles.statLabel}>{t('profileDetails.stats.patients')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{completedConsultations}</Text>
              <Text style={styles.statLabel}>{t('profileDetails.stats.consultations')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{doctorProfile?.experience || '0'}</Text>
              <Text style={styles.statLabel}>{t('profileDetails.stats.yearsExperience')}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['about', 'experience', 'credentials'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'about' ? t('profileDetails.tabs.about') : tab === 'experience' ? t('profileDetails.tabs.experience') : t('profileDetails.tabs.credentials')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* About Tab */}
        {activeTab === 'about' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profileDetails.sections.personalInfo')}</Text>
              <TouchableOpacity onPress={() => router.push('/profile-edit' as any)} activeOpacity={0.7}>
                <SvgXml width={20} height={20} xml={profileEditSvg} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>{t('profileDetails.fields.name')}</Text>
              <View style={styles.fieldValue}>
                <Text style={styles.fieldText}>{doctorProfile?.name}</Text>
              </View>
            </View>

            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>{t('profileDetails.fields.mobileNumber')}</Text>
              <View style={styles.fieldValue}>
                <Text style={styles.fieldText}>{doctorPhone}</Text>
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              </View>
            </View>

            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>{t('profileDetails.fields.location')}</Text>
              <View style={styles.fieldValue}>
                <Text style={locationStyle}>{locationText}</Text>
                <Ionicons name="location-outline" size={18} color="#BD632F" />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 8 }]}>{t('profileDetails.sections.about')}</Text>
            <Text style={[styles.aboutText, !doctorProfile?.bio && styles.noDataText]}>
              {doctorProfile?.bio || t('profileDetails.noData')}
            </Text>
          </View>
        )}

        {/* Experience Tab */}
        {activeTab === 'experience' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profileDetails.sections.experiences')}</Text>
              <View style={styles.sectionActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/profile-edit', params: { tab: 'experience' } } as any)}
                >
                  <Ionicons name="add-circle-outline" size={22} color="#7C7672" />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/profile-edit', params: { tab: 'experience' } } as any)}
                >
                  <SvgXml width={20} height={20} xml={profileEditSvg} />
                </TouchableOpacity>
              </View>
            </View>

            {doctorProfile?.experiences && doctorProfile.experiences.length > 0 ? (
              doctorProfile.experiences.map((exp, i) => (
                <View key={i} style={[styles.experienceCard, i > 0 && { marginTop: 10 }]}>
                  <View style={styles.expHeader}>
                    <View style={styles.expIcon}>
                      <Ionicons name="business-outline" size={20} color="#BD632F" />
                    </View>
                    <View style={styles.expInfo}>
                      <Text style={styles.expTitle}>{exp.organization}</Text>
                      <Text style={styles.expRole}>{exp.title}</Text>
                    </View>
                  </View>
                  <View style={styles.expMeta}>
                    <View style={styles.expDateBadge}>
                      <Ionicons name="calendar-outline" size={12} color="#7C7672" />
                      <Text style={styles.expDateText}>{exp.duration}</Text>
                    </View>
                  </View>
                  {exp.description ? (
                    <Text style={styles.expDescription} numberOfLines={3}>
                      {exp.description}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <View style={styles.experienceCard}>
                <Text style={[styles.expDescription, styles.noDataText]}>{t('profileDetails.empty.experiences')}</Text>
              </View>
            )}

            {/* Qualifications */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>{t('profileDetails.sections.qualifications')}</Text>
              <View style={styles.sectionActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({ pathname: '/profile-edit', params: { tab: 'credentials', section: 'qualifications' } } as any)
                  }
                >
                  <Ionicons name="add-circle-outline" size={22} color="#7C7672" />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({ pathname: '/profile-edit', params: { tab: 'credentials', section: 'qualifications' } } as any)
                  }
                >
                  <SvgXml width={20} height={20} xml={profileEditSvg} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.qualificationCard}>
              {displayQualifications.length > 0 ? (
                displayQualifications.map((qual, i) => (
                  <View key={i} style={[styles.qualHeader, i > 0 && { marginTop: 10 }]}>
                    <View style={styles.qualLogo}>
                      <Ionicons name="school-outline" size={24} color="#BD632F" />
                    </View>
                    <View>
                      <Text style={styles.qualSchool}>{qual}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.qualHeader}>
                  <View style={styles.qualLogo}>
                    <Ionicons name="school-outline" size={24} color="#BD632F" />
                  </View>
                  <View>
                    <Text style={styles.qualSchool}>{t('profileDetails.empty.qualifications')}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Specialization */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>{t('profileDetails.sections.specialization')}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile-edit', params: { tab: 'credentials' } } as any)}
              >
                <SvgXml width={20} height={20} xml={profileEditSvg} />
              </TouchableOpacity>
            </View>

            <View style={styles.tagsContainer}>
              {doctorProfile?.specializations && doctorProfile.specializations.length > 0 ? (
                doctorProfile.specializations.map((tag) => (
                  <View key={tag} style={styles.tagItem}>
                    <Ionicons name="ribbon-outline" size={16} color="#BD632F" />
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.tagText, styles.noDataText]}>{t('profileDetails.empty.specializations')}</Text>
              )}
              <TouchableOpacity
                style={styles.addMoreTag}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/profile-edit', params: { tab: 'credentials' } } as any)}
              >
                <Ionicons name="add" size={16} color="#BD632F" />
                <Text style={styles.addMoreTagText}>{t('profileDetails.actions.addMore')}</Text>
              </TouchableOpacity>
            </View>

            {/* Patient Reviews */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>{t('profileDetails.sections.patientReviews')}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: '/all-reviews',
                    params: {
                      doctorId: String(doctorProfile?.id),
                      doctorName: doctorProfile?.name ?? '',
                    },
                  })
                }
              >
                <Text style={styles.seeAllText}>{t('profileDetails.actions.seeAll')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reviewsRatingRow}>
              <Ionicons name="star" size={18} color="#F59E0B" />
              <Text style={styles.reviewsScore}>{doctorProfile?.rating ?? '0.0'}</Text>
              <Text style={styles.reviewsCount}>({t('profileDetails.reviewsCount', { count: reviews.length })})</Text>
            </View>

            {reviews.length > 0 ? (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar}>
                      {review.user?.avatar ? (
                        <Image source={{ uri: review.user.avatar }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                      ) : (
                        <Ionicons name="person-outline" size={16} color="#9C9690" />
                      )}
                    </View>
                    <View style={styles.reviewInfo}>
                      <Text style={styles.reviewName}>{review.user?.name || t('profileDetails.reviewer.anonymous')}</Text>
                      <View style={styles.reviewStars}>
                        {Array.from({ length: review.rating }).map((_, si) => (
                          <Ionicons key={si} name="star" size={12} color="#F59E0B" />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.reviewTime}>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.reviewText}>{review.text}</Text>
                </View>
              ))
            ) : (
              <View style={styles.reviewCard}>
                <Text style={styles.reviewText}>{t('profileDetails.empty.reviews')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Credentials Tab */}
        {activeTab === 'credentials' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profileDetails.sections.credentials')}</Text>
              <View style={styles.sectionActions}>
                <TouchableOpacity activeOpacity={0.7} onPress={handleDeleteCredentials}>
                  <Ionicons name="trash-outline" size={20} color="#E53935" />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/profile-edit', params: { tab: 'credentials' } } as any)}
                >
                  <SvgXml width={20} height={20} xml={profileEditSvg} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>{t('profileDetails.fields.certifications')}</Text>
              <View style={styles.fieldValue}>
                <Text style={[styles.fieldText, doctorProfile?.qualifications?.[0] ? undefined : styles.noDataText]}>
                  {doctorProfile?.qualifications?.[0] || t('profileDetails.noData')}
                </Text>
              </View>
            </View>

            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>{t('profileDetails.fields.instituteName')}</Text>
              <View style={styles.fieldValue}>
                <Text style={[styles.fieldText, doctorProfile?.qualifications?.[1] ? undefined : styles.noDataText]}>
                  {doctorProfile?.qualifications?.[1] || t('profileDetails.noData')}
                </Text>
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              </View>
            </View>

            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>{t('profileDetails.fields.location')}</Text>
              <View style={styles.fieldValue}>
                <Text style={locationStyle}>{locationText}</Text>
                <Ionicons name="location-outline" size={18} color="#BD632F" />
              </View>
            </View>

            <View style={styles.halfRow}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>{t('profileDetails.fields.startDate')}</Text>
                <TouchableOpacity
                  style={styles.dropdownField}
                  onPress={() => setPickerTarget('start')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.fieldText}>{`${monthLabel(startMonth)} ${startYear}`}</Text>
                  <Ionicons name="chevron-down" size={16} color="#9C9690" />
                </TouchableOpacity>
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>{t('profileDetails.fields.endDate')}</Text>
                <TouchableOpacity
                  style={[styles.dropdownField, isCurrentlyStudying && styles.dropdownFieldDisabled]}
                  onPress={() => {
                    if (!isCurrentlyStudying) setPickerTarget('end');
                  }}
                  disabled={isCurrentlyStudying}
                  activeOpacity={0.7}
                >
                  <Text style={styles.fieldText}>
                    {isCurrentlyStudying ? t('profileDetails.present') : `${monthLabel(endMonth)} ${endYear}`}
                  </Text>
                  {!isCurrentlyStudying && <Ionicons name="chevron-down" size={16} color="#9C9690" />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.checkboxRow} activeOpacity={0.7} onPress={toggleCurrentlyStudying}>
              <View style={styles.checkbox}>
                {isCurrentlyStudying && <View style={[styles.checkboxInner, { backgroundColor: '#BD632F' }]} />}
              </View>
              <Text style={styles.checkboxLabel}>{t('profileDetails.currentlyStudying')}</Text>
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { marginTop: 16, marginBottom: 8 }]}>{t('profileDetails.fields.academicCredentialsRequired')}</Text>
            <TouchableOpacity style={styles.uploadArea} activeOpacity={0.7} onPress={handleUploadDocument}>
              {displayDocumentUri ? (
                <Image source={{ uri: displayDocumentUri }} style={{ width: '100%', height: '100%', borderRadius: 14 }} resizeMode="cover" />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={36} color="#D1CCC7" />
                  <Text style={styles.uploadText}>{t('profileDetails.actions.tapToUpload')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.addMoreBtn} activeOpacity={0.8} onPress={handleUploadDocument}>
              <Ionicons name="image-outline" size={18} color="#7C7672" />
              <Text style={styles.addMoreBtnText}>{t('profileDetails.actions.addMore')}</Text>
            </TouchableOpacity>

            {pendingFiles.length > 0 && (
              <TouchableOpacity
                style={[styles.saveBtn, isSavingDocs && { opacity: 0.6 }]}
                activeOpacity={0.8}
                onPress={handleSaveDocuments}
                disabled={isSavingDocs}
              >
                {isSavingDocs ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>{t('profileDetails.actions.savePhoto')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <MonthYearPickerModal
        visible={pickerTarget !== null}
        title={pickerTarget === 'start' ? t('profileDetails.fields.startDate') : t('profileDetails.fields.endDate')}
        month={monthLabel(pickerTarget === 'start' ? startMonth : endMonth)}
        year={pickerTarget === 'start' ? startYear : endYear}
        months={MONTHS.map((m) => monthLabel(m))}
        years={YEARS}
        onConfirm={(monthValue, yearValue) => {
          const englishMonth = MONTHS.find((m) => monthLabel(m) === monthValue) ?? monthValue;
          confirmPeriodPicker(englishMonth, yearValue);
        }}
        onClose={() => setPickerTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },

  // Doctor Card
  doctorCard: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6E1DC', padding: 16, marginBottom: 16 },
  doctorInfoRow: { flexDirection: 'row', marginBottom: 14 },
  avatarContainer: { position: 'relative', marginRight: 14 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF2EB', overflow: 'hidden' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#FFFFFF' },
  doctorDetails: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: '800', color: '#1A1817', marginBottom: 2 },
  doctorSpecialty: { fontSize: 12, fontWeight: '500', color: '#7C7672', marginBottom: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  ratingText: { fontSize: 11, fontWeight: '600', color: '#7C7672' },
  doctorLocation: { fontSize: 11, fontWeight: '500', color: '#9C9690' },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0ECE8', paddingTop: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 16, fontWeight: '800', color: '#1A1817', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '500', color: '#9C9690' },
  statDivider: { width: 1, backgroundColor: '#F0ECE8' },

  // Tabs
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E6E1DC', marginBottom: 16 },
  tab: { paddingVertical: 10, marginRight: 20 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#1A1817' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9C9690' },
  tabTextActive: { color: '#1A1817', fontWeight: '700' },

  // Sections
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1817' },
  sectionActions: { flexDirection: 'row', gap: 10 },

  // Fields
  fieldCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '500', color: '#9C9690', marginBottom: 6 },
  fieldValue: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldText: { fontSize: 14, fontWeight: '600', color: '#1A1817' },
  noDataText: { color: '#9C9690', fontWeight: '500' },

  // About
  aboutText: { fontSize: 13, fontWeight: '500', color: '#7C7672', lineHeight: 20 },
  readMore: { color: '#BD632F', fontWeight: '700' },

  // Experience
  experienceCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 10 },
  expHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  expIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center' },
  expInfo: { flex: 1 },
  expTitle: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  expRole: { fontSize: 12, fontWeight: '500', color: '#7C7672' },
  expMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  expDateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F2EC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  expDateText: { fontSize: 11, fontWeight: '500', color: '#7C7672' },
  expCurrent: { fontSize: 11, fontWeight: '600', color: '#4CAF50' },
  expLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  expLocationText: { fontSize: 11, fontWeight: '500', color: '#9C9690' },
  expDescription: { fontSize: 12, fontWeight: '500', color: '#7C7672', lineHeight: 18 },

  // Qualifications
  qualificationCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 10 },
  qualHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  qualLogo: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center' },
  qualSchool: { fontSize: 13, fontWeight: '700', color: '#1A1817' },
  qualYear: { fontSize: 11, fontWeight: '500', color: '#9C9690' },
  qualCertPlaceholder: { backgroundColor: '#F5F2EC', borderRadius: 10, height: 80, justifyContent: 'center', alignItems: 'center' },
  qualCertText: { fontSize: 12, color: '#9C9690' },

  // Tags
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF2EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  tagText: { fontSize: 13, fontWeight: '600', color: '#BD632F' },
  addMoreTag: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1.5, borderColor: '#E6E1DC', borderStyle: 'dashed', paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  addMoreTagText: { fontSize: 13, fontWeight: '600', color: '#9C9690' },

  // Reviews
  seeAllText: { fontSize: 13, fontWeight: '600', color: '#BD632F' },
  reviewsRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  reviewsScore: { fontSize: 16, fontWeight: '800', color: '#1A1817' },
  reviewsCount: { fontSize: 13, fontWeight: '500', color: '#9C9690' },
  reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F2EC', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  reviewInfo: { flex: 1 },
  reviewName: { fontSize: 13, fontWeight: '700', color: '#1A1817' },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewTime: { fontSize: 11, fontWeight: '500', color: '#9C9690' },
  reviewText: { fontSize: 12, fontWeight: '500', color: '#7C7672', lineHeight: 18 },

  // Credentials
  halfRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  halfField: { flex: 1 },
  dropdownField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 14, height: 44 },
  dropdownFieldDisabled: { opacity: 0.6 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#E6E1DC', justifyContent: 'center', alignItems: 'center' },
  checkboxInner: { width: 12, height: 12, borderRadius: 3, backgroundColor: 'transparent' },
  checkboxLabel: { fontSize: 13, fontWeight: '500', color: '#1A1817' },
  uploadArea: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#E6E1DC', borderStyle: 'dashed', height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  uploadText: { fontSize: 12, fontWeight: '500', color: '#D1CCC7', marginTop: 6 },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  addMoreBtnText: { fontSize: 13, fontWeight: '600', color: '#7C7672' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#BD632F', borderRadius: 12, height: 48, marginTop: 16 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
