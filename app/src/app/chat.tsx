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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import PrescriptionBottomSheet from '@/components/PrescriptionBottomSheet';
import { useGetMessagesQuery, useSendMessageMutation, useSendAttachmentMessageMutation } from '@/store/chatApi';
import {
  useGetByIdQuery as useGetConsultationQuery,
  useStartConsultationMutation,
  useEndConsultationMutation,
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
  isPdf?: boolean;
  pdfUri?: string;
}

const CONSULTATION_DURATION_SECONDS = 30 * 60;

function formatTimeRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

  const consultationId = params.consultationId || '';
  const conversationId = params.conversationId ? parseInt(params.conversationId, 10) : undefined;
  const patientName = params.patientName || 'Patient';
  const animalImage = params.animalImage || '';
  const animalId = params.animalId || '';
  const appointmentId = params.appointmentId || '';

  const { data: consultation } = useGetConsultationQuery(consultationId, { skip: !consultationId });
  const { data: apiMessages, isLoading: messagesLoading } = useGetMessagesQuery(conversationId, { skip: !conversationId });
  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
  const [startConsultation, { isLoading: starting }] = useStartConsultationMutation();
  const [endConsultation, { isLoading: ending }] = useEndConsultationMutation();
  const [createPrescription] = useCreatePrescriptionMutation();
  const [sendPrescriptionApi] = useSendPrescriptionMutation();
  const [sendAttachment, { isLoading: sendingAttachment }] = useSendAttachmentMessageMutation();

  useChatSocket(conversationId);

  const [consultationState, setConsultationState] = useState<ConsultationState>('idle');
  const [inputText, setInputText] = useState('');
  const [remainingTime, setRemainingTime] = useState(CONSULTATION_DURATION_SECONDS);
  const flatListRef = useRef<FlatList>(null);
  const [showPrescriptionSheet, setShowPrescriptionSheet] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessageUI[]>([]);

  useEffect(() => {
    if (consultation) {
      if (consultation.status === 'COMPLETED' || consultation.status === 'ENDED') {
        setConsultationState('ended');
      } else if (consultation.status === 'IN_PROGRESS') {
        setConsultationState('active');
        if (consultation.startedAt) {
          const elapsed = Math.floor(
            (Date.now() - new Date(consultation.startedAt).getTime()) / 1000,
          );
          setRemainingTime(Math.max(0, CONSULTATION_DURATION_SECONDS - elapsed));
        }
      }
    }
  }, [consultation]);

  useEffect(() => {
    if (consultationState !== 'active') return;
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [consultationState]);

  useEffect(() => {
    if (apiMessages) {
      const mapped: ChatMessageUI[] = apiMessages.map((msg) => ({
        id: msg.id.toString(),
        sender: msg.sender === 'doctor' ? 'doctor' : 'patient',
        text: msg.text,
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isPrescription: !!(msg.attachmentType === 'document' || (msg.text?.startsWith('Prescription -') && msg.attachmentUrl)),
        isPdf: msg.attachmentType === 'document' && msg.attachmentMimeType?.includes('pdf') ? true : undefined,
        prescriptionDate: msg.attachmentUrl ? new Date(msg.createdAt).toLocaleDateString() : undefined,
        prescriptionSize: msg.attachmentType === 'document' ? (msg.attachmentMimeType?.includes('pdf') ? `PDF` : 'File') : undefined,
        attachmentUrl: msg.attachmentUrl || undefined,
      }));
      setLocalMessages(mapped);
    }
  }, [apiMessages]);

  const handleStartConsultation = async () => {
    if (!consultationId) return;
    try {
      await startConsultation(consultationId).unwrap();
      setConsultationState('active');
      setRemainingTime(CONSULTATION_DURATION_SECONDS);
    } catch {
      Alert.alert('Error', 'Failed to start consultation. Please try again.');
    }
  };

  const handleEndConsultation = async () => {
    if (consultationId) {
      try {
        await endConsultation(consultationId).unwrap();
      } catch {
        Alert.alert('Error', 'Failed to end consultation. Please try again.');
      }
    }
    setConsultationState('ended');
    router.push({
      pathname: '/consultation-ended',
      params: {
        consultationId,
        patientName,
        startedAt: consultation?.startedAt || '',
        conversationId: conversationId ? String(conversationId) : '',
        animalId,
        appointmentId,
      },
    });
  };

  const handleSendPrescription = () => {
    setShowPrescriptionSheet(true);
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

    try {
      await sendAttachment({
        conversationId,
        file: { uri: asset.uri, name: fileName, type: asset.mimeType || 'image/jpeg' },
      }).unwrap();
    } catch {
      Alert.alert('Error', 'Failed to send attachment. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');
    const optimistic: ChatMessageUI = {
      id: `temp-${Date.now()}`,
      sender: 'doctor',
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
    const isDoctor = item.sender === 'doctor';

    if (item.isPrescription) {
      return (
        <View style={styles.messageRowRight}>
          <View style={styles.prescriptionBubble}>
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
      <View style={isDoctor ? styles.messageRowRight : styles.messageRowLeft}>
        {!isDoctor && (
          <View style={styles.patientAvatar}>
            {animalImage ? (
              <Image source={{ uri: animalImage }} style={styles.patientAvatarImage} />
            ) : (
              <Ionicons name="paw" size={16} color="#BD632F" />
            )}
          </View>
        )}
        <View style={isDoctor ? styles.doctorBubble : styles.patientBubble}>
          <Text style={isDoctor ? styles.doctorBubbleText : styles.patientBubbleText}>
            {item.text}
          </Text>
          <Text style={isDoctor ? styles.doctorTimeText : styles.patientTimeText}>
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
          <TouchableOpacity
            style={styles.headerActionBtn}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: '/video-call',
                params: {
                  appointmentId,
                  conversationId: conversationId ? String(conversationId) : '',
                  patientName,
                  animalImage,
                },
              })
            }
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionBtn}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: '/video-call',
                params: {
                  appointmentId,
                  conversationId: conversationId ? String(conversationId) : '',
                  patientName,
                  animalImage,
                },
              })
            }
          >
            <Ionicons name="videocam" size={18} color="#FFFFFF" />
          </TouchableOpacity>
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

      {(consultationState === 'idle' || consultationState === 'active') && consultation && (
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
                {new Date(consultation.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Today
              </Text>
              <Text style={styles.upcomingBannerName}>{patientName}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.upcomingBannerJoin}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: '/video-call',
                params: {
                  appointmentId,
                  conversationId: conversationId ? String(conversationId) : '',
                  patientName,
                  animalImage,
                },
              })
            }
          >
            <Text style={styles.upcomingBannerJoinText}>Join</Text>
          </TouchableOpacity>
        </View>
      )}

      {consultationState === 'active' && (
        <View style={styles.consultationBanner}>
          <Text style={styles.consultationBannerTitle}>Consultation started</Text>
          <Text style={styles.consultationBannerDesc}>You are now in consultation with {patientName}</Text>
          <Text style={styles.consultationBannerBullet}>•  Start time: {consultation ? new Date(consultation.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
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
          <Text style={styles.consultationBannerBullet}>•  Start time: {consultation ? new Date(consultation.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
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

      {consultationState === 'idle' && (
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

      {consultationState !== 'idle' && (
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
  patientBubble: { backgroundColor: '#F5EDE6', borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%' },
  patientBubbleText: { fontSize: 14, fontWeight: '500', color: '#1A1817', lineHeight: 19 },
  patientTimeText: { fontSize: 10, fontWeight: '500', color: '#9C9690', marginTop: 4, alignSelf: 'flex-end' },
  doctorBubble: { backgroundColor: '#BD632F', borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%' },
  doctorBubbleText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 19 },
  doctorTimeText: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginTop: 4, alignSelf: 'flex-end' },
  prescriptionBubble: { backgroundColor: '#BD632F', borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 12, maxWidth: '100%', minWidth: 220 },
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
