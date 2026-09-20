import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import { useGetMyPatientsQuery } from '@/store/discountsApi';
import { EmptyState } from '@/components/ui/empty-state';
import { MediaCardSkeleton } from '@/components/ui/skeleton';

export default function DoctorPatientsScreen() {
  const router = useRouter();
  const isDoctor = useRequireDoctor();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: patients = [], isLoading } = useGetMyPatientsQuery({
    search: searchQuery || undefined,
  });

  if (!isDoctor) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#BD632F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patients</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#9C9690" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients..."
          placeholderTextColor="#9C9690"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color="#9C9690" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading ? (
          <>
            <MediaCardSkeleton imageSize={80} />
            <MediaCardSkeleton imageSize={80} />
            <MediaCardSkeleton imageSize={80} />
            <MediaCardSkeleton imageSize={80} />
          </>
        ) : patients.length === 0 ? (
          <EmptyState
            title={searchQuery ? 'No patients found' : 'No patients yet'}
            description={
              searchQuery
                ? 'Try a different search term.'
                : 'Patients will appear here after their first appointment.'
            }
          />
        ) : (
          patients.map((patient) => (
            <TouchableOpacity
              key={patient.id}
              style={styles.patientCard}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/patient-details',
                  params: { id: patient.id.toString() },
                })
              }
            >
              <View style={styles.patientAvatar}>
                {patient.image ? (
                  <Image
                    source={{ uri: patient.image }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="paw" size={28} color="#BD632F" />
                )}
              </View>

              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientBreed}>{patient.breed}</Text>
                <View style={styles.patientMetaRow}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Age</Text>
                    <Text style={styles.metaValue}>{patient.age}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Weight</Text>
                    <Text style={styles.metaValue}>{patient.weight}</Text>
                  </View>
                  {patient.ownerName && (
                    <>
                      <View style={styles.metaDivider} />
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Owner</Text>
                        <Text style={styles.metaValue} numberOfLines={1}>
                          {patient.ownerName}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#9C9690" />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1817',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1817',
    paddingVertical: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
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
    gap: 14,
  },
  patientAvatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  patientInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 2,
  },
  patientBreed: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7C7672',
    marginBottom: 8,
  },
  patientMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#BD632F',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1817',
    marginTop: 1,
  },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E6E1DC',
    marginHorizontal: 8,
  },
});
