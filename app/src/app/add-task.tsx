import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useCreateTaskMutation } from '@/store/tasksApi';
import { localDateKey } from '@/utils/date';
import { apiErrorMessage } from '@/utils/api-error';
import {
  backButtonSvg,
  myTaskCalendarSvg,
  cowShedSvg,
  goatShedSvg,
  poultryShedSvg,
  addTaskFeedingSvg,
  addTaskWaterSupplySvg,
  addTaskHygieneSvg,
  addTaskCleaningSvg,
  addTaskVaccinationSvg,
  addTaskHealthCheckSvg,
  addTaskMicrophoneSvg,
} from '@/components/icons/svg-icon-sources';
import { SetTimePanel } from '@/components/ui/set-time-panel';
import {
  type TimeOfDay,
  toMinutes24,
  fromMinutes24,
  formatTime,
  dateFromDateKey,
} from '@/utils/time';
import { useTranslation } from '@/hooks/use-translation';

const SHEDS = [
  { id: 'cow', name: 'Cow Shed', nameKey: 'addTask.sheds.cow', icon: cowShedSvg },
  { id: 'goat', name: 'Goat Shed', nameKey: 'addTask.sheds.goat', icon: goatShedSvg },
  { id: 'poultry', name: 'Poultry Shed', nameKey: 'addTask.sheds.poultry', icon: poultryShedSvg },
];

const TASK_TYPES = [
  { id: 'feeding', name: 'Feeding', nameKey: 'addTask.types.feeding', icon: addTaskFeedingSvg },
  { id: 'water', name: 'Water Supply', nameKey: 'addTask.types.water', icon: addTaskWaterSupplySvg },
  { id: 'hygiene', name: 'Hygiene', nameKey: 'addTask.types.hygiene', icon: addTaskHygieneSvg },
  { id: 'cleaning', name: 'Cleaning', nameKey: 'addTask.types.cleaning', icon: addTaskCleaningSvg },
  { id: 'vaccination', name: 'Vaccination', nameKey: 'addTask.types.vaccination', icon: addTaskVaccinationSvg },
  { id: 'health', name: 'Health Check', nameKey: 'addTask.types.health', icon: addTaskHealthCheckSvg },
];

function defaultStartTime(): TimeOfDay {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 0, 0);
  if (start.getTime() > dayEnd.getTime()) {
    start.setTime(dayEnd.getTime());
  }

  return fromMinutes24(start.getHours() * 60 + start.getMinutes());
}

export default function AddTaskScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [createTask, { isLoading: isSubmitting }] = useCreateTaskMutation();

  const [selectedDate, setSelectedDate] = useState(() => localDateKey());
  const [selectedShed, setSelectedShed] = useState('cow');
  const [selectedType, setSelectedType] = useState('hygiene');
  const [customTask, setCustomTask] = useState('');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly'>('none');
  const [instruction, setInstruction] = useState('');
  const [start, setStart] = useState<TimeOfDay>(defaultStartTime);
  const [durationMins, setDurationMins] = useState(60);

  const selectedTypeIcon =
    TASK_TYPES.find((type) => type.id === selectedType)?.icon ?? cowShedSvg;

  async function handleSubmit() {
    if (!customTask.trim()) {
      Alert.alert(t('addTask.alerts.requiredField'), t('addTask.alerts.enterDescription'));
      return;
    }

    const typeObj = TASK_TYPES.find((type) => type.id === selectedType);
    const shedObj = SHEDS.find((shed) => shed.id === selectedShed);
    const title = customTask.trim() || `${typeObj?.name || 'Task'} - ${shedObj?.name || 'Farm'}`;

    const endTime = fromMinutes24(toMinutes24(start) + durationMins);
    const timeText = `${formatTime(start)} - ${formatTime(endTime)}`;
    const detailParts = [`${shedObj?.name || 'Farm'} • ${timeText}`];
    if (repeat !== 'none') detailParts.push(`Repeat: ${repeat.charAt(0).toUpperCase() + repeat.slice(1)}`);
    if (instruction.trim()) detailParts.push(`Instruction: ${instruction.trim()}`);

    const scheduledDate = dateFromDateKey(selectedDate);
    const startMinutes = toMinutes24(start);
    scheduledDate.setHours(Math.floor(startMinutes / 60), start.minute, 0, 0);

    // TC-057: reject past dates
    if (scheduledDate.getTime() < Date.now()) {
      Alert.alert(t('addTask.alerts.invalidDate'), t('addTask.alerts.futureDate'));
      return;
    }

    try {
      await createTask({
        title,
        detail: detailParts.join(' | '),
        scheduledTime: scheduledDate.toISOString(),
      }).unwrap();

      router.replace({
        pathname: '/my-task',
        params: { date: selectedDate },
      });
    } catch (err) {
      console.log('Error adding task:', err);
      Alert.alert(t('addTask.alerts.addFailed'), apiErrorMessage(err, t('addTask.alerts.tryAgain')));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerSquareBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('addTask.header')}</Text>

        <TouchableOpacity
          style={styles.headerSquareBtn}
          onPress={() => router.push('/my-task')}
          activeOpacity={0.8}
        >
          <SvgXml width={20} height={20} xml={myTaskCalendarSvg} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Recommended Banner */}
        <View style={styles.recommendedBanner}>
          <SvgXml width={20} height={20} xml={selectedTypeIcon} style={styles.recommendedIcon} />
          <Text style={styles.recommendedText}>{t('addTask.banner')}</Text>
        </View>

        {/* Card Form */}
        <View style={styles.formCard}>
          {/* Select Farm */}
          <Text style={styles.sectionHeading}>{t('addTask.selectFarm')}</Text>
          <View style={styles.shedsList}>
            {SHEDS.map((s) => {
              const isSel = s.id === selectedShed;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.shedRow, isSel && styles.shedRowSelected]}
                  onPress={() => setSelectedShed(s.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.shedRowLeft}>
                    <View style={styles.shedIconCircle}>
                      <SvgXml width={24} height={24} xml={s.icon} />
                    </View>
                    <Text style={[styles.shedName, isSel && styles.shedNameSelected]}>
                      {t(s.nameKey)}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSel ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={isSel ? '#BD632F' : '#7C7672'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Select Task Type */}
          <Text style={styles.sectionHeading}>{t('addTask.selectType')}</Text>
          <View style={styles.typesGrid}>
            {TASK_TYPES.map((type) => {
              const isSel = type.id === selectedType;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeCard, isSel && styles.typeCardSelected]}
                  onPress={() => setSelectedType(type.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.typeRadioPos}>
                    <Ionicons
                      name={isSel ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSel ? '#BD632F' : '#7C7672'}
                    />
                  </View>
                  <View style={[styles.typeIconCircle, isSel && styles.typeIconCircleSelected]}>
                    <SvgXml width={24} height={24} xml={type.icon} />
                  </View>
                  <Text style={[styles.typeName, isSel && styles.typeNameSelected]}>
                    {t(type.nameKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Task Input */}
          <View style={styles.customTaskWrapper}>
            <TextInput
              style={styles.customTaskInput}
              placeholder={t('addTask.taskHeadingPlaceholder')}
              placeholderTextColor="#A39E99"
              value={customTask}
              onChangeText={setCustomTask}
            />
            <TouchableOpacity
              style={styles.micBtn}
              onPress={() =>
                Alert.alert(t('addTask.alerts.voiceInput'), t('addTask.alerts.voiceInputSoon'))
              }
              activeOpacity={0.7}
            >
              <SvgXml width={20} height={20} xml={addTaskMicrophoneSvg} />
            </TouchableOpacity>
          </View>

          {/* Set Time */}
          <SetTimePanel
            i18nPrefix="addTask"
            dateKey={selectedDate}
            onDateChange={setSelectedDate}
            time={start}
            onTimeChange={setStart}
            durationMins={durationMins}
            onDurationChange={setDurationMins}
          />

          {/* Repeat */}
          <View style={styles.repeatRowCard}>
            <Text style={styles.repeatRowLabel}>{t('addTask.repeatTask')}</Text>
            <View style={styles.repeatChips}>
              {(['daily', 'weekly'] as const).map((opt) => {
                const isSel = repeat === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.repeatChip, isSel && styles.repeatChipSelected]}
                    onPress={() => setRepeat(isSel ? 'none' : opt)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.repeatChipText, isSel && styles.repeatChipTextSelected]}>
                      {t(`addTask.repeatOptions.${opt}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Add Instruction */}
          <Text style={styles.sectionHeading}>{t('addTask.instructionLabel')}</Text>
          <TextInput
            style={styles.instructionTextarea}
            placeholder={t('addTask.instructionPlaceholder')}
            placeholderTextColor="#A39E99"
            value={instruction}
            onChangeText={setInstruction}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>{t('addTask.submit')}</Text>
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
    marginBottom: 20,
  },
  headerSquareBtn: {
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
  recommendedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  recommendedIcon: {
    marginRight: 10,
  },
  recommendedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BD632F',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 14,
    marginTop: 6,
  },
  shedsList: {
    gap: 10,
    marginBottom: 20,
  },
  shedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  shedRowSelected: {
    borderColor: '#BD632F',
    backgroundColor: '#FFF8F4',
    borderWidth: 1.5,
  },
  shedRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shedIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1817',
  },
  shedNameSelected: {
    color: '#BD632F',
    fontWeight: '700',
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  typeCard: {
    width: '31%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
  },
  typeCardSelected: {
    borderColor: '#BD632F',
    backgroundColor: '#FFF8F4',
    borderWidth: 1.5,
  },
  typeRadioPos: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  typeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF9F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  typeIconCircleSelected: {
    backgroundColor: '#FFFFFF',
  },
  typeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C7672',
    textAlign: 'center',
  },
  typeNameSelected: {
    color: '#BD632F',
    fontWeight: '700',
  },
  customTaskWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  customTaskInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#1A1817',
  },
  micBtn: {
    padding: 4,
  },
  repeatRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  repeatRowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  repeatChips: {
    flexDirection: 'row',
    gap: 8,
  },
  repeatChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    backgroundColor: '#FAF9F6',
  },
  repeatChipSelected: {
    borderColor: '#BD632F',
    backgroundColor: '#FFF8F4',
    borderWidth: 1.5,
  },
  repeatChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
  },
  repeatChipTextSelected: {
    color: '#BD632F',
    fontWeight: '700',
  },
  instructionTextarea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 110,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 14,
    color: '#1A1817',
    marginBottom: 20,
    textAlignVertical: 'top',
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
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
