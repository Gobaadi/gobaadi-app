/**
 * Helpers for the animal `age` field (stored as a string, in months).
 * Older records may hold a date (from the retired date-picker field) or a
 * "24 Months" style value, so prefill/display paths normalize them here.
 */

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const first = Number(dmy[1]);
    const second = Number(dmy[2]);
    const year = Number(dmy[3]);
    // Prefer day/month/year when ambiguous (app data uses DD/MM/YYYY).
    if (first > 12) return new Date(year, second - 1, first);
    if (second > 12) return new Date(year, first - 1, second);
    return new Date(year, second - 1, first);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function monthsSince(from: Date, to: Date = new Date()): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

/** Strip everything but digits — age is entered as whole months. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Normalize a stored `age` value for the numeric age input.
 * Returns months as a digits-only string; '' when nothing usable.
 */
export function ageToMonthsInput(value?: string | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^\d+$/.test(trimmed)) return trimmed;

  const years = trimmed.match(/^(\d+)\s*years?$/i);
  if (years) return String(Number(years[1]) * 12);

  const months = trimmed.match(/^(\d+)\s*months?$/i);
  if (months) return months[1];

  const fromDate = parseDate(trimmed);
  if (fromDate) return String(monthsSince(fromDate));

  return '';
}

/**
 * Single source of truth for an animal's age in whole months.
 * Prefers the date of birth, then falls back to the stored `age`
 * string (plain months number, "X years", "X months" or a date).
 */
export function ageToMonths(age?: string | null, dob?: string | null): number | null {
  const fromDob = parseDate(dob);
  if (fromDob) return monthsSince(fromDob);

  if (!age) return null;
  const trimmed = age.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  const fromDate = parseDate(trimmed);
  if (fromDate) return monthsSince(fromDate);

  const years = trimmed.match(/^(\d+)\s*years?$/i);
  if (years) return Number(years[1]) * 12;

  const months = trimmed.match(/^(\d+)\s*months?$/i);
  if (months) return Number(months[1]);

  return null;
}

/** Keep only digits, a single decimal point and max 2 decimals (money/amount input). */
export function sanitizeAmount(value: string): string {
  let v = value.replace(/[^\d.]/g, '');
  const dot = v.indexOf('.');
  if (dot !== -1) {
    v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
    const [intPart, decPart] = v.split('.');
    v = intPart + (decPart !== undefined ? `.${decPart.slice(0, 2)}` : '');
  }
  return v;
}

/** Strict positive numeric amount: "150", "150.5", "150.50" — rejects "", "0", "100k", "100kg". */
export function isValidAmount(value?: string | null): boolean {
  const trimmed = (value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return false;
  return Number(trimmed) > 0;
}
