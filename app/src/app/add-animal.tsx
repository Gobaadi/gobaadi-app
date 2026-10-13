import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import {
  useGetAnimalByIdQuery,
  useAddAnimalMutation,
  useUpdateAnimalMutation,
  useUploadAnimalPhotoMutation,
} from '@/store/animalsApi';
import { compressImageForUpload } from '@/utils/compress-image';
import { isRenderableImageUri } from '@/utils/photo-uri';
import { ageToMonthsInput, digitsOnly } from '@/utils/age';
import { useTranslation } from '@/hooks/use-translation';

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Custom Calendar Modal Component
interface CalendarModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelectDate: (dateStr: string) => void;
}

function CalendarModal({ visible, title, onClose, onSelectDate }: CalendarModalProps) {
  const { t } = useTranslation();
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = MONTH_KEYS.map((key) => t(`addAnimal.calendar.months.${key}`));
  const dayNames = DAY_KEYS.map((key) => t(`addAnimal.calendar.weekdays.${key}`));

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
  const { t } = useTranslation();
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
  const [modalData, setModalData] = useState<{
    title: string;
    options: { value: string; label: string }[];
    onSelect: (val: string) => void;
  }>({
    title: '',
    options: [],
    onSelect: () => {},
  });

  // Calendar Modal States
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState(() => t('addAnimal.calendar.selectDate'));
  const [calendarTarget, setCalendarTarget] = useState<'dob' | 'joinedFarm' | null>(null);

  type OptionGroup = 'gender' | 'source' | 'breed' | 'reproStatus';

  const optionLabel = (group: OptionGroup, value: string) =>
    t(`addAnimal.options.${group}.${value}`, { defaultValue: value });

  const openDropdown = (
    title: string,
    group: OptionGroup,
    values: string[],
    onSelect: (val: string) => void,
  ) => {
    setModalData({
      title,
      options: values.map((value) => ({ value, label: optionLabel(group, value) })),
      onSelect,
    });
    setModalVisible(true);
  };

  const openCalendar = (target: 'dob' | 'joinedFarm', title: string) => {
    setCalendarTarget(target);
    setCalendarTitle(title);
    setCalendarVisible(true);
  };

  const handleCalendarSelect = (dateStr: string) => {
    if (calendarTarget === 'dob') {
      setDob(dateStr);
    } else if (calendarTarget === 'joinedFarm') {
      setJoinedFarm(dateStr);
    }
  };

  // Multiple Image Picker
  const addPickedAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const validAssets = assets.filter((asset) => {
      if (asset.mimeType && !validTypes.includes(asset.mimeType)) {
        return false;
      }
      return true;
    });
    if (validAssets.length < assets.length) {
      Alert.alert(t('addAnimal.alerts.invalidFileTypeTitle'), t('addAnimal.alerts.invalidFileTypeMsg'));
    }
    if (validAssets.length === 0) return;
    const newUris = validAssets.map((asset) => asset.uri);
    setPhotos((prev) => [...prev, ...newUris]);
    if (photos.length === 0) {
      setActivePhotoIndex(0);
    }
  };

  const pickImages = async () => {
    try {
      // Android sometimes kills the activity after the picker finishes; the
      // selection is parked until drained via getPendingResultAsync.
      const pending = await ImagePicker.getPendingResultAsync();
      if (pending && 'assets' in pending && !pending.canceled && pending.assets?.length) {
        addPickedAssets(pending.assets);
        return;
      }

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t('addAnimal.alerts.permissionTitle'), t('addAnimal.alerts.permissionMsg'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        addPickedAssets(result.assets);
      } else if (!result.canceled) {
        Alert.alert(t('addAnimal.alerts.selectFailedTitle'), t('addAnimal.alerts.selectFailedReadMsg'));
      }
    } catch (err) {
      console.log('Error picking images:', err);
      Alert.alert(t('addAnimal.alerts.selectFailedTitle'), t('addAnimal.alerts.selectFailedOpenMsg'));
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
  const [uploadAnimalPhoto] = useUploadAnimalPhotoMutation();

  useEffect(() => {
    if (!existingAnimal) return;
    setName(existingAnimal.name || '');
    setDescription(existingAnimal.description || '');
    setDob(existingAnimal.dob || '');
    setGender(existingAnimal.gender || '');
    setSource(existingAnimal.source || '');
    setBreed(existingAnimal.breed || '');
    setAge(ageToMonthsInput(existingAnimal.age));
    setJoinedFarm(existingAnimal.joinedFarm || '');
    setWeight(existingAnimal.weight || '');
    setLiveWeight(existingAnimal.liveWeight || '');
    setReproStatus(existingAnimal.reproStatus || '');
    setColor(existingAnimal.color || '');
    setPhotos(
      (existingAnimal.photos || (existingAnimal.image ? [existingAnimal.image] : [])).filter(
        isRenderableImageUri,
      ),
    );
    setPhotoCost(existingAnimal.photoCost || '');
    setSellingPrice(existingAnimal.sellingPrice || '');
    setLiveWeightPrice(existingAnimal.liveWeightPrice || '');
  }, [existingAnimal]);

  const handleNext = async () => {
    if (step === 1) {
      if (!name.trim()) {
        Alert.alert(t('addAnimal.alerts.requiredTitle'), t('addAnimal.validation.nameRequired'));
        return;
      }
      const nameRegex = /^[a-zA-Z0-9\s.,'-]+$/;
      if (name.trim() && !nameRegex.test(name.trim())) {
        Alert.alert(t('addAnimal.alerts.invalidInputTitle'), t('addAnimal.validation.nameInvalid'));
        return;
      }
      if (!description.trim()) {
        Alert.alert(t('addAnimal.alerts.requiredTitle'), t('addAnimal.validation.descriptionRequired'));
        return;
      }
      if (description.trim() && !nameRegex.test(description.trim())) {
        Alert.alert(t('addAnimal.alerts.invalidInputTitle'), t('addAnimal.validation.descriptionInvalid'));
        return;
      }
      if (!gender) {
        Alert.alert(t('addAnimal.alerts.requiredTitle'), t('addAnimal.validation.genderRequired'));
        return;
      }
      if (!dob.trim()) {
        Alert.alert(t('addAnimal.alerts.requiredTitle'), t('addAnimal.validation.dobRequired'));
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!weight.trim()) {
        Alert.alert(t('addAnimal.alerts.requiredTitle'), t('addAnimal.validation.weightRequired'));
        return;
      }
      if (!color.trim()) {
        Alert.alert(t('addAnimal.alerts.requiredTitle'), t('addAnimal.validation.colorRequired'));
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (photos.length === 0) {
        Alert.alert(t('addAnimal.alerts.requiredTitle'), t('addAnimal.validation.photoRequired'));
        return;
      }
      setStep(4);
    } else {
      if (!photoCost.trim()) {
        Alert.alert(t('addAnimal.alerts.requiredTitle'), t('addAnimal.validation.costRequired'));
        return;
      }
      try {
        setIsUploading(true);
        const existingUrls = photos.filter((p) => p.startsWith('http') && isRenderableImageUri(p));
        const newLocalUris = photos.filter((p) => !p.startsWith('http'));
        let uploadedNewUrls: string[] = [];
        try {
          uploadedNewUrls = await Promise.all(
            newLocalUris.map(async (uri) => {
              const file = await compressImageForUpload(uri, {
                fileName: uri.split('/').pop() || `animal-${Date.now()}.jpg`,
                mimeType: 'image/jpeg',
              });
              const formData = new FormData();
              formData.append('file', {
                uri: file.uri,
                name: file.name,
                type: file.type,
              } as any);
              const result = await uploadAnimalPhoto(formData).unwrap();
              return result.url;
            })
          );
        } catch (uploadErr: any) {
          console.log("Error uploading photos:", uploadErr);
          setIsUploading(false);
          Alert.alert(
            t('addAnimal.alerts.uploadFailedTitle'),
            uploadErr?.status === 413
              ? t('addAnimal.alerts.uploadTooLarge')
              : uploadErr?.data?.message || uploadErr?.message || t('addAnimal.alerts.uploadFailedMsg'),
          );
          return;
        }
        setIsUploading(false);

        const allPhotoUrls = [...existingUrls, ...uploadedNewUrls];
        const payload = {
          name: name,
          breed: breed,
          weight: weight,
          age: age,
          color: color,
          image: allPhotoUrls[0] || undefined,
          description: description,
          dob: dob,
          gender: gender,
          source: source,
          joinedFarm: joinedFarm,
          liveWeight: liveWeight,
          reproStatus: reproStatus,
          photos: allPhotoUrls,
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
        Alert.alert(t('addAnimal.alerts.errorTitle'), err?.data?.message || err?.message || t('addAnimal.alerts.saveFailedMsg'));
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
      {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{editId ? t('addAnimal.header.edit') : t('addAnimal.header.add')}</Text>
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
              <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>{t('addAnimal.steps.info')}</Text>
            </View>

            <View style={[styles.stepLine, step >= 2 ? styles.stepLineActive : styles.stepLineInactive]} />

            {/* Step 2 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, step >= 2 ? styles.stepDotActive : styles.stepDotInactive]}>
                {step > 2 ? <Ionicons name="checkmark" size={14} color="#BD632F" /> : step === 2 ? <View style={styles.stepInnerDot} /> : null}
              </View>
              <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>{t('addAnimal.steps.details')}</Text>
            </View>

            <View style={[styles.stepLine, step >= 3 ? styles.stepLineActive : styles.stepLineInactive]} />

            {/* Step 3 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, step >= 3 ? styles.stepDotActive : styles.stepDotInactive]}>
                {step > 3 ? <Ionicons name="checkmark" size={14} color="#BD632F" /> : step === 3 ? <View style={styles.stepInnerDot} /> : null}
              </View>
              <Text style={[styles.stepLabel, step === 3 && styles.stepLabelActive]}>{t('addAnimal.steps.visual')}</Text>
            </View>

            <View style={[styles.stepLine, step >= 4 ? styles.stepLineActive : styles.stepLineInactive]} />

            {/* Step 4 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, step >= 4 ? styles.stepDotActive : styles.stepDotInactive]}>
                {step === 4 ? <View style={styles.stepInnerDot} /> : null}
              </View>
              <Text style={[styles.stepLabel, step === 4 && styles.stepLabelActive]}>{t('addAnimal.steps.pricing')}</Text>
            </View>
          </View>
        </View>

        {/* Scrollable form */}
        <KeyboardAwareScrollView
          contentContainerStyle={styles.formContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <View style={styles.formStep}>
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.nameRequired')}</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('addAnimal.placeholders.name')}
                  placeholderTextColor="#A39E99"
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.descriptionRequired')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('addAnimal.placeholders.description')}
                  placeholderTextColor="#A39E99"
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Date of Birth */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.dobRequired')}</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => openCalendar('dob', t('addAnimal.calendar.dobTitle'))}
                >
                  <Text style={[styles.dropdownValue, !dob && styles.placeholder]}>
                    {dob || t('addAnimal.placeholders.dob')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#7C7672" />
                </TouchableOpacity>
              </View>

              {/* Gender */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.genderRequired')}</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => openDropdown(t('addAnimal.dropdowns.gender'), 'gender', ['Male', 'Female'], setGender)}
                >
                  <Text style={[styles.dropdownValue, !gender && styles.placeholder]}>
                    {gender ? optionLabel('gender', gender) : t('addAnimal.placeholders.gender')}
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
                <Text style={styles.label}>{t('addAnimal.fields.source')} <Text style={styles.optional}>{t('addAnimal.optional')}</Text></Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => openDropdown(t('addAnimal.dropdowns.source'), 'source', ['Purchased', 'Born in Farm', 'Leased', 'Imported'], setSource)}
                >
                  <Text style={[styles.dropdownValue, !source && styles.placeholder]}>
                    {source ? optionLabel('source', source) : t('addAnimal.placeholders.source')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#7C7672" />
                </TouchableOpacity>
              </View>

              {/* Breed */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.breed')} <Text style={styles.optional}>{t('addAnimal.optional')}</Text></Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => openDropdown(t('addAnimal.dropdowns.breed'), 'breed', ['Albino Buffalo', 'Bangladeshi Cow', 'Gir', 'Holstein', 'Sahiwal', 'Crossbreed'], setBreed)}
                >
                  <Text style={[styles.dropdownValue, !breed && styles.placeholder]}>
                    {breed ? optionLabel('breed', breed) : t('addAnimal.placeholders.breed')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#7C7672" />
                </TouchableOpacity>
              </View>

              {/* Age (months) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.age')} <Text style={styles.optional}>{t('addAnimal.optional')}</Text></Text>
                <TextInput
                  style={styles.input}
                  value={age}
                  onChangeText={(text) => setAge(digitsOnly(text))}
                  placeholder={t('addAnimal.placeholders.age')}
                  placeholderTextColor="#A39E99"
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>

              {/* Joined Farm */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.joinedFarm')} <Text style={styles.optional}>{t('addAnimal.optional')}</Text></Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => openCalendar('joinedFarm', t('addAnimal.calendar.farmJoinedTitle'))}
                >
                  <Text style={[styles.dropdownValue, !joinedFarm && styles.placeholder]}>
                    {joinedFarm || t('addAnimal.placeholders.farmJoined')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#7C7672" />
                </TouchableOpacity>
              </View>

              {/* Weight */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.weightRequired')}</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder={t('addAnimal.placeholders.weight')}
                  placeholderTextColor="#A39E99"
                  keyboardType="numeric"
                />
              </View>

              {/* Live Weight */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.liveWeight')} <Text style={styles.optional}>{t('addAnimal.optional')}</Text></Text>
                <TextInput
                  style={styles.input}
                  value={liveWeight}
                  onChangeText={setLiveWeight}
                  placeholder={t('addAnimal.placeholders.liveWeight')}
                  placeholderTextColor="#A39E99"
                  keyboardType="numeric"
                />
              </View>

              {/* Reproductive Status */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.reproStatus')} <Text style={styles.optional}>{t('addAnimal.optional')}</Text></Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => openDropdown(t('addAnimal.dropdowns.reproStatus'), 'reproStatus', ['Open', 'Pregnant', 'Lactating', 'Dry', 'N/A'], setReproStatus)}
                >
                  <Text style={[styles.dropdownValue, !reproStatus && styles.placeholder]}>
                    {reproStatus ? optionLabel('reproStatus', reproStatus) : t('addAnimal.placeholders.reproStatus')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#7C7672" />
                </TouchableOpacity>
              </View>

              {/* Color */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.colorRequired')}</Text>
                <TextInput
                  style={styles.input}
                  value={color}
                  onChangeText={setColor}
                  placeholder={t('addAnimal.placeholders.color')}
                  placeholderTextColor="#A39E99"
                />
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.formStep}>
              <Text style={styles.label}>{t('addAnimal.fields.photoRequired')}</Text>

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
                    <Text style={styles.photoUploadText}>{t('addAnimal.photo.tapToUpload')}</Text>
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
                    <Text style={styles.addMoreText}>{t('addAnimal.actions.addMore')}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.formStep}>
              {/* Purchase Cost */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.purchaseCostRequired')}</Text>
                <TextInput
                  style={styles.input}
                  value={photoCost}
                  onChangeText={setPhotoCost}
                  placeholder={t('addAnimal.placeholders.purchaseCost')}
                  placeholderTextColor="#A39E99"
                  keyboardType="numeric"
                />
              </View>

              {/* Selling Price (optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.sellingPrice')} <Text style={styles.optional}>{t('addAnimal.optional')}</Text></Text>
                <TextInput
                  style={styles.input}
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                  placeholder={t('addAnimal.placeholders.sellingPrice')}
                  placeholderTextColor="#A39E99"
                  keyboardType="numeric"
                />
              </View>

              {/* Live Weight Price (optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addAnimal.fields.liveWeightPrice')} <Text style={styles.optional}>{t('addAnimal.optional')}</Text></Text>
                <TextInput
                  style={styles.input}
                  value={liveWeightPrice}
                  onChangeText={setLiveWeightPrice}
                  placeholder={t('addAnimal.placeholders.sellingPrice')}
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
                <Text style={styles.backButtonText}>{t('addAnimal.actions.back')}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.nextButton, isUploading && { opacity: 0.6 }]}
              onPress={handleNext}
              activeOpacity={0.8}
              disabled={isUploading}
            >
              <Text style={styles.nextButtonText}>
                {isUploading ? t('addAnimal.actions.uploading') : step === 4 ? t('addAnimal.actions.addAnimal') : t('addAnimal.actions.next')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>

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
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    modalData.onSelect(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
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
