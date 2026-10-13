import { localDateKey } from '@/utils/date';

export type TimeOfDay = { hour: number; minute: number; period: 'AM' | 'PM' };

export const WHEEL_ITEM_HEIGHT = 36;
export const DURATION_OPTIONS = [30, 60, 120, 180];

export function parseTime12(value: string): TimeOfDay {
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return { hour: 9, minute: 0, period: 'AM' };
  let hour = parseInt(match[1], 10) % 12;
  if (hour === 0) hour = 12;
  return {
    hour,
    minute: Math.min(59, parseInt(match[2], 10)),
    period: match[3].toUpperCase() as 'AM' | 'PM',
  };
}

export function toMinutes24(time: TimeOfDay): number {
  return ((time.hour % 12) + (time.period === 'PM' ? 12 : 0)) * 60 + time.minute;
}

export function fromMinutes24(total: number): TimeOfDay {
  const normalized = ((total % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  let hour = hour24 % 12;
  if (hour === 0) hour = 12;
  return { hour, minute: normalized % 60, period: hour24 >= 12 ? 'PM' : 'AM' };
}

export function formatTime(time: TimeOfDay): string {
  return `${time.hour}:${String(time.minute).padStart(2, '0')} ${time.period}`;
}

export function dateKeyFromIso(iso?: string): string {
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return localDateKey(parsed);
  }
  return localDateKey();
}

export function dateFromDateKey(key: string): Date {
  const parts = key.split('-').map((part) => parseInt(part, 10));
  return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
}

export function snapDuration(start: TimeOfDay, end: TimeOfDay): number {
  const diff = ((toMinutes24(end) - toMinutes24(start)) % 1440 + 1440) % 1440;
  let best = 60;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const mins of DURATION_OPTIONS) {
    const gap = Math.abs(mins - diff);
    if (gap < bestGap) {
      bestGap = gap;
      best = mins;
    }
  }
  return best;
}
