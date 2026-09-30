import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  useGetMedicalRecordsQuery,
  useUploadMedicalRecordMutation,
  type AttachmentStatus,
} from '@/store/medicalRecordsApi';
import { compressImageForUpload } from '@/utils/compress-image';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusStyle(status: AttachmentStatus) {
  switch (status) {
    case 'READY':
      return { badge: styles.statusReady, text: styles.statusTextReady };
    case 'FAILED':
      return { badge: styles.statusFailed, text: styles.statusTextFailed };
    default:
      return { badge: styles.statusPending, text: styles.statusTextPending };
  }
}

export default function MedicalRecordsScreen() {
  const router = useRouter();
  const { data: records, isLoading } = useGetMedicalRecordsQuery();
  const [uploadMedicalRecord, { isLoading: isUploading }] = useUploadMedicalRecordMutation();

  async function handleUpload() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to upload a document.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    const file = await compressImageForUpload(asset.uri, {
      fileName: asset.fileName || `upload-${Date.now()}.jpg`,
      mimeType: asset.mimeType || 'image/jpeg',
    });
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    try {
      await uploadMedicalRecord(formData).unwrap();
    } catch (err) {
      console.log('Error uploading medical record:', err);
      const status = (err as { status?: number | string })?.status;
      Alert.alert(
        'Upload failed',
        status === 413 ? 'Photo is too large — please pick a smaller image.' : 'Please try again.',
      );
    }
  }

  function handleOpen(url?: string) {
    if (!url) return;
    Linking.openURL(url).catch((err) => console.log('Error opening file:', err));
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Records</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#BD632F" style={{ marginTop: 30 }} />
        ) : !records || records.length === 0 ? (
          <Text style={styles.emptyText}>No medical records uploaded yet.</Text>
        ) : (
          records.map((record) => {
            const { badge, text } = statusStyle(record.status);
            return (
              <TouchableOpacity
                key={record.id}
                style={styles.recordCard}
                activeOpacity={record.status === 'READY' ? 0.7 : 1}
                onPress={() => record.status === 'READY' && handleOpen(record.storageUrl)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {record.originalFileName}
                  </Text>
                  <Text style={styles.fileDate}>{formatDate(record.createdAt)}</Text>
                </View>
                <View style={[styles.statusBadge, badge]}>
                  <Text style={[styles.statusText, text]}>{record.status}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.uploadButton, isUploading && { opacity: 0.6 }]}
          onPress={handleUpload}
          disabled={isUploading}
          activeOpacity={0.85}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.uploadButtonText}>＋ Upload Document</Text>
          )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 16,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 110,
  },
  emptyText: {
    fontSize: 13,
    color: '#9C9690',
    textAlign: 'center',
    paddingVertical: 40,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  fileDate: {
    fontSize: 11,
    color: '#9C9690',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusReady: {
    backgroundColor: '#E8F5E9',
  },
  statusTextReady: {
    color: '#2E7D32',
  },
  statusFailed: {
    backgroundColor: '#FFEBEE',
  },
  statusTextFailed: {
    color: '#C62828',
  },
  statusPending: {
    backgroundColor: '#FFF8F4',
  },
  statusTextPending: {
    color: '#BD632F',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9E5DF',
  },
  uploadButton: {
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
