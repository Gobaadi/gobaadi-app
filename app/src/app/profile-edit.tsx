import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  useGetMyDoctorProfileQuery,
  useGetDoctorBookingsQuery,
  useUpdateProfileMutation,
  useUpdateExperiencesMutation,
  useUpdateQualificationsMutation,
  useUpdateSpecializationsMutation,
  useUploadMyPhotoMutation,
  type DoctorExperience,
} from '@/store/doctorPortalApi';
import { useGetMyProfileQuery } from '@/store/usersApi';
import {
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
} from '@/store/addressesApi';
import { compressImageForUpload } from '@/utils/compress-image';
import { DoctorAvatar } from '@/components/doctor-avatar';
import { useTranslation } from '@/hooks/use-translation';

type Tab = 'about' | 'experience' | 'credentials';

function parseTab(tab?: string): Tab {
  return tab === 'experience' || tab === 'credentials' ? tab : 'about';
}

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { tab, section } = useLocalSearchParams<{ tab?: string; section?: string }>();
  const isDoctor = useRequireDoctor();

  const { data: doctorProfile, isLoading: profileLoading } = useGetMyDoctorProfileQuery(undefined, { skip: !isDoctor });
  const { data: doctorBookings = [] } = useGetDoctorBookingsQuery(undefined, { skip: !isDoctor });
  const { data: userProfile } = useGetMyProfileQuery(undefined, { skip: !isDoctor });
  const { data: addresses = [] } = useGetAddressesQuery(undefined, { skip: !isDoctor });
  const [createAddress, { isLoading: creatingAddress }] = useCreateAddressMutation();
  const [updateAddress, { isLoading: updatingAddress }] = useUpdateAddressMutation();

  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [updateExperiences, { isLoading: savingExperiences }] = useUpdateExperiencesMutation();
  const [updateQualifications, { isLoading: savingQualifications }] = useUpdateQualificationsMutation();
  const [updateSpecializations, { isLoading: savingSpecializations }] = useUpdateSpecializationsMutation();

  const defaultAddress = useMemo(
    () => addresses.find((a) => a.isDefault) ?? addresses[0] ?? null,
    [addresses]
  );

  const [activeTab, setActiveTab] = useState<Tab>(() => parseTab(tab));

  const scrollViewRef = useRef<ScrollView>(null);
  const qualificationInputRef = useRef<TextInput>(null);
  const specializationInputRef = useRef<TextInput>(null);
  const didScrollToSection = useRef(false);
  const didPrefill = useRef(false);
  const [credentialsContentY, setCredentialsContentY] = useState<number | null>(null);
  const [qualificationsHeaderY, setQualificationsHeaderY] = useState<number | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [qualificationError, setQualificationError] = useState('');
  const [specializationError, setSpecializationError] = useState('');

  // About fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [experience, setExperience] = useState('');

  // Location (from the user's address book)
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const didPrefillAddress = useRef(false);

  // Experience fields
  const [experiences, setExperiences] = useState<DoctorExperience[]>([]);
  const [editingExpIndex, setEditingExpIndex] = useState<number | null>(null);
  const [expError, setExpError] = useState('');
  const [expTitle, setExpTitle] = useState('');
  const [expInstitute, setExpInstitute] = useState('');
  const [expDuration, setExpDuration] = useState('');
  const [expDescription, setExpDescription] = useState('');

  // Qualifications
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [newQualification, setNewQualification] = useState('');
  // qualifications[0] and [1] edit the Certifications / Institute Name fields.
  const otherQualifications = qualifications.slice(2);

  // Specializations
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [newSpecialization, setNewSpecialization] = useState('');

  // License
  const [licenseNumber, setLicenseNumber] = useState('');

  // Profile photo
  const [uploadMyPhoto] = useUploadMyPhotoMutation();
  const [pickedPhotoUri, setPickedPhotoUri] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Pre-fill fields from API, once. Re-running on every background refetch
  // (e.g. after a photo upload invalidates the profile) would wipe in-progress
  // edits, including experiences the doctor is about to add.
  useEffect(() => {
    if (!doctorProfile || didPrefill.current) return;
    didPrefill.current = true;
    setName(doctorProfile.name || '');
    setBio(doctorProfile.bio || '');
    setSpecialty(doctorProfile.specialty || '');
    setExperience(doctorProfile.experience || '');
    setQualifications(doctorProfile.qualifications || []);
    setSpecializations(doctorProfile.specializations || []);
    setLicenseNumber(doctorProfile.licenseNumber || '');
    setExperiences(doctorProfile.experiences || []);
  }, [doctorProfile]);

  // Pre-fill location from the saved address once.
  useEffect(() => {
    if (!defaultAddress || didPrefillAddress.current) return;
    didPrefillAddress.current = true;
    setDistrict(defaultAddress.district || '');
    setUpazila(defaultAddress.upazila || '');
  }, [defaultAddress]);

  const uniquePatients = useMemo(() => {
    const patientIds = new Set(doctorBookings.map((b) => b.patientId));
    return patientIds.size;
  }, [doctorBookings]);

  const completedConsultations = useMemo(() => {
    return doctorBookings.filter((b) => b.status === 'COMPLETED').length;
  }, [doctorBookings]);

  const isSaving =
    savingProfile ||
    savingExperiences ||
    savingQualifications ||
    savingSpecializations ||
    creatingAddress ||
    updatingAddress;

  const openPhotoPicker = () => {
    Alert.alert(t('profileEdit.photo.title'), t('profileEdit.photo.chooseOption'), [
      { text: t('profileEdit.photo.takePhoto'), onPress: () => pickPhoto('camera') },
      { text: t('profileEdit.photo.fromLibrary'), onPress: () => pickPhoto('library') },
      { text: t('profileEdit.photo.cancel'), style: 'cancel' },
    ]);
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t('profileEdit.photo.permissionTitle'),
          source === 'camera'
            ? t('profileEdit.photo.cameraPermission')
            : t('profileEdit.photo.libraryPermission'),
        );
        return;
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets?.length) return;
      await uploadPhoto(result.assets[0].uri);
    } catch {
      Alert.alert(
        t('profileEdit.photo.selectFailedTitle'),
        t('profileEdit.photo.selectFailedMsg'),
      );
    }
  };

  const uploadPhoto = async (uri: string) => {
    try {
      setIsUploadingPhoto(true);
      setPickedPhotoUri(uri);
      const file = await compressImageForUpload(uri, {
        fileName: `doctor-avatar-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
      await uploadMyPhoto(formData).unwrap();
    } catch (err: any) {
      setPickedPhotoUri(null);
      Alert.alert(
        t('profileEdit.photo.uploadFailedTitle'),
        err?.status === 413
          ? t('profileEdit.photo.uploadTooLarge')
          : err?.data?.message ||
            err?.message ||
            t('profileEdit.photo.uploadFailedMsg'),
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveAbout = async () => {
    await updateProfile({
      name,
      bio,
      specialty,
      experience,
    }).unwrap();

    const nextDistrict = district.trim();
    const nextUpazila = upazila.trim();
    // Location cannot be fully cleared from here — at least one part is required.
    if (!nextDistrict && !nextUpazila) return;

    const changed =
      nextDistrict !== (defaultAddress?.district || '') ||
      nextUpazila !== (defaultAddress?.upazila || '');
    if (!changed) return;

    if (defaultAddress) {
      await updateAddress({
        id: defaultAddress.id,
        data: { district: nextDistrict, upazila: nextUpazila },
      }).unwrap();
    } else {
      await createAddress({
        label: 'Home',
        contactName: name.trim(),
        phone: userProfile?.phone || '',
        division: '',
        district: nextDistrict,
        upazila: nextUpazila,
        postalCode: '',
        isDefault: true,
      }).unwrap();
    }
  };

  const handleSaveExperience = async () => {
    await updateExperiences(experiences).unwrap();
  };

  const resetExpForm = () => {
    setExpTitle('');
    setExpInstitute('');
    setExpDuration('');
    setExpDescription('');
    setEditingExpIndex(null);
    setExpError('');
  };

  const addOrUpdateExperience = () => {
    if (!expTitle.trim() && !expInstitute.trim()) {
      setExpError(t('profileEdit.errors.expRequired'));
      return;
    }
    const entry: DoctorExperience = {
      title: expTitle.trim(),
      organization: expInstitute.trim(),
      duration: expDuration.trim(),
      description: expDescription.trim() || undefined,
    };
    if (editingExpIndex !== null) {
      setExperiences((prev) => prev.map((exp, i) => (i === editingExpIndex ? entry : exp)));
    } else {
      setExperiences((prev) => [...prev, entry]);
    }
    resetExpForm();
  };

  const editExperience = (index: number) => {
    const exp = experiences[index];
    setExpTitle(exp.title || '');
    setExpInstitute(exp.organization || '');
    setExpDuration(exp.duration || '');
    setExpDescription(exp.description || '');
    setEditingExpIndex(index);
    setExpError('');
  };

  const removeExperience = (index: number) => {
    setExperiences((prev) => prev.filter((_, i) => i !== index));
    if (editingExpIndex === index) {
      resetExpForm();
    } else if (editingExpIndex !== null && index < editingExpIndex) {
      setEditingExpIndex(editingExpIndex - 1);
    }
  };

  const handleSaveQualifications = async () => {
    try {
      // qualifications[0] = Certifications, qualifications[1] = Institute Name.
      const payload = qualifications.map((q) => q.trim());
      while (payload.length && payload[payload.length - 1] === '') {
        payload.pop();
      }
      await updateQualifications(payload).unwrap();
    } catch {
      throw new Error('Failed to update qualifications');
    }
  };

  const handleSaveSpecializations = async () => {
    try {
      await updateSpecializations(specializations).unwrap();
    } catch {
      throw new Error('Failed to update specializations');
    }
  };

  const handleSave = async () => {
    try {
      switch (activeTab) {
        case 'about':
          await handleSaveAbout();
          break;
        case 'experience':
          await handleSaveExperience();
          break;
        case 'credentials':
          await Promise.all([
            handleSaveQualifications(),
            handleSaveSpecializations(),
          ]);
          if (licenseNumber !== (doctorProfile?.licenseNumber || '')) {
            await updateProfile({ licenseNumber }).unwrap();
          }
          break;
      }
      Alert.alert(t('profileEdit.success.title'), t('profileEdit.success.saved'));
      router.back();
    } catch {
      Alert.alert(t('profileEdit.errors.title'), t('profileEdit.errors.saveFailed'));
    }
  };

  const setQualificationAt = (index: number, value: string) => {
    setQualifications((prev) => {
      const next = [...prev];
      while (next.length <= index) next.push('');
      next[index] = value;
      return next;
    });
  };

  const addQualification = () => {
    if (newQualification.trim()) {
      setQualifications((prev) => {
        const next = [...prev];
        // Keep indices 0 (Certifications) and 1 (Institute Name) reserved.
        while (next.length < 2) next.push('');
        next.push(newQualification.trim());
        return next;
      });
      setNewQualification('');
      setQualificationError('');
    } else {
      setQualificationError(t('profileEdit.errors.qualificationRequired'));
      qualificationInputRef.current?.focus();
    }
  };

  const removeQualification = (index: number) => {
    setQualifications(qualifications.filter((_, i) => i !== index));
  };

  const addSpecialization = () => {
    if (newSpecialization.trim()) {
      setSpecializations([...specializations, newSpecialization.trim()]);
      setNewSpecialization('');
      setSpecializationError('');
    } else {
      setSpecializationError(t('profileEdit.errors.specializationRequired'));
      specializationInputRef.current?.focus();
    }
  };

  const removeSpecialization = (index: number) => {
    setSpecializations(specializations.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (section !== 'qualifications') return;
    if (credentialsContentY === null || qualificationsHeaderY === null) return;
    if (didScrollToSection.current) return;

    const scrollTimer = setTimeout(() => {
      didScrollToSection.current = true;
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, credentialsContentY + qualificationsHeaderY - 12),
        animated: true,
      });
      setHighlightedSection('qualifications');
    }, 120);

    return () => clearTimeout(scrollTimer);
  }, [section, credentialsContentY, qualificationsHeaderY]);

  useEffect(() => {
    if (!highlightedSection) return;
    const clearTimer = setTimeout(() => setHighlightedSection(null), 2400);
    return () => clearTimeout(clearTimer);
  }, [highlightedSection]);

  if (!isDoctor) return null;

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BD632F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profileEdit.title')}</Text>
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>{t('profileEdit.saveChanges')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Doctor Card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorInfoRow}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={openPhotoPicker}
              disabled={isUploadingPhoto}
              activeOpacity={0.8}
            >
              <DoctorAvatar
                name={doctorProfile?.name}
                avatar={pickedPhotoUri ?? doctorProfile?.avatar}
                size={64}
                radius={32}
                style={styles.avatarPlaceholder}
              />
              <View style={styles.onlineDot} />
              <View style={styles.cameraBadge}>
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.doctorDetails}>
              <Text style={styles.doctorName}>Dr {doctorProfile?.name || t('profileEdit.doctorFallback')}</Text>
              <Text style={styles.doctorSpecialty}>{doctorProfile?.specialty || t('profileEdit.noSpecialty')}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>{doctorProfile?.rating ?? '0.0'} ({t('profileEdit.reviews', { count: doctorBookings.length })})</Text>
              </View>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{uniquePatients}</Text>
              <Text style={styles.statLabel}>{t('profileEdit.stats.patients')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{completedConsultations}</Text>
              <Text style={styles.statLabel}>{t('profileEdit.stats.consultations')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{doctorProfile?.experience || '0'}</Text>
              <Text style={styles.statLabel}>{t('profileEdit.stats.yearsExperience')}</Text>
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
                {tab === 'about' ? t('profileEdit.tabs.about') : tab === 'experience' ? t('profileEdit.tabs.experience') : t('profileEdit.tabs.credentials')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* About Tab - Edit */}
        {activeTab === 'about' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profileEdit.sections.personalInfo')}</Text>
            </View>

            <Text style={styles.fieldLabel}>{t('profileEdit.fields.name')}</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('profileEdit.placeholders.name')} placeholderTextColor="#A39E99" />
            </View>

            <Text style={styles.fieldLabel}>{t('profileEdit.fields.specialty')}</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={specialty} onChangeText={setSpecialty} placeholder={t('profileEdit.placeholders.specialty')} placeholderTextColor="#A39E99" />
            </View>

            <Text style={styles.fieldLabel}>{t('profileEdit.fields.yearsExperience')}</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={experience} onChangeText={setExperience} placeholder={t('profileEdit.placeholders.experience')} placeholderTextColor="#A39E99" />
            </View>

            <Text style={styles.fieldLabel}>{t('profileEdit.fields.district')}</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder={t('profileEdit.placeholders.district')} placeholderTextColor="#A39E99" />
            </View>

            <Text style={styles.fieldLabel}>{t('profileEdit.fields.upazilaVillage')}</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={upazila} onChangeText={setUpazila} placeholder={t('profileEdit.placeholders.upazila')} placeholderTextColor="#A39E99" />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>{t('profileEdit.fields.bio')}</Text>
            <TextInput
              style={styles.textarea}
              value={bio}
              onChangeText={setBio}
              multiline
              textAlignVertical="top"
              placeholder={t('profileEdit.placeholders.bio')}
              placeholderTextColor="#A39E99"
            />
          </View>
        )}

        {/* Experience Tab - Edit */}
        {activeTab === 'experience' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profileEdit.sections.experiences')}</Text>
            </View>

            {experiences.length > 0 ? (
              experiences.map((exp, i) => (
                <View key={i} style={styles.existingItem}>
                  <View style={styles.existingItemContent}>
                    <Ionicons name="briefcase-outline" size={18} color="#BD632F" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.existingItemTitle}>{exp.title}</Text>
                      <Text style={styles.existingItemSubtitle}>{exp.organization} · {exp.duration}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => editExperience(i)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                      accessibilityLabel={t('profileEdit.a11y.editExperience')}
                    >
                      <Ionicons name="create-outline" size={20} color="#7C7672" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeExperience(i)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                      accessibilityLabel={t('profileEdit.a11y.deleteExperience')}
                    >
                      <Ionicons name="trash-outline" size={20} color="#E53935" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>{t('profileEdit.empty.experiences')}</Text>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{t('profileEdit.fields.positionTitle')}</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={expTitle} onChangeText={setExpTitle} placeholder={t('profileEdit.placeholders.positionTitle')} placeholderTextColor="#A39E99" />
            </View>

            <Text style={styles.fieldLabel}>{t('profileEdit.fields.instituteName')}</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={expInstitute} onChangeText={setExpInstitute} placeholder={t('profileEdit.placeholders.instituteName')} placeholderTextColor="#A39E99" />
            </View>

            <Text style={styles.fieldLabel}>{t('profileEdit.fields.duration')}</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={expDuration} onChangeText={setExpDuration} placeholder={t('profileEdit.placeholders.duration')} placeholderTextColor="#A39E99" />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{t('profileEdit.fields.description')}</Text>
            <TextInput
              style={styles.textarea}
              value={expDescription}
              onChangeText={setExpDescription}
              multiline
              textAlignVertical="top"
              placeholder={t('profileEdit.placeholders.description')}
              placeholderTextColor="#A39E99"
            />

            <View style={styles.expFormActions}>
              <TouchableOpacity style={styles.expPrimaryBtn} onPress={addOrUpdateExperience} activeOpacity={0.8}>
                <Ionicons name={editingExpIndex !== null ? 'checkmark' : 'add'} size={18} color="#FFFFFF" />
                <Text style={styles.expPrimaryBtnText}>
                  {editingExpIndex !== null ? t('profileEdit.actions.updateExperience') : t('profileEdit.actions.addExperience')}
                </Text>
              </TouchableOpacity>
              {editingExpIndex !== null && (
                <TouchableOpacity style={styles.expCancelBtn} onPress={resetExpForm} activeOpacity={0.8}>
                  <Text style={styles.expCancelBtnText}>{t('profileEdit.actions.cancel')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {expError ? <Text style={styles.errorText}>{expError}</Text> : null}
          </View>
        )}

        {/* Credentials Tab - Edit */}
        {activeTab === 'credentials' && (
          <View onLayout={(e) => setCredentialsContentY(e.nativeEvent.layout.y)}>
            {/* Certifications (qualifications[0]) */}
            <View
              style={[styles.sectionHeader, highlightedSection === 'qualifications' && styles.sectionHeaderHighlight]}
              onLayout={(e) => setQualificationsHeaderY(e.nativeEvent.layout.y)}
            >
              <Text style={styles.sectionTitle}>{t('profileEdit.sections.certifications')}</Text>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={qualifications[0] ?? ''}
                onChangeText={(text) => setQualificationAt(0, text)}
                placeholder={t('profileEdit.placeholders.certifications')}
                placeholderTextColor="#A39E99"
              />
            </View>

            {/* Institute Name (qualifications[1]) */}
            <Text style={styles.fieldLabel}>{t('profileEdit.fields.instituteName')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={qualifications[1] ?? ''}
                onChangeText={(text) => setQualificationAt(1, text)}
                placeholder={t('profileEdit.placeholders.otherInstitute')}
                placeholderTextColor="#A39E99"
              />
            </View>

            {/* Other Qualifications (qualifications[2+]) */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>{t('profileEdit.sections.otherQualifications')}</Text>
            </View>

            {otherQualifications.length > 0 ? (
              otherQualifications.map((qual, i) => (
                <View key={i + 2} style={styles.tagEditRow}>
                  <View style={styles.tagEditItem}>
                    <Ionicons name="school-outline" size={16} color="#BD632F" />
                    <Text style={styles.tagEditText}>{qual}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeQualification(i + 2)} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={20} color="#E53935" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>{t('profileEdit.empty.qualifications')}</Text>
            )}

            <View style={styles.addRow}>
              <TextInput
                ref={qualificationInputRef}
                style={[styles.input, { flex: 1, height: 40 }]}
                value={newQualification}
                onChangeText={(text) => {
                  setNewQualification(text);
                  if (qualificationError) setQualificationError('');
                }}
                placeholder={t('profileEdit.placeholders.addQualification')}
                placeholderTextColor="#A39E99"
                onSubmitEditing={addQualification}
              />
              <TouchableOpacity
                style={styles.addBtn}
                onPress={addQualification}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={t('profileEdit.a11y.addQualification')}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {qualificationError ? <Text style={styles.errorText}>{qualificationError}</Text> : null}

            {/* Specializations */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>{t('profileEdit.sections.specializations')}</Text>
            </View>

            {specializations.length > 0 ? (
              specializations.map((spec, i) => (
                <View key={i} style={styles.tagEditRow}>
                  <View style={styles.tagEditItem}>
                    <Ionicons name="ribbon-outline" size={16} color="#BD632F" />
                    <Text style={styles.tagEditText}>{spec}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeSpecialization(i)} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={20} color="#E53935" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>{t('profileEdit.empty.specializations')}</Text>
            )}

            <View style={styles.addRow}>
              <TextInput
                ref={specializationInputRef}
                style={[styles.input, { flex: 1, height: 40 }]}
                value={newSpecialization}
                onChangeText={(text) => {
                  setNewSpecialization(text);
                  if (specializationError) setSpecializationError('');
                }}
                placeholder={t('profileEdit.placeholders.addSpecialization')}
                placeholderTextColor="#A39E99"
                onSubmitEditing={addSpecialization}
              />
              <TouchableOpacity
                style={styles.addBtn}
                onPress={addSpecialization}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={t('profileEdit.a11y.addSpecialization')}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {specializationError ? <Text style={styles.errorText}>{specializationError}</Text> : null}

            {/* License Number */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>{t('profileEdit.sections.licenseNumber')}</Text>
            </View>

            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder={t('profileEdit.placeholders.licenseNumber')}
                placeholderTextColor="#A39E99"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  saveBtn: { backgroundColor: '#BD632F', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },

  // Doctor Card
  doctorCard: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6E1DC', padding: 16, marginBottom: 16 },
  doctorInfoRow: { flexDirection: 'row', marginBottom: 14 },
  avatarContainer: { position: 'relative', marginRight: 14 },
  cameraBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#FFFFFF' },
  doctorDetails: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: '800', color: '#1A1817', marginBottom: 2 },
  doctorSpecialty: { fontSize: 12, fontWeight: '500', color: '#7C7672', marginBottom: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  ratingText: { fontSize: 11, fontWeight: '600', color: '#7C7672' },
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
  sectionHeaderHighlight: { backgroundColor: '#FFF2EB', borderRadius: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1817' },
  errorText: { fontSize: 12, fontWeight: '600', color: '#E53935', marginTop: 6 },

  // Fields
  fieldLabel: { fontSize: 12, fontWeight: '500', color: '#9C9690', marginBottom: 6, marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 14, height: 48, marginBottom: 10, gap: 8 },
  input: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1817', height: '100%' },
  textarea: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, minHeight: 120, fontSize: 13, fontWeight: '500', color: '#1A1817', lineHeight: 19, marginBottom: 10 },

  // Existing items
  existingItem: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E1DC', padding: 12, marginBottom: 8 },
  existingItemContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  existingItemTitle: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  existingItemSubtitle: { fontSize: 12, fontWeight: '500', color: '#7C7672', marginTop: 2 },

  // Tags edit
  tagEditRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E1DC', padding: 12, marginBottom: 8 },
  tagEditItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  tagEditText: { fontSize: 14, fontWeight: '600', color: '#1A1817' },
  emptyText: { fontSize: 13, fontWeight: '500', color: '#9C9690', marginBottom: 12, fontStyle: 'italic' },

  // Add row
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  expFormActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 8 },
  expPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#BD632F',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  expPrimaryBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  expCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    backgroundColor: '#FFFFFF',
  },
  expCancelBtnText: { fontSize: 14, fontWeight: '700', color: '#7C7672' },
});
