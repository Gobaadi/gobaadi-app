import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';

import {
  aiScanResultCowSvg,
  backButtonSvg,
  doctorNotificationSvg,
} from '@/components/icons/svg-icon-sources';

import { useGetDiagnosisByIdQuery } from '@/store/aiDiagnosisApi';
import { getDiseaseInfo } from '@/constants/disease-info';
import { formatRelativeTime } from '@/utils/date';

function parseTitleDetail(rec: string): { title: string; detail?: string } {
  const separator = rec.indexOf(':');
  if (separator > 0 && separator < rec.length - 1) {
    return { title: rec.slice(0, separator + 1), detail: rec.slice(separator + 1).trim() };
  }
  return { title: rec };
}

export default function AiSummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const diagnosisId = id ? Number(id) : undefined;

  const {
    data: diagnosis,
    isLoading,
    isError,
    refetch,
  } = useGetDiagnosisByIdQuery(diagnosisId as number, { skip: !diagnosisId });

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/doctors');
    }
  }

  if (!diagnosisId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.circleButton} onPress={handleBack} activeOpacity={0.8}>
            <SvgXml width={20} height={20} xml={backButtonSvg} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Summary</Text>
          <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
            <SvgXml width={20} height={20} xml={doctorNotificationSvg} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerState}>
          <Ionicons name="document-text-outline" size={40} color="#A39E99" />
          <Text style={styles.centerStateText}>No diagnosis selected</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/ai-scan')}>
            <Text style={styles.retryButtonText}>Start a new scan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.circleButton} onPress={handleBack} activeOpacity={0.8}>
            <SvgXml width={20} height={20} xml={backButtonSvg} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Summary</Text>
          <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
            <SvgXml width={20} height={20} xml={doctorNotificationSvg} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#BD632F" />
          <Text style={styles.centerStateText}>Loading diagnosis…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !diagnosis) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.circleButton} onPress={handleBack} activeOpacity={0.8}>
            <SvgXml width={20} height={20} xml={backButtonSvg} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Summary</Text>
          <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
            <SvgXml width={20} height={20} xml={doctorNotificationSvg} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={40} color="#A39E99" />
          <Text style={styles.centerStateText}>
            Could not load this diagnosis. Please try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const diseaseInfo = getDiseaseInfo(diagnosis.analysisResult);
  const confidencePct =
    diagnosis.confidenceScore != null ? Math.round(diagnosis.confidenceScore * 100) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleButton} onPress={handleBack} activeOpacity={0.8}>
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Summary</Text>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <SvgXml width={20} height={20} xml={doctorNotificationSvg} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Animal Info Header Card */}
        <View style={styles.diagnoseInfoBox}>
          <View style={styles.cowInfoRow}>
            <View style={styles.cowAvatarCircle}>
              <SvgXml width={26} height={24} xml={aiScanResultCowSvg} />
            </View>
            <View style={styles.cowMetaCol}>
              <Text style={styles.cowTitle}>Cow</Text>
              <Text style={styles.cowTime}>Detected : {formatRelativeTime(diagnosis.createdAt)}</Text>
            </View>
          </View>
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>{confidencePct !== null ? `${confidencePct}% ✅` : '—'}</Text>
          </View>
        </View>

        {/* Diagnostic Detail Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.diagnosticTitle}>{diagnosis.analysisResult ?? 'No diagnosis available'}</Text>
          <Text style={styles.diagnosticSubtitle}>{diseaseInfo.subtitle}</Text>

          <View style={styles.divider} />

          {diseaseInfo.paragraphs.map((paragraph, index) => (
            <Text key={index} style={styles.diagnosticParagraph}>
              {paragraph}
            </Text>
          ))}

          {diagnosis.status === 'FAILED' && (
            <Text style={styles.failureText}>
              {diagnosis.failureReason || 'The automated analysis failed for this scan.'}
            </Text>
          )}

          <View style={styles.divider} />

          {/* Action plan list */}
          <Text style={styles.actionPlanHeader}>Immediate Action Plan</Text>

          {diagnosis.recommendations.length === 0 ? (
            <Text style={styles.diagnosticParagraph}>
              No specific actions were recommended for this diagnosis. Keep monitoring the animal
              and consult a veterinarian if symptoms continue.
            </Text>
          ) : (
            diagnosis.recommendations.map((rec, index) => {
              const { title, detail } = parseTitleDetail(rec);
              return (
                <View key={index} style={styles.actionRow}>
                  <Text style={styles.actionNumber}>{index + 1}.</Text>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>
                      {title}
                      {detail ? <Text style={styles.actionDesc}> {detail}</Text> : null}
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          {diseaseInfo.clinicalSigns.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.actionPlanHeader}>Key Clinical Signs in Cattle</Text>
              {diseaseInfo.clinicalSigns.map((sign, index) => (
                <View key={index} style={styles.actionRow}>
                  <Ionicons name="medkit-outline" size={14} color="#BD632F" style={styles.signIcon} />
                  <View style={styles.actionTextCol}>
                    <Text style={styles.signText}>{sign}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {!!diagnosis.recommendedDoctorIds.length && (
            <TouchableOpacity
              style={styles.summaryButton}
              onPress={() =>
                router.push({
                  pathname: '/doctor-detail',
                  params: { id: String(diagnosis.recommendedDoctorIds[0]) },
                })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.summaryButtonText}>View Recommended Doctor</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 20,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  centerStateText: {
    fontSize: 14,
    color: '#7C7672',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#BD632F',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  diagnoseInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cowInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cowAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF9F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cowMetaCol: {
    justifyContent: 'center',
  },
  cowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
  },
  cowTime: {
    fontSize: 12,
    color: '#7C7672',
    marginTop: 2,
  },
  matchBadge: {
    backgroundColor: '#EEFBEF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  matchBadgeText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  diagnosticTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 4,
  },
  diagnosticSubtitle: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '600',
    marginBottom: 16,
  },
  diagnosticParagraph: {
    fontSize: 13,
    color: '#4C4844',
    lineHeight: 18,
    marginBottom: 12,
  },
  failureText: {
    fontSize: 13,
    color: '#C62828',
    lineHeight: 18,
    marginBottom: 12,
    fontWeight: '600',
  },
  summaryButton: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  summaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#FAF9F6',
    marginVertical: 16,
  },
  actionPlanHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  actionNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1817',
    marginRight: 6,
    width: 18,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1817',
    lineHeight: 18,
  },
  actionDesc: {
    fontWeight: '400',
    color: '#7C7672',
  },
  signIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  signText: {
    fontSize: 13,
    color: '#4C4844',
    lineHeight: 18,
  },
});
