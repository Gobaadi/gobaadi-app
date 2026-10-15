import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/hooks/use-translation';
import { PASSWORD_RULES, PASSWORD_RULE_I18N_KEYS } from '@/utils/password';

interface PasswordRequirementsProps {
  value: string;
}

export function PasswordRequirements({ value }: PasswordRequirementsProps) {
  const { t } = useTranslation();

  if (!value) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('passwordRules.heading')}</Text>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <View key={rule.id} style={styles.row}>
            <Ionicons
              name={met ? 'checkmark-circle' : 'close-circle-outline'}
              size={16}
              color={met ? '#22C55E' : '#9C9690'}
              style={styles.icon}
            />
            <Text style={[styles.rule, met && styles.ruleMet]}>{t(PASSWORD_RULE_I18N_KEYS[rule.id])}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  heading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C7672',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  icon: {
    marginRight: 8,
  },
  rule: {
    fontSize: 13,
    color: '#9C9690',
  },
  ruleMet: {
    color: '#22C55E',
    fontWeight: '600',
  },
});
