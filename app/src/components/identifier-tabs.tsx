import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from '@/hooks/use-translation';

export type IdentifierMode = 'phone' | 'email';

interface IdentifierTabsProps {
  mode: IdentifierMode;
  onChange: (mode: IdentifierMode) => void;
}

/** Phone Number / Email tab switcher shared by the login and signup screens. */
export function IdentifierTabs({ mode, onChange }: IdentifierTabsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, mode === 'phone' && styles.tabActive]}
        onPress={() => onChange('phone')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, mode === 'phone' && styles.tabTextActive]}>{t('common.identifierTabs.phone')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, mode === 'email' && styles.tabActive]}
        onPress={() => onChange('email')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, mode === 'email' && styles.tabTextActive]}>{t('common.identifierTabs.email')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E1DC',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#BD632F',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A39E99',
  },
  tabTextActive: {
    color: '#BD632F',
  },
});
