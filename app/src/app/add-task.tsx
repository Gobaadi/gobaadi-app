import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useCreateTaskMutation, useGetTasksQuery } from '@/store/tasksApi';
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

function generateDatePills() {
  const pills = [];
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    pills.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
      date: String(d.getDate()).padStart(2, '0'),
      fullDate: localDateKey(d),
    });
  }
  return pills;
}

function getDefaultTimes(): { startTime: string; endTime: string } {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  // Default date is always today, so the default time must never leave today
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 0, 0);
  if (start.getTime() > dayEnd.getTime()) {
    start.setTime(dayEnd.getTime());
  }

  const end = new Date(start.getTime() + 60 * 60 * 1000);

  function fmt(d: Date): string {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const p = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${m} ${p}`;
  }

  return { startTime: fmt(start), endTime: fmt(end) };
}

function DatePillItem({ pill, isSelected, onSelect }: {
  pill: { day: string; date: string; fullDate: string };
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { data: tasks = [] } = useGetTasksQuery(pill.fullDate);
  const count = tasks.length;

  return (
    <TouchableOpacity
      style={[styles.datePillCard, isSelected && styles.datePillCardSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <Text style={[styles.datePillDay, isSelected && styles.datePillTextSelected]}>{pill.day}</Text>
      <Text style={[styles.datePillNum, isSelected && styles.datePillTextSelected]}>{pill.date}</Text>
      <Text style={[styles.datePillCount, isSelected && styles.datePillTextSelected]}>
        {count > 0 ? `(${count})` : '(-)'}
      </Text>
    </TouchableOpacity>
  );
}

export default function AddTaskScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [createTask, { isLoading: isSubmitting }] = useCreateTaskMutation();

  const datePills = useMemo(() => generateDatePills(), []);
  const defaults = useMemo(() => getDefaultTimes(), []);
  const [selectedDate, setSelectedDate] = useState(datePills[0].fullDate);
  const [selectedShed, setSelectedShed] = useState('cow');
  const [selectedType, setSelectedType] = useState('hygiene');
  const [customTask, setCustomTask] = useState('');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly'>('none');
  const [instruction, setInstruction] = useState('');
  const [startTime, setStartTime] = useState(defaults.startTime);
  const [endTime, setEndTime] = useState(defaults.endTime);

  async function handleSubmit() {
    if (!customTask.trim()) {
      Alert.alert(t('addTask.alerts.requiredField'), t('addTask.alerts.enterDescription'));
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      Alert.alert(t('addTask.alerts.requiredField'), t('addTask.alerts.enterTimes'));
      return;
    }

    const typeObj = TASK_TYPES.find((type) => type.id === selectedType);
    const shedObj = SHEDS.find((shed) => shed.id === selectedShed);
    const title = customTask.trim() || `${typeObj?.name || 'Task'} - ${shedObj?.name || 'Farm'}`;

    const detailParts = [`${shedObj?.name || 'Farm'} • ${startTime} - ${endTime}`];
    if (repeat !== 'none') detailParts.push(`Repeat: ${repeat.charAt(0).toUpperCase() + repeat.slice(1)}`);
    if (instruction.trim()) detailParts.push(`Instruction: ${instruction.trim()}`);

    // Parse selected local calendar date (YYYY-MM-DD), not UTC midnight
    const dateParts = selectedDate.split('-').map((p) => parseInt(p, 10));
    const scheduledDate = new Date(
      dateParts[0],
      (dateParts[1] || 1) - 1,
      dateParts[2] || 1,
      0,
      0,
      0,
      0,
    );

    const timeParts = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeParts) {
      let hours = parseInt(timeParts[1], 10);
      const minutes = parseInt(timeParts[2], 10);
      const period = timeParts[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      scheduledDate.setHours(hours, minutes, 0, 0);
    }

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

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date Selector Pills */}
        <View style={styles.datePillsRow}>
          {datePills.map((p) => (
            <DatePillItem
              key={p.fullDate}
              pill={p}
              isSelected={p.fullDate === selectedDate}
              onSelect={() => setSelectedDate(p.fullDate)}
            />
          ))}
        </View>

        {/* Recommended Banner */}
        <View style={styles.recommendedBanner}>
          <SvgXml width={20} height={20} xml={cowShedSvg} style={styles.recommendedIcon} />
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
                    color={isSel ? '#BD632F' : '#9C9690'}
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
                      color={isSel ? '#BD632F' : '#9C9690'}
                    />
                  </View>
                  <View style={styles.typeIconCircle}>
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

          {/* Repeat */}
          <Text style={styles.sectionHeading}>{t('addTask.repeat')}</Text>
          <View style={styles.repeatRow}>
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

          {/* Set Time */}
          <Text style={styles.sectionHeading}>{t('addTask.setTime')}</Text>
          <View style={styles.timeInputsRow}>
            <View style={styles.timeInputCol}>
              <Text style={styles.timeInputLabel}>{t('addTask.workStart')}</Text>
              <TextInput
                style={styles.timeInputBox}
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>
            <View style={styles.timeInputCol}>
              <Text style={styles.timeInputLabel}>{t('addTask.workEnd')}</Text>
              <TextInput
                style={styles.timeInputBox}
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
          </View>
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
  datePillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  datePillCard: {
    flex: 1,
    marginHorizontal: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    paddingVertical: 10,
    alignItems: 'center',
  },
  datePillCardSelected: {
    borderColor: '#BD632F',
    backgroundColor: '#FFF8F4',
    borderWidth: 1.5,
  },
  datePillDay: {
    fontSize: 11,
    color: '#7C7672',
    fontWeight: '500',
    marginBottom: 2,
  },
  datePillNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1817',
    marginBottom: 2,
  },
  datePillCount: {
    fontSize: 10,
    color: '#9C9690',
  },
  datePillTextSelected: {
    color: '#BD632F',
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
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E6E1DC',
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
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
  timeInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInputCol: {
    flex: 1,
  },
  timeInputLabel: {
    fontSize: 12,
    color: '#7C7672',
    fontWeight: '500',
    marginBottom: 6,
  },
  timeInputBox: {
    height: 44,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
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
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  repeatRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  repeatChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
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
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 14,
    height: 100,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 14,
    color: '#1A1817',
    marginBottom: 20,
    textAlignVertical: 'top',
  },
});
