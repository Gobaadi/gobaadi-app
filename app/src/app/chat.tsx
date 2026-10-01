import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import PrescriptionBottomSheet from '@/components/PrescriptionBottomSheet';
import { useCallSignalingContext } from '@/components/IncomingCallProvider';
import type { CallType } from '@/hooks/use-call-signaling';
import {
  useGetMessagesQuery,
  useSendMessageMutation,
  useSendAttachmentMessageMutation,
  useCreateConversationMutation,
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
import {
  useCreatePrescriptionMutation,
  useSendPrescriptionMutation,
} from '@/store/prescriptionsApi';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { sendPrescriptionPdf, savePdfToTempFile } from '@/lib/pdf-service';

type ConsultationState = 'idle' | 'active' | 'ended' | 'prescription_sent';

interface ChatMessageUI {
  id: string;
  sender: 'patient' | 'doctor';
  text: string;
  time: string;
  isPrescription?: boolean;
  prescriptionDate?: string;
  prescriptionSize?: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'document';
  isPdf?: boolean;
  pdfUri?: string;
}

const CONSULTATION_DURATION_SECONDS = 30 * 60;
const CONSULTATION_WARN_SECONDS = 25 * 60;

function toUIMessage(msg: ChatMessage): ChatMessageUI {
  const isPdf =
    msg.attachmentType === 'document' && !!msg.attachmentMimeType?.includes('pdf');
  return {
    id: msg.id.toString(),
    sender: msg.sender === 'doctor' ? 'doctor' : 'patient',
    text: msg.text,
    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isPrescription: !!(
      msg.attachmentType === 'document' ||
      (msg.text?.startsWith('Prescription -') && msg.attachmentUrl)
    ),
    isPdf: msg.attachmentType === 'document' ? isPdf : undefined,
    prescriptionDate: msg.attachmentUrl ? new Date(msg.createdAt).toLocaleDateString() : undefined,
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

function ChatImageBubble({
  uri,
  isMine,
  time,
  caption,
}: {
  uri: string;
  isMine: boolean;
  time: string;
  caption?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={isMine ? styles.imageBubble : styles.imageBubbleLeft}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => Linking.openURL(uri)}>
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
      <Text style={isMine ? styles.imageTimeMine : styles.imageTime}>{time}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    consultationId?: string;
    conversationId?: string;
    patientName?: string;
    animalImage?: string;
    animalId?: string;
    appointmentId?: string;
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
  const [createPrescription] = useCreatePrescriptionMutation();
  const [sendPrescriptionApi] = useSendPrescriptionMutation();
  const [sendAttachment, { isLoading: sendingAttachment }] = useSendAttachmentMessageMutation();
  const [createConversation] = useCreateConversationMutation();

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

  useChatSocket(conversationId);
  const { ringCall } = useCallSignalingContext();

  const [consultationState, setConsultationState] = useState<ConsultationState>('idle');
  const [inputText, setInputText] = useState('');
  const [remainingTime, setRemainingTime] = useState(CONSULTATION_DURATION_SECONDS);
  const flatListRef = useRef<FlatList>(null);
  const [showPrescriptionSheet, setShowPrescriptionSheet] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessageUI[]>([]);

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

  // Warn once when 5 minutes remain.
  const consultationWarnedRef = useRef(false);
  useEffect(() => {
    if (consultationState !== 'active') return;
    if (
      remainingTime > 0 &&
      remainingTime <= CONSULTATION_WARN_SECONDS &&
      !consultationWarnedRef.current
    ) {
      consultationWarnedRef.current = true;
      Alert.alert('Almost time', 'Only 5 minutes left in this consultation.');
    }
  }, [remainingTime, consultationState]);

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
        startedAt: consultation ? consultationStartedAt(consultation) : '',
        conversationId: conversationId ? String(conversationId) : '',
        animalId,
        appointmentId,
      },
    });
  };

  const handleSendPrescription = () => {
    setShowPrescriptionSheet(true);
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
        animalImage,
      },
    });
  };

  const handlePrescriptionSent = useCallback(async (data: { medications: any[]; instructions: string; note: string }) => {
    setShowPrescriptionSheet(false);

    if (!appointmentId || !animalId) {
      Alert.alert('Error', 'Missing appointment or patient information. Please try again.');
      return;
    }

    try {
      // 1. Create prescription record in backend
      const medicines = data.medications.map((m) => ({
        name: m.name,
        dosage: `${m.dosage} ${m.dosageUnit} ${m.frequency}`,
        duration: `${m.duration} ${m.durationUnit}`,
        notes: data.instructions || undefined,
      }));

      const prescription = await createPrescription({
        appointmentId: parseInt(appointmentId, 10),
        animalId: parseInt(animalId, 10),
        medicines,
      }).unwrap();

      await sendPrescriptionApi(prescription.id).unwrap();

      // 2. Generate branded PDF + send email via PDF service
      let pdfUri: string | null = null;
      let pdfSizeKB = 0;
      let emailSent = false;

      try {
        const pdfResult = await sendPrescriptionPdf({
          patientName,
          userEmail: '',
          medications: data.medications.map((m) => ({
            name: m.name,
            type: m.type,
            dosage: m.dosage,
            dosageUnit: m.dosageUnit,
            frequency: m.frequency,
            duration: m.duration,
            durationUnit: m.durationUnit,
            quantity: m.quantity,
            quantityUnit: m.quantityUnit,
          })),
          instructions: data.instructions,
          note: data.note,
        });

        if (pdfResult.data?.pdfBase64) {
          const fileName = `Prescription_${new Date().toISOString().split('T')[0]}.pdf`;
          pdfUri = await savePdfToTempFile(pdfResult.data.pdfBase64, fileName);
          pdfSizeKB = pdfResult.data.pdfSizeKB;
        }

        emailSent = pdfResult.data?.messageId !== 'no-email';
      } catch (pdfError) {
        console.warn('PDF generation failed, continuing without PDF:', pdfError);
      }

      // 3. Send prescription message to chat
      const summary = `Prescription - ${new Date().toLocaleDateString()}`;
      await sendMessage({
        text: summary,
        conversationId,
      }).unwrap();

      // 4. If PDF was generated, send it as document attachment
      if (pdfUri) {
        const fileName = `Prescription_${new Date().toISOString().split('T')[0]}.pdf`;
        await sendAttachment({
          conversationId,
          caption: summary,
          file: {
            uri: pdfUri,
            name: fileName,
            type: 'application/pdf',
          },
        }).unwrap();
      }

      // 5. If email was sent successfully, notify the patient in chat
      if (emailSent) {
        await sendMessage({
          text: 'I have sent you an email with the prescription PDF. Please check your inbox for the medicine details.',
          conversationId,
        }).unwrap();
      }

      // 6. Add optimistic prescription bubble
      const prescriptionMessage: ChatMessageUI = {
        id: `presc-${Date.now()}`,
        sender: 'doctor',
        text: summary,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isPrescription: true,
        isPdf: pdfUri !== null,
        prescriptionDate: new Date().toLocaleDateString(),
        prescriptionSize: pdfSizeKB > 0 ? `PDF · ${pdfSizeKB} KB` : `${data.medications.length} medication${data.medications.length > 1 ? 's' : ''}`,
      };
      setLocalMessages((prev) => [...prev, prescriptionMessage]);

      setConsultationState('prescription_sent');
    } catch {
      Alert.alert('Error', 'Failed to send prescription. Please try again.');
      setConsultationState('active');
    }
  }, [appointmentId, animalId, conversationId, patientName, createPrescription, sendPrescriptionApi, sendMessage, sendAttachment]);

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
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setLocalMessages((prev) => [...prev, optimistic]);
    try {
      await sendMessage({ text, conversationId }).unwrap();
    } catch {
      setLocalMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessageUI }) => {
    const isMine = isViewerDoctor ? item.sender === 'doctor' : item.sender === 'patient';

    if (item.attachmentType === 'image' && item.attachmentUrl && !item.isPrescription) {
      return (
        <View style={isMine ? styles.messageRowRight : styles.messageRowLeft}>
          {!isMine && (
            <View style={styles.patientAvatar}>
              {item.sender === 'patient' ? (
                animalImage ? (
                  <Image source={{ uri: animalImage }} style={styles.patientAvatarImage} />
                ) : (
                  <Ionicons name="paw" size={16} color="#BD632F" />
                )
              ) : (
                <Ionicons name="person" size={16} color="#BD632F" />
              )}
            </View>
          )}
          <ChatImageBubble
            uri={item.attachmentUrl}
            isMine={isMine}
            time={item.time}
            caption={item.text}
          />
        </View>
      );
    }

    if (item.isPrescription) {
      return (
        <View style={isMine ? styles.messageRowRight : styles.messageRowLeft}>
          <View style={isMine ? styles.prescriptionBubble : styles.prescriptionBubbleLeft}>
            <View style={styles.prescriptionHeader}>
              <Ionicons name="document-text" size={18} color="#FFFFFF" />
              <Text style={styles.prescriptionTitle}>Prescription - {item.prescriptionDate}</Text>
            </View>
            <Text style={styles.prescriptionMeta}>
              {item.prescriptionDate} · {item.prescriptionSize}
            </Text>
            <View style={styles.prescriptionFooter}>
              <Text style={styles.prescriptionTime}>{item.time}</Text>
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
        </View>
      );
    }

    return (
      <View style={isMine ? styles.messageRowRight : styles.messageRowLeft}>
        {!isMine && (
          <View style={styles.patientAvatar}>
            {item.sender === 'patient' ? (
              animalImage ? (
                <Image source={{ uri: animalImage }} style={styles.patientAvatarImage} />
              ) : (
                <Ionicons name="paw" size={16} color="#BD632F" />
              )
            ) : (
              <Ionicons name="person" size={16} color="#BD632F" />
            )}
          </View>
        )}
        <View style={isMine ? styles.mineBubble : styles.theirsBubble}>
          <Text style={isMine ? styles.mineBubbleText : styles.theirsBubbleText}>
            {item.text}
          </Text>
          <Text style={isMine ? styles.mineTimeText : styles.theirsTimeText}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{patientName}</Text>
        <View style={styles.headerActions}>
          {!!appointmentId && (
            <>
              <TouchableOpacity
                style={[styles.headerActionBtn, consultationState !== 'active' && styles.headerActionBtnDisabled]}
                activeOpacity={0.7}
                disabled={consultationState !== 'active'}
                onPress={() => handleStartCall('audio')}
              >
                <Ionicons name="call" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerActionBtn, consultationState !== 'active' && styles.headerActionBtnDisabled]}
                activeOpacity={0.7}
                disabled={consultationState !== 'active'}
                onPress={() => handleStartCall('video')}
              >
                <Ionicons name="videocam" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7} onPress={() => setShowActionsMenu((prev) => !prev)}>
            <Ionicons name="ellipsis-vertical" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {showActionsMenu && (
        <>
          <TouchableOpacity style={styles.actionsMenuBackdrop} activeOpacity={1} onPress={() => setShowActionsMenu(false)} />
          <View style={styles.actionsMenuContainer}>
            <TouchableOpacity
              style={styles.actionsMenuItem}
              activeOpacity={0.7}
              onPress={() => {
                setShowActionsMenu(false);
                setShowPrescriptionSheet(true);
              }}
            >
              <Ionicons name="document-text-outline" size={18} color="#BD632F" />
              <Text style={styles.actionsMenuItemText}>Send Recommendation</Text>
            </TouchableOpacity>
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

      {consultationState === 'active' && activeConsultation && (
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
                {new Date(consultationStartedAt(activeConsultation)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Today
              </Text>
              <Text style={styles.upcomingBannerName}>{patientName}</Text>
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

      {consultationState === 'active' && (
        <View style={styles.consultationBanner}>
          <Text style={styles.consultationBannerTitle}>Consultation started</Text>
          <Text style={styles.consultationBannerDesc}>You are now in consultation with {patientName}</Text>
          <Text style={styles.consultationBannerBullet}>•  Start time: {consultation ? new Date(consultationStartedAt(consultation)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
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

      {(consultationState === 'ended' || consultationState === 'prescription_sent') && (
        <View style={styles.consultationBanner}>
          <Text style={styles.consultationBannerEndedTitle}>Consultation ended!</Text>
          <Text style={styles.consultationBannerDesc}>Your consultation with {patientName} has ended.</Text>
          <Text style={styles.consultationBannerBullet}>•  Start time: {consultation ? new Date(consultationStartedAt(consultation)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
          <Text style={styles.consultationBannerBullet}>•  Max Duration: 30 min</Text>
          <Text style={styles.consultationBannerRemaining}>•  Remaining time: {formatTimeRemaining(remainingTime)}</Text>
        </View>
      )}

      {(consultationState === 'ended' || consultationState === 'prescription_sent') && (
        <View style={styles.nextStepInline}>
          <Text style={styles.nextStepInlineTitle}>Next Step</Text>
          <View style={styles.nextStepInlineOption}>
            {consultationState === 'prescription_sent' ? (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            ) : (
              <View style={styles.radioOuter}>
                <View style={styles.radioInner} />
              </View>
            )}
            <Text style={styles.nextStepInlineText}>Send prescription, recommendation, note</Text>
          </View>
          {consultationState === 'ended' && (
            <TouchableOpacity style={styles.sendPrescriptionInlineBtn} onPress={handleSendPrescription} activeOpacity={0.85}>
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
          ListHeaderComponent={
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>
                {new Date().toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
          }
        />
      )}

      {consultationState === 'active' && (
        <View style={styles.quickActionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.8} onPress={() => setShowPrescriptionSheet(true)}>
              <Text style={styles.quickActionText}>Send prescription</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.8} onPress={() => setShowPrescriptionSheet(true)}>
              <Text style={styles.quickActionText}>Send recommendation</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {consultationState === 'idle' && !!appointmentId && (
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

      <PrescriptionBottomSheet
        visible={showPrescriptionSheet}
        onClose={() => setShowPrescriptionSheet(false)}
        onSend={handlePrescriptionSent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, backgroundColor: '#BD632F' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerActionBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerActionBtnDisabled: { opacity: 0.4 },
  upcomingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E6D5C3', marginHorizontal: 20, borderRadius: 14, padding: 12, marginBottom: 12 },
  upcomingBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  upcomingBannerAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  upcomingBannerAvatarImage: { width: 44, height: 44, borderRadius: 12 },
  upcomingBannerTime: { fontSize: 11, fontWeight: '600', color: '#BD632F' },
  upcomingBannerName: { fontSize: 15, fontWeight: '800', color: '#1A1817' },
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
  actionsMenuBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
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
});
