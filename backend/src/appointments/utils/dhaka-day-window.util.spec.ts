import { dhakaDateKey, dhakaDayWindow } from './dhaka-day-window.util';

describe('dhakaDateKey', () => {
  it('returns the Asia/Dhaka calendar date regardless of server timezone', () => {
    const now = new Date('2026-10-08T21:30:00Z');
    expect(dhakaDateKey(now)).toBe('2026-10-09');
  });

  it('stays on the same date for a mid-day Dhaka instant', () => {
    const now = new Date('2026-10-08T08:00:00Z');
    expect(dhakaDateKey(now)).toBe('2026-10-08');
  });
});

describe('dhakaDayWindow', () => {
  it('spans the Dhaka day as true UTC instants (UTC+6 -> previous day 18:00Z)', () => {
    const now = new Date('2026-10-09T12:30:00Z'); // 18:30 Dhaka on Oct 9
    const { start, end } = dhakaDayWindow(now);

    expect(start.toISOString()).toBe('2026-10-08T18:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-09T18:00:00.000Z');
  });

  it('keeps a slot at 15:00 Dhaka (09:00Z) inside its Dhaka day window', () => {
    const now = new Date('2026-10-08T11:00:00Z'); // 17:00 Dhaka Oct 8
    const { start, end } = dhakaDayWindow(now);

    const slot = new Date('2026-10-08T09:00:00Z'); // 15:00 Dhaka Oct 8
    expect(slot.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(slot.getTime()).toBeLessThan(end.getTime());
  });

  it('keeps an early-morning Dhaka slot (05:00 Dhaka) inside its own day', () => {
    const now = new Date('2026-10-09T00:00:00Z'); // 06:00 Dhaka Oct 9
    const { start, end } = dhakaDayWindow(now);

    const slot = new Date('2026-10-08T23:00:00Z'); // 05:00 Dhaka Oct 9
    expect(slot.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(slot.getTime()).toBeLessThan(end.getTime());
  });

  it('excludes the next Dhaka day’s slot', () => {
    const now = new Date('2026-10-08T11:00:00Z'); // Dhaka Oct 8
    const { end } = dhakaDayWindow(now);

    const nextDaySlot = new Date('2026-10-09T09:00:00Z'); // 15:00 Dhaka Oct 9
    expect(nextDaySlot.getTime()).toBeGreaterThanOrEqual(end.getTime());
  });

  it('window length is exactly 24 hours', () => {
    const { start, end } = dhakaDayWindow(new Date());
    expect(end.getTime() - start.getTime()).toBe(86_400_000);
  });
});
