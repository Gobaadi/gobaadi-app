import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { LOCATIONS } from '@/constants/locations';
import { useTranslation } from '@/hooks/use-translation';

interface LocationBottomSheetProps {
  visible: boolean;
  selectedLocation: string;
  onClose: () => void;
  onSave: (location: string) => void;
}

export default function LocationBottomSheet({
  visible,
  selectedLocation,
  onClose,
  onSave,
}: LocationBottomSheetProps) {
  const { t } = useTranslation();
  const [tempSelected, setTempSelected] = useState(selectedLocation);
  const [typedValue, setTypedValue] = useState('');

  const handleShow = () => {
    setTempSelected(selectedLocation);
    setTypedValue('');
  };

  const handleSave = () => {
    const typed = typedValue.trim();
    if (typed) {
      onSave(typed);
    } else if (tempSelected) {
      onSave(tempSelected);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleShow}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetContainer}>
            <View style={styles.handleBar} />

            <Text style={styles.title}>{t('locationSheet.title')}</Text>
            <Text style={styles.helperText}>
              {t('locationSheet.helper')}
            </Text>

            <TextInput
              style={styles.input}
              placeholder={t('locationSheet.typePlaceholder')}
              placeholderTextColor="#A39E99"
              value={typedValue}
              onChangeText={setTypedValue}
            />

            <ScrollView style={styles.locationScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.locationList}>
                {LOCATIONS.map((loc) => {
                  const isSelected = !typedValue.trim() && tempSelected === loc;
                  return (
                    <TouchableOpacity
                      key={loc}
                      style={[styles.locationCard, isSelected && styles.locationCardActive]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setTempSelected(loc);
                        setTypedValue('');
                      }}
                    >
                      <View style={styles.locationInfo}>
                        <Text
                          style={[styles.locationName, isSelected && styles.locationNameActive]}
                        >
                          {loc}
                        </Text>
                      </View>
                      <View style={[styles.radio, isSelected && styles.radioActive]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{t('locationSheet.save')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0D8D0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E6E1DC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1817',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  locationScroll: {
    marginBottom: 24,
  },
  locationList: {
    gap: 12,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E6E1DC',
    padding: 16,
  },
  locationCardActive: {
    borderColor: '#BD632F',
    backgroundColor: '#FFF8F4',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
  },
  locationNameActive: {
    color: '#BD632F',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1CCC7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: '#BD632F',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#BD632F',
  },
  saveBtn: {
    backgroundColor: '#BD632F',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
