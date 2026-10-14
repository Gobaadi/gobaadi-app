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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SvgXml } from 'react-native-svg';
import {
  useGetTasksQuery,
  useToggleTaskMutation,
  useDeleteTaskMutation,
  Task,
} from '@/store/tasksApi';
import { useGetWeatherQuery } from '@/store/weatherApi';
import { useLocation } from '@/hooks/use-location';
import { RowSkeleton } from '@/components/ui/skeleton';
import { formatLocalDateKey, localDateKey, formatTime12h } from '@/utils/date';
import { apiErrorMessage } from '@/utils/api-error';
import {
  backButtonSvg,
  myTaskCalendarSvg,
  myTaskBlueCalendarSvg,
  myTaskCardCalendarSvg,
  myTaskCheckMarkSvg,
  myTaskDeleteMarkSvg,
  morningFeedSvg,
  waterSupplyCheckSvg,
  addTaskCalendarSvg,
  addTaskCleaningSvg,
  addTaskVaccinationSvg,
  addTaskHealthCheckSvg,
} from '@/components/icons/svg-icon-sources';

function taskBadgeSvg(title: string): string | null {
  const lower = title.toLowerCase();
  if (lower.includes('water')) return waterSupplyCheckSvg;
  if (lower.includes('feed')) return morningFeedSvg;
  if (lower.includes('clean')) return addTaskCleaningSvg;
  if (lower.includes('vaccin')) return addTaskVaccinationSvg;
  if (lower.includes('health')) return addTaskHealthCheckSvg;
  return null;
}

function taskBadgeBg(title: string): string {
  return title.toLowerCase().includes('water') ? '#EAF2FF' : '#FFF2EB';
}

function parseFarm(detail?: string): string {
  if (!detail) return '';
  return detail.split('•')[0].trim();
}

function formatTaskTime(scheduledTime?: string): string {
  if (!scheduledTime) return '07:00 PM';
  return formatTime12h(scheduledTime) || '07:00 PM';
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

function formatTodayDate(dateKey: string): string {
  return formatLocalDateKey(dateKey);
}

export default function MyTaskScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const rawDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const listDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : localDateKey();
  const { data: tasks = [], isLoading: isTasksLoading } = useGetTasksQuery(listDate);
  const [toggleTaskMutation] = useToggleTaskMutation();
  const [deleteTaskMutation] = useDeleteTaskMutation();

  const { location } = useLocation();
  const zila = location.split(',').map((part) => part.trim()).filter(Boolean).pop();
  const { data: weather } = useGetWeatherQuery(zila);

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      Alert.alert(t('myTask.alerts.updateFailed'), apiErrorMessage(err, t('myTask.alerts.tryAgain')));
    }
  }

  async function confirmDelete() {
    if (!taskToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteTaskMutation(String(taskToDelete.id)).unwrap();
      setTaskToDelete(null);
    } catch (err) {
      console.log('Error deleting task:', err);
      Alert.alert(t('myTask.alerts.deleteFailed'), apiErrorMessage(err, t('myTask.alerts.tryAgain')));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerSquareBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <SvgXml width={20} height={20} xml={backButtonSvg} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t('myTask.title')}</Text>
        </View>

        <TouchableOpacity
          style={styles.headerSquareBtn}
          onPress={() => router.push('/add-task')}
          activeOpacity={0.8}
        >
          <SvgXml width={20} height={20} xml={myTaskCalendarSvg} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Date & Weather Card */}
        <View style={styles.dateWeatherCard}>
          <View style={styles.dateWeatherLeft}>
            <View style={styles.calendarCircle}>
              <SvgXml width={18} height={18} xml={myTaskBlueCalendarSvg} />
            </View>
            <Text style={styles.dateText}>{formatTodayDate(listDate)}</Text>
          </View>
          <View style={styles.weatherRight}>
            <Text style={styles.weatherIcon}>⛅</Text>
            <Text style={styles.tempText}>
              {weather ? `${Math.round(weather.temperature)}°C` : '—°C'}
            </Text>
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
              {t('myTask.filters.all', { count: tasks.length })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'pending' && styles.filterPillActive]}
            onPress={() => setActiveFilter('pending')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'pending' && styles.filterPillTextActive]}>
              {t('myTask.filters.pending', { count: pendingTasks.length })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'completed' && styles.filterPillActive]}
            onPress={() => setActiveFilter('completed')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'completed' && styles.filterPillTextActive]}>
              {t('myTask.filters.completed', { count: completedTasks.length })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Task Button */}
        <TouchableOpacity
          style={styles.addMainTaskBtn}
          onPress={() => router.push('/add-task')}
          activeOpacity={0.85}
        >
          <Text style={styles.addMainTaskBtnText}>{t('myTask.addTask')}</Text>
        </TouchableOpacity>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>
          {activeFilter === 'all'
            ? t('myTask.sections.all')
            : activeFilter === 'pending'
            ? t('myTask.sections.pending')
            : t('myTask.sections.completed')}
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
              <SvgXml width={48} height={48} xml={addTaskCalendarSvg} />
            </View>
            <Text style={styles.emptyTitle}>{t('myTask.empty.title')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('myTask.empty.subtitle', {
                date: listDate === localDateKey() ? t('myTask.today') : formatLocalDateKey(listDate),
              })}
            </Text>

            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => router.push('/add-task')}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyAddBtnText}>{t('myTask.addTask')}</Text>
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
                  <View style={[styles.taskTypeBadge, { backgroundColor: taskBadgeBg(task.title) }]}>
                    {taskBadgeSvg(task.title) ? (
                      <SvgXml width={24} height={24} xml={taskBadgeSvg(task.title) as string} />
                    ) : (
                      <Text style={styles.badgeEmoji}>📋</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskCardTitle}>{task.title}</Text>
                    <Text style={styles.taskCardSpec}>
                      {parseFarm(task.detail) || t('myTask.cowShed')}
                    </Text>
                  </View>
                </View>

                {/* Right Action */}
                {task.isDone ? (
                  <View style={styles.checkDoneCircle}>
                    <SvgXml width={18} height={15} xml={myTaskCheckMarkSvg} />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.trashBtn}
                    onPress={() => setTaskToDelete(task)}
                    activeOpacity={0.7}
                  >
                    <SvgXml width={20} height={20} xml={myTaskDeleteMarkSvg} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Time Row */}
              <View style={styles.timeRow}>
                <View style={styles.timeGroup}>
                  <View style={styles.timeIconCircle}>
                    <SvgXml width={16} height={16} xml={myTaskCardCalendarSvg} />
                  </View>
                  <View style={styles.timeTextCol}>
                    <Text style={styles.timeLabel}>{t('myTask.workStart')}</Text>
                    <Text style={styles.timeVal}>{formatTaskTime(task.scheduledTime)}</Text>
                  </View>
                </View>
                <View style={styles.timeDividerVertical} />
                <View style={styles.timeGroup}>
                  <View style={styles.timeIconCircle}>
                    <SvgXml width={16} height={16} xml={myTaskCardCalendarSvg} />
                  </View>
                  <View style={styles.timeTextCol}>
                    <Text style={styles.timeLabel}>{t('myTask.workEnd')}</Text>
                    <Text style={styles.timeVal}>{parseEndTime(task.detail)}</Text>
                  </View>
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
                <>
                  <View style={styles.cardDivider} />
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.markDoneBtn}
                      onPress={() => handleToggleDone(task.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.markDoneBtnText}>{t('myTask.markDone')}</Text>
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
                      <Text style={styles.editTaskBtnText}>{t('myTask.editTask')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
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
              <SvgXml width={26} height={26} xml={myTaskDeleteMarkSvg} />
            </View>
            <Text style={styles.modalTitle}>{t('myTask.deleteModal.title')}</Text>
            <Text style={styles.modalMessage}>
              {t('myTask.deleteModal.message', { title: taskToDelete?.title ?? '' })}
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTaskToDelete(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>{t('myTask.deleteModal.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, isDeleting && { opacity: 0.6 }]}
                onPress={confirmDelete}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>
                  {isDeleting ? t('myTask.deleteModal.deleting') : t('myTask.deleteModal.confirm')}
                </Text>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    borderRadius: 18,
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
    borderColor: '#E6E1DC',
  },
  taskCardDone: {
    borderColor: '#BD632F',
    borderWidth: 1.5,
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
  taskCardSpec: {
    fontSize: 12,
    color: '#7C7672',
  },
  checkDoneCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#BD632F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F2EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  timeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F2EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeTextCol: {
    justifyContent: 'center',
  },
  timeLabel: {
    fontSize: 11,
    color: '#7C7672',
    fontWeight: '500',
    marginBottom: 2,
  },
  timeVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1817',
  },
  timeDividerVertical: {
    width: 1,
    height: 36,
    backgroundColor: '#E6E1DC',
    marginHorizontal: 8,
  },
  taskDescription: {
    fontSize: 12.5,
    color: '#7C7672',
    lineHeight: 18,
    marginBottom: 0,
  },
  cardDivider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E0DAD3',
    marginTop: 12,
    marginBottom: 12,
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
