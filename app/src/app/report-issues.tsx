import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import * as DocumentPicker from 'expo-document-picker';
import {
  backButtonSvg,
  reportIssuesArrowDownSvg,
  reportIssuesCameraSvg,
  reportIssuesAddSvg,
} from '@/components/icons/svg-icon-sources';
import { useCreateTicketMutation } from '@/store/supportApi';
import { compressImageForUpload, getLocalFileSize, MAX_UPLOAD_BYTES } from '@/utils/compress-image';
import { apiErrorMessage } from '@/utils/api-error';

const ISSUE_TYPES = [
  'App Not Working',
  'Payment Issue',
  'Animal Record Sync Error',
  'Doctor Consultation Problem',
  'Other Technical Bug',
];

// Images above this are refused outright; anything smaller is compressed to
// fit under MAX_UPLOAD_BYTES at submit time.
const MAX_PICK_BYTES = 15 * 1024 * 1024;
const IMAGE_PATTERN = /\.(png|jpe?g|webp|gif)$/i;

function isImageAttachment(name: string, mimeType?: string): boolean {
  return (mimeType ?? '').startsWith('image/') || IMAGE_PATTERN.test(name);
}

export default function ReportIssuesScreen() {
  const router = useRouter();
  const [selectedIssue, setSelectedIssue] = useState('E.g App Not Working');
  const [description, setDescription] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [attachment, setAttachment] = useState<{
    uri: string;
    name: string;
    size: number | null;
    mimeType?: string;
  } | null>(null);
  const [createTicket, { isLoading }] = useCreateTicketMutation();

  async function handleBrowseFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const isImage = isImageAttachment(file.name, file.mimeType);
      const size = typeof file.size === 'number' ? file.size : null;
      if (isImage) {
        if (size !== null && size > MAX_PICK_BYTES) {
          Alert.alert('File Too Large', 'Images must be under 15 MB.');
          return;
        }
      } else if (size !== null && size > MAX_UPLOAD_BYTES) {
        Alert.alert(
          'File Too Large',
          'Files must be under 900 KB. Images are compressed automatically.',
        );
        return;
      }
      setAttachment({
        uri: file.uri,
        name: file.name,
        size: typeof file.size === 'number' ? file.size : null,
        mimeType: file.mimeType,
      });
    } catch {
      Alert.alert('Error', 'Could not select the file. Please try again.');
    }
  }

  async function handleSubmit() {
    if (!description.trim()) {
      Alert.alert('Missing Info', 'Please describe the issue in detail.');
      return;
    }
    if (selectedIssue === 'E.g App Not Working') {
      Alert.alert('Missing Info', 'Please select an issue type.');
      return;
    }
    try {
      let fileField: { uri: string; name: string; type: string } | null = null;
      if (attachment) {
        fileField = isImageAttachment(attachment.name, attachment.mimeType)
          ? await compressImageForUpload(attachment.uri, {
              fileName: attachment.name,
              mimeType: attachment.mimeType || 'image/jpeg',
            })
          : {
              uri: attachment.uri,
              name: attachment.name,
              type: attachment.mimeType || 'application/octet-stream',
            };
        const finalSize = getLocalFileSize(fileField.uri);
        if (finalSize !== null && finalSize > MAX_UPLOAD_BYTES) {
          Alert.alert(
            'Attachment Too Large',
            'This attachment is still too large after compression. Please choose a smaller file.',
          );
          return;
        }
      }

      const form = new FormData();
      form.append('subject', selectedIssue);
      form.append('message', description);
      if (fileField) {
        form.append('file', { ...fileField } as any);
      }
      await createTicket(form).unwrap();
      Alert.alert('Report Submitted', 'Thank you for reporting. Our team will inspect it promptly.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const status = (err as { status?: number | string })?.status;
      Alert.alert(
        'Error',
        status === 413
          ? 'Attachment is too large — files must be under 1 MB. Please choose a smaller file.'
          : apiErrorMessage(err, 'Failed to submit report. Please try again.'),
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Report Issues</Text>

        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Issue Type Dropdown */}
        <Text style={styles.fieldLabel}>What Happened ?</Text>
        <TouchableOpacity
          style={styles.dropdownInput}
          onPress={() => setShowDropdown(!showDropdown)}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownValue}>{selectedIssue}</Text>
          <SvgXml
            width={18}
            height={9}
            xml={reportIssuesArrowDownSvg}
            style={showDropdown ? styles.dropdownArrowOpen : undefined}
          />
        </TouchableOpacity>

        {showDropdown && (
          <View style={styles.dropdownMenu}>
            {ISSUE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedIssue(type);
                  setShowDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Description Field */}
        <Text style={styles.fieldLabel}>Description</Text>
        <View style={styles.descriptionWrapper}>
          <TextInput
            style={styles.descriptionInput}
            multiline
            numberOfLines={4}
            placeholder="Please Describe in Detail What happened"
            placeholderTextColor="#A39E99"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Attachment Upload */}
        <View style={styles.uploadCard}>
          <View style={styles.uploadIconCircle}>
            <SvgXml width={22} height={22} xml={reportIssuesCameraSvg} />
          </View>
          <Text style={styles.uploadTitle}>Drag &amp; Drop</Text>
          <Text style={styles.uploadSubtitle}>Select File and Upload Here</Text>
          <View style={styles.uploadDivider} />
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={handleBrowseFile}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <SvgXml width={20} height={20} xml={reportIssuesAddSvg} />
            <Text style={styles.browseBtnText}>Browse File</Text>
          </TouchableOpacity>
        </View>

        {attachment && (
          <View style={styles.selectedFileRow}>
            <Ionicons name="document-attach-outline" size={18} color="#BD632F" />
            <Text style={styles.selectedFileName} numberOfLines={1}>
              {attachment.name}
            </Text>
            <TouchableOpacity
              onPress={() => setAttachment(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Ionicons name="close-circle" size={20} color="#9C9690" />
            </TouchableOpacity>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Report</Text>
          )}
        </TouchableOpacity>
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
    paddingTop: 12,
    marginBottom: 24,
  },
  backBtn: {
    width: 42,
    height: 42,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1817',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 8,
  },
  dropdownInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  dropdownValue: {
    fontSize: 14,
    color: '#7C7672',
    fontWeight: '500',
  },
  dropdownArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    marginTop: -14,
    marginBottom: 20,
    paddingVertical: 6,
    elevation: 3,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F2EC',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1A1817',
    fontWeight: '500',
  },
  descriptionWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#1A1817',
  },
  uploadCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F2EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: '#9C9690',
    marginBottom: 14,
  },
  uploadDivider: {
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: '#E6E1DC',
    marginBottom: 14,
    borderStyle: 'dashed',
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'stretch',
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EEF3F9',
    borderWidth: 1,
    borderColor: '#DCE5F0',
  },
  browseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8F4',
    borderWidth: 1,
    borderColor: '#F0DFD4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  selectedFileName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1817',
  },
  submitBtn: {
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
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
