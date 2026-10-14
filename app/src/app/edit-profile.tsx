import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useUploadMyPhotoMutation,
} from '@/store/usersApi';
import { useLocation } from '@/hooks/use-location';
import { compressImageForUpload } from '@/utils/compress-image';
import { apiErrorMessage } from '@/utils/api-error';
import {
  backButtonSvg,
  editProfilePhotoCameraSvg,
  editProfileNameMicrophoneSvg,
  editProfileNumberCheckSvg,
  editProfileLocationSvg,
} from '@/components/icons/svg-icon-sources';
import { useTranslation } from '@/hooks/use-translation';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: profile } = useGetMyProfileQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateMyProfileMutation();
  const [uploadMyPhoto] = useUploadMyPhotoMutation();
  const { location, setLocation } = useLocation();

  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [locationInput, setLocationInput] = useState<string | null>(null);
  const [pickedPhotoUri, setPickedPhotoUri] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profileSynced, setProfileSynced] = useState(false);

  // Fill the form once, when the profile first arrives. Syncing in an effect
  // would also wipe in-progress edits whenever a background refetch lands
  // (e.g. the Profile tag invalidating after a photo upload).
  if (!profileSynced && profile) {
    setProfileSynced(true);
    if (profile.name) setName(profile.name);
    if (profile.phone) setPhone(profile.phone);
  }

  const avatarSource = pickedPhotoUri
    ? { uri: pickedPhotoUri }
    : profile?.profilePhoto
      ? { uri: profile.profilePhoto }
      : require('@/assets/images/user_profile.webp');

  const openPhotoPicker = () => {
    Alert.alert(t('editProfile.alerts.changePhoto'), t('editProfile.alerts.chooseOption'), [
      { text: t('editProfile.alerts.takePhoto'), onPress: () => pickPhoto('camera') },
      { text: t('editProfile.alerts.chooseLibrary'), onPress: () => pickPhoto('library') },
      { text: t('editProfile.alerts.cancel'), style: 'cancel' },
    ]);
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t('editProfile.alerts.permissionRequired'),
          source === 'camera'
            ? t('editProfile.alerts.cameraPermission')
            : t('editProfile.alerts.libraryPermission'),
        );
        return;
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets?.length) return;
      await uploadPhoto(result.assets[0].uri);
    } catch {
      Alert.alert(
        t('editProfile.alerts.photoSelectionFailed'),
        t('editProfile.alerts.photoSelectionFailedMsg'),
      );
    }
  };

  const uploadPhoto = async (uri: string) => {
    try {
      setIsUploadingPhoto(true);
      setPickedPhotoUri(uri);
      const file = await compressImageForUpload(uri, {
        fileName: `avatar-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
      await uploadMyPhoto(formData).unwrap();
    } catch (err: any) {
      setPickedPhotoUri(null);
      Alert.alert(
        t('editProfile.alerts.uploadFailed'),
        err?.status === 413
          ? t('editProfile.alerts.photoTooLarge')
          : err?.data?.message ||
          err?.message ||
          t('editProfile.alerts.uploadPhotoFailed'),
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('editProfile.alerts.requiredField'), t('editProfile.alerts.enterName'));
      return;
    }
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() }).unwrap();
    } catch (err) {
      Alert.alert(
        t('editProfile.alerts.error'),
        apiErrorMessage(err, t('editProfile.alerts.updateProfileFailed')),
      );
      return;
    }
    await setLocation((locationInput ?? '').trim() || location);
    Alert.alert(t('editProfile.alerts.success'), t('editProfile.alerts.profileUpdated'), [
      { text: t('editProfile.alerts.ok'), onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('editProfile.header')}</Text>

        <View style={{ width: 42 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Card Container */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={openPhotoPicker}
            disabled={isUploadingPhoto}
            activeOpacity={0.8}
          >
            <Image source={avatarSource} style={styles.avatarImage} />
            <View style={styles.cameraBadge}>
              {isUploadingPhoto ? (
                <ActivityIndicator size="small" color="#BD632F" />
              ) : (
                <SvgXml width={28} height={28} xml={editProfilePhotoCameraSvg} />
              )}
            </View>
          </TouchableOpacity>

          {/* Form Fields */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('editProfile.nameLabel')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder={t('editProfile.namePlaceholder')}
                placeholderTextColor="#A39E99"
              />
              <TouchableOpacity style={styles.inputActionBtn} activeOpacity={0.7}>
                <SvgXml width={20} height={20} xml={editProfileNameMicrophoneSvg} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('editProfile.phoneLabel')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                editable={true}
                placeholder={t('editProfile.phonePlaceholder')}
                placeholderTextColor="#A39E99"
                keyboardType="phone-pad"
              />
              <SvgXml width={20} height={20} xml={editProfileNumberCheckSvg} />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('editProfile.locationLabel')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={locationInput ?? location}
                onChangeText={setLocationInput}
                placeholder={t('editProfile.locationPlaceholder')}
                placeholderTextColor="#A39E99"
              />
              <SvgXml width={20} height={20} xml={editProfileLocationSvg} />
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{t('editProfile.saveChanges')}</Text>
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
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    marginBottom: 20,
  },
  backButton: {
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
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 28,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 48,
    height: 48,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E6E1DC',
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#E6E1DC',
  },
  fieldContainer: {
    width: '100%',
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#BD7D5B',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#1A1817',
    fontWeight: '700',
  },
  inputActionBtn: {
    padding: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E9E5DF',
  },
  saveButton: {
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
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
