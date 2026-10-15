export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES = [
  {
    id: 'minLength',
    test: (value: string) => value.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'uppercase',
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: 'lowercase',
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: 'number',
    test: (value: string) => /[0-9]/.test(value),
  },
  {
    id: 'symbol',
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

export type PasswordRuleId = (typeof PASSWORD_RULES)[number]['id'];

export const PASSWORD_RULE_I18N_KEYS: Record<PasswordRuleId, string> = {
  minLength: 'passwordRules.minLength',
  uppercase: 'passwordRules.uppercase',
  lowercase: 'passwordRules.lowercase',
  number: 'passwordRules.number',
  symbol: 'passwordRules.symbol',
};

/**
 * Returns the ids of the password rules that are NOT satisfied yet, in
 * display order. Must stay in sync with the backend password policy if one
 * is added later.
 */
export function getUnmetPasswordRules(value: string): PasswordRuleId[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.id);
}

export function isPasswordValid(value: string): boolean {
  return getUnmetPasswordRules(value).length === 0;
}
