import React, { useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useUpdateTaskMutation } from '@/store/tasksApi';
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

const SHEDS = [
  { id: 'cow', name: 'Cow Shed', icon: cowShedSvg },
  { id: 'goat', name: 'Goat Shed', icon: goatShedSvg },
  { id: 'poultry', name: 'Poultry Shed', icon: poultryShedSvg },
];

const TASK_TYPES = [
  { id: 'feeding', name: 'Feeding', icon: addTaskFeedingSvg },
  { id: 'water', name: 'Water Supply', icon: addTaskWaterSupplySvg },
  { id: 'hygiene', name: 'Hygiene', icon: addTaskHygieneSvg },
  { id: 'cleaning', name: 'Cleaning', icon: addTaskCleaningSvg },
  { id: 'vaccination', name: 'Vaccination', icon: addTaskVaccinationSvg },
  { id: 'health', name: 'Health Check', icon: addTaskHealthCheckSvg },
];

function parseExistingTask(title?: string, detail?: string) {
  let shedId = 'cow';
  let typeId = 'hygiene';
  let customName = title || '';
  let repeat: 'none' | 'daily' | 'weekly' = 'none';
  let instruction = '';
  let start = '07:00 PM';
  let end = '08:00 PM';

  if (detail) {
    const farmMatch = detail.match(/^(.+?)\s*•/);
    if (farmMatch) {
      const farmName = farmMatch[1].trim();
      const found = SHEDS.find((s) => s.name === farmName);
      if (found) shedId = found.id;
    }

    const timeMatch = detail.match(/•\s*(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (timeMatch) {
      start = timeMatch[1].trim();
      end = timeMatch[2].trim();
    }

    const repeatMatch = detail.match(/Repeat:\s*(Daily|Weekly)/i);
    if (repeatMatch) {
      repeat = repeatMatch[1].toLowerCase() as 'daily' | 'weekly';
    }

    const instrMatch = detail.match(/Instruction:\s*(.+)$/i);
    if (instrMatch) {
      instruction = instrMatch[1].trim();
    }
  }

  if (title) {
    const typeMatch = TASK_TYPES.find((t) => title.startsWith(t.name));
    if (typeMatch && title.includes(' - ')) {
      typeId = typeMatch.id;
      customName = '';
    }
  }

  return { shedId, typeId, customName, repeat, instruction, start, end };
}

export default function EditTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; title?: string; detail?: string; scheduledTime?: string }>();
  const [updateTask, { isLoading: isSubmitting }] = useUpdateTaskMutation();

  const parsed = parseExistingTask(params.title, params.detail);

  const [selectedShed, setSelectedShed] = useState(parsed.shedId);
  const [selectedType, setSelectedType] = useState(parsed.typeId);
  const [customTask, setCustomTask] = useState(parsed.customName);
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly'>(parsed.repeat);
  const [instruction, setInstruction] = useState(parsed.instruction);
  const [startTime, setStartTime] = useState(parsed.start);
  const [endTime, setEndTime] = useState(parsed.end);

  async function handleUpdate() {
    if (!params.id) {
      Alert.alert(
        'Could not update task',
        'Missing task ID. Go back to the task list and try again.',
      );
      return;
    }

    const taskId = Number(params.id);
    if (!Number.isFinite(taskId) || taskId <= 0) {
      Alert.alert(
        'Could not update task',
        'Invalid task ID. Go back to the task list and try again.',
      );
      return;
    }

    const typeObj = TASK_TYPES.find((t) => t.id === selectedType);
    const shedObj = SHEDS.find((s) => s.id === selectedShed);
    const title = customTask.trim() || `${typeObj?.name || 'Task'} - ${shedObj?.name || 'Farm'}`;

    const detailParts = [`${shedObj?.name || 'Farm'} • ${startTime} - ${endTime}`];
    if (repeat !== 'none') detailParts.push(`Repeat: ${repeat.charAt(0).toUpperCase() + repeat.slice(1)}`);
    if (instruction.trim()) detailParts.push(`Instruction: ${instruction.trim()}`);

    // Use existing scheduledTime or current time
    const scheduledTime = params.scheduledTime || new Date().toISOString();

    try {
      await updateTask({
        id: taskId,
        title,
        detail: detailParts.join(' | '),
        scheduledTime,
      }).unwrap();

      router.back();
    } catch (err) {
      console.log('Error updating task:', err);
      Alert.alert('Could not update task', apiErrorMessage(err, 'Please try again.'));
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

        <Text style={styles.headerTitle}>Edit Task</Text>

        <TouchableOpacity style={styles.headerSquareBtn} activeOpacity={0.8}>
          <SvgXml width={20} height={20} xml={myTaskCalendarSvg} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Card Form */}
        <View style={styles.formCard}>
          {/* Select Farm */}
          <Text style={styles.sectionHeading}>Select Farm</Text>
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
                      {s.name}
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
          <Text style={styles.sectionHeading}>Select Task Type</Text>
          <View style={styles.typesGrid}>
            {TASK_TYPES.map((t) => {
              const isSel = t.id === selectedType;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeCard, isSel && styles.typeCardSelected]}
                  onPress={() => setSelectedType(t.id)}
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
                    <SvgXml width={24} height={24} xml={t.icon} />
                  </View>
                  <Text style={[styles.typeName, isSel && styles.typeNameSelected]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Task Input */}
          <View style={styles.customTaskWrapper}>
            <TextInput
              style={styles.customTaskInput}
              placeholder="Custom Task"
              placeholderTextColor="#A39E99"
              value={customTask}
              onChangeText={setCustomTask}
            />
            <TouchableOpacity
              style={styles.micBtn}
              onPress={() => Alert.alert('Voice input', 'Voice input is coming soon.')}
              activeOpacity={0.7}
            >
              <SvgXml width={20} height={20} xml={addTaskMicrophoneSvg} />
            </TouchableOpacity>
          </View>

          {/* Repeat */}
          <Text style={styles.sectionHeading}>Repeat</Text>
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
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Add Instruction */}
          <Text style={styles.sectionHeading}>Add Instruction</Text>
          <TextInput
            style={styles.instructionTextarea}
            placeholder="Write task instructions..."
            placeholderTextColor="#A39E99"
            value={instruction}
            onChangeText={setInstruction}
            multiline
            textAlignVertical="top"
          />

          {/* Set Time */}
          <Text style={styles.sectionHeading}>Set Time</Text>
          <View style={styles.timeInputsRow}>
            <View style={styles.timeInputCol}>
              <Text style={styles.timeInputLabel}>Work Start</Text>
              <TextInput
                style={styles.timeInputBox}
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>
            <View style={styles.timeInputCol}>
              <Text style={styles.timeInputLabel}>Work End</Text>
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
          onPress={handleUpdate}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>Update Task</Text>
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
