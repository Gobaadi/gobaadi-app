import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from '@/hooks/use-translation';

export interface MonthYearPickerModalProps {
  visible: boolean;
  title: string;
  month?: string;
  year?: string;
  months: string[];
  years: string[];
  onConfirm: (month: string, year: string) => void;
  onClose: () => void;
}

/**
 * Two-column month/year picker. Replaces Alert-based pickers, which on
 * Android can render at most 3 buttons (so most options were unreachable).
 */
export function MonthYearPickerModal({
  visible,
  title,
  month,
  year,
  months,
  years,
  onConfirm,
  onClose,
}: MonthYearPickerModalProps) {
  const { t } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState(month ?? months[0] ?? '');
  const [selectedYear, setSelectedYear] = useState(year ?? years[0] ?? '');

  // Re-sync the selection when the modal opens. Done while rendering (not in an
  // effect) so the visible values never flash stale ones from a previous open.
  const [lastProps, setLastProps] = useState({ visible, month, year });
  if (lastProps.visible !== visible || lastProps.month !== month || lastProps.year !== year) {
    setLastProps({ visible, month, year });
    if (visible) {
      setSelectedMonth(month ?? months[0] ?? '');
      setSelectedYear(year ?? years[0] ?? '');
    }
  }

  const renderOption = (
    value: string,
    isSelected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={value}
      style={[styles.option, isSelected && styles.optionSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
        {value}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.columns}>
            <View style={styles.column}>
              <Text style={styles.columnLabel}>{t('monthPicker.month')}</Text>
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {months.map((m) =>
                  renderOption(m, m === selectedMonth, () => setSelectedMonth(m)),
                )}
              </ScrollView>
            </View>

            <View style={styles.column}>
              <Text style={styles.columnLabel}>{t('monthPicker.year')}</Text>
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {years.map((y) =>
                  renderOption(y, y === selectedYear, () => setSelectedYear(y)),
                )}
              </ScrollView>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>{t('monthPicker.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => onConfirm(selectedMonth, selectedYear)}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>{t('monthPicker.confirm')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 24, 23, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    width: '100%',
  },
  title: { fontSize: 16, fontWeight: '800', color: '#1A1817', marginBottom: 12 },
  columns: { flexDirection: 'row', gap: 12 },
  column: { flex: 1 },
  columnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9C9690',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  list: { maxHeight: 220 },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#F0ECE8',
  },
  optionSelected: { backgroundColor: '#FFF2EB', borderColor: '#BD632F' },
  optionText: { fontSize: 14, fontWeight: '600', color: '#7C7672' },
  optionTextSelected: { color: '#BD632F', fontWeight: '800' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E1DC',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#7C7672' },
  confirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#BD632F',
  },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

export default MonthYearPickerModal;
