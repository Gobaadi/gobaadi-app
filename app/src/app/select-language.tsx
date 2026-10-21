import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { LANGUAGES } from '@/constants/languages';
import { getFontFamily } from '@/constants/fonts';
import { useLanguage } from '@/hooks/use-language';
import { useTranslation } from '@/hooks/use-translation';
import {
  backButtonSvg,
  languageActiveSpeakerSvg,
  languageUnactiveSpeakerSvg,
} from '@/components/icons/svg-icon-sources';

export default function SelectLanguageScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const fontFamily = getFontFamily(language);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <SvgXml width={20} height={20} xml={backButtonSvg} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily }]}>{t('selectLanguage.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.helperText, { fontFamily }]}>{t('selectLanguage.helper')}</Text>

        {/* Language List */}
        <View style={styles.languageList}>
          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[styles.languageCard, isSelected && styles.languageCardActive]}
                onPress={() => setLanguage(lang.id)}
                activeOpacity={0.8}
              >
                <View style={styles.languageInfo}>
                  <Text style={[styles.languageName, isSelected && styles.languageNameActive, { fontFamily }]}>
                    {lang.name}
                  </Text>
                  <Text style={[styles.languageNative, isSelected && styles.languageNativeActive, { fontFamily }]}>
                    {lang.nativeName}
                  </Text>
                </View>
                <View style={[styles.speakerBadge, isSelected && styles.speakerBadgeActive]}>
                  <SvgXml
                    width={16}
                    height={16}
                    xml={isSelected ? languageActiveSpeakerSvg : languageUnactiveSpeakerSvg}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={() => router.back()}>
          <Text style={[styles.saveBtnText, { fontFamily }]}>{t('selectLanguage.save')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BD632F', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1817' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  languageList: {
    gap: 12,
    marginBottom: 16,
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
  languageInfo: { flex: 1 },
  languageName: { fontSize: 16, fontWeight: '700', color: '#1A1817', marginBottom: 2 },
  languageNameActive: { color: '#BD632F' },
  languageNative: { fontSize: 12, fontWeight: '500', color: '#9C9690' },
  languageNativeActive: { color: '#BD632F' },
  speakerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F2EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakerBadgeActive: {
    backgroundColor: '#BD632F',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
  },
  saveBtn: {
    backgroundColor: '#BD632F',
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
