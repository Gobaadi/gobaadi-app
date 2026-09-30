import React, { useState } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetAnimalByIdQuery } from '@/store/animalsApi';
import { useGetByAnimalMedicalEventsQuery } from '@/store/medicalEventsApi';
import { useGetByAnimalPrescriptionsQuery } from '@/store/prescriptionsApi';
import { useGetByPatientMedicalRecordsQuery } from '@/store/medicalRecordsApi';
import { useGetConversationsQuery, useCreateConversationMutation } from '@/store/chatApi';
import { useGetDoctorBookingsQuery } from '@/store/doctorPortalApi';
import type { MedicalEvent } from '@/store/medicalEventsApi';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'consults', label: 'Consults' },
  { key: 'treatments', label: 'Treatments' },
  { key: 'vaccination', label: 'Vaccination' },
  { key: 'labTests', label: 'Lab Tests' },
  { key: 'files', label: 'Files' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function StatusBadge({ status }: { status: string }) {
  const lower = status?.toLowerCase() || '';
  const isOngoing = lower === 'ongoing';
  const isCompleted = lower === 'completed';
  const bgColor = isOngoing ? '#FFF3E0' : isCompleted ? '#E8F5E9' : '#E3F2FD';
  const textColor = isOngoing ? '#E65100' : isCompleted ? '#2E7D32' : '#1565C0';
  const label = isOngoing ? 'Ongoing' : isCompleted ? 'Completed' : status;

  return (
    <View style={[statusBadgeStyles.badge, { backgroundColor: bgColor }]}>
      <Text style={[statusBadgeStyles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const statusBadgeStyles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  text: { fontSize: 11, fontWeight: '600' },
});

function DataFields({ data }: { data: Record<string, any> }) {
  return (
    <View>
      {Object.entries(data).map(([key, value]) => (
        <View key={key} style={{ marginBottom: 8 }}>
          <Text style={tabStyles.detailLabelFirst}>
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}:
          </Text>
          {Array.isArray(value) ? (
            value.map((v: any, i: number) => (
              <Text key={i} style={tabStyles.bulletItem}>
                {typeof v === 'string' ? v : JSON.stringify(v)}
              </Text>
            ))
          ) : (
            <Text style={tabStyles.detailText}>
              {typeof value === 'string' ? value : JSON.stringify(value)}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function AllTab({ events, prescriptions }: { events: MedicalEvent[]; prescriptions: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allItems = [
    ...events.map((e) => ({ ...e, _kind: 'event' as const })),
    ...prescriptions.map((p) => ({ ...p, _kind: 'prescription' as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <View style={tabStyles.section}>
      <Text style={tabStyles.sectionTitle}>Recent activities</Text>
      {allItems.length === 0 ? (
        <Text style={tabStyles.emptyText}>No activities recorded yet.</Text>
      ) : (
        allItems.map((item) => {
          const id = String(item._kind === 'prescription' ? `rx-${item.id}` : item.id);
          return (
            <TouchableOpacity
              key={id}
              style={tabStyles.activityCard}
              onPress={() => setExpandedId(expandedId === id ? null : id)}
              activeOpacity={0.7}
            >
              <View style={tabStyles.activityHeader}>
                <View style={tabStyles.activityInfo}>
                  <Text style={tabStyles.activityDate}>{formatDate(item.createdAt)}</Text>
                  <Text style={tabStyles.activityTitle}>
                    {item._kind === 'prescription'
                      ? `Prescription (${item.medicines?.length || 0} medicines)`
                      : `${(item.type || 'Medical Event').replace('_', ' ')}`}
                  </Text>
                  <Text style={tabStyles.activityDoctor}>Status: {item.status || 'N/A'}</Text>
                </View>
                <View style={tabStyles.activityRight}>
                  <StatusBadge status={item.status || 'ONGOING'} />
                  <Ionicons
                    name={expandedId === id ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#9C9690"
                    style={{ marginTop: 8 }}
                  />
                </View>
              </View>
              {expandedId === id && (
                <View style={tabStyles.expandedContent}>
                  {item._kind === 'event' && item.data && <DataFields data={item.data} />}
                  {item._kind === 'prescription' && item.medicines && (
                    <View>
                      <Text style={tabStyles.detailLabelFirst}>Medicines:</Text>
                      {item.medicines.map((m: any, i: number) => (
                        <Text key={i} style={tabStyles.bulletItem}>
                          {m.name} - {m.dosage} ({m.duration})
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

function EventListTab({ events, title }: { events: MedicalEvent[]; title: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(events.length > 0 ? String(events[0].id) : null);

  return (
    <View style={tabStyles.section}>
      <Text style={tabStyles.sectionTitle}>{title}</Text>
      {events.length === 0 ? (
        <Text style={tabStyles.emptyText}>No {title.toLowerCase()} recorded yet.</Text>
      ) : (
        events.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={tabStyles.activityCard}
            onPress={() => setExpandedId(expandedId === String(item.id) ? null : String(item.id))}
            activeOpacity={0.7}
          >
            <View style={tabStyles.activityHeader}>
              <View style={tabStyles.activityInfo}>
                <Text style={tabStyles.activityDate}>
                  {formatDate(item.createdAt)}
                  {item.type !== 'TREATMENT' ? ` · ${formatTime(item.createdAt)}` : ''}
                </Text>
                <Text style={tabStyles.activityTitle}>{title}</Text>
                <Text style={tabStyles.activityDoctor}>Doctor #{item.doctorId}</Text>
              </View>
              <View style={tabStyles.activityRight}>
                <StatusBadge status={item.status || 'ONGOING'} />
                <Ionicons
                  name={expandedId === String(item.id) ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#9C9690"
                  style={{ marginTop: 8 }}
                />
              </View>
            </View>
            {expandedId === String(item.id) && item.data && (
              <View style={tabStyles.expandedContent}>
                <DataFields data={item.data} />
                {item.nextFollowUpAt && (
                  <View style={tabStyles.followUpRow}>
                    <Text style={tabStyles.detailLabel}>Next Follow-up:</Text>
                    <Text style={tabStyles.followUpDate}>{formatDate(item.nextFollowUpAt)}</Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

function FilesTab({ records }: { records: any[] }) {
  return (
    <View style={tabStyles.section}>
      <Text style={tabStyles.sectionTitle}>Files</Text>
      {records.length === 0 ? (
        <Text style={tabStyles.emptyText}>No files uploaded yet.</Text>
      ) : (
        records.map((item) => (
          <View key={item.id} style={tabStyles.fileCard}>
            <View style={tabStyles.fileIcon}>
              <Ionicons name="document-text" size={28} color="#E53935" />
              <Text style={tabStyles.fileType}>{item.mimeType?.split('/')[1] || 'file'}</Text>
            </View>
            <View style={tabStyles.fileInfo}>
              <Text style={tabStyles.fileName}>{item.originalFileName}</Text>
              <Text style={tabStyles.fileMeta}>
                {formatDate(item.createdAt)} · {item.status}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export default function PatientDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const isDoctor = useRequireDoctor();

  const [activeTab, setActiveTab] = useState('all');
  const animalId = params.id || '1';

  const { data: animal, isLoading: animalLoading } = useGetAnimalByIdQuery(animalId);
  const { data: allEvents = [], isLoading: eventsLoading } = useGetByAnimalMedicalEventsQuery({ animalId });
  const { data: prescriptions = [] } = useGetByAnimalPrescriptionsQuery(animalId);
  const { data: records = [] } = useGetByPatientMedicalRecordsQuery(animalId);
  const { data: conversations = [] } = useGetConversationsQuery();
  const [createConversation] = useCreateConversationMutation();
  const { data: bookings = [] } = useGetDoctorBookingsQuery();

  /**
   * Opens the chat for this animal's owner with the real conversation id and
   * (when an appointment exists for this animal) the appointment id, so the
   * consultation flow works from this screen.
   */
  const handleStartConsultation = async () => {
    const booking =
      bookings
        .filter((b) => b.animalId === Number(animalId))
        .sort((a, b) => +new Date(b.startAt) - +new Date(a.startAt))[0] ?? null;
    const patientId = booking?.patientId ?? animal?.userId ?? null;
    if (!patientId) {
      Alert.alert('Error', 'No owner found for this animal.');
      return;
    }
    try {
      const existing = conversations.find((c) => c.patientId === patientId);
      let conversationId = existing?.id;
      if (!conversationId) {
        const created = await createConversation({ patientId }).unwrap();
        conversationId = created.id;
      }
      router.push({
        pathname: '/chat',
        params: {
          conversationId: String(conversationId),
          patientName: booking?.patientName || animal?.name || 'Patient',
          animalImage: booking?.animalImage || animal?.image || '',
          ...(booking ? { appointmentId: String(booking.id) } : {}),
        },
      });
    } catch {
      Alert.alert('Error', 'Could not open the consultation. Please try again.');
    }
  };

  const consultEvents = allEvents.filter((e) => e.type === 'CONSULTATION');
  const treatmentEvents = allEvents.filter((e) => e.type === 'TREATMENT');
  const vaccinationEvents = allEvents.filter((e) => e.type === 'VACCINATION');
  const labTestEvents = allEvents.filter((e) => e.type === 'LAB_TEST');

  const tabCounts: Record<string, number> = {
    all: allEvents.length + prescriptions.length,
    consults: consultEvents.length,
    treatments: treatmentEvents.length,
    vaccination: vaccinationEvents.length,
    labTests: labTestEvents.length,
    files: records.length,
  };

  const isLoading = animalLoading || eventsLoading;

  if (!isDoctor) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'all':
        return <AllTab events={allEvents} prescriptions={prescriptions} />;
      case 'consults':
        return <EventListTab events={consultEvents} title="Consultations" />;
      case 'treatments':
        return <EventListTab events={treatmentEvents} title="Treatments" />;
      case 'vaccination':
        return <EventListTab events={vaccinationEvents} title="Vaccinations" />;
      case 'labTests':
        return <EventListTab events={labTestEvents} title="Lab Tests" />;
      case 'files':
        return <FilesTab records={records} />;
      default:
        return <AllTab events={allEvents} prescriptions={prescriptions} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#BD632F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Details</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#BD632F" />
          </View>
        ) : !animal ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#E6E1DC" />
            <Text style={{ fontSize: 15, color: '#9C9690', marginTop: 12 }}>Patient not found</Text>
          </View>
        ) : (
          <>
            <View style={styles.patientCard}>
              <View style={styles.patientAvatar}>
                {animal.image ? (
                  <Image source={{ uri: animal.image }} style={styles.patientImage} contentFit="cover" />
                ) : (
                  <Ionicons name="paw" size={32} color="#BD632F" />
                )}
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{animal.name}</Text>
                <View style={styles.patientInfoRow}>
                  <View style={styles.patientInfoItem}>
                    <Text style={styles.patientInfoLabel}>Species</Text>
                    <Text style={styles.patientInfoValue}>{animal.breed}</Text>
                  </View>
                  <View style={styles.patientInfoItem}>
                    <Text style={styles.patientInfoLabel}>Age</Text>
                    <Text style={styles.patientInfoValue}>{animal.age}</Text>
                  </View>
                  <View style={styles.patientInfoItem}>
                    <Text style={styles.patientInfoLabel}>Weight</Text>
                    <Text style={styles.patientInfoValue}>{animal.weight}</Text>
                  </View>
                </View>
                {animal.color && (
                  <View style={styles.patientOwnerRow}>
                    <View style={styles.patientOwnerItem}>
                      <Text style={styles.patientInfoLabel}>Color</Text>
                      <Text style={styles.patientInfoValue}>{animal.color}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContainer}
            >
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                    {tab.label} ({tabCounts[tab.key] || 0})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {renderTabContent()}
          </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.consultBtn}
          activeOpacity={0.85}
          onPress={handleStartConsultation}
        >
          <Text style={styles.consultBtnText}>Start Consultation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
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
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1817' },
  scrollContainer: { paddingBottom: 100 },
  loadingContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
  patientCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  patientAvatar: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  patientImage: { width: 80, height: 80, borderRadius: 16 },
  patientInfo: { flex: 1, justifyContent: 'center' },
  patientName: { fontSize: 17, fontWeight: '700', color: '#1A1817', marginBottom: 8 },
  patientInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  patientInfoItem: { flex: 1 },
  patientInfoLabel: { fontSize: 11, fontWeight: '600', color: '#BD632F', marginBottom: 2 },
  patientInfoValue: { fontSize: 13, fontWeight: '600', color: '#1A1817' },
  patientOwnerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  patientOwnerItem: { flex: 1 },
  tabsContainer: { paddingHorizontal: 20, marginBottom: 16, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  tabActive: { backgroundColor: '#BD632F', borderColor: '#BD632F' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#7C7672' },
  tabTextActive: { color: '#FFFFFF' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
  },
  consultBtn: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  consultBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

const tabStyles = StyleSheet.create({
  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1817', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9C9690', fontWeight: '500', textAlign: 'center', marginTop: 20 },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 14,
    marginBottom: 12,
  },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  activityInfo: { flex: 1 },
  activityRight: { alignItems: 'flex-end', gap: 6 },
  activityDate: { fontSize: 13, fontWeight: '600', color: '#9C9690', marginBottom: 4 },
  activityTitle: { fontSize: 15, fontWeight: '700', color: '#1A1817', marginBottom: 2 },
  activityDoctor: { fontSize: 13, fontWeight: '500', color: '#7C7672' },
  treatmentHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  treatmentSubheader: { fontSize: 11, fontWeight: '600', color: '#BD632F', marginBottom: 4 },
  expandedContent: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0EAE1' },
  detailLabel: { fontSize: 13, fontWeight: '700', color: '#1A1817', marginBottom: 6, marginTop: 12 },
  detailLabelFirst: { fontSize: 13, fontWeight: '700', color: '#1A1817', marginBottom: 6, marginTop: 0 },
  detailText: { fontSize: 13, fontWeight: '500', color: '#7C7672', lineHeight: 20 },
  bulletItem: { fontSize: 13, fontWeight: '500', color: '#7C7672', lineHeight: 22, paddingLeft: 8, marginBottom: 2 },
  followUpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0EAE1',
  },
  followUpDate: { fontSize: 14, fontWeight: '700', color: '#BD632F' },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  fileIcon: {
    width: 48,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileType: { fontSize: 9, fontWeight: '700', color: '#E53935', marginTop: 2 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  fileMeta: { fontSize: 12, fontWeight: '500', color: '#9C9690', marginTop: 2 },
});
