import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LANGUAGES } from '@/constants/languages';
import { getFontFamily } from '@/constants/fonts';
import { useTranslation } from '@/hooks/use-translation';

interface LanguageBottomSheetProps {
  visible: boolean;
  selectedLanguage: string;
  onClose: () => void;
  onSave: (lang: string) => void;
}

export default function LanguageBottomSheet({
  visible,
  selectedLanguage,
  onClose,
  onSave,
}: LanguageBottomSheetProps) {
  const [tempSelected, setTempSelected] = useState(selectedLanguage);
  const { t } = useTranslation();
  const fontFamily = getFontFamily(tempSelected);

  // Reset temp selected when sheet becomes visible
  const handleOpen = () => {
    setTempSelected(selectedLanguage);
  };

  const handleSave = () => {
    onSave(tempSelected);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetContainer}>
            <View style={styles.handleBar} />

            <Text style={[styles.title, { fontFamily }]}>{t('selectLanguage.title')}</Text>
            <Text style={[styles.helperText, { fontFamily }]}>{t('selectLanguage.helper')}</Text>

            <View style={styles.languageList}>
              {LANGUAGES.map((lang) => {
                const isSelected = tempSelected === lang.id;
                return (
                  <TouchableOpacity
                    key={lang.id}
                    style={[styles.languageCard, isSelected && styles.languageCardActive]}
                    activeOpacity={0.7}
                    onPress={() => setTempSelected(lang.id)}
                  >
                    <View style={styles.languageInfo}>
                      <Text style={[styles.languageName, isSelected && styles.languageNameActive, { fontFamily }]}>
                        {lang.name}
                      </Text>
                      <Text style={[styles.languageNative, isSelected && styles.languageNativeActive, { fontFamily }]}>
                        {lang.nativeName}
                      </Text>
                    </View>
                    <View style={[styles.radio, isSelected && styles.radioActive]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={handleSave}>
              <Text style={[styles.saveBtnText, { fontFamily }]}>{t('selectLanguage.save')}</Text>
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
    marginBottom: 24,
  },
  languageList: {
    gap: 12,
    marginBottom: 24,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E6E1DC',
    padding: 16,
  },
  languageCardActive: {
    borderColor: '#BD632F',
    backgroundColor: '#FFF8F4',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 2,
  },
  languageNameActive: {
    color: '#BD632F',
  },
  languageNative: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9C9690',
  },
  languageNativeActive: {
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
