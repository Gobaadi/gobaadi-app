export interface DhakaDayWindow {
  start: Date;
  end: Date;
}

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

export function dhakaDateKey(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(
    now,
  );
}

/**
 * [start, end) window for the Asia/Dhaka calendar day that `now` falls in,
 * expressed as real UTC instants. `startAt` values are stored as true UTC
 * instants, so the day must be anchored at Dhaka midnight = 18:00Z of the
 * previous UTC day (UTC+6).
 */
export function dhakaDayWindow(now: Date): DhakaDayWindow {
  const utcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const dhakaMidnightUtc = utcMidnight - DHAKA_OFFSET_MS;
  return {
    start: new Date(dhakaMidnightUtc),
    end: new Date(dhakaMidnightUtc + 86_400_000),
  };
}
