import React, { useState, useMemo, useCallback } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetConversationsQuery, useCreateConversationMutation } from '@/store/chatApi';
import {
  useGetDoctorBookingsQuery,
  type DoctorAppointment,
} from '@/store/doctorPortalApi';

interface EnrichedChat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isPending: boolean;
  animalImage?: string;
  patientId: number;
  conversationId?: number;
  appointmentId?: number;
  appointmentStatus?: string;
  consultationType?: string;
  startAt?: string;
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
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DoctorMessagesScreen() {
  const router = useRouter();
  const isDoctor = useRequireDoctor();
  const [searchQuery] = useState('');
  const [creatingId, setCreatingId] = useState<number | null>(null);

  const { data: conversations = [] } = useGetConversationsQuery();
  const { data: bookings = [] } = useGetDoctorBookingsQuery();
  const [createConversation] = useCreateConversationMutation();

  const conversationByPatientId = useMemo(() => {
    const map = new Map<number, number>();
    conversations.forEach((conv) => {
      map.set(conv.patientId, conv.id);
    });
    return map;
  }, [conversations]);

  const patientLookup = useMemo(() => {
    const map = new Map<number, DoctorAppointment>();
    bookings.forEach((b) => {
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
        name: appointment?.patientName || `Patient #${conv.patientId}`,
        lastMessage: conv.lastMessageText || 'Start a conversation',
        time: formatChatTime(conv.lastMessageAt),
        unreadCount: conv.unreadCount || 0,
        isPending: false,
        animalImage: appointment?.animalImage,
        patientId: conv.patientId,
        conversationId: conv.id,
      });
    });

    bookings.forEach((b) => {
      if (!chatMap.has(b.patientId)) {
        chatMap.set(b.patientId, {
          id: `apt-${b.patientId}`,
          name: b.patientName || `Patient #${b.patientId}`,
          lastMessage: '',
          time: formatAppointmentTime(b.startAt),
          unreadCount: 0,
          isPending: true,
          animalImage: b.animalImage,
          patientId: b.patientId,
          appointmentId: Number(b.id),
          appointmentStatus: b.status,
          consultationType: b.consultationType,
          startAt: b.startAt,
        });
      }
    });

    return Array.from(chatMap.values());
  }, [conversations, bookings, patientLookup]);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return enrichedChats;
    const q = searchQuery.toLowerCase();
    return enrichedChats.filter((c) => c.name.toLowerCase().includes(q));
  }, [enrichedChats, searchQuery]);

  const nextAppointment = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((b) => new Date(b.startAt) >= now && b.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
  }, [bookings]);

  const handleChatPress = useCallback(
    async (chat: EnrichedChat) => {
      if (chat.conversationId) {
        router.push({
          pathname: '/chat',
          params: {
            conversationId: String(chat.conversationId),
            patientName: chat.name,
            animalImage: chat.animalImage || '',
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
            patientName: chat.name,
            animalImage: chat.animalImage || '',
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
            patientName: appointment.patientName || `Patient #${appointment.patientId}`,
            animalImage: appointment.animalImage || '',
            appointmentId: String(appointment.id),
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
        <Text style={styles.headerTitle}>Chat</Text>
        <TouchableOpacity style={styles.searchBtn} activeOpacity={0.7}>
          <Ionicons name="search" size={20} color="#1A1817" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {nextAppointment && (
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
                <Text style={styles.upcomingOwner}>Owner   {nextAppointment.patientName || `Patient #${nextAppointment.patientId}`}</Text>
              </View>
              <View style={styles.upcomingRight}>
                <View style={styles.upcomingPetAvatar}>
                  {nextAppointment.animalImage ? (
                    <Image source={{ uri: nextAppointment.animalImage }} style={styles.upcomingPetAvatarImage} />
                  ) : (
                    <Ionicons name="paw" size={28} color="#BD632F" />
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

        {filteredChats.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            style={styles.chatItem}
            activeOpacity={0.7}
            onPress={() => handleChatPress(chat)}
            disabled={creatingId === chat.patientId}
          >
            <View style={styles.chatAvatar}>
              {chat.animalImage ? (
                <Image source={{ uri: chat.animalImage }} style={styles.chatAvatarImage} />
              ) : (
                <Ionicons name="paw" size={22} color="#BD632F" />
              )}
            </View>
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
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
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
  chatAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  chatAvatarImage: { width: 48, height: 48, borderRadius: 24 },
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
