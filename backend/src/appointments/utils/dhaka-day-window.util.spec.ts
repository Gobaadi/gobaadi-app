import { dhakaDateKey, dhakaDayWindow } from './dhaka-day-window.util';

const SERVER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
  it('covers a Dhaka date so a wall-clock startAt of that day is inside', () => {
    const now = new Date('2026-10-08T21:30:00Z');
    const { start, end } = dhakaDayWindow(now);

    expect(dhakaDateKey(start)).toBe('2026-10-09');
    expect(dhakaDateKey(end)).toBe('2026-10-10');
    expect(end.getTime() - start.getTime()).toBe(86_400_000);
  });

  it('keeps a same-day wall-clock slot inside the window', () => {
    const now = new Date('2026-10-08T21:30:00Z');
    const { start, end } = dhakaDayWindow(now);

    const slot = new Date('2026-10-09 09:00:00');
    expect(slot.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(slot.getTime()).toBeLessThan(end.getTime());
  });

  it('excludes yesterday’s wall-clock slot', () => {
    const now = new Date('2026-10-08T21:30:00Z');
    const { start, end } = dhakaDayWindow(now);

    const slot = new Date('2026-10-08 23:00:00');
    expect(slot.getTime()).toBeLessThan(start.getTime());
    expect(slot.getTime()).toBeLessThan(end.getTime());
  });

  it('is monotonic across the Dhaka midnight boundary', () => {
    const beforeMidnight = dhakaDayWindow(new Date('2026-10-08T17:59:00Z'));
    const afterMidnight = dhakaDayWindow(new Date('2026-10-08T18:01:00Z'));

    expect(afterMidnight.start.getTime() - beforeMidnight.start.getTime()).toBe(
      86_400_000,
    );
    expect(beforeMidnight.end.getTime()).toBe(afterMidnight.start.getTime());
  });
});

describe('server timezone interop', () => {
  it(`produces a server-local midnight when the server runs in ${SERVER_TZ}`, () => {
    const now = new Date();
    const { start } = dhakaDayWindow(now);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
  });
});
