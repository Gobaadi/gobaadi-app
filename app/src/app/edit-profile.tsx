import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useUploadMyPhotoMutation,
} from '@/store/usersApi';
import { useLocation } from '@/hooks/use-location';
import { compressImageForUpload } from '@/utils/compress-image';

export default function EditProfileScreen() {
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

  useEffect(() => {
    if (profile?.name) setName(profile.name);
    if (profile?.phone) setPhone(profile.phone);
  }, [profile]);

  const avatarSource = pickedPhotoUri
    ? { uri: pickedPhotoUri }
    : profile?.profilePhoto
      ? { uri: profile.profilePhoto }
      : require('@/assets/images/user_profile.png');

  const openPhotoPicker = () => {
    Alert.alert('Change Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: () => pickPhoto('camera') },
      { text: 'Choose from Library', onPress: () => pickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
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
          'Permission required',
          source === 'camera'
            ? 'Camera access is required to take a profile photo.'
            : 'Photo library access is required to choose a profile photo.',
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
        'Photo selection failed',
        'Could not open the camera or photo gallery. Please try again.',
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
        'Upload failed',
        err?.status === 413
          ? 'The photo is too large. Please try a smaller image.'
          : err?.data?.message ||
            err?.message ||
            'Failed to upload photo. Please try again.',
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required field', 'Please enter your name.');
      return;
    }
    try {
      await updateProfile({ name: name.trim(), phone }).unwrap();
      await setLocation((locationInput ?? '').trim() || location);
      Alert.alert('Success', 'Profile updated successfully.');
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
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
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Profile</Text>

        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          {/* Form Fields */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Your name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter name"
                placeholderTextColor="#A39E99"
              />
              <TouchableOpacity style={styles.inputActionBtn} activeOpacity={0.7}>
                <Ionicons name="mic-outline" size={20} color="#BD632F" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Mobile Number</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                editable={true}
                placeholder="Enter Phone"
                placeholderTextColor="#A39E99"
                keyboardType="phone-pad"
              />
              <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Location</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={locationInput ?? location}
                onChangeText={setLocationInput}
                placeholder="Enter location"
                placeholderTextColor="#A39E99"
              />
              <Ionicons name="location-outline" size={20} color="#BD632F" />
            </View>
          </View>
        </View>
      </ScrollView>

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
            <Text style={styles.saveButtonText}>Save Changes</Text>
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
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
