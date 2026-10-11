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
