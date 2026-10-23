import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';

import {
  aiScanBigCameraSvg,
  aiScanResultCowSvg,
  backButtonSvg,
} from '@/components/icons/svg-icon-sources';

import {
  useAnalyzeSymptomsMutation,
  useGetDiagnosisByIdQuery,
  useUploadDiagnosisImageMutation,
} from '@/store/aiDiagnosisApi';
import { getDiseaseInfo } from '@/constants/disease-info';
import { formatRelativeTime } from '@/utils/date';
import { compressImageForUpload } from '@/utils/compress-image';

const { width, height } = Dimensions.get('window');

const DEFAULT_SYMPTOM = 'visible abnormality observed in photo';
const ANALYSIS_TIMEOUT_MS = 90_000;

type Phase = 'camera' | 'capturing' | 'uploading' | 'analyzing' | 'done' | 'error';

export default function AiHoldScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { imageUrl, symptoms: symptomsParam } = useLocalSearchParams<{
    imageUrl?: string;
    symptoms?: string;
  }>();

  const [phase, setPhase] = useState<Phase>(() => (imageUrl ? 'analyzing' : 'camera'));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | undefined>(imageUrl || undefined);
  const [cameraReady, setCameraReady] = useState(false);

  const [progress] = useState(new Animated.Value(0));
  const [modalY] = useState(new Animated.Value(height));
  const startedRef = useRef(false);
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [uploadDiagnosisImage] = useUploadDiagnosisImageMutation();
  const [analyzeSymptoms] = useAnalyzeSymptomsMutation();

  const { data: diagnosis } = useGetDiagnosisByIdQuery(pendingId as number, {
    skip: pendingId === null,
    pollingInterval: 2000,
  });

  const isReady = diagnosis?.status === 'READY';
  const isFailed = diagnosis?.status === 'FAILED';
  const displayPhase: Phase = isReady ? 'done' : isFailed ? 'error' : phase;
  const displayErrorMessage = isFailed
    ? diagnosis?.failureReason || t('aiHold.errors.analysisIncomplete')
    : errorMessage;

  function parseSymptoms(): string[] {
    try {
      const parsed: string[] = symptomsParam ? JSON.parse(symptomsParam) : [];
      const cleaned = parsed.map((s) => s.trim()).filter(Boolean);
      return cleaned.length > 0 ? cleaned : [DEFAULT_SYMPTOM];
    } catch {
      return [DEFAULT_SYMPTOM];
    }
  }

  const showSheet = useCallback(() => {
    Animated.spring(modalY, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [modalY]);

  async function runAnalysis(remoteUrl?: string) {
    setErrorMessage(null);
    setPhase('uploading');

    let url = remoteUrl;
    if (!url && capturedUri) {
      try {
        const file = await compressImageForUpload(capturedUri, {
          fileName: capturedUri.split('/').pop() || `scan-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
        });
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
        try {
          const uploaded = await uploadDiagnosisImage(formData).unwrap();
          url = uploaded.url;
        } catch (err) {
          const status = (err as { status?: number | string })?.status;
          setErrorMessage(
            status === 413
              ? t('aiHold.errors.photoTooLarge')
              : t('aiHold.errors.uploadFailed'),
          );
          setPhase('error');
          showSheet();
          return;
        }
      } catch {
        // Compression itself failed → fall back to uploading the raw capture
        // was never produced; surface the standard upload error path below.
        url = undefined;
        if (capturedUri) {
          const formData = new FormData();
          formData.append('file', {
            uri: capturedUri,
            name: capturedUri.split('/').pop() || `scan-${Date.now()}.jpg`,
            type: 'image/jpeg',
          } as any);
          try {
            const uploaded = await uploadDiagnosisImage(formData).unwrap();
            url = uploaded.url;
          } catch (err) {
            const status = (err as { status?: number | string })?.status;
            setErrorMessage(
              status === 413
                ? t('aiHold.errors.photoTooLarge')
                : t('aiHold.errors.uploadFailed'),
            );
            setPhase('error');
            showSheet();
            return;
          }
        }
      }
    }

    setUploadedUrl(url);
    setPhase('analyzing');

    try {
      const created = await analyzeSymptoms({
        symptoms: parseSymptoms(),
        images: url ? [url] : [],
      }).unwrap();
      setPendingId(created.id);
    } catch (err) {
      console.log('Error starting analysis:', JSON.stringify(err));
      const serverMsg = (err as { data?: { message?: string } })?.data?.message;
      setErrorMessage(serverMsg || t('aiHold.errors.startFailed'));
      setPhase('error');
      showSheet();
    }
  }

  async function handleShutter() {
    if (!cameraRef.current || !cameraReady || phase !== 'camera') return;
    setPhase('capturing');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) {
        setPhase('camera');
        return;
      }
      setCapturedUri(photo.uri);
      await runAnalysis();
    } catch {
      setErrorMessage(t('aiHold.errors.captureFailed'));
      setPhase('error');
      showSheet();
    }
  }

  function handleRetry() {
    if (uploadedUrl) {
      setPendingId(null);
      runAnalysis(uploadedUrl);
    } else {
      setPhase('camera');
      setCameraReady(false);
      setErrorMessage(null);
      setCapturedUri(null);
      modalY.setValue(height);
    }
  }

  // Gallery entry: analysis starts as soon as the screen opens.
  useEffect(() => {
    if (imageUrl && !startedRef.current) {
      startedRef.current = true;
      runAnalysis(imageUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scanner line sweeps while the analysis request runs.
  useEffect(() => {
    if (displayPhase === 'uploading' || displayPhase === 'analyzing') {
      progress.setValue(0);
      Animated.loop(
        Animated.timing(progress, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true,
        }),
        { iterations: -1 }
      ).start();
    } else {
      progress.stopAnimation();
    }
    return () => progress.stopAnimation();
  }, [displayPhase, progress]);

  // Slide the result sheet up once the diagnosis settles (READY / FAILED).
  useEffect(() => {
    if (displayPhase === 'done' || displayPhase === 'error') {
      showSheet();
    }
  }, [displayPhase, showSheet]);

  // Don't leave the user stuck if the queue never responds.
  useEffect(() => {
    if (displayPhase !== 'analyzing' && displayPhase !== 'uploading') return;
    const timer = setTimeout(() => {
      setErrorMessage(t('aiHold.errors.timeout'));
      setPhase('error');
      showSheet();
    }, ANALYSIS_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [displayPhase, showSheet, t]);

  const scanLineY = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [height * 0.25, height * 0.65, height * 0.25],
  });

  const diseaseInfo = getDiseaseInfo(diagnosis?.analysisResult);
  const confidencePct =
    diagnosis?.confidenceScore != null ? Math.round(diagnosis.confidenceScore * 100) : null;
  const backgroundSource = capturedUri
    ? { uri: capturedUri }
    : imageUrl
      ? { uri: imageUrl }
      : null;
  const showBottomControls = displayPhase === 'camera' || phase === 'capturing';
  const showAnalyzingBadge = displayPhase === 'uploading' || displayPhase === 'analyzing';

  if (!backgroundSource && phase === 'camera' && !permission) {
    // Camera permission state is still resolving — don't mount the camera yet.
    return (
      <View style={styles.container}>
        <View style={styles.permissionSpinnerWrap}>
          <Text style={styles.permissionSpinnerText}>{t('aiHold.loadingCamera')}</Text>
        </View>
      </View>
    );
  }

  if (!backgroundSource && phase === 'camera' && permission && !permission.granted) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.permissionWrap}>
          <View style={styles.permissionIcon}>
            <SvgXml width={44} height={44} xml={aiScanBigCameraSvg} />
          </View>
          <Text style={styles.permissionTitle}>{t('aiHold.permission.title')}</Text>
          <Text style={styles.permissionText}>{t('aiHold.permission.message')}</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>{t('aiHold.permission.allow')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permissionLink} onPress={() => router.back()}>
            <Text style={styles.permissionLinkText}>{t('aiHold.permission.goBack')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {backgroundSource ? (
        <ImageBackground source={backgroundSource} style={styles.cameraBackground} resizeMode="cover">
          {showAnalyzingBadge && (
            <View style={styles.centeredBadge}>
              <View style={styles.statusBadge}>
                <Ionicons name="time-outline" size={14} color="#FFFFFF" style={styles.statusBadgeIcon} />
                <Text style={styles.statusBadgeText}>
                  {phase === 'uploading' ? t('aiHold.uploadingScan') : t('aiHold.holdStill')}
                </Text>
              </View>
            </View>
          )}
        </ImageBackground>
      ) : (
        <CameraView
          ref={cameraRef}
          style={styles.cameraBackground}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
          onMountError={() => {
            setErrorMessage(t('aiHold.errors.mountFailed'));
            setPhase('error');
            showSheet();
          }}
        />
      )}

      {/* Back Button */}
      <SafeAreaView style={styles.safeHeader} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Framing overlay: dimmed edges + grid + corner brackets */}
      {(phase === 'camera' || phase === 'capturing') && !backgroundSource && (
        <>
          <View style={[styles.dimBand, { top: 0, height: height * 0.25 }]} />
          <View style={[styles.dimBand, { top: height * 0.65, bottom: 0 }]} />
          <View style={[styles.dimBand, { top: height * 0.25, height: height * 0.4, left: 0, right: 'auto', width: width * 0.15 }]} />
          <View style={[styles.dimBand, { top: height * 0.25, height: height * 0.4, right: 0, left: 'auto', width: width * 0.15 }]} />

          <View style={styles.overlayFrameContainer}>
            <View style={styles.scanTargetArea}>
              <View style={[styles.gridLineV, { left: '33.33%' }]} />
              <View style={[styles.gridLineV, { left: '66.66%' }]} />
              <View style={[styles.gridLineH, { top: '33.33%' }]} />
              <View style={[styles.gridLineH, { top: '66.66%' }]} />
              <View style={[styles.cornerMarker, styles.topLeftCorner]} />
              <View style={[styles.cornerMarker, styles.topRightCorner]} />
              <View style={[styles.cornerMarker, styles.bottomLeftCorner]} />
              <View style={[styles.cornerMarker, styles.bottomRightCorner]} />
            </View>
          </View>
        </>
      )}

      {/* Laser scanning line while uploading/analyzing */}
      {showAnalyzingBadge && backgroundSource && (
        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]} />
      )}

      {/* Shutter + guidance badge */}
      {showBottomControls && !backgroundSource && (
        <View style={styles.bottomControls}>
          <View style={styles.statusBadge}>
            <Ionicons name="time-outline" size={14} color="#FFFFFF" style={styles.statusBadgeIcon} />
            <Text style={styles.statusBadgeText}>{t('aiHold.holdStill')}</Text>
          </View>

          <TouchableOpacity
            style={styles.shutterContainer}
            onPress={handleShutter}
            activeOpacity={0.9}
            disabled={displayPhase !== 'camera' || !cameraReady}
          >
            <View style={styles.shutterOuterRing}>
              <View style={styles.shutterInnerCircle} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Backdrop overlay when modal is up */}
      {displayPhase === 'done' && <View style={styles.dimBackdrop} />}

      {/* Slide up scan results modal sheet */}
      <Animated.View style={[styles.modalSheet, { transform: [{ translateY: modalY }] }]}>
        <View style={styles.modalHandle} />
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {displayPhase === 'error' ? (
            <>
              <View style={styles.errorIcon}>
                <Ionicons name="alert" size={24} color="#C62828" />
              </View>
              <Text style={styles.diagnosticTitle}>{t('aiHold.errors.title')}</Text>
              <Text style={styles.diagnosticParagraph}>{displayErrorMessage}</Text>
            </>
          ) : (
            <>
              <View style={styles.diagnoseInfoBox}>
                <View style={styles.cowInfoRow}>
                  <View style={styles.cowAvatarCircle}>
                    <SvgXml width={26} height={24} xml={aiScanResultCowSvg} />
                  </View>
                  <View style={styles.cowMetaCol}>
                    <Text style={styles.cowTitle}>{t('aiHold.cow')}</Text>
                    <Text style={styles.cowTime}>
                      {t('aiHold.detected', { time: formatRelativeTime(diagnosis?.createdAt) })}
                    </Text>
                  </View>
                </View>
                <View style={styles.matchBadge}>
                  <Text style={styles.matchBadgeText}>
                    {confidencePct !== null ? `${confidencePct}% ✅` : '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.diagnosticBody}>
                <Text style={styles.diagnosticTitle}>
                  {diagnosis?.analysisResult ?? t('aiHold.analyzing')}
                </Text>
                <Text style={styles.diagnosticSubtitle}>{diseaseInfo.subtitle}</Text>
                {diseaseInfo.paragraphs.map((paragraph, index) => (
                  <Text key={index} style={styles.diagnosticParagraph}>
                    {paragraph}
                  </Text>
                ))}
                {diagnosis?.recommendations?.length ? (
                  <Text style={styles.actionPlanLabel}>{t('aiHold.actionPlan')}</Text>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>

        {displayPhase === 'error' ? (
          <TouchableOpacity style={styles.summaryButton} onPress={handleRetry} activeOpacity={0.85}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" style={styles.summaryButtonIcon} />
            <Text style={styles.summaryButtonText}>{t('aiHold.tryAgain')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.summaryButton}
            disabled={!diagnosis || diagnosis.status !== 'READY'}
            onPress={() =>
              router.replace({ pathname: '/ai-summary', params: { id: String(diagnosis!.id) } })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.summaryButtonText}>
              {!diagnosis || diagnosis.status !== 'READY' ? t('aiHold.analyzing') : t('aiHold.detailsSummary')}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraBackground: {
    flex: 1,
  },
  safeHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  dimBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  overlayFrameContainer: {
    position: 'absolute',
    top: height * 0.25,
    left: width * 0.15,
    width: width * 0.7,
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTargetArea: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  cornerMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#FFFFFF',
  },
  topLeftCorner: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRightCorner: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scanLine: {
    position: 'absolute',
    left: width * 0.15,
    width: width * 0.7,
    height: 3,
    backgroundColor: '#00FF66',
    shadowColor: '#00FF66',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
  centeredBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 140,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 24, 23, 0.75)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 24,
  },
  statusBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
    color: '#FFFFFF',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  shutterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInnerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  dimBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    maxHeight: height * 0.75,
  },
  modalHandle: {
    width: 48,
    height: 5,
    backgroundColor: '#E6E1DC',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  diagnoseInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  cowInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cowAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E9E5DF',
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
  diagnosticBody: {
    marginBottom: 8,
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
  actionPlanLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
    marginTop: 8,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDECEC',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  summaryButton: {
    flexDirection: 'row',
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 16,
  },
  summaryButtonIcon: {
    marginRight: 8,
  },
  summaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  permissionWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#FAF9F6',
  },
  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFF1E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#7C7672',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#BD632F',
    width: '100%',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  permissionLink: {
    paddingVertical: 8,
  },
  permissionLinkText: {
    color: '#7C7672',
    fontSize: 14,
    fontWeight: '600',
  },
  permissionSpinnerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionSpinnerText: {
    color: '#FAF9F6',
    fontSize: 14,
    fontWeight: '600',
  },
});
