import React, { useState, useMemo, useCallback } from 'react';
import { useRequireDoctor } from '@/hooks/use-require-doctor';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetMyDoctorProfileQuery } from '@/store/doctorPortalApi';
import {
  useGetBlockTimesQuery,
  useCreateBlockTimeMutation,
  useRemoveBlockTimeMutation,
} from '@/store/blockTimesApi';
import type {
  BlockTime,
  BlockTimeBilling,
  BlockTimeConflict,
  BlockTimeConflictPayload,
  CreateBlockTimeResult,
} from '@/store/blockTimesApi';
import { useTranslation } from '@/hooks/use-translation';
import i18n from '@/i18n';

const REASONS = ['vacation', 'sick_leave', 'conference_training', 'emergency', 'other'];

type Step = 'form' | 'warning' | 'confirmation' | 'confirmed';

function parseConflictPayload(err: any): BlockTimeConflictPayload | null {
  const payload = err?.data?.conflicts
    ? err.data
    : err?.data?.message?.conflicts
    ? err.data.message
    : null;
  return payload?.conflicts ? payload : null;
}

function errorMessage(err: any): string | null {
  const raw = err?.data?.message;
  if (typeof raw === 'string' && raw) return raw;
  if (Array.isArray(raw) && raw.length > 0) return String(raw[0]);
  return null;
}

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateISO(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${i18n.t(`blockTime.months.${MONTH_KEYS[m - 1]}`)}, ${y}`;
}

function isDateInRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

function isPastDate(year: number, month: number, day: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(year, month, day);
  return date < today;
}

function getBlockedDatesForMonth(blockTimes: BlockTime[], year: number, month: number): Set<string> {
  const blocked = new Set<string>();
  const monthStart = formatDateISO(year, month, 1);
  const monthEnd = formatDateISO(year, month, getDaysInMonth(year, month));

  for (const bt of blockTimes) {
    const btStart = bt.startDate < monthStart ? monthStart : bt.startDate;
    const btEnd = bt.endDate > monthEnd ? monthEnd : bt.endDate;

    if (btStart <= btEnd) {
      const startParts = btStart.split('-').map(Number);
      const endParts = btEnd.split('-').map(Number);
      const startDay = startParts[2];
      const endDay = endParts[2];

      for (let d = startDay; d <= endDay; d++) {
        blocked.add(formatDateISO(year, month, d));
      }
    }
  }
  return blocked;
}

export default function BlockTimeOffScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDoctor = useRequireDoctor();

  const { data: profile } = useGetMyDoctorProfileQuery();
  const doctorId = profile?.id;

  const { data: blockTimes = [] } = useGetBlockTimesQuery(
    String(doctorId),
    { skip: !doctorId }
  );

  const [createBlockTime, { isLoading: creating }] = useCreateBlockTimeMutation();
  const [removeBlockTime, { isLoading: removing }] = useRemoveBlockTimeMutation();

  const [step, setStep] = useState<Step>('form');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [note, setNote] = useState('');
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [conflicts, setConflicts] = useState<BlockTimeConflict[]>([]);
  const [estimatedDeduction, setEstimatedDeduction] = useState(0);
  const [billing, setBilling] = useState<BlockTimeBilling | null>(null);
  const [showBilling, setShowBilling] = useState(false);
  const [blockResult, setBlockResult] = useState<CreateBlockTimeResult | null>(null);

  const today = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, []);

  const [startCalMonth, setStartCalMonth] = useState(today.month);
  const [startCalYear, setStartCalYear] = useState(today.year);
  const [endCalMonth, setEndCalMonth] = useState(today.month);
  const [endCalYear, setEndCalYear] = useState(today.year);

  const startCalBlocked = useMemo(
    () => getBlockedDatesForMonth(blockTimes, startCalYear, startCalMonth),
    [blockTimes, startCalYear, startCalMonth]
  );

  const endCalBlocked = useMemo(
    () => getBlockedDatesForMonth(blockTimes, endCalYear, endCalMonth),
    [blockTimes, endCalYear, endCalMonth]
  );

  const navigateMonth = useCallback(
    (direction: 'prev' | 'next', target: 'start' | 'end') => {
      const setter = target === 'start'
        ? { month: setStartCalMonth, year: setStartCalYear }
        : { month: setEndCalMonth, year: setEndCalYear };
      const getMonth = target === 'start' ? startCalMonth : endCalMonth;
      const getYear = target === 'start' ? startCalYear : endCalYear;

      if (direction === 'next') {
        if (getMonth === 11) {
          setter.month(0);
          setter.year(getYear + 1);
        } else {
          setter.month(getMonth + 1);
        }
      } else {
        if (getMonth === today.month && getYear === today.year) return;
        if (getMonth === 0) {
          setter.month(11);
          setter.year(getYear - 1);
        } else {
          setter.month(getMonth - 1);
        }
      }
    },
    [startCalMonth, startCalYear, endCalMonth, endCalYear, today]
  );

  const canNavigatePrev = startCalMonth !== today.month || startCalYear !== today.year;

  if (!isDoctor) return null;

  const renderCalendar = (
    calYear: number,
    calMonth: number,
    blockedDates: Set<string>,
    target: 'start' | 'end',
    showCalendar: boolean
  ) => {
    if (!showCalendar) return null;

    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfWeek(calYear, calMonth);

    return (
      <View style={styles.miniCalendar}>
        <View style={styles.calHeader}>
          <TouchableOpacity
            onPress={() => navigateMonth('prev', target)}
            activeOpacity={0.7}
            disabled={target === 'start' && !canNavigatePrev}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={target === 'start' && !canNavigatePrev ? '#E6E1DC' : '#BD632F'}
            />
          </TouchableOpacity>
          <Text style={styles.calMonth}>{t(`blockTime.months.${MONTH_KEYS[calMonth]}`)} {calYear}</Text>
          <TouchableOpacity onPress={() => navigateMonth('next', target)} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={18} color="#BD632F" />
          </TouchableOpacity>
        </View>
        <View style={styles.calDayHeader}>
          {DAY_KEYS.map((d) => (
            <Text key={d} style={styles.calDayText}>{t(`blockTime.weekdays.${d}`)}</Text>
          ))}
        </View>
        <View style={styles.calDays}>
          {Array.from({ length: firstDay }, (_, i) => (
            <View key={`empty-${i}`} style={styles.calDay} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = formatDateISO(calYear, calMonth, day);
            const blocked = blockedDates.has(dateStr);
            const past = isPastDate(calYear, calMonth, day);
            const selected = dateStr === startDate || dateStr === endDate;
            const inRange =
              startDate && endDate
                ? isDateInRange(dateStr, startDate, endDate)
                : false;

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.calDay,
                  blocked && styles.calDayBlocked,
                  past && styles.calDayDisabled,
                  selected && styles.calDaySelected,
                  inRange && !selected && styles.calDayInRange,
                ]}
                onPress={() => {
                  if (past || blocked) return;
                  if (target === 'start') {
                    setStartDate(dateStr);
                    setShowStartCalendar(false);
                    if (endDate && dateStr > endDate) setEndDate('');
                  } else {
                    if (startDate && dateStr < startDate) return;
                    setEndDate(dateStr);
                    setShowEndCalendar(false);
                  }
                }}
                activeOpacity={past || blocked ? 1 : 0.7}
                disabled={past || blocked}
              >
                <Text
                  style={[
                    styles.calDayNumber,
                    blocked && styles.calDayNumberBlocked,
                    past && styles.calDayNumberDisabled,
                    selected && styles.calDayNumberSelected,
                  ]}
                >
                  {day}
                </Text>
                {blocked && <View style={styles.blockedDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const applyConflictPayload = (payload: BlockTimeConflictPayload) => {
    setConflicts(payload.conflicts);
    setEstimatedDeduction(payload.estimatedWalletDeduction ?? 0);
    setBilling(payload.billing ?? null);
    setShowBilling(false);
  };

  const handleContinue = async () => {
    if (!doctorId || !startDate || !endDate || !selectedReason) return;

    try {
      await createBlockTime({
        id: doctorId,
        data: {
          startDate,
          endDate,
          reason: selectedReason as any,
          note: note || undefined,
          force: false,
        },
      }).unwrap();
      setBlockResult(null);
      setStep('confirmed');
    } catch (err: any) {
      const payload409 = parseConflictPayload(err);
      if (err?.status === 409 && payload409) {
        applyConflictPayload(payload409);
        setStep('warning');
      } else if (err?.status === 409) {
        Alert.alert(
          t('blockTime.alerts.conflictTitle'),
          t('blockTime.alerts.conflictMsg'),
        );
      } else {
        Alert.alert(t('blockTime.title'), errorMessage(err) || t('blockTime.errors.generic'));
      }
    }
  };

  const handleWarningConfirm = () => {
    setStep('confirmation');
  };

  const handleFinalConfirm = async () => {
    if (!doctorId || !startDate || !endDate || !selectedReason) return;

    try {
      const result = await createBlockTime({
        id: doctorId,
        data: {
          startDate,
          endDate,
          reason: selectedReason as any,
          note: note || undefined,
          force: true,
        },
      }).unwrap();
      setBlockResult(result);
      setStep('confirmed');
    } catch (err: any) {
      const payload409 = parseConflictPayload(err);
      if (err?.status === 409 && payload409) {
        applyConflictPayload(payload409);
        setStep('warning');
      } else {
        Alert.alert(t('blockTime.title'), errorMessage(err) || t('blockTime.errors.generic'));
      }
    }
  };

  const handleRemoveBlock = async (blockId: number) => {
    if (!doctorId) return;
    Alert.alert(t('blockTime.remove.title'), t('blockTime.remove.msg'), [
      { text: t('blockTime.actions.cancel'), style: 'cancel' },
      {
        text: t('blockTime.actions.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeBlockTime({ id: doctorId, blockId }).unwrap();
          } catch {}
        },
      },
    ]);
  };

  if (step === 'confirmed') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('blockTime.confirmed.header')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.confirmedContent}>
          <View style={styles.confirmedCircle}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.confirmedTitle}>{t('blockTime.confirmed.title')}</Text>
          <Text style={styles.confirmedDate}>
            {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
          </Text>
          <Text style={styles.confirmedSubtitle}>{t('blockTime.confirmed.subtitle')}</Text>

          {blockResult?.billing && blockResult.billing.totalFee > 0 && (
            <View style={styles.billingSection}>
              <Text style={styles.billingTitle}>{t('blockTime.billing.title')}</Text>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>{t('blockTime.billing.bookingTimeOff')}</Text>
                <Text style={styles.billingValue}>
                  {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
                </Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>{t('blockTime.billing.reason')}</Text>
                <Text style={styles.billingValue}>{t(`blockTime.reasons.${selectedReason}`, { defaultValue: selectedReason })}</Text>
              </View>
              <View style={styles.billingDivider} />
              <Text style={styles.feesTitle}>{t('blockTime.billing.feesTitle')}</Text>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>{t('blockTime.billing.appointmentsFee')}</Text>
                <Text style={styles.billingValue}>
                  ৳ {blockResult.billing.appointmentsFeeTotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>{t('blockTime.billing.cancellationFee')}</Text>
                <Text style={styles.billingValue}>
                  ৳ {blockResult.billing.cancellationFeesTotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.billingDivider} />
              <View style={styles.billingRow}>
                <Text style={styles.totalLabel}>{t('blockTime.billing.totalFees')}</Text>
                <Text style={styles.totalValue}>
                  ৳ {blockResult.billing.totalFee.toFixed(2)}
                </Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>{t('blockTime.billing.status')}</Text>
                <Text style={styles.paidText}>{blockResult.billing.status}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.viewCalendarBtn}
            onPress={() => {
              router.dismissAll();
              router.navigate('/doctor-bookings');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.viewCalendarBtnText}>{t('blockTime.actions.viewCalendar')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>{t('blockTime.actions.done')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'confirmation') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('form')} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('blockTime.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.sectionTitle}>{t('blockTime.cancelled.title')}</Text>

          {conflicts.map((appt) => {
            const apptDate = new Date(appt.startAt);
            const dateStr = apptDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            const timeStr = apptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            return (
              <View key={appt.id} style={styles.cancelledCard}>
                <View style={styles.cancelledAvatar}>
                  <Ionicons name="paw" size={20} color="#BD632F" />
                </View>
                <View style={styles.cancelledInfo}>
                  <Text style={styles.cancelledName}>
                    {appt.animalName || t('blockTime.cancelled.appointmentFallback', { id: appt.id })}
                  </Text>
                  {appt.ownerName ? (
                    <Text style={styles.cancelledOwner}>{t('blockTime.cancelled.owner', { name: appt.ownerName })}</Text>
                  ) : null}
                  <Text style={styles.cancelledDateTime}>
                    <Ionicons name="calendar-outline" size={12} color="#9C9690" /> {dateStr} · {timeStr}
                  </Text>
                  {appt.price > 0 && (
                    <Text style={styles.cancelledOwner}>৳ {appt.price.toFixed(2)}</Text>
                  )}
                </View>
                <View style={styles.cancelledBadge}>
                  <Text style={styles.cancelledBadgeText}>{t('blockTime.cancelled.badge')}</Text>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.walletSection}
            onPress={() => setShowBilling((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={styles.walletHeader}>
              <Ionicons name="wallet-outline" size={18} color="#BD632F" />
              <Text style={styles.walletLabel}>{t('blockTime.billing.walletDeduction')}</Text>
            </View>
            <View style={styles.walletRight}>
              <Text style={styles.walletAmount}>৳ {estimatedDeduction.toFixed(2)}</Text>
              <Ionicons
                name={showBilling ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#7C7672"
              />
            </View>
          </TouchableOpacity>

          {showBilling && billing && (
            <View style={styles.billingSection}>
              <Text style={styles.billingTitle}>{t('blockTime.billing.title')}</Text>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>{t('blockTime.billing.bookingTimeOff')}</Text>
                <Text style={styles.billingValue}>
                  {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
                </Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>{t('blockTime.billing.reason')}</Text>
                <Text style={styles.billingValue}>{t(`blockTime.reasons.${selectedReason}`, { defaultValue: selectedReason })}</Text>
              </View>
              <View style={styles.billingDivider} />
              <Text style={styles.feesTitle}>{t('blockTime.billing.feesTitle')}</Text>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>{t('blockTime.billing.appointmentsFee')}</Text>
                <Text style={styles.billingValue}>
                  ৳ {billing.appointmentsFeeTotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>{t('blockTime.billing.cancellationFee')}</Text>
                <Text style={styles.billingValue}>
                  ৳ {billing.cancellationFeesTotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.billingDivider} />
              <View style={styles.billingRow}>
                <Text style={styles.totalLabel}>{t('blockTime.billing.totalFees')}</Text>
                <Text style={styles.totalValue}>৳ {billing.totalFee.toFixed(2)}</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>{t('blockTime.billing.status')}</Text>
                <Text
                  style={billing.status === 'Paid' ? styles.paidText : styles.pendingText}
                >
                  {billing.status}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color="#BD632F" />
            <Text style={styles.infoText}>
              {t('blockTime.confirmation.info')}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleFinalConfirm} activeOpacity={0.85}>
            {creating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmBtnText}>{t('blockTime.actions.confirm')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtnBottom} onPress={() => setStep('form')} activeOpacity={0.85}>
            <Text style={styles.backBtnText}>{t('blockTime.actions.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'warning') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('form')} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('blockTime.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <Modal transparent animationType="fade" visible={true} onRequestClose={() => setStep('form')}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setStep('form')} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#7C7672" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('blockTime.warning.title')}</Text>
              <Text style={styles.modalDescription}>
                {t('blockTime.warning.description', { count: conflicts.length })}
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setStep('form')} activeOpacity={0.85}>
                  <Text style={styles.modalBackBtnText}>{t('blockTime.actions.back')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleWarningConfirm} activeOpacity={0.85}>
                  <Text style={styles.modalConfirmBtnText}>{t('blockTime.actions.confirm')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('blockTime.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>{t('blockTime.fields.startDate')}</Text>
        <TouchableOpacity
          style={styles.dateDropdown}
          onPress={() => setShowStartCalendar(!showStartCalendar)}
          activeOpacity={0.7}
        >
          <Text style={[styles.dateText, !startDate && styles.datePlaceholder]}>
            {startDate ? formatDateDisplay(startDate) : t('blockTime.selectDate')}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#9C9690" />
        </TouchableOpacity>

        {renderCalendar(startCalYear, startCalMonth, startCalBlocked, 'start', showStartCalendar)}

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t('blockTime.fields.endDate')}</Text>
        <TouchableOpacity
          style={styles.dateDropdown}
          onPress={() => setShowEndCalendar(!showEndCalendar)}
          activeOpacity={0.7}
        >
          <Text style={[styles.dateText, !endDate && styles.datePlaceholder]}>
            {endDate ? formatDateDisplay(endDate) : t('blockTime.selectDate')}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#9C9690" />
        </TouchableOpacity>

        {renderCalendar(endCalYear, endCalMonth, endCalBlocked, 'end', showEndCalendar)}

        {startDate && endDate && (
          <View style={styles.dateRangeInfo}>
            <Ionicons name="information-circle-outline" size={16} color="#7C7672" />
            <Text style={styles.dateRangeText}>
              {t('blockTime.dateRange', { start: formatDateDisplay(startDate), end: formatDateDisplay(endDate) })}
            </Text>
          </View>
        )}

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t('blockTime.fields.reason')} <Text style={styles.required}>{t('blockTime.required')}</Text></Text>
        <View style={styles.reasonsCard}>
          {REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={styles.reasonRow}
              onPress={() => setSelectedReason(reason)}
              activeOpacity={0.7}
            >
              <View style={[styles.radio, selectedReason === reason && styles.radioSelected]}>
                {selectedReason === reason && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.reasonText}>{t(`blockTime.reasons.${reason}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t('blockTime.fields.note')} <Text style={styles.optional}>{t('blockTime.optional')}</Text></Text>
        <TextInput
          style={styles.noteInput}
          placeholder=""
          placeholderTextColor="#A39E99"
          value={note}
          onChangeText={setNote}
          multiline
        />

        {blockTimes.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>{t('blockTime.blockedPeriods')}</Text>
            {blockTimes.map((bt) => {
              const reasonLabel = bt.reason
                ? t(`blockTime.reasons.${bt.reason}`, { defaultValue: bt.reason })
                : t('blockTime.reasons.other');
              return (
                <View key={bt.id} style={styles.blockTimeCard}>
                  <View style={styles.blockTimeInfo}>
                    <Ionicons name="time-outline" size={18} color="#BD632F" />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.blockTimeDate}>
                        {formatDateDisplay(bt.startDate)} - {formatDateDisplay(bt.endDate)}
                      </Text>
                      <Text style={styles.blockTimeReason}>{reasonLabel}</Text>
                      {bt.note ? <Text style={styles.blockTimeNote}>{bt.note}</Text> : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveBlock(bt.id)}
                    disabled={removing}
                    activeOpacity={0.7}
                    style={styles.removeBlockBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#C62828" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#BD632F" />
          <Text style={styles.infoText}>
            {t('blockTime.formInfo')}
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.continueBtn, !(startDate && endDate && selectedReason) && styles.continueBtnDisabled]}
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={!startDate || !endDate || !selectedReason}
        >
          <Text style={styles.continueBtnText}>{t('blockTime.actions.continue')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1817' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#1A1817', marginBottom: 8 },
  required: { color: '#BD632F' },
  optional: { color: '#9C9690' },
  dateDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 16, height: 52 },
  dateText: { fontSize: 14, fontWeight: '500', color: '#1A1817' },
  datePlaceholder: { color: '#A39E99' },
  miniCalendar: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginTop: 8 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calMonth: { fontSize: 15, fontWeight: '700', color: '#1A1817' },
  calDayHeader: { flexDirection: 'row', marginBottom: 8 },
  calDayText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#9C9690' },
  calDays: { flexDirection: 'row', flexWrap: 'wrap' },
  calDay: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 6 },
  calDaySelected: { backgroundColor: '#BD632F', borderRadius: 16 },
  calDayInRange: { backgroundColor: '#FFF2EB' },
  calDayBlocked: { backgroundColor: '#FFEBEE', borderRadius: 16 },
  calDayDisabled: { opacity: 0.4 },
  calDayNumber: { fontSize: 13, fontWeight: '500', color: '#1A1817' },
  calDayNumberSelected: { color: '#FFFFFF', fontWeight: '700' },
  calDayNumberBlocked: { color: '#C62828', fontWeight: '600' },
  calDayNumberDisabled: { color: '#D1CCC8' },
  blockedDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C62828', marginTop: 2 },
  dateRangeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 4 },
  dateRangeText: { fontSize: 13, fontWeight: '500', color: '#7C7672' },
  reasonsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6E1DC', padding: 16 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#E6E1DC', justifyContent: 'center', alignItems: 'center' },
  radioSelected: { borderColor: '#BD632F' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#BD632F' },
  reasonText: { fontSize: 15, fontWeight: '500', color: '#1A1817' },
  noteInput: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 16, paddingVertical: 14, minHeight: 100, textAlignVertical: 'top', fontSize: 14, color: '#1A1817' },
  infoBanner: { flexDirection: 'row', backgroundColor: '#FFF2EB', borderRadius: 12, padding: 14, gap: 10, marginTop: 20 },
  infoText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#7C7672', lineHeight: 18 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FAF9F6', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 30 },
  continueBtn: { backgroundColor: '#BD632F', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  continueBtnDisabled: { backgroundColor: '#E6E1DC' },
  continueBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  modalContainer: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '100%' },
  modalCloseBtn: { alignSelf: 'flex-end', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1817', marginBottom: 12 },
  modalDescription: { fontSize: 14, fontWeight: '500', color: '#7C7672', lineHeight: 20, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBackBtn: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: '#E6E1DC', justifyContent: 'center', alignItems: 'center' },
  modalBackBtnText: { color: '#7C7672', fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, height: 48, borderRadius: 24, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  modalConfirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1817', marginBottom: 12 },
  cancelledCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 10, gap: 12 },
  cancelledAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF2EB', justifyContent: 'center', alignItems: 'center' },
  cancelledInfo: { flex: 1 },
  cancelledName: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  cancelledOwner: { fontSize: 12, color: '#7C7672', fontWeight: '500' },
  cancelledDateTime: { fontSize: 12, color: '#9C9690', fontWeight: '500', marginTop: 2 },
  cancelledBadge: { backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  cancelledBadgeText: { fontSize: 11, fontWeight: '600', color: '#C62828' },
  walletSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 16 },
  walletHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletLabel: { fontSize: 13, fontWeight: '600', color: '#1A1817' },
  walletAmount: { fontSize: 16, fontWeight: '800', color: '#BD632F' },
  billingSection: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 16, marginBottom: 16 },
  billingTitle: { fontSize: 16, fontWeight: '700', color: '#1A1817', marginBottom: 12 },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 6 },
  billingLabel: { fontSize: 13, color: '#7C7672', fontWeight: '500', flexShrink: 1 },
  billingValue: { fontSize: 13, fontWeight: '600', color: '#1A1817', flexShrink: 1, textAlign: 'right' },
  billingDivider: { height: 1, backgroundColor: '#E6E1DC', marginVertical: 8 },
  feesTitle: { fontSize: 14, fontWeight: '700', color: '#1A1817', marginBottom: 8 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  totalValue: { fontSize: 14, fontWeight: '800', color: '#1A1817' },
  paidText: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
  pendingText: { fontSize: 13, fontWeight: '600', color: '#BD632F' },
  confirmBtn: { backgroundColor: '#BD632F', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  backBtnBottom: { height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: '#E6E1DC', justifyContent: 'center', alignItems: 'center' },
  backBtnText: { color: '#7C7672', fontSize: 16, fontWeight: '600' },
  confirmedContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 120 },
  confirmedCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  confirmedTitle: { fontSize: 20, fontWeight: '700', color: '#1A1817', marginBottom: 8 },
  confirmedDate: { fontSize: 14, fontWeight: '600', color: '#BD632F', marginBottom: 8 },
  confirmedSubtitle: { fontSize: 14, fontWeight: '500', color: '#7C7672', textAlign: 'center' },
  viewCalendarBtn: { backgroundColor: '#BD632F', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  viewCalendarBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  doneBtn: { height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: '#E6E1DC', justifyContent: 'center', alignItems: 'center' },
  doneBtnText: { color: '#7C7672', fontSize: 16, fontWeight: '600' },
  blockTimeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 10, gap: 12 },
  blockTimeInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  blockTimeDate: { fontSize: 14, fontWeight: '600', color: '#1A1817' },
  blockTimeReason: { fontSize: 12, color: '#7C7672', fontWeight: '500', marginTop: 2 },
  blockTimeNote: { fontSize: 12, color: '#9C9690', fontWeight: '400', marginTop: 2 },
  removeBlockBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
});
