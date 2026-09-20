import React, { useState, useEffect, useMemo } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetMyDoctorProfileQuery,
  useGetDoctorBookingsQuery,
  useUpdateProfileMutation,
  useUpdateExperiencesMutation,
  useUpdateQualificationsMutation,
  useUpdateSpecializationsMutation,
} from '@/store/doctorPortalApi';

type Tab = 'about' | 'experience' | 'credentials';

export default function ProfileEditScreen() {
  const router = useRouter();
  const isDoctor = useRequireDoctor();
  if (!isDoctor) return null;

  const { data: doctorProfile, isLoading: profileLoading } = useGetMyDoctorProfileQuery(undefined, { skip: !isDoctor });
  const { data: doctorBookings = [] } = useGetDoctorBookingsQuery(undefined, { skip: !isDoctor });

  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [updateExperiences, { isLoading: savingExperiences }] = useUpdateExperiencesMutation();
  const [updateQualifications, { isLoading: savingQualifications }] = useUpdateQualificationsMutation();
  const [updateSpecializations, { isLoading: savingSpecializations }] = useUpdateSpecializationsMutation();

  const [activeTab, setActiveTab] = useState<Tab>('about');

  // About fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [experience, setExperience] = useState('');

  // Experience fields
  const [expTitle, setExpTitle] = useState('');
  const [expInstitute, setExpInstitute] = useState('');
  const [expDuration, setExpDuration] = useState('');
  const [expDescription, setExpDescription] = useState('');

  // Qualifications
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [newQualification, setNewQualification] = useState('');

  // Specializations
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [newSpecialization, setNewSpecialization] = useState('');

  // License
  const [licenseNumber, setLicenseNumber] = useState('');

  // Pre-fill fields from API
  useEffect(() => {
    if (doctorProfile) {
      setName(doctorProfile.name || '');
      setBio(doctorProfile.bio || '');
      setSpecialty(doctorProfile.specialty || '');
      setExperience(doctorProfile.experience || '');
      setQualifications(doctorProfile.qualifications || []);
      setSpecializations(doctorProfile.specializations || []);
      setLicenseNumber(doctorProfile.licenseNumber || '');

      // Pre-fill first experience if exists
      if (doctorProfile.experiences && doctorProfile.experiences.length > 0) {
        const exp = doctorProfile.experiences[0];
        setExpTitle(exp.title || '');
        setExpInstitute(exp.organization || '');
        setExpDuration(exp.duration || '');
        setExpDescription(exp.description || '');
      }
    }
  }, [doctorProfile]);

  const uniquePatients = useMemo(() => {
    const patientIds = new Set(doctorBookings.map((b) => b.patientId));
    return patientIds.size;
  }, [doctorBookings]);

  const completedConsultations = useMemo(() => {
    return doctorBookings.filter((b) => b.status === 'COMPLETED').length;
  }, [doctorBookings]);

  const isSaving = savingProfile || savingExperiences || savingQualifications || savingSpecializations;

  const handleSaveAbout = async () => {
    await updateProfile({
      name,
      bio,
      specialty,
      experience,
    }).unwrap();
  };

  const handleSaveExperience = async () => {
    const experiences = [];
    if (expTitle || expInstitute) {
      experiences.push({
        title: expTitle,
        organization: expInstitute,
        duration: expDuration,
        description: expDescription,
      });
    }
    if (doctorProfile?.experiences && doctorProfile.experiences.length > 1) {
      experiences.push(...doctorProfile.experiences.slice(1));
    }
    await updateExperiences(experiences).unwrap();
  };

  const handleSaveQualifications = async () => {
    try {
      await updateQualifications(qualifications).unwrap();
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
      Alert.alert('Success', 'Changes saved successfully');
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  };

  const addQualification = () => {
    if (newQualification.trim()) {
      setQualifications([...qualifications, newQualification.trim()]);
      setNewQualification('');
    }
  };

  const removeQualification = (index: number) => {
    setQualifications(qualifications.filter((_, i) => i !== index));
  };

  const addSpecialization = () => {
    if (newSpecialization.trim()) {
      setSpecializations([...specializations, newSpecialization.trim()]);
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (index: number) => {
    setSpecializations(specializations.filter((_, i) => i !== index));
  };

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
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Doctor Card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorInfoRow}>
            <View style={styles.avatarContainer}>
              {doctorProfile?.avatar ? (
                <Image source={{ uri: doctorProfile.avatar }} style={styles.avatarPlaceholder} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#BD632F" />
                </View>
              )}
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.doctorDetails}>
              <Text style={styles.doctorName}>Dr {doctorProfile?.name || 'Doctor'}</Text>
              <Text style={styles.doctorSpecialty}>{doctorProfile?.specialty || 'No specialty'}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>{doctorProfile?.rating ?? '0.0'} ({doctorBookings.length} reviews)</Text>
              </View>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{uniquePatients}</Text>
              <Text style={styles.statLabel}>Patients</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{completedConsultations}</Text>
              <Text style={styles.statLabel}>Consultations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{doctorProfile?.experience || '0'}</Text>
              <Text style={styles.statLabel}>Years Experience</Text>
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
                {tab === 'about' ? 'About' : tab === 'experience' ? 'Experience' : 'Credentials'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* About Tab - Edit */}
        {activeTab === 'about' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personal information</Text>
            </View>

            <Text style={styles.fieldLabel}>Your Name</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your name" placeholderTextColor="#A39E99" />
            </View>

            <Text style={styles.fieldLabel}>Specialty</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={specialty} onChangeText={setSpecialty} placeholder="e.g. Veterinary Surgery" placeholderTextColor="#A39E99" />
            </View>

            <Text style={styles.fieldLabel}>Years of Experience</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={experience} onChangeText={setExperience} placeholder="e.g. 5 Years" placeholderTextColor="#A39E99" />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>About / Bio</Text>
            <TextInput
              style={styles.textarea}
              value={bio}
              onChangeText={setBio}
              multiline
              textAlignVertical="top"
              placeholder="Tell patients about yourself..."
              placeholderTextColor="#A39E99"
            />
          </View>
        )}

        {/* Experience Tab - Edit */}
        {activeTab === 'experience' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Experiences</Text>
            </View>

            {doctorProfile?.experiences && doctorProfile.experiences.length > 0 ? (
              doctorProfile.experiences.map((exp, i) => (
                <View key={i} style={styles.existingItem}>
                  <View style={styles.existingItemContent}>
                    <Ionicons name="briefcase-outline" size={18} color="#BD632F" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.existingItemTitle}>{exp.title}</Text>
                      <Text style={styles.existingItemSubtitle}>{exp.organization} · {exp.duration}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : null}

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Position Title</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={expTitle} onChangeText={setExpTitle} placeholder="e.g. Senior Veterinarian" placeholderTextColor="#A39E99" />
            </View>

            <Text style={styles.fieldLabel}>Institute Name</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={expInstitute} onChangeText={setExpInstitute} placeholder="e.g. City Vet Clinic" placeholderTextColor="#A39E99" />
            </View>

            <Text style={styles.fieldLabel}>Duration</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={expDuration} onChangeText={setExpDuration} placeholder="e.g. Jan 2020 - Present" placeholderTextColor="#A39E99" />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Description</Text>
            <TextInput
              style={styles.textarea}
              value={expDescription}
              onChangeText={setExpDescription}
              multiline
              textAlignVertical="top"
              placeholder="Describe your role and achievements..."
              placeholderTextColor="#A39E99"
            />
          </View>
        )}

        {/* Credentials Tab - Edit */}
        {activeTab === 'credentials' && (
          <View>
            {/* Qualifications */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Qualifications</Text>
            </View>

            {qualifications.length > 0 ? (
              qualifications.map((qual, i) => (
                <View key={i} style={styles.tagEditRow}>
                  <View style={styles.tagEditItem}>
                    <Ionicons name="school-outline" size={16} color="#BD632F" />
                    <Text style={styles.tagEditText}>{qual}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeQualification(i)} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={20} color="#E53935" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No qualifications added yet</Text>
            )}

            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newQualification}
                onChangeText={setNewQualification}
                placeholder="Add qualification..."
                placeholderTextColor="#A39E99"
                onSubmitEditing={addQualification}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addQualification} activeOpacity={0.8}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Specializations */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Specializations</Text>
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
              <Text style={styles.emptyText}>No specializations added yet</Text>
            )}

            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newSpecialization}
                onChangeText={setNewSpecialization}
                placeholder="Add specialization..."
                placeholderTextColor="#A39E99"
                onSubmitEditing={addSpecialization}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addSpecialization} activeOpacity={0.8}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* License Number */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>License Number</Text>
            </View>

            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="Enter license number..."
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
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1817' },

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
});
