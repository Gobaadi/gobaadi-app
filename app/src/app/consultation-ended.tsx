import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  useGetForAppointmentQuery,
  consultationStartedAt,
} from '@/store/consultationsApi';
import { useGetConversationsQuery } from '@/store/chatApi';

const CONSULTATION_DURATION_SECONDS = 30 * 60;

function formatTimeRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ConsultationEndedScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    patientName = '',
    peerName = '',
    startedAt = '',
    conversationId = '',
    animalId = '',
    appointmentId = '',
  } = useLocalSearchParams<{
    patientName?: string;
    peerName?: string;
    consultationId?: string;
    startedAt?: string;
    conversationId?: string;
    animalId?: string;
    appointmentId?: string;
  }>();

  const resolvedPatientName = patientName || t('consultationEnded.patient');
  const displayName = peerName || resolvedPatientName;

  // Fallback when the caller (video-call screen) could not pass startedAt —
  // re-derive it so Start time / Remaining time bullets still render.
  const { data: consultation } = useGetForAppointmentQuery(appointmentId, {
    skip: !appointmentId,
  });
  const resolvedStartedAt =
    startedAt || (consultation ? consultationStartedAt(consultation) : '');

  const { data: conversations } = useGetConversationsQuery();
  const ownerEmail =
    conversations?.find((c) => String(c.id) === String(conversationId))
      ?.patientEmail || '';

  const [remaining, setRemaining] = useState(() => {
    if (!resolvedStartedAt) return CONSULTATION_DURATION_SECONDS;
    const elapsed = Math.floor(
      (Date.now() - new Date(resolvedStartedAt).getTime()) / 1000,
    );
    return Math.max(0, CONSULTATION_DURATION_SECONDS - elapsed);
  });

  // Tick only while the consultation is still live; completed sessions freeze
  // the value shown at entry.
  useEffect(() => {
    if (!resolvedStartedAt || consultation?.status === 'COMPLETED') return;
    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - new Date(resolvedStartedAt).getTime()) / 1000,
      );
      setRemaining(Math.max(0, CONSULTATION_DURATION_SECONDS - elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [resolvedStartedAt, consultation?.status]);

  const startTimeStr = resolvedStartedAt
    ? new Date(resolvedStartedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const chatParams = {
    conversationId,
    patientName: resolvedPatientName,
    appointmentId,
    animalId,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('consultationEnded.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.title}>{t('consultationEnded.heading')}</Text>
        <Text style={styles.subtitle}>
          {t('consultationEnded.subtitle', { name: displayName })}
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('consultationEnded.title')}</Text>
          <Text style={styles.summaryDesc}>
            {t('consultationEnded.summaryDesc', { name: displayName })}
          </Text>
          {startTimeStr ? (
            <Text style={styles.summaryBullet}>{t('consultationEnded.startTime', { time: startTimeStr })}</Text>
          ) : null}
          <Text style={styles.summaryBullet}>{t('consultationEnded.maxDuration')}</Text>
          <Text style={styles.summaryRemaining}>
            {t('consultationEnded.remainingTime', { time: formatTimeRemaining(remaining) })}
          </Text>
        </View>

        <View style={styles.nextStepCard}>
          <Text style={styles.nextStepTitle}>{t('consultationEnded.nextStep')}</Text>
          <View style={styles.nextStepOption}>
            <View style={styles.radioOuter}>
              <View style={styles.radioInner} />
            </View>
            <Text style={styles.nextStepText}>{t('consultationEnded.nextStepOption')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.8}
          onPress={() => {
            router.push({
              pathname: '/send-prescription',
              params: {
                appointmentId,
                conversationId,
                animalId,
                patientName: resolvedPatientName,
                userEmail: ownerEmail,
              },
            });
          }}
        >
          <Text style={styles.primaryBtnText}>{t('consultationEnded.sendPrescription')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.8}
          onPress={() => router.replace({ pathname: '/chat', params: chatParams })}
        >
          <Text style={styles.secondaryBtnText}>{t('consultationEnded.backToChat')}</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#BD632F',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1817',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7C7672',
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1817',
    marginBottom: 4,
  },
  summaryDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7C7672',
    marginBottom: 8,
  },
  summaryBullet: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1817',
    lineHeight: 22,
  },
  summaryRemaining: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BD632F',
    lineHeight: 22,
  },
  nextStepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 16,
  },
  nextStepTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1817',
    marginBottom: 8,
  },
  nextStepOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextStepText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7C7672',
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E6E1DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 14,
  },
  primaryBtn: {
    backgroundColor: '#BD632F',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#B7B2AC',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
