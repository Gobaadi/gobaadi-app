import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/hooks/use-translation';
import {
  useLazySearchMedicinesQuery,
  type MedicineCatalogItem,
} from '@/store/medicinesApi';

export interface MedicationEntry {
  id: string;
  name: string;
  type: string;
  dosage: string;
  dosageUnit: string;
  frequency: string;
  duration: string;
  durationUnit: string;
  quantity: string;
  quantityUnit: string;
  isExpanded: boolean;
}

export interface PrescriptionFormData {
  medications: MedicationEntry[];
  instructions: string;
  note: string;
}

interface PrescriptionFormProps {
  onSend: (data: PrescriptionFormData) => void;
  sending?: boolean;
}

const DOSAGE_UNITS = ['ml', 'tablet', 'capsule', 'injection', 'bottle'];
const DURATION_UNITS = ['days', 'weeks'];
const QUANTITY_UNITS = ['vial', 'tablet', 'bottle', 'sachet'];
const FREQUENCY_OPTIONS = ['once', 'twice', 'thrice', 'q8h', 'q12h', 'asNeeded'];

/** Canonical English labels for frequency keys — used for the DB payload and
 *  the external PDF service (UI display goes through i18n instead). */
export const FREQUENCY_LABELS: Record<string, string> = {
  once: 'Once daily',
  twice: 'Twice daily',
  thrice: 'Thrice daily',
  q8h: 'Every 8 hours',
  q12h: 'Every 12 hours',
  asNeeded: 'As needed',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

type T = ReturnType<typeof useTranslation>['t'];

function translateFrequency(value: string, t: T): string {
  if (!value) return '';
  return (FREQUENCY_OPTIONS as string[]).includes(value)
    ? t(`prescription.frequencies.${value}`)
    : value;
}

function getMedicationSummary(med: MedicationEntry, t: T): string {
  if (!med.dosage || !med.frequency || !med.duration) return '';
  return `${med.dosage} ${t(`prescription.units.${med.dosageUnit}`)} · ${translateFrequency(med.frequency, t)} · ${med.duration} ${t(`prescription.units.${med.durationUnit}`)}`;
}

function createEmptyMedication(): MedicationEntry {
  return {
    id: generateId(),
    name: '',
    type: '',
    dosage: '',
    dosageUnit: 'ml',
    frequency: '',
    duration: '',
    durationUnit: 'days',
    quantity: '',
    quantityUnit: 'vial',
    isExpanded: true,
  };
}

function MedSummaryCard({ med, t }: { med: MedicationEntry; t: T }) {
  if (!getMedicationSummary(med, t)) return null;
  const cells: { label: string; value: string }[] = [
    {
      label: t('prescription.dosage'),
      value: `${med.dosage} ${t(`prescription.units.${med.dosageUnit}`)}`,
    },
    { label: t('prescription.frequency'), value: translateFrequency(med.frequency, t) },
    {
      label: t('prescription.duration'),
      value: `${med.duration} ${t(`prescription.units.${med.durationUnit}`)}`,
    },
  ];
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Ionicons name="medkit-outline" size={14} color="#BD632F" />
        <Text style={styles.summaryHeaderLabel}>{t('prescription.summaryTitle')}</Text>
      </View>
      <View style={styles.summaryRow}>
        {cells.map((cell) => (
          <View key={cell.label} style={styles.summaryCell}>
            <Text style={styles.summaryCellLabel} numberOfLines={1}>
              {cell.label}
            </Text>
            <Text style={styles.summaryCellValue} numberOfLines={1}>
              {cell.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryEmptyCard() {
  const { t } = useTranslation();
  return (
    <View style={styles.summaryEmptyCard}>
      <Text style={styles.noSummary}>{t('prescription.noSummary')}</Text>
    </View>
  );
}

interface PickerConfig {
  title: string;
  labelKind: 'unit' | 'frequency';
  options: string[];
  value: string;
  onSelect: (value: string) => void;
}

export default function PrescriptionForm({ onSend, sending }: PrescriptionFormProps) {
  const { t } = useTranslation();
  const [medications, setMedications] = useState<MedicationEntry[]>([
    createEmptyMedication(),
  ]);
  const [instructions, setInstructions] = useState('');
  const [note, setNote] = useState('');
  const [picker, setPicker] = useState<PickerConfig | null>(null);

  // Medication catalog search (debounced suggestions under the name input)
  const [fetchMedicines] = useLazySearchMedicinesQuery();
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestionState, setSuggestionState] = useState<{
    forId: string;
    items: MedicineCatalogItem[];
  } | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeSearch = useCallback(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setActiveSearchId(null);
    setSearchLoading(false);
    setSuggestionState(null);
  }, []);

  const runSearch = useCallback(
    (medId: string, raw: string) => {
      const q = raw.trim();
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (!q) {
        setSearchLoading(false);
        setSuggestionState(null);
        return;
      }
      setSearchLoading(true);
      searchDebounceRef.current = setTimeout(() => {
        searchDebounceRef.current = null;
        fetchMedicines(q)
          .unwrap()
          .then((items) => setSuggestionState({ forId: medId, items }))
          .catch(() => setSuggestionState({ forId: medId, items: [] }))
          .finally(() => setSearchLoading(false));
      }, 350);
    },
    [fetchMedicines],
  );

  useEffect(
    () => () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    },
    [],
  );

  const addMedication = useCallback(() => {
    closeSearch();
    setMedications((prev) => [
      ...prev.map((m) => ({ ...m, isExpanded: false })),
      createEmptyMedication(),
    ]);
  }, [closeSearch]);

  const removeMedication = useCallback(
    (id: string) => {
      if (activeSearchId === id) closeSearch();
      setMedications((prev) => prev.filter((m) => m.id !== id));
    },
    [activeSearchId, closeSearch],
  );

  const toggleExpand = useCallback(
    (id: string) => {
      if (activeSearchId === id) closeSearch();
      setMedications((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isExpanded: !m.isExpanded } : m))
      );
    },
    [activeSearchId, closeSearch],
  );

  const updateMedication = useCallback(
    (id: string, updates: Partial<MedicationEntry>) => {
      setMedications((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
      );
    },
    [],
  );

  const selectSuggestion = useCallback(
    (medId: string, item: MedicineCatalogItem) => {
      updateMedication(medId, {
        name: item.name,
        type: item.type,
        isExpanded: true,
      });
      closeSearch();
    },
    [updateMedication, closeSearch],
  );

  const openUnitPicker = (
    med: MedicationEntry,
    field: 'dosageUnit' | 'durationUnit' | 'quantityUnit',
    titleKey: string,
    options: string[],
  ) => {
    setPicker({
      title: t(titleKey),
      labelKind: 'unit',
      options,
      value: med[field],
      onSelect: (value) => updateMedication(med.id, { [field]: value }),
    });
  };

  const openFrequencyPicker = (med: MedicationEntry) => {
    setPicker({
      title: t('prescription.frequency'),
      labelKind: 'frequency',
      options: FREQUENCY_OPTIONS,
      value: med.frequency,
      onSelect: (value) => updateMedication(med.id, { frequency: value }),
    });
  };

  const pickerLabel = (config: PickerConfig, value: string): string =>
    config.labelKind === 'frequency'
      ? translateFrequency(value, t)
      : t(`prescription.units.${value}`);

  const handleSend = () => {
    if (sending) return;
    onSend({ medications, instructions, note });
  };

  const hasNamedMed = medications.some((m) => m.name.trim());

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {medications.map((med, index) => {
          const showSuggestions =
            activeSearchId === med.id &&
            (searchLoading ||
              (!!suggestionState && suggestionState.forId === med.id));

          return (
            <View key={med.id} style={styles.medicationBlock}>
              <View style={styles.medNameHeader}>
                <View style={styles.medBadge}>
                  <Text style={styles.medBadgeText}>{index + 1}</Text>
                </View>
                <Text style={styles.medNameLabel}>{t('prescription.medicationName')}</Text>
                {med.name ? (
                  <View style={styles.medActions}>
                    <TouchableOpacity
                      style={styles.medActionBtn}
                      onPress={() => toggleExpand(med.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={med.isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#7C7672"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.medActionBtn}
                      onPress={() => removeMedication(med.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={20} color="#E53935" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              <View
                style={[
                  styles.medCard,
                  med.name ? styles.medCardFilled : null,
                  !med.isExpanded && med.name ? styles.medCardCollapsed : null,
                ]}
              >
                <TextInput
                  style={styles.medNameInput}
                  placeholder={t('prescription.namePlaceholder')}
                  placeholderTextColor="#A39E99"
                  value={med.name}
                  onFocus={() => {
                    if (med.name.trim()) {
                      setActiveSearchId(med.id);
                      runSearch(med.id, med.name);
                    }
                  }}
                  onChangeText={(text) => {
                    updateMedication(med.id, { name: text, type: '' });
                    setActiveSearchId(med.id);
                    runSearch(med.id, text);
                  }}
                />

                {med.type ? <Text style={styles.medTypeText}>{med.type}</Text> : null}

                {showSuggestions && (
                  <View style={styles.suggestionsBox}>
                    {searchLoading && !suggestionState?.items.length ? (
                      <View style={styles.suggestionInfo}>
                        <ActivityIndicator size="small" color="#BD632F" />
                      </View>
                    ) : suggestionState?.items.length ? (
                      <ScrollView
                        style={styles.suggestionsScroll}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                      >
                        {suggestionState.items.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.suggestionRow}
                            activeOpacity={0.7}
                            onPress={() => selectSuggestion(med.id, item)}
                          >
                            <View style={styles.suggestionTextBlock}>
                              <Text style={styles.suggestionName} numberOfLines={1}>
                                {item.name}
                                {item.type ? (
                                  <Text style={styles.suggestionType}> · {item.type}</Text>
                                ) : null}
                              </Text>
                            </View>
                            <View style={styles.suggestionAddBtn}>
                              <Ionicons name="add" size={16} color="#FFFFFF" />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionEmpty}>
                          {t('prescription.searchNoResults')}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {med.isExpanded && med.name && (
                  <View style={styles.medFields}>
                    <Text style={styles.fieldLabel}>{t('prescription.dosage')}</Text>
                    <View style={styles.dosageRow}>
                      <TextInput
                        style={[styles.fieldInput, styles.dosageInput]}
                        placeholder="0"
                        placeholderTextColor="#A39E99"
                        keyboardType="numeric"
                        value={med.dosage}
                        onChangeText={(text) => updateMedication(med.id, { dosage: text })}
                      />
                      <TouchableOpacity
                        style={styles.unitDropdown}
                        activeOpacity={0.7}
                        onPress={() =>
                          openUnitPicker(med, 'dosageUnit', 'prescription.dosage', DOSAGE_UNITS)
                        }
                      >
                        <Text style={styles.unitText}>
                          {t(`prescription.units.${med.dosageUnit}`)}
                        </Text>
                        <Ionicons name="chevron-down" size={14} color="#9C9690" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.halfRow}>
                      <View style={styles.halfField}>
                        <Text style={styles.fieldLabel}>{t('prescription.frequency')}</Text>
                        <TouchableOpacity
                          style={[styles.fieldInput, styles.pickerField]}
                          activeOpacity={0.7}
                          onPress={() => openFrequencyPicker(med)}
                        >
                          <Text
                            style={[
                              styles.pickerValue,
                              !med.frequency && styles.pickerPlaceholder,
                            ]}
                            numberOfLines={1}
                          >
                            {med.frequency
                              ? translateFrequency(med.frequency, t)
                              : t('prescription.selectPlaceholder')}
                          </Text>
                          <Ionicons name="chevron-down" size={14} color="#9C9690" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.halfField}>
                        <Text style={styles.fieldLabel}>{t('prescription.duration')}</Text>
                        <View style={styles.durationRow}>
                          <TextInput
                            style={[styles.fieldInput, styles.durationInput]}
                            placeholder="0"
                            placeholderTextColor="#A39E99"
                            keyboardType="numeric"
                            value={med.duration}
                            onChangeText={(text) =>
                              updateMedication(med.id, { duration: text })
                            }
                          />
                          <TouchableOpacity
                            style={styles.inlineUnitBtn}
                            activeOpacity={0.7}
                            onPress={() =>
                              openUnitPicker(
                                med,
                                'durationUnit',
                                'prescription.duration',
                                DURATION_UNITS,
                              )
                            }
                          >
                            <Text style={styles.durationUnit}>
                              {t(`prescription.units.${med.durationUnit}`)}
                            </Text>
                            <Ionicons name="chevron-down" size={12} color="#9C9690" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.fieldLabel}>{t('prescription.quantity')}</Text>
                    <View style={styles.quantityRow}>
                      <TextInput
                        style={[styles.fieldInput, styles.quantityInput]}
                        placeholder="0"
                        placeholderTextColor="#A39E99"
                        keyboardType="numeric"
                        value={med.quantity}
                        onChangeText={(text) => updateMedication(med.id, { quantity: text })}
                      />
                      <TouchableOpacity
                        style={styles.inlineUnitBtn}
                        activeOpacity={0.7}
                        onPress={() =>
                          openUnitPicker(
                            med,
                            'quantityUnit',
                            'prescription.quantity',
                            QUANTITY_UNITS,
                          )
                        }
                      >
                        <Text style={styles.quantityUnit}>
                          {t(`prescription.units.${med.quantityUnit}`)}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color="#9C9690" />
                      </TouchableOpacity>
                    </View>

                    {getMedicationSummary(med, t) ? (
                      <MedSummaryCard med={med} t={t} />
                    ) : (
                      <SummaryEmptyCard />
                    )}
                  </View>
                )}
              </View>

              {!med.isExpanded && med.name && <MedSummaryCard med={med} t={t} />}
            </View>
          );
        })}

        {medications.length > 0 &&
          !medications.some((m) => m.isExpanded && m.name) && <SummaryEmptyCard />}

        <TouchableOpacity
          style={styles.addMedBtn}
          onPress={addMedication}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#BD632F" />
          <Text style={styles.addMedBtnText}>{t('prescription.addMedication')}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>{t('prescription.instructions')}</Text>
        <View style={styles.textareaContainer}>
          <TextInput
            style={styles.textarea}
            placeholder={t('prescription.instructionsPlaceholder')}
            placeholderTextColor="#A39E99"
            value={instructions}
            onChangeText={setInstructions}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{instructions.length}/500</Text>
        </View>

        <Text style={styles.sectionLabel}>{t('prescription.noteLabel')}</Text>
        <View style={styles.textareaContainer}>
          <TextInput
            style={styles.textarea}
            placeholder={t('prescription.instructionsPlaceholder')}
            placeholderTextColor="#A39E99"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{note.length}/500</Text>
        </View>
      </KeyboardAwareScrollView>

      <View style={styles.sendBtnContainer}>
        <TouchableOpacity
          style={[styles.sendBtn, (sending || !hasNamedMed) && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={sending || !hasNamedMed}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendBtnText}>{t('prescription.send')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!picker}
        transparent
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPicker(null)}
        >
          {picker && (
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.pickerSheet}>
                <View style={styles.pickerHandle} />
                <Text style={styles.pickerTitle}>{picker.title}</Text>
                <ScrollView style={styles.pickerOptions}>
                  {picker.options.map((option) => {
                    const isSelected = option === picker.value;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                        activeOpacity={0.7}
                        onPress={() => {
                          picker.onSelect(option);
                          setPicker(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerRowText,
                            isSelected && styles.pickerRowTextSelected,
                          ]}
                        >
                          {pickerLabel(picker, option)}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={18} color="#BD632F" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

  medicationBlock: { marginBottom: 16 },
  medNameHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  medBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  medBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  medNameLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1817' },
  medActions: { flexDirection: 'row', gap: 4 },
  medActionBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  medCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 12 },
  medCardFilled: { backgroundColor: '#F5F1EC', borderColor: '#F5F1EC', paddingTop: 8 },
  medCardCollapsed: { paddingBottom: 12 },
  medNameInput: { backgroundColor: 'transparent', paddingHorizontal: 0, height: 44, fontSize: 14, fontWeight: '600', color: '#1A1817' },
  medTypeText: { fontSize: 13, fontWeight: '500', color: '#7C7672', marginTop: -4, marginBottom: 4 },

  suggestionsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    marginTop: 6,
    overflow: 'hidden',
    zIndex: 10,
    elevation: 8,
    shadowColor: '#1A1817',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  suggestionsScroll: { maxHeight: 190 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0EBE5' },
  suggestionTextBlock: { flex: 1, marginRight: 10 },
  suggestionName: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  suggestionType: { fontSize: 13, fontWeight: '500', color: '#9C9690' },
  suggestionAddBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  suggestionInfo: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  suggestionEmpty: { fontSize: 13, fontWeight: '500', color: '#9C9690' },

  medFields: { marginTop: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#1A1817', marginBottom: 6 },
  fieldInput: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 14, height: 44, fontSize: 14, color: '#1A1817' },
  dosageRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dosageInput: { flex: 1 },
  unitDropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 12, height: 44, gap: 4 },
  unitText: { fontSize: 14, fontWeight: '500', color: '#1A1817' },
  halfRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  halfField: { flex: 1 },
  pickerField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 },
  pickerValue: { fontSize: 14, fontWeight: '500', color: '#1A1817', flexShrink: 1 },
  pickerPlaceholder: { color: '#A39E99' },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  durationInput: { flex: 1 },
  inlineUnitBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  durationUnit: { fontSize: 13, fontWeight: '500', color: '#7C7672' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  quantityInput: { flex: 1 },
  quantityUnit: { fontSize: 13, fontWeight: '500', color: '#7C7672' },
  summaryCard: {
    backgroundColor: '#FFF8F4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5E1D3',
    padding: 12,
    marginTop: 12,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  summaryHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BD632F',
    letterSpacing: 0.6,
  },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCell: { flex: 1 },
  summaryCellLabel: { fontSize: 10, fontWeight: '600', color: '#9C9690', marginBottom: 2 },
  summaryCellValue: { fontSize: 13, fontWeight: '700', color: '#1A1817' },
  summaryEmptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderStyle: 'dashed',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  noSummary: { fontSize: 13, fontWeight: '500', color: '#D1CCC7', textAlign: 'center' },

  addMedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#BD632F', paddingVertical: 12, gap: 6, marginTop: 8, marginBottom: 20 },
  addMedBtnText: { fontSize: 14, fontWeight: '600', color: '#BD632F' },

  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#1A1817', marginBottom: 8 },
  textareaContainer: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 16, minHeight: 100 },
  textarea: { fontSize: 14, color: '#1A1817', minHeight: 70, textAlignVertical: 'top' },
  charCount: { fontSize: 11, fontWeight: '500', color: '#9C9690', textAlign: 'right', marginTop: 4 },

  sendBtnContainer: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF' },
  sendBtn: { backgroundColor: '#BD632F', borderRadius: 26, paddingVertical: 16, alignItems: 'center', minHeight: 54, justifyContent: 'center' },
  sendBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, maxHeight: '70%' },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0D8D0', alignSelf: 'center', marginBottom: 16 },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1817', marginBottom: 12 },
  pickerOptions: { flexGrow: 0 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E6E1DC' },
  pickerRowSelected: { borderColor: '#BD632F', backgroundColor: '#FFF8F4' },
  pickerRowText: { fontSize: 14, fontWeight: '600', color: '#1A1817' },
  pickerRowTextSelected: { color: '#BD632F' },
});
