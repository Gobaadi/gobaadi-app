import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { backButtonSvg, chatPhoneSvg, chatVideoSvg } from '@/components/icons/svg-icon-sources';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { useCallSignalingContext } from '@/components/IncomingCallProvider';
import type { CallType } from '@/hooks/use-call-signaling';
import {
  useGetMessagesQuery,
  useSendMessageMutation,
  useSendAttachmentMessageMutation,
  useCreateConversationMutation,
  useGetDoctorAppointmentsQuery,
  useGetConversationsQuery,
  type ChatMessage,
} from '@/store/chatApi';
import { compressImageForUpload } from '@/utils/compress-image';
import {
  useGetByIdQuery as useGetConsultationQuery,
  useGetForAppointmentQuery,
  useStartForAppointmentMutation,
  useEndConsultationMutation,
  consultationStartedAt,
} from '@/store/consultationsApi';
import { useGetByAppointmentQuery } from '@/store/prescriptionsApi';
import { useGetMyProfileQuery } from '@/store/usersApi';
import { useGetMyDoctorProfileQuery, useGetDoctorBookingsQuery } from '@/store/doctorPortalApi';
import { useChatSocket } from '@/hooks/use-chat-socket';

type ConsultationState = 'idle' | 'active' | 'ended' | 'prescription_sent';

const DHAKA_TZ = 'Asia/Dhaka';

function formatDhakaClock(value: string | number | Date): string {
  return new Date(value).toLocaleTimeString('en-GB', {
    timeZone: DHAKA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function dhakaDayKey(value: string | number | Date): string {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: DHAKA_TZ });
}

function formatDhakaDayLabel(value: string | number | Date): string {
  const key = dhakaDayKey(value);
  const now = Date.now();
  if (key === dhakaDayKey(now)) return 'Today';
  if (key === dhakaDayKey(now - 86_400_000)) return 'Yesterday';
  return new Date(value).toLocaleDateString('en-GB', {
    timeZone: DHAKA_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDhakaDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString('en-GB', {
    timeZone: DHAKA_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface ChatMessageUI {
  id: string;
  sender: 'patient' | 'doctor';
  text: string;
  time: string;
  createdAt: string;
  status?: ChatMessage['status'];
  isPrescription?: boolean;
  prescriptionDate?: string;
  prescriptionSize?: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'document';
  isPdf?: boolean;
  pdfUri?: string;
}

const CONSULTATION_DURATION_SECONDS = 30 * 60;

function toUIMessage(msg: ChatMessage): ChatMessageUI {
  const isPdf =
    msg.attachmentType === 'document' && !!msg.attachmentMimeType?.includes('pdf');
  return {
    id: msg.id.toString(),
    sender: msg.sender === 'doctor' ? 'doctor' : 'patient',
    text: msg.text,
    time: formatDhakaClock(msg.createdAt),
    createdAt: msg.createdAt,
    status: msg.status,
    isPrescription: !!(
      msg.attachmentType === 'document' ||
      (msg.text?.startsWith('Prescription -') && msg.attachmentUrl)
    ),
    isPdf: msg.attachmentType === 'document' ? isPdf : undefined,
    prescriptionDate: msg.attachmentUrl ? formatDhakaDate(msg.createdAt) : undefined,
    prescriptionSize:
      msg.attachmentType === 'document' ? (isPdf ? `PDF` : 'File') : undefined,
    attachmentUrl: msg.attachmentUrl || undefined,
    attachmentType: msg.attachmentType || undefined,
  };
}

function formatTimeRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ReadTicks({ status, light }: { status?: ChatMessage['status']; light?: boolean }) {
  return (
    <Ionicons
      name="checkmark-done"
      size={14}
      color={status === 'READ' ? '#38BDF8' : light ? '#9C9690' : 'rgba(255,255,255,0.75)'}
    />
  );
}

function MessageAvatar({ uri, mine }: { uri?: string; mine: boolean }) {
  return (
    <View style={[styles.patientAvatar, mine && styles.mineAvatar]}>
      {uri ? (
        <Image source={{ uri }} style={styles.patientAvatarImage} />
      ) : (
        <Ionicons name="person" size={16} color="#BD632F" />
      )}
    </View>
  );
}

function ChatImageBubble({
  uri,
  isMine,
  time,
  caption,
  status,
  onView,
}: {
  uri: string;
  isMine: boolean;
  time: string;
  caption?: string;
  status?: ChatMessage['status'];
  onView: (uri: string, mine: boolean) => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={isMine ? styles.imageBubble : styles.imageBubbleLeft}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => onView(uri, isMine)}>
        {failed ? (
          <View style={styles.imageFallback}>
            <Ionicons name="image-outline" size={36} color="#BD632F" />
            <Text style={styles.imageFallbackText}>Tap to open image</Text>
          </View>
        ) : (
          <Image
            source={{ uri }}
            style={styles.messageImage}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        )}
      </TouchableOpacity>
      {!!caption && (
        <Text style={isMine ? styles.imageCaptionMine : styles.imageCaption}>{caption}</Text>
      )}
      <View style={styles.metaRow}>
        <Text style={isMine ? styles.imageTimeMine : styles.imageTime}>{time}</Text>
        {isMine && <ReadTicks status={status} light />}
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    consultationId?: string;
    conversationId?: string;
    patientName?: string;
    peerName?: string;
    animalImage?: string;
    theirAvatar?: string;
    animalId?: string;
    animalName?: string;
    appointmentId?: string;
    appointmentTime?: string;
  }>();

  const [consultationId, setConsultationId] = useState(params.consultationId || '');
  const [conversationId, setConversationId] = useState<number | undefined>(
    params.conversationId ? parseInt(params.conversationId, 10) : undefined,
  );
  const patientName = params.patientName || 'Patient';
  const animalImage = params.animalImage || '';
  const animalId = params.animalId || '';
  const appointmentId = params.appointmentId || '';

  const viewerRole = useSelector((state: RootState) => state.auth.user?.role);
  const isViewerDoctor = viewerRole === 'doctor';
  // Counterparty shown in the header/banners: the doctor sees the patient,
  // the farmer sees the doctor (peerName supplied by the entry point).
  const peerName = isViewerDoctor ? patientName : params.peerName || 'Doctor';

  const { data: myProfile } = useGetMyProfileQuery();
  const { data: myDoctorProfile } = useGetMyDoctorProfileQuery(undefined, {
    skip: !isViewerDoctor,
  });
  // Doctor's photo lives in the doctors table; farmer's in users.
  const myAvatarUri = isViewerDoctor
    ? myDoctorProfile?.avatar || undefined
    : myProfile?.avatar || myProfile?.profilePhoto || undefined;
  // Doctor: patient photo. Farmer: doctor photo. Resolve from API — several
  // navigators pass nothing (or the animal photo), which showed a dummy avatar.
  const { data: conversations } = useGetConversationsQuery();
  const { data: myBookings } = useGetDoctorBookingsQuery(undefined, {
    skip: isViewerDoctor,
  });
  const resolvedTheirAvatar = useMemo(() => {
    if (isViewerDoctor) {
      return (
        conversations?.find((c) => String(c.id) === String(conversationId))
          ?.patientPhoto || undefined
      );
    }
    return (
      myBookings?.find((a) => String(a.id) === appointmentId)?.doctorAvatar ||
      undefined
    );
  }, [isViewerDoctor, conversations, conversationId, myBookings, appointmentId]);
  const theirAvatarUri =
    params.theirAvatar || resolvedTheirAvatar || (!isViewerDoctor ? animalImage : undefined) || undefined;
  // Counterparty NAME, resolved live from API (same sources as the avatar) —
  // navigators pass a stale/missing name often; params stay as fallback only.
  const resolvedTheirName = useMemo(() => {
    if (isViewerDoctor) {
      return (
        conversations?.find((c) => String(c.id) === String(conversationId))
          ?.patientName || undefined
      );
    }
    return (
      myBookings?.find((a) => String(a.id) === appointmentId)?.doctorName ||
      undefined
    );
  }, [isViewerDoctor, conversations, conversationId, myBookings, appointmentId]);
  const counterpartyName = resolvedTheirName || patientName;

  // Prescriptions need animalId, but most navigators only pass appointmentId —
  // resolve it (plus the appointment time / animal name for the session card)
  // from the doctor's appointment list.
  const { data: doctorAppointments } = useGetDoctorAppointmentsQuery(
    { limit: 100 },
    { skip: !isViewerDoctor },
  );
  const appointmentInfo = useMemo(
    () => doctorAppointments?.data?.find((a) => String(a.id) === appointmentId),
    [doctorAppointments, appointmentId],
  );
  const resolvedAnimalId =
    animalId || (appointmentInfo?.animalId ? String(appointmentInfo.animalId) : '');
  const appointmentTime =
    params.appointmentTime || appointmentInfo?.startAt || '';
  const animalName = params.animalName || appointmentInfo?.animalName || '';

  // Dynamic Join card: only when a real upcoming appointment exists —
  // completed/cancelled ones (or chats opened without appointment context)
  // must not show it. The chat appointments endpoint only lists
  // CONFIRMED/RESCHEDULED/COMPLETED, so undefined = nothing upcoming.
  const hasUpcomingAppointment =
    !!appointmentId &&
    !!appointmentInfo &&
    ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(appointmentInfo.status);

  const { data: consultation } = useGetConsultationQuery(consultationId, { skip: !consultationId });
  // Re-attach to an already-running consultation when the chat is (re)opened —
  // params.consultationId is rarely passed by navigators.
  const { data: appointmentConsultation } = useGetForAppointmentQuery(appointmentId, {
    skip: !appointmentId,
  });
  const activeConsultation = consultation ?? appointmentConsultation ?? undefined;
  // params.consultationId is rarely passed — fall back to the appointment's
  // consultation so End / auto-end / prescription always hit the API. Without
  // this, ending was local-only and a reload resurrected the session.
  const resolvedConsultationId =
    consultationId ||
    (appointmentConsultation?.id ? String(appointmentConsultation.id) : '');
  const { data: apiMessages, isLoading: messagesLoading } = useGetMessagesQuery(conversationId, { skip: !conversationId });
  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
  const [startConsultation, { isLoading: starting }] = useStartForAppointmentMutation();
  const [endConsultation, { isLoading: ending }] = useEndConsultationMutation();
  const [sendAttachment, { isLoading: sendingAttachment }] = useSendAttachmentMessageMutation();
  const [createConversation] = useCreateConversationMutation();
  // Green check in Next Step when a prescription already exists for THIS
  // appointment — survives navigation and sends done from the video screen.
  const { data: existingPrescription } = useGetByAppointmentQuery(appointmentId, {
    skip: !appointmentId,
  });

  useEffect(() => {
    if (conversationId || !appointmentId) return;
    let cancelled = false;
    (async () => {
      try {
        const conv = await createConversation({
          appointmentId: parseInt(appointmentId, 10),
        }).unwrap();
        if (!cancelled && conv?.id) setConversationId(conv.id);
      } catch {
        // leave undefined — backend still auto-resolves for the farmer
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, appointmentId, createConversation]);

  useChatSocket(conversationId, isViewerDoctor ? 'doctor' : 'user');
  const { ringCall } = useCallSignalingContext();

  const [consultationState, setConsultationState] = useState<ConsultationState>('idle');
  const [inputText, setInputText] = useState('');
  const [remainingTime, setRemainingTime] = useState(CONSULTATION_DURATION_SECONDS);
  const flatListRef = useRef<FlatList>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessageUI[]>([]);
  // In-app full-screen viewer for chat images (never leaves to a browser).
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerMine, setViewerMine] = useState<boolean | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedFlashTimeoutRef.current) clearTimeout(savedFlashTimeoutRef.current);
    };
  }, []);

  const openImageViewer = (uri: string, mine: boolean) => {
    setViewerError(false);
    setViewerLoading(true);
    setViewerMine(mine);
    setViewerUri(uri);
  };

  const closeImageViewer = () => {
    if (savedFlashTimeoutRef.current) clearTimeout(savedFlashTimeoutRef.current);
    setSavedFlash(false);
    setViewerUri(null);
    setViewerMine(null);
    setViewerLoading(false);
    setViewerError(false);
  };

  /** Fetch the remote image into cache; returns local uri + extension. */
  const downloadToCache = async (
    uri: string,
  ): Promise<{ cacheUri: string; ext: string }> => {
    const rawExt = uri.split('?')[0].match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
    const ext = rawExt && ['png', 'webp', 'gif'].includes(rawExt) ? rawExt : 'jpg';
    const file = await File.downloadFileAsync(
      uri,
      new File(Paths.cache, `chat-image-${Date.now()}.${ext}`),
    );
    return { cacheUri: file.uri, ext };
  };

  /** Download to cache, then open the native share sheet — stays in-app. */
  const shareViewedImage = async () => {
    if (!viewerUri || sharingImage) return;
    setSharingImage(true);
    try {
      const { cacheUri, ext } = await downloadToCache(viewerUri);
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device');
      }
      await Sharing.shareAsync(cacheUri, {
        mimeType: ext === 'jpg' ? 'image/jpeg' : `image/${ext}`,
        dialogTitle: 'Share image',
      });
    } catch {
      Alert.alert('Error', 'Could not share this image. Please try again.');
    } finally {
      setSharingImage(false);
    }
  };

  /** Save the viewed image into the device gallery/photos. */
  const downloadViewedImage = async () => {
    if (!viewerUri || savingImage) return;
    setSavingImage(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Allow photo access so the image can be saved to your gallery.',
        );
        return;
      }
      const { cacheUri } = await downloadToCache(viewerUri);
      await MediaLibrary.Asset.create(cacheUri);
      setSavedFlash(true);
      if (savedFlashTimeoutRef.current) clearTimeout(savedFlashTimeoutRef.current);
      savedFlashTimeoutRef.current = setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      Alert.alert('Error', 'Could not save this image. Please try again.');
    } finally {
      setSavingImage(false);
    }
  };

  useEffect(() => {
    if (!activeConsultation) return;
    if (activeConsultation.status === 'COMPLETED') {
      setRemainingTime(0);
      setConsultationState((prev) => (prev === 'prescription_sent' ? prev : 'ended'));
      return;
    }
    if (activeConsultation.status === 'ONGOING') {
      setConsultationState((prev) =>
        prev === 'ended' || prev === 'prescription_sent' ? prev : 'active',
      );
      const elapsed = Math.floor(
        (Date.now() - new Date(consultationStartedAt(activeConsultation)).getTime()) / 1000,
      );
      setRemainingTime(Math.max(0, CONSULTATION_DURATION_SECONDS - elapsed));
    }
  }, [activeConsultation]);

  useEffect(() => {
    if (consultationState !== 'active') return;
    // Auto-end at 0: nobody has to press "End Consultation". finish() runs
    // from a deferred timeout so it stays out of the effect body (lint) and
    // after the updater flushes; the `finished` guard makes double fires safe.
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setConsultationState('ended');
      if (resolvedConsultationId) {
        endConsultation(resolvedConsultationId).unwrap().catch(() => {});
      }
    };
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(finish, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [consultationState, resolvedConsultationId, endConsultation]);

  // Farmer: consultation ended while chat is open (doctor pressed End, or the
  // 30-min timer auto-ended) — congratulate once and offer a Home shortcut.
  // Mounting into an already-ended consultation (history view) stays silent.
  const farmerEndNotifiedRef = useRef(false);
  const prevConsultationStateRef = useRef<ConsultationState>(consultationState);
  useEffect(() => {
    const prev = prevConsultationStateRef.current;
    prevConsultationStateRef.current = consultationState;
    if (isViewerDoctor || farmerEndNotifiedRef.current) return;
    if (prev !== 'active') return;
    if (consultationState !== 'ended' && consultationState !== 'prescription_sent') return;
    farmerEndNotifiedRef.current = true;
    Alert.alert(
      'Congratulations!',
      'The consultation has ended.',
      [{ text: 'Go to Home', onPress: () => router.replace('/(tabs)') }],
      { cancelable: false },
    );
  }, [consultationState, isViewerDoctor, router]);

  useEffect(() => {
    if (apiMessages) {
      setLocalMessages(apiMessages.map(toUIMessage));
    }
  }, [apiMessages]);

  const handleStartConsultation = async () => {
    if (!appointmentId) {
      Alert.alert(
        'Error',
        'Missing appointment information. Please open this chat from the appointment.',
      );
      return;
    }
    try {
      const started = await startConsultation(appointmentId).unwrap();
      setConsultationId(String(started.id));
      if (started.status === 'COMPLETED') {
        // One consultation per appointment — a finished session stays ended.
        setRemainingTime(0);
        setConsultationState('ended');
        return;
      }
      setConsultationState('active');
      const elapsed = Math.floor(
        (Date.now() - new Date(consultationStartedAt(started)).getTime()) / 1000,
      );
      setRemainingTime(Math.max(0, CONSULTATION_DURATION_SECONDS - elapsed));
    } catch {
      Alert.alert('Error', 'Failed to start consultation. Please try again.');
    }
  };

  const handleEndConsultation = async () => {
    if (resolvedConsultationId) {
      try {
        await endConsultation(resolvedConsultationId).unwrap();
      } catch {
        Alert.alert('Error', 'Failed to end consultation. Please try again.');
      }
    }
    setConsultationState('ended');
    router.push({
      pathname: '/consultation-ended',
      params: {
        consultationId: resolvedConsultationId,
        patientName,
        peerName,
        startedAt: activeConsultation ? consultationStartedAt(activeConsultation) : '',
        conversationId: conversationId ? String(conversationId) : '',
        animalId: resolvedAnimalId,
        appointmentId,
      },
    });
  };

  const openSendPrescription = () => {
    if (!isViewerDoctor || !appointmentId) {
      Alert.alert(
        'Error',
        'Missing appointment information. Please open this chat from the appointment.',
      );
      return;
    }
    const ownerEmail =
      conversations?.find((c) => String(c.id) === String(conversationId))
        ?.patientEmail || '';
    router.push({
      pathname: '/send-prescription',
      params: {
        appointmentId,
        conversationId: conversationId ? String(conversationId) : '',
        animalId: resolvedAnimalId,
        patientName,
        userEmail: ownerEmail,
      },
    });
  };

  /**
   * Ring the other party (socket callStarted), then join the call screen
   * immediately and wait in the Agora channel.
   */
  const handleStartCall = (callType: CallType = 'video') => {
    if (!appointmentId) {
      Alert.alert(
        'Error',
        'Missing appointment information. Please open this chat from the appointment.',
      );
      return;
    }
    ringCall(parseInt(appointmentId, 10), callType);
    router.push({
      pathname: '/video-call',
      params: {
        appointmentId,
        callType,
        conversationId: conversationId ? String(conversationId) : '',
        patientName,
        peerName,
        animalImage,
        animalId: resolvedAnimalId,
      },
    });
  };

  const textInputRef = useRef<TextInput>(null);

  const handleSendNote = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt('Send Note', 'Enter a note for the patient', (text) => {
        if (text && text.trim()) {
          setInputText(text.trim());
        }
      });
    } else {
      textInputRef.current?.focus();
    }
  };

  const handleSendAttachment = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to send images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const fileName = asset.fileName || `photo-${Date.now()}.jpg`;

      const isImage = (asset.mimeType || 'image/jpeg').startsWith('image/');
      const file = isImage
        ? await compressImageForUpload(asset.uri, {
            fileName,
            mimeType: asset.mimeType || 'image/jpeg',
          })
        : { uri: asset.uri, name: fileName, type: asset.mimeType || 'application/octet-stream' };

      let targetConversationId = conversationId;
      if (!targetConversationId) {
        if (!appointmentId) {
          Alert.alert('Error', 'Open this chat from an appointment to send images.');
          return;
        }
        const conv = await createConversation({
          appointmentId: parseInt(appointmentId, 10),
        }).unwrap();
        targetConversationId = conv.id;
        setConversationId(conv.id);
      }

      const saved = await sendAttachment({
        conversationId: targetConversationId,
        file: { uri: file.uri, name: file.name, type: file.type },
      }).unwrap();

      setLocalMessages((prev) =>
        prev.some((m) => m.id === String(saved.id)) ? prev : [...prev, toUIMessage(saved)],
      );
    } catch (err) {
      const status = (err as { status?: number | string })?.status;
      Alert.alert(
        'Error',
        status === 413
          ? 'Photo is too large — please pick a smaller image.'
          : 'Failed to send attachment. Please try again.',
      );
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');
    const optimistic: ChatMessageUI = {
      id: `temp-${Date.now()}`,
      sender: isViewerDoctor ? 'doctor' : 'patient',
      text,
      time: formatDhakaClock(new Date()),
      createdAt: new Date().toISOString(),
      status: 'SENT',
    };
    setLocalMessages((prev) => [...prev, optimistic]);
    try {
      const saved = await sendMessage({ text, conversationId }).unwrap();
      // Replace the optimistic bubble with the server copy so the double-tick
      // status updates patch the same id (avoids temp/real duplicates).
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? toUIMessage(saved) : m)),
      );
    } catch {
      setLocalMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const renderMessage = ({ item, index }: { item: ChatMessageUI; index: number }) => {
    const isMine = isViewerDoctor ? item.sender === 'doctor' : item.sender === 'patient';
    const prev = index > 0 ? localMessages[index - 1] : undefined;
    const showDateSeparator =
      !prev || dhakaDayKey(prev.createdAt) !== dhakaDayKey(item.createdAt);
    const separator = showDateSeparator ? (
      <View style={styles.dateSeparator}>
        <Text style={styles.dateSeparatorText}>{formatDhakaDayLabel(item.createdAt)}</Text>
      </View>
    ) : null;

    let content: React.ReactNode;

    if (item.attachmentType === 'image' && item.attachmentUrl && !item.isPrescription) {
      content = (
        <View style={isMine ? styles.messageRowRight : styles.messageRowLeft}>
          {!isMine && <MessageAvatar uri={theirAvatarUri} mine={false} />}
          <ChatImageBubble
            uri={item.attachmentUrl}
            isMine={isMine}
            time={item.time}
            caption={item.text}
            status={item.status}
            onView={openImageViewer}
          />
          {isMine && <MessageAvatar uri={myAvatarUri} mine />}
        </View>
      );
    } else if (item.isPrescription) {
      content = (
        <View style={isMine ? styles.messageRowRight : styles.messageRowLeft}>
          {!isMine && <MessageAvatar uri={theirAvatarUri} mine={false} />}
          <View style={isMine ? styles.prescriptionBubble : styles.prescriptionBubbleLeft}>
            <View style={styles.prescriptionHeader}>
              <Ionicons name="document-text" size={18} color="#FFFFFF" />
              <Text style={styles.prescriptionTitle}>Prescription - {item.prescriptionDate}</Text>
            </View>
            <Text style={styles.prescriptionMeta}>
              {item.prescriptionDate} · {item.prescriptionSize}
            </Text>
            <View style={styles.prescriptionFooter}>
              <View style={styles.metaRowPrescription}>
                <Text style={styles.prescriptionTime}>{item.time}</Text>
                {isMine && <ReadTicks status={item.status} />}
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (item.attachmentUrl) {
                    Linking.openURL(item.attachmentUrl);
                  }
                }}
              >
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          {isMine && <MessageAvatar uri={myAvatarUri} mine />}
        </View>
      );
    } else {
      content = (
        <View style={isMine ? styles.messageRowRight : styles.messageRowLeft}>
          {!isMine && <MessageAvatar uri={theirAvatarUri} mine={false} />}
          <View style={isMine ? styles.mineBubble : styles.theirsBubble}>
            <Text style={isMine ? styles.mineBubbleText : styles.theirsBubbleText}>
              {item.text}
            </Text>
            <View style={styles.metaRow}>
              <Text style={isMine ? styles.mineTimeText : styles.theirsTimeText}>
                {item.time}
              </Text>
              {isMine && <ReadTicks status={item.status} />}
            </View>
          </View>
          {isMine && <MessageAvatar uri={myAvatarUri} mine />}
        </View>
      );
    }

    return (
      <View>
        {separator}
        {content}
      </View>
    );
  };

  const prescriptionAlreadySent =
    consultationState === 'prescription_sent' || !!existingPrescription;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <SvgXml width={20} height={20} xml={backButtonSvg} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {counterpartyName}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {isViewerDoctor && !!appointmentId && (
            <>
              <TouchableOpacity
                style={[styles.headerActionBtn, consultationState !== 'active' && styles.headerActionBtnDisabled]}
                activeOpacity={0.7}
                disabled={consultationState !== 'active'}
                onPress={() => handleStartCall('audio')}
              >
                <SvgXml width={20} height={20} xml={chatPhoneSvg} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerActionBtn, consultationState !== 'active' && styles.headerActionBtnDisabled]}
                activeOpacity={0.7}
                disabled={consultationState !== 'active'}
                onPress={() => handleStartCall('video')}
              >
                <SvgXml width={22} height={18} xml={chatVideoSvg} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7} onPress={() => setShowActionsMenu((prev) => !prev)}>
            <Ionicons name="ellipsis-vertical" size={18} color="#141B34" />
          </TouchableOpacity>
        </View>
      </View>

      {showActionsMenu && (
        <>
          <TouchableOpacity style={styles.actionsMenuBackdrop} activeOpacity={1} onPress={() => setShowActionsMenu(false)} />
          <View style={styles.actionsMenuContainer}>
            {isViewerDoctor && (
              <TouchableOpacity
                style={styles.actionsMenuItem}
                activeOpacity={0.7}
                onPress={() => {
                  setShowActionsMenu(false);
                  openSendPrescription();
                }}
              >
                <Ionicons name="document-text-outline" size={18} color="#BD632F" />
                <Text style={styles.actionsMenuItemText}>Send Recommendation</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionsMenuItem}
              activeOpacity={0.7}
              onPress={() => {
                setShowActionsMenu(false);
                handleSendNote();
              }}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#BD632F" />
              <Text style={styles.actionsMenuItemText}>Send Note</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Upcoming-session card (doctor's entry point): Join jumps into the
          video call before the consultation timer starts. */}
      {isViewerDoctor && consultationState === 'idle' && hasUpcomingAppointment && (
        <View style={styles.upcomingBanner}>
          <View style={styles.upcomingBannerLeft}>
            <View style={styles.upcomingBannerAvatar}>
              {animalImage ? (
                <Image source={{ uri: animalImage }} style={styles.upcomingBannerAvatarImage} />
              ) : (
                <Ionicons name="paw" size={24} color="#BD632F" />
              )}
            </View>
            <View>
              <Text style={styles.upcomingBannerTime}>
                {appointmentTime
                  ? `${formatDhakaClock(appointmentTime)} · ${formatDhakaDayLabel(appointmentTime)}`
                  : 'Today'}
              </Text>
              <Text style={styles.upcomingBannerName}>{animalName || patientName}</Text>
              {!!animalName && (
                <Text style={styles.upcomingBannerOwner}>Owner   {patientName}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.upcomingBannerJoin}
            activeOpacity={0.85}
            onPress={() => handleStartCall('video')}
          >
            <Text style={styles.upcomingBannerJoinText}>Join</Text>
          </TouchableOpacity>
        </View>
      )}

      {isViewerDoctor && consultationState === 'active' && (
        <View style={styles.consultationBanner}>
          <Text style={styles.consultationBannerTitle}>Consultation started</Text>
          <Text style={styles.consultationBannerDesc}>You are now in consultation with {patientName}</Text>
          <Text style={styles.consultationBannerBullet}>•  Start time: {activeConsultation ? formatDhakaClock(consultationStartedAt(activeConsultation)) : ''}</Text>
          <Text style={styles.consultationBannerBullet}>•  Max Duration: 30 min</Text>
          <Text style={styles.consultationBannerRemaining}>•  Remaining time: {formatTimeRemaining(remainingTime)}</Text>
          <TouchableOpacity style={styles.endConsultationBtn} onPress={handleEndConsultation} activeOpacity={0.85} disabled={ending}>
            {ending ? (
              <ActivityIndicator size="small" color="#1A1817" />
            ) : (
              <Text style={styles.endConsultationBtnText}>End Consultation</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isViewerDoctor &&
        (consultationState === 'ended' || consultationState === 'prescription_sent') && (
        <View style={styles.consultationBanner}>
          <Text style={styles.consultationBannerEndedTitle}>Consultation ended!</Text>
          <Text style={styles.consultationBannerDesc}>Your consultation with {patientName} has ended.</Text>
          <Text style={styles.consultationBannerBullet}>•  Start time: {activeConsultation ? formatDhakaClock(consultationStartedAt(activeConsultation)) : ''}</Text>
          <Text style={styles.consultationBannerBullet}>•  Max Duration: 30 min</Text>
          <Text style={styles.consultationBannerRemaining}>•  Remaining time: {formatTimeRemaining(remainingTime)}</Text>
        </View>
      )}

      {isViewerDoctor &&
        (consultationState === 'ended' || consultationState === 'prescription_sent') && (
        <View style={styles.nextStepInline}>
          <Text style={styles.nextStepInlineTitle}>Next Step</Text>
          <View style={styles.nextStepInlineOption}>
            {prescriptionAlreadySent ? (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            ) : (
              <View style={styles.radioOuter}>
                <View style={styles.radioInner} />
              </View>
            )}
            <Text style={styles.nextStepInlineText}>Send prescription, recommendation, note</Text>
          </View>
          {consultationState === 'ended' && !prescriptionAlreadySent && (
            <TouchableOpacity style={styles.sendPrescriptionInlineBtn} onPress={openSendPrescription} activeOpacity={0.85}>
              <Text style={styles.sendPrescriptionInlineBtnText}>Send Prescription</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {messagesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BD632F" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={localMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {isViewerDoctor && consultationState === 'active' && (
        <View style={styles.quickActionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.8} onPress={openSendPrescription}>
              <Text style={styles.quickActionText}>Send prescription</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.8} onPress={openSendPrescription}>
              <Text style={styles.quickActionText}>Send recommendation</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {isViewerDoctor && consultationState === 'idle' && !!appointmentId && (
        <View style={styles.startConsultationContainer}>
          <TouchableOpacity style={styles.startConsultationBtn} onPress={handleStartConsultation} activeOpacity={0.85} disabled={starting}>
            {starting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.startConsultationBtnText}>Start Consultation</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {(!!conversationId || consultationState !== 'idle') && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.inputBar}>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#A39E99"
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity style={[styles.plusBtn, sendingAttachment && { opacity: 0.5 }]} activeOpacity={0.8} onPress={handleSendAttachment} disabled={sendingAttachment}>
              <Ionicons name="add" size={22} color="#BD632F" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.micBtn, sending && { opacity: 0.5 }]}
              activeOpacity={0.8}
              onPress={inputText.trim() ? handleSendMessage : () => Alert.alert('Audio Recording', 'Audio recording feature coming soon.')}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name={inputText.trim() ? 'send' : 'mic'} size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* In-app full-screen viewer for chat images */}
      <Modal
        visible={!!viewerUri}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeImageViewer}
      >
        <View style={styles.viewerContainer}>
          <Image
            source={{ uri: viewerUri ?? undefined }}
            style={styles.viewerImage}
            resizeMode="contain"
            onLoad={() => setViewerLoading(false)}
            onError={() => {
              setViewerLoading(false);
              setViewerError(true);
            }}
          />
          {viewerLoading && !viewerError && (
            <View style={styles.viewerCenter} pointerEvents="none">
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}
          {viewerError && (
            <View style={styles.viewerCenter} pointerEvents="none">
              <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.6)" />
              <Text style={styles.viewerErrorText}>Could not load image</Text>
            </View>
          )}
          <SafeAreaView style={styles.viewerTopBar} edges={['top']}>
            <TouchableOpacity
              style={styles.viewerIconBtn}
              onPress={closeImageViewer}
              activeOpacity={0.7}
              accessibilityLabel="Close image"
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            {viewerMine !== null && viewerUri && (
              <View style={styles.viewerSenderRow}>
                <MessageAvatar
                  uri={viewerMine ? myAvatarUri : theirAvatarUri}
                  mine={false}
                />
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.viewerSenderName}>
                  {viewerMine ? 'You' : counterpartyName}
                </Text>
              </View>
            )}
            <View style={styles.viewerTopActions}>
              <TouchableOpacity
                style={styles.viewerIconBtn}
                onPress={downloadViewedImage}
                activeOpacity={0.7}
                disabled={savingImage || sharingImage}
                accessibilityLabel="Download image"
              >
                {savingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name={savedFlash ? 'checkmark' : 'download-outline'}
                    size={24}
                    color={savedFlash ? '#4CAF50' : '#FFFFFF'}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewerIconBtn}
                onPress={shareViewedImage}
                activeOpacity={0.7}
                disabled={sharingImage || savingImage}
                accessibilityLabel="Share image"
              >
                {sharingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="share-outline" size={24} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, backgroundColor: '#FAF9F6' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, marginRight: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1817', flexShrink: 1 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerActionBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerActionBtnDisabled: { opacity: 0.4 },
  upcomingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E6D5C3', marginHorizontal: 20, borderRadius: 14, padding: 12, marginBottom: 12 },
  upcomingBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  upcomingBannerAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  upcomingBannerAvatarImage: { width: 44, height: 44, borderRadius: 12 },
  upcomingBannerTime: { fontSize: 11, fontWeight: '600', color: '#BD632F' },
  upcomingBannerName: { fontSize: 15, fontWeight: '800', color: '#1A1817' },
  upcomingBannerOwner: { fontSize: 11, fontWeight: '500', color: '#7C7672', marginTop: 2 },
  upcomingBannerJoin: { backgroundColor: '#BD632F', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8 },
  upcomingBannerJoinText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  consultationBanner: { backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 12 },
  consultationBannerTitle: { fontSize: 15, fontWeight: '800', color: '#1A1817', marginBottom: 4 },
  consultationBannerEndedTitle: { fontSize: 15, fontWeight: '800', color: '#E53935', marginBottom: 4 },
  consultationBannerDesc: { fontSize: 13, fontWeight: '500', color: '#7C7672', marginBottom: 8 },
  consultationBannerBullet: { fontSize: 13, fontWeight: '500', color: '#1A1817', lineHeight: 20 },
  consultationBannerRemaining: { fontSize: 13, fontWeight: '600', color: '#BD632F', lineHeight: 20 },
  endConsultationBtn: { backgroundColor: '#E6E1DC', borderRadius: 14, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  endConsultationBtnText: { color: '#1A1817', fontSize: 14, fontWeight: '700' },
  nextStepInline: { backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 12 },
  nextStepInlineTitle: { fontSize: 15, fontWeight: '800', color: '#1A1817', marginBottom: 8 },
  nextStepInlineOption: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nextStepInlineText: { fontSize: 13, fontWeight: '500', color: '#7C7672', flex: 1 },
  sendPrescriptionInlineBtn: { backgroundColor: '#BD632F', borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  sendPrescriptionInlineBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#E6E1DC', justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'transparent' },
  messagesList: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  dateSeparator: { alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 16, paddingVertical: 6, marginVertical: 12 },
  dateSeparatorText: { fontSize: 12, fontWeight: '600', color: '#9C9690' },
  messageRowLeft: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14, maxWidth: '85%' },
  messageRowRight: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14, maxWidth: '85%', alignSelf: 'flex-end' },
  patientAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center', marginRight: 8, overflow: 'hidden' },
  mineAvatar: { marginRight: 0, marginLeft: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  metaRowPrescription: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  patientAvatarImage: { width: 32, height: 32, borderRadius: 16 },
  theirsBubble: { backgroundColor: '#FFFFFF', borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F0EAE1', paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%' },
  theirsBubbleText: { fontSize: 14, fontWeight: '500', color: '#BD632F', lineHeight: 19 },
  theirsTimeText: { fontSize: 10, fontWeight: '500', color: 'rgba(189, 99, 47, 0.6)', marginTop: 4, alignSelf: 'flex-end' },
  mineBubble: { backgroundColor: '#BD632F', borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%' },
  mineBubbleText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 19 },
  mineTimeText: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginTop: 4, alignSelf: 'flex-end' },
  imageBubble: {
    backgroundColor: '#FFF2EB',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  imageBubbleLeft: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F0EAE1',
    overflow: 'hidden',
    maxWidth: '100%',
  },
  messageImage: { width: 200, height: 200, backgroundColor: '#E6E1DC' },
  imageFallback: {
    width: 200,
    height: 200,
    backgroundColor: '#F0EAE1',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  imageFallbackText: { fontSize: 12, fontWeight: '600', color: '#BD632F' },
  imageCaption: {
    fontSize: 14,
    fontWeight: '500',
    color: '#BD632F',
    lineHeight: 19,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  imageCaptionMine: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 19,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  imageTime: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(189, 99, 47, 0.6)',
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 4,
    alignSelf: 'flex-end',
  },
  imageTimeMine: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(189, 99, 47, 0.7)',
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 4,
    alignSelf: 'flex-end',
  },
  prescriptionBubble: { backgroundColor: '#BD632F', borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 12, maxWidth: '100%', minWidth: 220 },
  prescriptionBubbleLeft: { backgroundColor: '#BD632F', borderRadius: 18, borderBottomLeftRadius: 4, borderBottomRightRadius: 18, paddingHorizontal: 14, paddingVertical: 12, maxWidth: '100%', minWidth: 220 },
  prescriptionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  prescriptionTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  prescriptionMeta: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  prescriptionFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prescriptionTime: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  quickActionsContainer: { paddingHorizontal: 20, paddingBottom: 8 },
  quickActions: { flexDirection: 'row', gap: 8 },
  quickActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  quickActionText: { fontSize: 13, fontWeight: '600', color: '#7C7672' },
  startConsultationContainer: { paddingHorizontal: 20, paddingBottom: 16 },
  startConsultationBtn: { backgroundColor: '#BD632F', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  startConsultationBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  inputBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#E6E1DC', height: 52, paddingHorizontal: 16, marginHorizontal: 20, marginBottom: 12, gap: 8 },
  textInput: { flex: 1, fontSize: 14, color: '#1A1817', height: '100%' },
  plusBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  micBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  actionsMenuBackdrop: { ...StyleSheet.absoluteFill, zIndex: 100 },
  actionsMenuContainer: {
    position: 'absolute',
    top: 56,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    paddingVertical: 4,
    minWidth: 190,
    zIndex: 101,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  actionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionsMenuItemText: { fontSize: 14, fontWeight: '600', color: '#1A1817' },
  viewerContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  viewerErrorText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  viewerTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  viewerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  viewerTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewerSenderRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    minWidth: 0,
  },
  viewerSenderName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
});
