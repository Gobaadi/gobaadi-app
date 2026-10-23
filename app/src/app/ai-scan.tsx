import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { SvgXml } from 'react-native-svg';

import {
  aiScanBigCameraSvg,
  aiScanCameraSvg,
  aiScanUploadSvg,
  backButtonSvg,
  doctorNotificationSvg,
} from '@/components/icons/svg-icon-sources';
import { useUploadDiagnosisImageMutation } from '@/store/aiDiagnosisApi';
import { compressImageForUpload } from '@/utils/compress-image';

export default function AiScanScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [symptomsText, setSymptomsText] = useState('');
  const [uploadDiagnosisImage, { isLoading: isUploading }] = useUploadDiagnosisImageMutation();

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('aiScan.alerts.permissionTitle'), t('aiScan.alerts.permissionMsg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function handleAnalyze() {
    const symptoms = symptomsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!imageUri) {
      Alert.alert(t('aiScan.alerts.moreInfoTitle'), t('aiScan.alerts.moreInfoMsg'));
      return;
    }

    if (symptoms.length === 0) {
      Alert.alert(t('aiScan.alerts.symptomsRequiredTitle'), t('aiScan.alerts.symptomsRequiredMsg'));
      return;
    }

    let imageUrl: string | undefined;
    try {
      if (imageUri) {
        const file = await compressImageForUpload(imageUri, {
          fileName: imageUri.split('/').pop() || `scan-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
        });
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
        const result = await uploadDiagnosisImage(formData).unwrap();
        imageUrl = result.url;
      }
    } catch (err) {
      console.log('Error uploading scan image:', err);
      const status = (err as { status?: number | string })?.status;
      Alert.alert(
        t('aiScan.alerts.uploadFailed'),
        status === 413 ? t('aiScan.alerts.photoTooLarge') : t('aiScan.alerts.tryAgain'),
      );
      return;
    }

    router.push({
      pathname: '/ai-hold',
      params: {
        imageUrl: imageUrl ?? '',
        symptoms: JSON.stringify(symptoms),
      },
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
          <SvgXml width={20} height={20} xml={doctorNotificationSvg} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <View style={styles.iconCircle}>
            <SvgXml width={52} height={52} xml={aiScanBigCameraSvg} />
          </View>
        )}

        <Text style={styles.title}>{t('aiScan.title')}</Text>

        <Text style={styles.subtitle}>{t('aiScan.subtitle')}</Text>

        {imageUri ? (
          <TextInput
            style={styles.symptomsInput}
            placeholder={t('aiScan.symptomsPlaceholder')}
            placeholderTextColor="#A39E99"
            value={symptomsText}
            onChangeText={setSymptomsText}
            multiline
          />
        ) : null}

        {imageUri ? (
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleAnalyze}
            activeOpacity={0.85}
            disabled={isUploading}
          >
            <Text style={styles.scanButtonText}>{isUploading ? t('aiScan.uploading') : t('aiScan.analyzeNow')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => router.push('/ai-hold')}
            activeOpacity={0.85}
          >
            <SvgXml width={18} height={18} xml={aiScanCameraSvg} style={styles.scanButtonIcon} />
            <Text style={styles.scanButtonText}>{t('aiScan.startScan')}</Text>
          </TouchableOpacity>
        )}

        {!imageUri && (
          <TouchableOpacity style={styles.uploadButton} activeOpacity={0.8} onPress={pickFromGallery}>
            <SvgXml width={18} height={18} xml={aiScanUploadSvg} style={styles.uploadButtonIcon} />
            <Text style={styles.uploadButtonText}>{t('aiScan.uploadFromGallery')}</Text>
          </TouchableOpacity>
        )}

        {imageUri && (
          <TouchableOpacity style={styles.uploadButton} activeOpacity={0.8} onPress={() => setImageUri(null)}>
            <Text style={styles.uploadButtonText}>{t('aiScan.retake')}</Text>
          </TouchableOpacity>
        )}
      </KeyboardAwareScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF1E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#7C7672',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  symptomsInput: {
    width: '100%',
    minHeight: 80,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E6E1DC',
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: '#1A1817',
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BD632F',
    width: '100%',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 16,
  },
  scanButtonIcon: {
    marginRight: 8,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E6E1DC',
    width: '100%',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
  },
  uploadButtonIcon: {
    marginRight: 8,
  },
  uploadButtonText: {
    color: '#1A1817',
    fontSize: 16,
    fontWeight: '600',
  },
});
