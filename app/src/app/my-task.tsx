import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetTasksQuery,
  useToggleTaskMutation,
  useDeleteTaskMutation,
  Task,
} from '@/store/tasksApi';
import { RowSkeleton } from '@/components/ui/skeleton';

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTaskTime(scheduledTime?: string): string {
  if (!scheduledTime) return '07:00 PM';
  try {
    return new Date(scheduledTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '07:00 PM';
  }
}

function parseEndTime(detail?: string): string {
  if (!detail) return '—';
  const match = detail.match(/-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  return match ? match[1] : '—';
}

function parseInstruction(detail?: string): string {
  if (!detail) return '';
  const match = detail.match(/Instruction:\s*(.+)$/i);
  return match ? match[1].trim() : '';
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function MyTaskScreen() {
  const router = useRouter();
  const { data: tasks = [], isLoading: isTasksLoading } = useGetTasksQuery(todayDateKey());
  const [toggleTaskMutation] = useToggleTaskMutation();
  const [deleteTaskMutation] = useDeleteTaskMutation();

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const pendingTasks = tasks.filter((t) => !t.isDone);
  const completedTasks = tasks.filter((t) => t.isDone);

  const filteredTasks =
    activeFilter === 'pending'
      ? pendingTasks
      : activeFilter === 'completed'
      ? completedTasks
      : tasks;

  async function handleToggleDone(id: number) {
    try {
      await toggleTaskMutation(String(id)).unwrap();
    } catch (err) {
      console.log('Error toggling task:', err);
    }
  }

  async function confirmDelete() {
    if (!taskToDelete) return;
    try {
      await deleteTaskMutation(String(taskToDelete.id)).unwrap();
    } catch (err) {
      console.log('Error deleting task:', err);
    } finally {
      setTaskToDelete(null);
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
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Task</Text>

        <TouchableOpacity
          style={styles.headerSquareBtn}
          onPress={() => router.push('/add-task')}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Date & Weather Card */}
        <View style={styles.dateWeatherCard}>
          <View style={styles.dateWeatherLeft}>
            <View style={styles.calendarCircle}>
              <Ionicons name="calendar-outline" size={18} color="#2B6CB0" />
            </View>
            <Text style={styles.dateText}>{formatTodayDate()}</Text>
          </View>
          <View style={styles.weatherRight}>
            <Text style={styles.weatherIcon}>⛅</Text>
            <Text style={styles.tempText}>—°C</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}>
              All Tasks ({tasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'pending' && styles.filterPillActive]}
            onPress={() => setActiveFilter('pending')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'pending' && styles.filterPillTextActive]}>
              Pending ({pendingTasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'completed' && styles.filterPillActive]}
            onPress={() => setActiveFilter('completed')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'completed' && styles.filterPillTextActive]}>
              Completed ({completedTasks.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Task Button */}
        <TouchableOpacity
          style={styles.addMainTaskBtn}
          onPress={() => router.push('/add-task')}
          activeOpacity={0.85}
        >
          <Text style={styles.addMainTaskBtnText}>Add Task</Text>
        </TouchableOpacity>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>
          {activeFilter === 'all'
            ? 'All Tasks'
            : activeFilter === 'pending'
            ? 'Pending Tasks'
            : 'Completed Tasks'}
        </Text>

        {/* Task Cards or Empty State */}
        {isTasksLoading ? (
          <View style={{ gap: 12 }}>
            <RowSkeleton />
            <RowSkeleton />
          </View>
        ) : filteredTasks.length === 0 ? (
          /* Empty State Matching Screenshot 2 */
          <View style={styles.emptyCardContainer}>
            <View style={styles.emptyIconBadge}>
              <Ionicons name="calendar-outline" size={32} color="#BD632F" />
            </View>
            <Text style={styles.emptyTitle}>Schedule New Task</Text>
            <Text style={styles.emptySubtitle}>You have no Task for Today</Text>

            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => router.push('/add-task')}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyAddBtnText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTasks.map((task) => (
            <View
              key={task.id}
              style={[
                styles.taskCard,
                task.isDone ? styles.taskCardDone : styles.taskCardPending,
              ]}
            >
              {/* Top Row */}
              <View style={styles.taskCardTopRow}>
                <View style={styles.taskTitleContainer}>
                  <View style={styles.taskTypeBadge}>
                    <Text style={styles.badgeEmoji}>
                      {task.title.toLowerCase().includes('water')
                        ? '💧'
                        : task.title.toLowerCase().includes('feed')
                        ? '🌾'
                        : task.title.toLowerCase().includes('clean')
                        ? '🧹'
                        : task.title.toLowerCase().includes('vaccin')
                        ? '💉'
                        : '📋'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskCardTitle, task.isDone && styles.taskCardTitleDone]}>
                      {task.title}
                    </Text>
                    <Text style={styles.taskCardSpec}>
                      {task.detail || 'Cow Shed'}
                    </Text>
                  </View>
                </View>

                {/* Right Action */}
                {task.isDone ? (
                  <View style={styles.checkDoneCircle}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.trashBtn}
                    onPress={() => setTaskToDelete(task)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={20} color="#E53935" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Time Row */}
              <View style={styles.timeRow}>
                <View style={styles.timeCol}>
                  <Ionicons name="calendar-outline" size={14} color="#BD7D5B" />
                  <Text style={styles.timeLabel}>Work Start </Text>
                  <Text style={styles.timeVal}>{formatTaskTime(task.scheduledTime)}</Text>
                </View>
                <View style={styles.timeDividerVertical} />
                <View style={styles.timeCol}>
                  <Ionicons name="calendar-outline" size={14} color="#BD7D5B" />
                  <Text style={styles.timeLabel}>Work End </Text>
                  <Text style={styles.timeVal}>{parseEndTime(task.detail)}</Text>
                </View>
              </View>

              {/* Description */}
              {parseInstruction(task.detail) ? (
                <Text style={styles.taskDescription}>
                  {parseInstruction(task.detail)}
                </Text>
              ) : null}

              {/* Card Action Buttons for Pending Task */}
              {!task.isDone && (
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.markDoneBtn}
                    onPress={() => handleToggleDone(task.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.markDoneBtnText}>Mark Done</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.editTaskBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/edit-task',
                        params: { id: String(task.id), title: task.title, detail: task.detail, scheduledTime: task.scheduledTime },
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.editTaskBtnText}>Edit Task</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        visible={!!taskToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setTaskToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.deleteModalIconCircle}>
              <Ionicons name="trash-outline" size={28} color="#E53935" />
            </View>
            <Text style={styles.modalTitle}>Delete Task?</Text>
            <Text style={styles.modalMessage}>
              Are you really sure you want to delete &quot;{taskToDelete?.title}&quot;? This action cannot be undone.
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTaskToDelete(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>Yes, Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  dateWeatherCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EDF4FE',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  dateWeatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D4E2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  weatherRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weatherIcon: {
    fontSize: 18,
  },
  tempText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  filterPill: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {
    borderColor: '#BD632F',
    backgroundColor: '#FFF8F4',
    borderWidth: 1.5,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C7672',
  },
  filterPillTextActive: {
    color: '#BD632F',
    fontWeight: '700',
  },
  addMainTaskBtn: {
    backgroundColor: '#BD632F',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#BD632F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  addMainTaskBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 14,
  },
  emptyCardContainer: {
    backgroundColor: '#FFFDFB',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 28,
    alignItems: 'center',
    marginVertical: 10,
  },
  emptyIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#7C7672',
    marginBottom: 20,
  },
  emptyAddBtn: {
    backgroundColor: '#803D16',
    borderRadius: 14,
    height: 44,
    paddingHorizontal: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardPending: {
    borderColor: '#FCD2C1',
  },
  taskCardDone: {
    borderColor: '#C8E6C9',
  },
  taskCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  taskTypeBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeEmoji: {
    fontSize: 20,
  },
  taskCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 2,
  },
  taskCardTitleDone: {
    textDecorationLine: 'line-through',
    color: '#9C9690',
  },
  taskCardSpec: {
    fontSize: 12,
    color: '#7C7672',
  },
  checkDoneCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  timeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  timeLabel: {
    fontSize: 11,
    color: '#7C7672',
    fontWeight: '500',
  },
  timeVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1817',
  },
  timeDividerVertical: {
    width: 1,
    height: 16,
    backgroundColor: '#E6E1DC',
    marginHorizontal: 8,
  },
  taskDescription: {
    fontSize: 12.5,
    color: '#7C7672',
    lineHeight: 18,
    marginBottom: 16,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  markDoneBtn: {
    flex: 1,
    backgroundColor: '#BD632F',
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  editTaskBtn: {
    flex: 1,
    backgroundColor: '#F5F2EC',
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editTaskBtnText: {
    color: '#1A1817',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  deleteModalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 13.5,
    color: '#7C7672',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F5F2EC',
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1817',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#E53935',
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
