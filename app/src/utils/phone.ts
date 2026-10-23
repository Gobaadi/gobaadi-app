/**
 * Bangladeshi mobile number helpers.
 *
 * Accepts any of the common local entry formats and validates the operator
 * block (mobile numbers start with the "1" trunk code followed by 3-9 as the
 * operator digit): 01XX XXXXXXX, +880 1XXXXXXXXX, 8801XXXXXXXXX.
 */

const BD_MOBILE_CORE_REGEX = /^1[3-9]\d{8}$/;

/** Strips formatting characters and resolves country/local prefixes to the 10-digit core. */
export function normalizeBdMobile(value: string): string {
  if (!value) return '';
  const digits = value.replace(/[^\d]/g, '');
  if (digits.startsWith('8801')) return digits.slice(3);
  if (digits.startsWith('01')) return digits.slice(1);
  if (digits.startsWith('1') && digits.length === 10) return digits;
  return digits;
}

export function isValidBdMobile(value: string): boolean {
  if (!value) return false;
  return BD_MOBILE_CORE_REGEX.test(normalizeBdMobile(value));
}
