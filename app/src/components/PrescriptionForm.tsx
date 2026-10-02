import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  searchQuery: string;
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

const MOCK_MEDICATIONS = [
  { name: 'Enrofloxacin 10% Injection', type: 'Antibiotic' },
  { name: 'Oxytetracycline 20% Injection', type: 'Antibiotic' },
  { name: 'Flunixin Meglumine Injection', type: 'Anti-inflammatory' },
  { name: 'Ivermectin 1% Injection', type: 'Antiparasitic' },
  { name: 'Meloxicam Injection', type: 'NSAID' },
  { name: 'Ceftiofur Hydrochloride Injection', type: 'Antibiotic' },
  { name: 'Gentamicin Injection', type: 'Antibiotic' },
  { name: 'Dexamethasone Injection', type: 'Corticosteroid' },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getMedicationSummary(med: MedicationEntry): string {
  if (!med.dosage || !med.frequency || !med.duration) return '';
  return `${med.dosage} ${med.dosageUnit} · ${med.frequency} · ${med.duration} ${med.durationUnit}`;
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
    searchQuery: '',
  };
}

export default function PrescriptionForm({ onSend, sending }: PrescriptionFormProps) {
  const [medications, setMedications] = useState<MedicationEntry[]>([
    createEmptyMedication(),
  ]);
  const [instructions, setInstructions] = useState('');
  const [note, setNote] = useState('');
  const [showMedPicker, setShowMedPicker] = useState<string | null>(null);

  const addMedication = useCallback(() => {
    setMedications((prev) => [
      ...prev.map((m) => ({ ...m, isExpanded: false })),
      createEmptyMedication(),
    ]);
  }, []);

  const removeMedication = useCallback((id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isExpanded: !m.isExpanded } : m))
    );
  }, []);

  const updateMedication = useCallback((id: string, updates: Partial<MedicationEntry>) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  const selectMedication = useCallback((id: string, med: { name: string; type: string }) => {
    setMedications((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, name: med.name, type: med.type, searchQuery: '', isExpanded: true }
          : m
      )
    );
    setShowMedPicker(null);
  }, []);

  const getFilteredMeds = (query: string) => {
    if (!query) return MOCK_MEDICATIONS;
    return MOCK_MEDICATIONS.filter(
      (m) =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.type.toLowerCase().includes(query.toLowerCase())
    );
  };

  const handleSend = () => {
    if (sending) return;
    onSend({ medications, instructions, note });
  };

  const hasNamedMed = medications.some((m) => m.name);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sheetTitle}>Prescription</Text>

        {medications.map((med, index) => (
          <View key={med.id} style={styles.medicationBlock}>
            <View style={styles.medNameHeader}>
              <View style={styles.medBadge}>
                <Text style={styles.medBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.medNameLabel}>Medication Name*</Text>
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

            {med.name ? (
              <View style={styles.medSelectedCard}>
                <Text style={styles.medSelectedName}>{med.name}</Text>
                <Text style={styles.medSelectedType}>{med.type}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.medDropdown}
                onPress={() => setShowMedPicker(showMedPicker === med.id ? null : med.id)}
                activeOpacity={0.7}
              >
                <TextInput
                  style={styles.medDropdownInput}
                  placeholder="Med name"
                  placeholderTextColor="#A39E99"
                  value={med.searchQuery}
                  onChangeText={(text) => {
                    updateMedication(med.id, { searchQuery: text });
                    setShowMedPicker(med.id);
                  }}
                  onFocus={() => setShowMedPicker(med.id)}
                />
                <Ionicons name="chevron-down" size={18} color="#9C9690" />
              </TouchableOpacity>
            )}

            {showMedPicker === med.id && !med.name && (
              <View style={styles.medPickerDropdown}>
                {getFilteredMeds(med.searchQuery).map((m, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.medPickerItem}
                    onPress={() => selectMedication(med.id, m)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.medPickerItemInfo}>
                      <Text style={styles.medPickerItemName}>{m.name}</Text>
                      <Text style={styles.medPickerItemType}>{m.type}</Text>
                    </View>
                    <View style={styles.medPickerItemAdd}>
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {med.isExpanded && med.name && (
              <View style={styles.medFields}>
                <Text style={styles.fieldLabel}>Dosage</Text>
                <View style={styles.dosageRow}>
                  <TextInput
                    style={[styles.fieldInput, styles.dosageInput]}
                    placeholder="0"
                    placeholderTextColor="#A39E99"
                    keyboardType="numeric"
                    value={med.dosage}
                    onChangeText={(text) => updateMedication(med.id, { dosage: text })}
                  />
                  <View style={styles.unitDropdown}>
                    <Text style={styles.unitText}>{med.dosageUnit}</Text>
                    <Ionicons name="chevron-down" size={14} color="#9C9690" />
                  </View>
                </View>

                <View style={styles.halfRow}>
                  <View style={styles.halfField}>
                    <Text style={styles.fieldLabel}>Frequency</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="0"
                      placeholderTextColor="#A39E99"
                      value={med.frequency}
                      onChangeText={(text) => updateMedication(med.id, { frequency: text })}
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.fieldLabel}>Duration</Text>
                    <View style={styles.durationRow}>
                      <TextInput
                        style={[styles.fieldInput, styles.durationInput]}
                        placeholder="0"
                        placeholderTextColor="#A39E99"
                        keyboardType="numeric"
                        value={med.duration}
                        onChangeText={(text) => updateMedication(med.id, { duration: text })}
                      />
                      <Text style={styles.durationUnit}>{med.durationUnit}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Quantity</Text>
                <View style={styles.quantityRow}>
                  <TextInput
                    style={[styles.fieldInput, styles.quantityInput]}
                    placeholder="0"
                    placeholderTextColor="#A39E99"
                    keyboardType="numeric"
                    value={med.quantity}
                    onChangeText={(text) => updateMedication(med.id, { quantity: text })}
                  />
                  <Text style={styles.quantityUnit}>{med.quantityUnit}</Text>
                </View>

                {getMedicationSummary(med) ? (
                  <Text style={styles.medSummary}>Summary: {getMedicationSummary(med)}</Text>
                ) : (
                  <Text style={styles.noSummary}>No Summary yet</Text>
                )}
              </View>
            )}

            {!med.isExpanded && med.name && getMedicationSummary(med) && (
              <Text style={styles.medCollapsedSummary}>Summary: {getMedicationSummary(med)}</Text>
            )}
          </View>
        ))}

        {medications.length > 0 &&
          !medications.some((m) => m.isExpanded && m.name) && (
            <Text style={styles.noSummaryCenter}>No Summary yet</Text>
          )}

        <TouchableOpacity style={styles.addMedBtn} onPress={addMedication} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#BD632F" />
          <Text style={styles.addMedBtnText}>Add medication</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Instructions</Text>
        <View style={styles.textareaContainer}>
          <TextInput
            style={styles.textarea}
            placeholder="Add instructions for the farmer..."
            placeholderTextColor="#A39E99"
            value={instructions}
            onChangeText={setInstructions}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{instructions.length}/500</Text>
        </View>

        <Text style={styles.sectionLabel}>Medication note (optional)</Text>
        <View style={styles.textareaContainer}>
          <TextInput
            style={styles.textarea}
            placeholder="Add instructions for the farmer..."
            placeholderTextColor="#A39E99"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{note.length}/500</Text>
        </View>
      </ScrollView>

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
            <Text style={styles.sendBtnText}>Send Prescription</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#1A1817', marginBottom: 12 },

  medicationBlock: { marginBottom: 16 },
  medNameHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  medBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  medBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  medNameLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1817' },
  medActions: { flexDirection: 'row', gap: 4 },
  medActionBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  medDropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 14, height: 48 },
  medDropdownInput: { flex: 1, fontSize: 14, color: '#1A1817', height: '100%' },

  medPickerDropdown: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', marginTop: 4, overflow: 'hidden' },
  medPickerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0ECE8' },
  medPickerItemInfo: { flex: 1 },
  medPickerItemName: { fontSize: 13, fontWeight: '600', color: '#1A1817' },
  medPickerItemType: { fontSize: 11, fontWeight: '500', color: '#9C9690', marginTop: 1 },
  medPickerItemAdd: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },

  medSelectedCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14 },
  medSelectedName: { fontSize: 14, fontWeight: '700', color: '#1A1817' },
  medSelectedType: { fontSize: 12, fontWeight: '500', color: '#9C9690', marginTop: 2 },

  medFields: { marginTop: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#1A1817', marginBottom: 6 },
  fieldInput: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 14, height: 44, fontSize: 14, color: '#1A1817' },
  dosageRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dosageInput: { flex: 1 },
  unitDropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6E1DC', paddingHorizontal: 12, height: 44, gap: 4 },
  unitText: { fontSize: 14, fontWeight: '500', color: '#1A1817' },
  halfRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  halfField: { flex: 1 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  durationInput: { flex: 1 },
  durationUnit: { fontSize: 13, fontWeight: '500', color: '#7C7672' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  quantityInput: { flex: 1 },
  quantityUnit: { fontSize: 13, fontWeight: '500', color: '#7C7672' },
  medSummary: { fontSize: 13, fontWeight: '600', color: '#BD632F', marginTop: 4 },
  noSummary: { fontSize: 13, fontWeight: '500', color: '#D1CCC7', marginTop: 4, textAlign: 'center' },
  noSummaryCenter: { fontSize: 13, fontWeight: '500', color: '#D1CCC7', textAlign: 'center', marginVertical: 8 },
  medCollapsedSummary: { fontSize: 13, fontWeight: '600', color: '#BD632F', marginTop: 6, marginLeft: 32 },

  addMedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#BD632F', borderStyle: 'dashed', paddingVertical: 12, gap: 6, marginTop: 8, marginBottom: 20 },
  addMedBtnText: { fontSize: 14, fontWeight: '600', color: '#BD632F' },

  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#1A1817', marginBottom: 8 },
  textareaContainer: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6E1DC', padding: 14, marginBottom: 16, minHeight: 100 },
  textarea: { fontSize: 14, color: '#1A1817', minHeight: 70, textAlignVertical: 'top' },
  charCount: { fontSize: 11, fontWeight: '500', color: '#9C9690', textAlign: 'right', marginTop: 4 },

  sendBtnContainer: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FAF9F6' },
  sendBtn: { backgroundColor: '#BD632F', borderRadius: 26, paddingVertical: 16, alignItems: 'center', minHeight: 54, justifyContent: 'center' },
  sendBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
