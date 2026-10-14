import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
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
import { useTranslation } from '@/hooks/use-translation';

const ISSUE_TYPES = [
  { value: 'App Not Working', labelKey: 'reportIssues.types.appNotWorking' },
  { value: 'Payment Issue', labelKey: 'reportIssues.types.paymentIssue' },
  { value: 'Animal Record Sync Error', labelKey: 'reportIssues.types.animalSyncError' },
  { value: 'Doctor Consultation Problem', labelKey: 'reportIssues.types.doctorConsultation' },
  { value: 'Other Technical Bug', labelKey: 'reportIssues.types.otherBug' },
];

const ISSUE_PLACEHOLDER = 'E.g App Not Working';

// Images above this are refused outright; anything smaller is compressed to
// fit under MAX_UPLOAD_BYTES at submit time.
const MAX_PICK_BYTES = 15 * 1024 * 1024;
const IMAGE_PATTERN = /\.(png|jpe?g|webp|gif)$/i;

function isImageAttachment(name: string, mimeType?: string): boolean {
  return (mimeType ?? '').startsWith('image/') || IMAGE_PATTERN.test(name);
}

export default function ReportIssuesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedIssue, setSelectedIssue] = useState(ISSUE_PLACEHOLDER);
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
          Alert.alert(t('reportIssues.alerts.fileTooLarge'), t('reportIssues.alerts.imageTooLarge'));
          return;
        }
      } else if (size !== null && size > MAX_UPLOAD_BYTES) {
        Alert.alert(
          t('reportIssues.alerts.fileTooLarge'),
          t('reportIssues.alerts.fileUnder900'),
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
      Alert.alert(t('reportIssues.alerts.error'), t('reportIssues.alerts.selectFileFailed'));
    }
  }

  async function handleSubmit() {
    if (!description.trim()) {
      Alert.alert(t('reportIssues.alerts.missingInfo'), t('reportIssues.alerts.describeIssue'));
      return;
    }
    if (selectedIssue === ISSUE_PLACEHOLDER) {
      Alert.alert(t('reportIssues.alerts.missingInfo'), t('reportIssues.alerts.selectIssueType'));
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
            t('reportIssues.alerts.attachmentTooLarge'),
            t('reportIssues.alerts.attachmentTooLargeMsg'),
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
      Alert.alert(
        t('reportIssues.alerts.submitted'),
        t('reportIssues.alerts.submittedMsg'),
        [{ text: t('reportIssues.alerts.ok'), onPress: () => router.back() }],
      );
    } catch (err) {
      const status = (err as { status?: number | string })?.status;
      Alert.alert(
        t('reportIssues.alerts.error'),
        status === 413
          ? t('reportIssues.alerts.tooLarge413')
          : apiErrorMessage(err, t('reportIssues.alerts.submitFailed')),
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

        <Text style={styles.headerTitle}>{t('reportIssues.header')}</Text>

        <View style={{ width: 42 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Issue Type Dropdown */}
        <Text style={styles.fieldLabel}>{t('reportIssues.whatHappened')}</Text>
        <TouchableOpacity
          style={styles.dropdownInput}
          onPress={() => setShowDropdown(!showDropdown)}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownValue}>
            {selectedIssue === ISSUE_PLACEHOLDER
              ? t('reportIssues.dropdownPlaceholder')
              : t(
                  ISSUE_TYPES.find((issue) => issue.value === selectedIssue)?.labelKey ??
                    'reportIssues.dropdownPlaceholder',
                )}
          </Text>
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
                key={type.value}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedIssue(type.value);
                  setShowDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{t(type.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Description Field */}
        <Text style={styles.fieldLabel}>{t('reportIssues.descriptionLabel')}</Text>
        <View style={styles.descriptionWrapper}>
          <TextInput
            style={styles.descriptionInput}
            multiline
            numberOfLines={4}
            placeholder={t('reportIssues.descriptionPlaceholder')}
            placeholderTextColor="#A39E99"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Attachment Upload / Preview */}
        {!attachment ? (
          <View style={styles.uploadCard}>
            <View style={styles.uploadIconCircle}>
              <SvgXml width={22} height={22} xml={reportIssuesCameraSvg} />
            </View>
            <Text style={styles.uploadTitle}>{t('reportIssues.dragDrop')}</Text>
            <Text style={styles.uploadSubtitle}>{t('reportIssues.uploadHint')}</Text>
            <View style={styles.uploadDivider} />
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={handleBrowseFile}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <SvgXml width={20} height={20} xml={reportIssuesAddSvg} />
              <Text style={styles.browseBtnText}>{t('reportIssues.browseFile')}</Text>
            </TouchableOpacity>
          </View>
        ) : isImageAttachment(attachment.name, attachment.mimeType) ? (
          <View style={styles.previewCard}>
            <Image source={{ uri: attachment.uri }} style={styles.previewImage} />
            <View style={styles.previewInfo}>
              <Ionicons name="image-outline" size={18} color="#BD632F" />
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
            <TouchableOpacity
              style={styles.changeFileBtn}
              onPress={handleBrowseFile}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <SvgXml width={18} height={18} xml={reportIssuesAddSvg} />
              <Text style={styles.changeFileBtnText}>{t('reportIssues.browseFile')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
            <Text style={styles.submitBtnText}>{t('reportIssues.submit')}</Text>
          )}
        </TouchableOpacity>
        </KeyboardAwareScrollView>
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
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    resizeMode: 'cover',
    backgroundColor: '#F5F2EC',
    marginBottom: 10,
  },
  previewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  changeFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'stretch',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF3F9',
    borderWidth: 1,
    borderColor: '#DCE5F0',
  },
  changeFileBtnText: {
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
