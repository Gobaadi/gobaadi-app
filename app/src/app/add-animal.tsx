import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import {
  useGetAnimalByIdQuery,
  useAddAnimalMutation,
  useUpdateAnimalMutation,
} from '@/store/animalsApi';
import { uploadImageToCloudinary } from '@/lib/cloudinary-upload';

// Custom Calendar Modal Component
interface CalendarModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelectDate: (dateStr: string) => void;
}

function CalendarModal({ visible, title, onClose, onSelectDate }: CalendarModalProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (dayNum: number) => {
    const dayFormatted = String(dayNum).padStart(2, '0');
    const monthFormatted = String(month + 1).padStart(2, '0');
    const formattedStr = `${dayFormatted}/${monthFormatted}/${year}`;
    onSelectDate(formattedStr);
    onClose();
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const currentTodayNum = today.getDate();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.calendarModalContent}>
          <View style={styles.calendarModalHeader}>
            <Text style={styles.calendarModalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.calendarCloseBtn}>
              <Ionicons name="close" size={20} color="#7C7672" />
            </TouchableOpacity>
          </View>

          {/* Month Navigation */}
          <View style={styles.calendarMonthRow}>
            <TouchableOpacity onPress={prevMonth} style={styles.calendarArrowBtn}>
              <Ionicons name="chevron-back" size={20} color="#BD632F" />
            </TouchableOpacity>
            <Text style={styles.calendarMonthText}>
              {monthNames[month]} {year}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.calendarArrowBtn}>
              <Ionicons name="chevron-forward" size={20} color="#BD632F" />
            </TouchableOpacity>
          </View>

          {/* Day Names Header */}
          <View style={styles.calendarDaysHeader}>
            {dayNames.map((d, i) => (
              <Text key={i} style={styles.calendarDayNameText}>
                {d}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.calendarGrid}>
            {cells.map((cell, idx) => {
              if (cell === null) {
                return <View key={idx} style={styles.calendarCellEmpty} />;
              }
              const isToday = isCurrentMonth && cell === currentTodayNum;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.calendarCell, isToday && styles.calendarCellToday]}
                  onPress={() => handleSelectDay(cell)}
                >
                  <Text style={[styles.calendarCellText, isToday && styles.calendarCellTextToday]}>
                    {cell}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function AddAnimalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const editId = params.edit ? String(params.id || '') : '';
  const [step, setStep] = useState(1); // 1: Info, 2: Details, 3: Visual, 4: Pricing

  // Form State - Step 1: Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');

  // Form State - Step 2: Details
  const [source, setSource] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [joinedFarm, setJoinedFarm] = useState('');
  const [weight, setWeight] = useState('');
  const [liveWeight, setLiveWeight] = useState('');
  const [reproStatus, setReproStatus] = useState('');
  const [color, setColor] = useState('');

  // Form State - Step 3: Visual
  const [photos, setPhotos] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Form State - Step 4: Pricing
  const [photoCost, setPhotoCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [liveWeightPrice, setLiveWeightPrice] = useState('');

  // Dropdown Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; options: string[]; onSelect: (val: string) => void }>({
    title: '',
    options: [],
    onSelect: () => {},
  });

  // Calendar Modal States
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState('Select Date');
  const [calendarTarget, setCalendarTarget] = useState<'dob' | 'age' | 'joinedFarm' | null>(null);

  const openDropdown = (title: string, options: string[], onSelect: (val: string) => void) => {
    setModalData({ title, options, onSelect });
    setModalVisible(true);
  };

  const openCalendar = (target: 'dob' | 'age' | 'joinedFarm', title: string) => {
    setCalendarTarget(target);
    setCalendarTitle(title);
    setCalendarVisible(true);
  };

  const handleCalendarSelect = (dateStr: string) => {
    if (calendarTarget === 'dob') {
      setDob(dateStr);
    } else if (calendarTarget === 'age') {
      setAge(dateStr);
    } else if (calendarTarget === 'joinedFarm') {
      setJoinedFarm(dateStr);
    }
  };

  // Multiple Image Picker
  const pickImages = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Access to photo gallery is required to upload animal photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        const validAssets = result.assets.filter((asset) => {
          if (asset.mimeType && !validTypes.includes(asset.mimeType)) {
            return false;
          }
          return true;
        });
        if (validAssets.length < result.assets.length) {
          Alert.alert('Invalid file type', 'Only JPEG and PNG images are allowed.');
        }
        const newUris = validAssets.map((asset) => asset.uri);
        setPhotos((prev) => [...prev, ...newUris]);
        if (photos.length === 0) {
          setActivePhotoIndex(0);
        }
      }
    } catch (err) {
      console.log('Error picking images:', err);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (activePhotoIndex >= updated.length) {
        setActivePhotoIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const { data: existingAnimal } = useGetAnimalByIdQuery(editId, { skip: !editId });
  const [addAnimal] = useAddAnimalMutation();
  const [updateAnimal] = useUpdateAnimalMutation();

  useEffect(() => {
    if (!existingAnimal) return;
    setName(existingAnimal.name);
    setBreed(existingAnimal.breed);
    setWeight(existingAnimal.weight);
    setAge(existingAnimal.age);
    setColor(existingAnimal.color);
  }, [existingAnimal]);

  const handleNext = async () => {
    if (step === 1) {
      if (!name.trim()) {
        Alert.alert('Required field', 'Please enter animal name.');
        return;
      }
      const nameRegex = /^[a-zA-Z0-9\s.,'-]+$/;
      if (name.trim() && !nameRegex.test(name.trim())) {
        Alert.alert('Invalid input', 'Name can only contain letters, numbers, spaces, and basic punctuation.');
        return;
      }
      if (!description.trim()) {
        Alert.alert('Required field', 'Please enter description.');
        return;
      }
      if (description.trim() && !nameRegex.test(description.trim())) {
        Alert.alert('Invalid input', 'Description can only contain letters, numbers, spaces, and basic punctuation.');
        return;
      }
      if (!gender) {
        Alert.alert('Required field', 'Please select gender.');
        return;
      }
      if (!dob.trim()) {
        Alert.alert('Required field', 'Please enter date of birth.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!weight.trim()) {
        Alert.alert('Required field', 'Please add weight when joined farm.');
        return;
      }
      if (!color.trim()) {
        Alert.alert('Required field', 'Please add animal color.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (photos.length === 0) {
        Alert.alert('Required field', 'Please add at least one photo.');
        return;
      }
      setStep(4);
    } else {
      if (!photoCost.trim()) {
        Alert.alert('Required field', 'Please add purchase cost.');
        return;
      }
      try {
        setIsUploading(true);
        let uploadedUrls: string[] = [];
        try {
          uploadedUrls = await Promise.all(
            photos.map((uri) => uploadImageToCloudinary(uri))
          );
        } catch (uploadErr: any) {
          setIsUploading(false);
          Alert.alert('Upload failed', uploadErr?.message || 'Failed to upload photos. Please try again.');
          return;
        }
        setIsUploading(false);

        const payload = {
          name: name,
          breed: breed,
          weight: weight,
          age: age,
          color: color,
          image: uploadedUrls[0] || undefined,
          description: description,
          dob: dob,
          gender: gender,
          source: source,
          joinedFarm: joinedFarm,
          liveWeight: liveWeight,
          reproStatus: reproStatus,
          photos: uploadedUrls,
          photoCost: photoCost,
          sellingPrice: sellingPrice,
          liveWeightPrice: liveWeightPrice,
        };
        if (editId) {
          await updateAnimal({ id: editId, data: payload }).unwrap();
        } else {
          await addAnimal(payload).unwrap();
        }
        router.replace('/(tabs)/animals');
      } catch (err: any) {
        console.log('Error saving animal:', err);
        Alert.alert('Error', err?.data?.message || err?.message || 'Failed to save animal. Please try again.');
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{editId ? 'Edit Animal' : 'Add New Animal'}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={18} color="#C62828" />
          </TouchableOpacity>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicatorContainer}>
          <View style={styles.stepsRow}>
            {/* Step 1 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, step >= 1 ? styles.stepDotActive : styles.stepDotInactive]}>
                {step > 1 ? <Ionicons name="checkmark" size={14} color="#BD632F" /> : <View style={styles.stepInnerDot} />}
              </View>
              <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Info</Text>
            </View>

            <View style={[styles.stepLine, step >= 2 ? styles.stepLineActive : styles.stepLineInactive]} />

            {/* Step 2 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, step >= 2 ? styles.stepDotActive : styles.stepDotInactive]}>
                {step > 2 ? <Ionicons name="checkmark" size={14} color="#BD632F" /> : step === 2 ? <View style={styles.stepInnerDot} /> : null}
              </View>
              <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Details</Text>
            </View>

            <View style={[styles.stepLine, step >= 3 ? styles.stepLineActive : styles.stepLineInactive]} />

            {/* Step 3 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, step >= 3 ? styles.stepDotActive : styles.stepDotInactive]}>
                {step > 3 ? <Ionicons name="checkmark" size={14} color="#BD632F" /> : step === 3 ? <View style={styles.stepInnerDot} /> : null}
              </View>
              <Text style={[styles.stepLabel, step === 3 && styles.stepLabelActive]}>Visual</Text>
            </View>

            <View style={[styles.stepLine, step >= 4 ? styles.stepLineActive : styles.stepLineInactive]} />

            {/* Step 4 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, step >= 4 ? styles.stepDotActive : styles.stepDotInactive]}>
                {step === 4 ? <View style={styles.stepInnerDot} /> : null}
              </View>
              <Text style={[styles.stepLabel, step === 4 && styles.stepLabelActive]}>Pricing</Text>
            </View>
          </View>
        </View>

        {/* Scrollable form */}
        <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
          {step === 1 && (
            <View style={styles.formStep}>
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name*</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter animal name"
                  placeholderTextColor="#A39E99"
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description*</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add descriptions of the animal"
                  placeholderTextColor="#A39E99"
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Date of Birth */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date of Birth*</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => openCalendar('dob', 'Select Date of Birth')}
                >
                  <Text style={[styles.dropdownValue, !dob && styles.placeholder]}>
                    {dob || 'Add date of birth'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#7C7672" />
                </TouchableOpacity>
              </View>

              {/* Gender */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Gender*</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => openDropdown('Gender', ['Male', 'Female'], setGender)}
                >
                  <Text style={[styles.dropdownValue, !gender && styles.placeholder]}>
                    {gender || 'Select gender'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#7C7672" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.formStep}>
              {/* Source */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Source <Text style={styles.optional}>(optional)</Text></Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => openDropdown('Source', ['Purchased', 'Born in Farm', 'Leased', 'Imported'], setSource)}
                >
                  <Text style={[styles.dropdownValue, !source && styles.placeholder]}>
                    {source || 'Select source'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#7C7672" />
                </TouchableOpacity>
              </View>

              {/* Breed */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Breed <Text style={styles.optional}>(optional)</Text></Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => openDropdown('Breed', ['Albino Buffalo', 'Bangladeshi Cow', 'Gir', 'Holstein', 'Sahiwal', 'Crossbreed'], setBreed)}
                >
                  <Text style={[styles.dropdownValue, !breed && styles.placeholder]}>
                    {breed || 'Select breed'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#7C7672" />
                </TouchableOpacity>
              </View>

              {/* Age */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Age <Text style={styles.optional}>(optional)</Text></Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => openCalendar('age', 'Select Farm Joined Date')}
                >
                  <Text style={[styles.dropdownValue, !age && styles.placeholder]}>
                    {age || 'Select farm joined date'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#7C7672" />
                </TouchableOpacity>
              </View>

              {/* Joined Farm */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Joined Farm <Text style={styles.optional}>(optional)</Text></Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => openCalendar('joinedFarm', 'Select Farm Joined Date')}
                >
                  <Text style={[styles.dropdownValue, !joinedFarm && styles.placeholder]}>
                    {joinedFarm || 'Select farm joined date'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#7C7672" />
                </TouchableOpacity>
              </View>

              {/* Weight */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Weight*</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="Add weight when joined farm"
                  placeholderTextColor="#A39E99"
                  keyboardType="numeric"
                />
              </View>

              {/* Live Weight */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Live Weight <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                  style={styles.input}
                  value={liveWeight}
                  onChangeText={setLiveWeight}
                  placeholder="Add live weight"
                  placeholderTextColor="#A39E99"
                  keyboardType="numeric"
                />
              </View>

              {/* Reproductive Status */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Reproductive Status <Text style={styles.optional}>(optional)</Text></Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => openDropdown('Reproductive Status', ['Open', 'Pregnant', 'Lactating', 'Dry', 'N/A'], setReproStatus)}
                >
                  <Text style={[styles.dropdownValue, !reproStatus && styles.placeholder]}>
                    {reproStatus || 'Add reproductive status'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#7C7672" />
                </TouchableOpacity>
              </View>

              {/* Color */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Color*</Text>
                <TextInput
                  style={styles.input}
                  value={color}
                  onChangeText={setColor}
                  placeholder="Add animal color"
                  placeholderTextColor="#A39E99"
                />
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.formStep}>
              <Text style={styles.label}>Photo*</Text>

              {/* Main Photo Card Box */}
              <TouchableOpacity
                style={styles.photoMainBox}
                activeOpacity={0.85}
                onPress={pickImages}
              >
                {photos.length > 0 && photos[activePhotoIndex] ? (
                  <View style={styles.photoPreviewWrapper}>
                    <Image
                      source={{ uri: photos[activePhotoIndex] }}
                      style={styles.photoMainImage}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeMainPhotoBtn}
                      onPress={() => removePhoto(activePhotoIndex)}
                    >
                      <Ionicons name="close-circle" size={28} color="#E53935" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoUploadPlaceholder}>
                    <View style={styles.photoUploadIconCircle}>
                      <Ionicons name="image-outline" size={48} color="#A39E99" />
                      <Ionicons name="arrow-up" size={20} color="#A39E99" style={styles.photoArrowBadge} />
                    </View>
                    <Text style={styles.photoUploadText}>Tap to upload photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Thumbnails Row */}
              <View style={styles.thumbnailsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailsRow}>
                  {photos.map((uri, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.thumbnailCard,
                        activePhotoIndex === idx && styles.thumbnailCardActive,
                      ]}
                      onPress={() => setActivePhotoIndex(idx)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri }} style={styles.thumbnailImage} contentFit="cover" />
                      <TouchableOpacity
                        style={styles.thumbnailDeleteBadge}
                        onPress={() => removePhoto(idx)}
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}

                  {/* Add More Button */}
                  <TouchableOpacity
                    style={styles.addMoreCard}
                    onPress={pickImages}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="image-outline" size={24} color="#7C7672" />
                    <Ionicons name="add" size={14} color="#7C7672" style={styles.addPlusBadge} />
                    <Text style={styles.addMoreText}>Add More</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.formStep}>
              {/* Purchase Cost */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Purchase Cost*</Text>
                <TextInput
                  style={styles.input}
                  value={photoCost}
                  onChangeText={setPhotoCost}
                  placeholder="Add purchase cost"
                  placeholderTextColor="#A39E99"
                  keyboardType="numeric"
                />
              </View>

              {/* Selling Price (optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Selling Price <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                  style={styles.input}
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                  placeholder="Add selling price"
                  placeholderTextColor="#A39E99"
                  keyboardType="numeric"
                />
              </View>

              {/* Live Weight Price (optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Live Weight Price <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                  style={styles.input}
                  value={liveWeightPrice}
                  onChangeText={setLiveWeightPrice}
                  placeholder="Add selling price"
                  placeholderTextColor="#A39E99"
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {/* Button Row */}
          <View style={styles.buttonRow}>
            {step > 1 ? (
              <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.nextButton, isUploading && { opacity: 0.6 }]}
              onPress={handleNext}
              activeOpacity={0.8}
              disabled={isUploading}
            >
              <Text style={styles.nextButtonText}>
                {isUploading ? 'Uploading...' : step === 4 ? 'Add Animal' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Selector Dropdown Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalData.title}</Text>
            <FlatList
              data={modalData.options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    modalData.onSelect(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Calendar Picker Modal */}
      <CalendarModal
        visible={calendarVisible}
        title={calendarTitle}
        onClose={() => setCalendarVisible(false)}
        onSelectDate={handleCalendarSelect}
      />
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1817',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBEBEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    width: 50,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stepDotActive: {
    borderColor: '#BD632F',
    backgroundColor: '#FFFFFF',
  },
  stepDotInactive: {
    borderColor: '#E6E1DC',
    backgroundColor: '#FFFFFF',
  },
  stepInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#BD632F',
  },
  stepLabel: {
    fontSize: 11,
    color: '#9C9690',
    marginTop: 6,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#BD632F',
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginTop: -16,
  },
  stepLineActive: {
    backgroundColor: '#BD632F',
  },
  stepLineInactive: {
    backgroundColor: '#E6E1DC',
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  formStep: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 18,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1817',
    marginBottom: 8,
  },
  optional: {
    color: '#9C9690',
    fontWeight: '400',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1A1817',
  },
  textArea: {
    height: 120,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
  },
  dropdownValue: {
    fontSize: 15,
    color: '#1A1817',
  },
  placeholder: {
    color: '#A39E99',
  },
  photoMainBox: {
    height: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  photoUploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadIconCircle: {
    position: 'relative',
    marginBottom: 12,
  },
  photoArrowBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  photoUploadText: {
    fontSize: 15,
    color: '#A39E99',
    fontWeight: '500',
  },
  photoPreviewWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  photoMainImage: {
    width: '100%',
    height: '100%',
  },
  removeMainPhotoBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  thumbnailsContainer: {
    marginBottom: 20,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnailCard: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailCardActive: {
    borderColor: '#BD632F',
    borderWidth: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailDeleteBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E53935',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreCard: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  addPlusBadge: {
    position: 'absolute',
    top: 14,
    right: 16,
  },
  addMoreText: {
    fontSize: 11,
    color: '#7C7672',
    fontWeight: '500',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#A39E99',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1.5,
    backgroundColor: '#BD632F',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF9F6',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1A1817',
    textAlign: 'center',
  },

  // Calendar Modal Styles
  calendarModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1817',
  },
  calendarCloseBtn: {
    padding: 4,
  },
  calendarMonthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FAF9F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  calendarArrowBtn: {
    padding: 4,
  },
  calendarMonthText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarDayNameText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#9C9690',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCellEmpty: {
    width: '14.28%',
    height: 40,
  },
  calendarCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  calendarCellToday: {
    backgroundColor: '#BD632F',
  },
  calendarCellText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1817',
  },
  calendarCellTextToday: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
