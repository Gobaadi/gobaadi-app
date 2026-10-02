import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetConversationsQuery, useCreateConversationMutation } from '@/store/chatApi';
import { useConversationListSocket } from '@/hooks/use-chat-socket';
import {
  useGetDoctorBookingsQuery,
  type DoctorAppointment,
} from '@/store/doctorPortalApi';
import { PatientAvatar } from '@/components/patient-avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { formatTime12h } from '@/utils/date';

interface EnrichedChat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isPending: boolean;
  animalImage?: string;
  patientAvatar?: string;
  patientId: number;
  conversationId?: number;
  appointmentId?: number;
  appointmentStatus?: string;
  consultationType?: string;
  startAt?: string;
  animalId?: number;
  animalName?: string;
}

function formatChatTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function formatAppointmentTime(iso?: string): string {
  if (!iso) return '';
  return formatTime12h(iso);
}

export default function DoctorMessagesScreen() {
  const router = useRouter();
  const isDoctor = useRequireDoctor();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const [creatingId, setCreatingId] = useState<number | null>(null);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const closeSearch = useCallback(() => {
    setSearchQuery('');
    setSearchOpen(false);
    searchInputRef.current?.blur();
  }, []);

  const { data: conversations = [] } = useGetConversationsQuery();
  // Live badge updates: refetch conversations when the other party sends a
  // message (the gateway emits `conversationUpdated` to each user room).
  useConversationListSocket();
  const { data: bookings = [] } = useGetDoctorBookingsQuery();
  const [createConversation] = useCreateConversationMutation();
  // Live-refresh the list (incl. unread badges) when the gateway broadcasts
  // conversationUpdated — e.g. a new patient message or a read receipt.
  useConversationListSocket();

  const conversationByPatientId = useMemo(() => {
    const map = new Map<number, number>();
    conversations.forEach((conv) => {
      map.set(conv.patientId, conv.id);
    });
    return map;
  }, [conversations]);

  const patientLookup = useMemo(() => {
    const map = new Map<number, DoctorAppointment>();
    const now = new Date().getTime();
    // Prefer the soonest upcoming appointment per patient, otherwise the
    // most recent past one — chat should link to the relevant appointment.
    const sorted = [...bookings].sort((a, b) => {
      const aUp = new Date(a.startAt).getTime() >= now;
      const bUp = new Date(b.startAt).getTime() >= now;
      if (aUp !== bUp) return aUp ? -1 : 1;
      return aUp
        ? new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        : new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
    });
    sorted.forEach((b) => {
      if (!map.has(b.patientId)) {
        map.set(b.patientId, b);
      }
    });
    return map;
  }, [bookings]);

  const enrichedChats = useMemo<EnrichedChat[]>(() => {
    const chatMap = new Map<number, EnrichedChat>();

    conversations.forEach((conv) => {
      const appointment = patientLookup.get(conv.patientId);
      chatMap.set(conv.patientId, {
        id: String(conv.id),
        name:
          conv.patientName ||
          appointment?.patientName ||
          conv.animalName ||
          appointment?.animalName ||
          'Patient',
        lastMessage: conv.lastMessageText || 'Start a conversation',
        time: formatChatTime(conv.lastMessageAt),
        unreadCount: conv.unreadCount || 0,
        isPending: false,
        animalImage: appointment?.animalImage,
        patientAvatar: appointment?.patientAvatar,
        patientId: conv.patientId,
        conversationId: conv.id,
        appointmentId: appointment?.id != null ? Number(appointment.id) : undefined,
        animalId: appointment?.animalId,
        animalName: appointment?.animalName,
        startAt: appointment?.startAt,
      });
    });

    bookings.forEach((b) => {
      if (!chatMap.has(b.patientId)) {
        chatMap.set(b.patientId, {
          id: `apt-${b.patientId}`,
          name: b.patientName || b.animalName || 'Patient',
          lastMessage: '',
          time: formatAppointmentTime(b.startAt),
          unreadCount: 0,
          isPending: true,
              animalImage: b.animalImage,
              patientAvatar: b.patientAvatar,
              patientId: b.patientId,
          appointmentId: Number(b.id),
          appointmentStatus: b.status,
          consultationType: b.consultationType,
          startAt: b.startAt,
          animalId: b.animalId,
          animalName: b.animalName,
        });
      }
    });

    return Array.from(chatMap.values());
  }, [conversations, bookings, patientLookup]);

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return enrichedChats;
    return enrichedChats.filter(
      (c) => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q),
    );
  }, [enrichedChats, searchQuery]);

  const nextAppointment = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((b) => new Date(b.startAt) >= now && b.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
  }, [bookings]);

  const handleChatPress = useCallback(
    async (chat: EnrichedChat) => {
      const baseParams = {
        patientName: chat.name,
        animalImage: chat.animalImage || '',
        theirAvatar: chat.patientAvatar,
        appointmentId:
          chat.appointmentId != null ? String(chat.appointmentId) : undefined,
        animalId: chat.animalId != null ? String(chat.animalId) : undefined,
        animalName: chat.animalName,
        appointmentTime: chat.startAt,
      };
      if (chat.conversationId) {
        router.push({
          pathname: '/chat',
          params: {
            conversationId: String(chat.conversationId),
            ...baseParams,
          },
        });
        return;
      }

      setCreatingId(chat.patientId);
      try {
        const result = await createConversation({ patientId: chat.patientId }).unwrap();
        router.push({
          pathname: '/chat',
          params: {
            conversationId: String(result.id),
            ...baseParams,
          },
        });
      } catch {}
      setCreatingId(null);
    },
    [createConversation, router]
  );

  const handleJoinAppointment = useCallback(
    async (appointment: DoctorAppointment) => {
      setCreatingId(Number(appointment.patientId));
      try {
        const result = await createConversation({ patientId: Number(appointment.patientId) }).unwrap();
        router.push({
          pathname: '/chat',
          params: {
            conversationId: String(result.id),
            patientName: appointment.patientName || appointment.animalName || 'Patient',
            animalImage: appointment.animalImage || '',
            theirAvatar: appointment.patientAvatar,
            appointmentId: String(appointment.id),
            animalId:
              appointment.animalId != null ? String(appointment.animalId) : undefined,
            animalName: appointment.animalName,
            appointmentTime: appointment.startAt,
          },
        });
      } catch {}
      setCreatingId(null);
    },
    [createConversation, router]
  );

  if (!isDoctor) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {searchOpen ? (
          <View style={styles.searchField}>
            <Ionicons name="search" size={18} color="#9C9690" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search chats..."
              placeholderTextColor="#9C9690"
              returnKeyType="search"
              autoCorrect={false}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color="#9C9690" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={styles.headerTitle}>Chat</Text>
        )}
        <TouchableOpacity
          style={styles.searchBtn}
          activeOpacity={0.7}
          onPress={searchOpen ? closeSearch : openSearch}
        >
          <Ionicons
            name={searchOpen ? 'close' : 'search'}
            size={20}
            color="#1A1817"
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {nextAppointment && !searchQuery && (
          <TouchableOpacity
            style={styles.upcomingCard}
            activeOpacity={0.85}
            onPress={() => handleJoinAppointment(nextAppointment)}
          >
            <View style={styles.upcomingContent}>
              <View style={styles.upcomingLeft}>
                <Text style={styles.upcomingLabel}>Upcoming appointment</Text>
                <Text style={styles.upcomingTime}>
                  {formatAppointmentTime(nextAppointment.startAt)} · Today
                </Text>
                <Text style={styles.upcomingPetName}>{nextAppointment.animalName || 'Pet'}</Text>
                <Text style={styles.upcomingOwner}>
                  Owner{'   '}
                  {nextAppointment.patientName ||
                    nextAppointment.patientPhone ||
                    'Patient'}
                </Text>
              </View>
              <View style={styles.upcomingRight}>
                <View style={styles.upcomingPetAvatar}>
                  {nextAppointment.animalImage ? (
                    <Image source={{ uri: nextAppointment.animalImage }} style={styles.upcomingPetAvatarImage} />
                  ) : (
                    <PatientAvatar
                      name={nextAppointment.patientName || nextAppointment.animalName}
                      image={nextAppointment.patientImage}
                      size={64}
                      radius={16}
                    />
                  )}
                </View>
                <TouchableOpacity style={styles.joinBtn} activeOpacity={0.85}>
                  <Text style={styles.joinBtnText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Recent chats</Text>

        {searchQuery && filteredChats.length === 0 ? (
          <EmptyState
            title="No chats found"
            description="Try a different name or message."
          />
        ) : (
          filteredChats.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatItem}
              activeOpacity={0.7}
              onPress={() => handleChatPress(chat)}
              disabled={creatingId === chat.patientId}
            >
              <PatientAvatar
                name={chat.name}
                image={chat.animalImage || chat.patientPhoto}
                size={48}
                radius={24}
                style={styles.chatAvatarSpacing}
              />
              <View style={styles.chatInfo}>
                <View style={styles.chatTopRow}>
                  <Text style={styles.chatName}>{chat.name}</Text>
                  <Text style={styles.chatTime}>{chat.time}</Text>
                </View>
                <View style={styles.chatBottomRow}>
                  {creatingId === chat.patientId ? (
                    <ActivityIndicator size="small" color="#BD632F" />
                  ) : chat.isPending ? (
                    <Text style={styles.pendingText}>
                      Tap to start chatting
                    </Text>
                  ) : (
                    <Text style={styles.chatLastMessage} numberOfLines={1}>{chat.lastMessage}</Text>
                  )}
                  {chat.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{chat.unreadCount}</Text>
                    </View>
                  )}
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
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    marginRight: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1A1817', paddingVertical: 0 },
  searchBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  upcomingCard: { backgroundColor: '#E6D5C3', borderRadius: 20, padding: 16, marginBottom: 24 },
  upcomingContent: { flexDirection: 'row', justifyContent: 'space-between' },
  upcomingLeft: { flex: 1, marginRight: 12 },
  upcomingLabel: { fontSize: 14, fontWeight: '800', color: '#BD632F', marginBottom: 4 },
  upcomingTime: { fontSize: 12, fontWeight: '600', color: '#7C7672', marginBottom: 2 },
  upcomingPetName: { fontSize: 17, fontWeight: '800', color: '#1A1817', marginBottom: 2 },
  upcomingOwner: { fontSize: 12, fontWeight: '500', color: '#7C7672' },
  upcomingRight: { alignItems: 'center', gap: 8 },
  upcomingPetAvatar: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  upcomingPetAvatarImage: { width: 64, height: 64, borderRadius: 16 },
  joinBtn: { backgroundColor: '#BD632F', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  joinBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1817', marginBottom: 12 },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0ECE8' },
  chatAvatarSpacing: { marginRight: 12 },
  chatInfo: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 15, fontWeight: '700', color: '#1A1817' },
  chatTime: { fontSize: 12, fontWeight: '500', color: '#9C9690' },
  chatBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatLastMessage: { fontSize: 13, fontWeight: '500', color: '#9C9690', flex: 1 },
  pendingText: { fontSize: 13, fontWeight: '500', color: '#BD632F', flex: 1 },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
