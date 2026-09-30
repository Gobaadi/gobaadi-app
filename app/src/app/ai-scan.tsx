import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { useUploadDiagnosisImageMutation } from '@/store/aiDiagnosisApi';
import { compressImageForUpload } from '@/utils/compress-image';

export default function AiScanScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [symptomsText, setSymptomsText] = useState('');
  const [uploadDiagnosisImage, { isLoading: isUploading }] = useUploadDiagnosisImageMutation();

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to upload a photo.');
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

    if (!imageUri && symptoms.length === 0) {
      Alert.alert('More info needed', 'Add a photo or describe the symptoms before analyzing.');
      return;
    }

    let imageUrl: string | undefined;
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

      try {
        const result = await uploadDiagnosisImage(formData).unwrap();
        imageUrl = result.url;
      } catch (err) {
        console.log('Error uploading scan image:', err);
        const status = (err as { status?: number | string })?.status;
        Alert.alert(
          'Upload failed',
          status === 413 ? 'Photo is too large — please pick a smaller image.' : 'Please try again.',
        );
        return;
      }
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.circleButton} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.iconCircle}>
              <Ionicons name="camera" size={40} color="#BD632F" />
            </View>
          )}

          <Text style={styles.title}>AI-Powered animals Diagnostics</Text>

          <Text style={styles.subtitle}>
            Take a photo or upload an image to detect animal&apos;s diseases, fungal attack and nutrient deficiencies
          </Text>

          {imageUri ? (
            <TextInput
              style={styles.symptomsInput}
              placeholder="Describe what you're seeing — fever, skin lesions, coughing, etc. (comma separated)"
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
              <Text style={styles.scanButtonText}>{isUploading ? 'Uploading…' : 'Analyze Now'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => router.push('/ai-hold')}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={18} color="#FFFFFF" style={styles.scanButtonIcon} />
              <Text style={styles.scanButtonText}>Scan Now</Text>
            </TouchableOpacity>
          )}

          {!imageUri && (
            <TouchableOpacity style={styles.uploadButton} activeOpacity={0.8} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={18} color="#7C7672" style={styles.uploadButtonIcon} />
              <Text style={styles.uploadButtonText}>Upload From Gallery</Text>
            </TouchableOpacity>
          )}

          {imageUri && (
            <TouchableOpacity style={styles.uploadButton} activeOpacity={0.8} onPress={() => setImageUri(null)}>
              <Text style={styles.uploadButtonText}>Retake</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    color: '#FFFFFF',
    fontSize: 18,
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
    fontSize: 18,
    marginRight: 8,
    color: '#7C7672',
  },
  uploadButtonText: {
    color: '#1A1817',
    fontSize: 16,
    fontWeight: '600',
  },
});
