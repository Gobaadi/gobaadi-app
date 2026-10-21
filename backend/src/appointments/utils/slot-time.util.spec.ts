import { addMinutes, parseSlotDateTime, subMinutes } from './slot-time.util';

describe('parseSlotDateTime', () => {
  it('anchors 12h slot labels at Asia/Dhaka (+06:00)', () => {
    expect(parseSlotDateTime('2026-10-21', '10.00 AM').toISOString()).toBe(
      '2026-10-21T04:00:00.000Z',
    );
    expect(parseSlotDateTime('2026-10-21', '03.30 PM').toISOString()).toBe(
      '2026-10-21T09:30:00.000Z',
    );
  });

  it('handles noon-midnight meridiem edge cases', () => {
    expect(parseSlotDateTime('2026-10-21', '12.00 PM').toISOString()).toBe(
      '2026-10-21T06:00:00.000Z',
    );
    expect(parseSlotDateTime('2026-10-21', '12.00 AM').toISOString()).toBe(
      '2026-10-20T18:00:00.000Z',
    );
  });

  it('accepts 24h and space-free labels', () => {
    expect(parseSlotDateTime('2026-10-21', '15:00').toISOString()).toBe(
      '2026-10-21T09:00:00.000Z',
    );
    expect(parseSlotDateTime('2026-10-21', '09:00 AM').toISOString()).toBe(
      '2026-10-21T03:00:00.000Z',
    );
  });

  it('rejects malformed input', () => {
    expect(() => parseSlotDateTime('2026-10-21', 'xx')).toThrow();
  });
});

describe('minute helpers', () => {
  it('add/subtract minutes', () => {
    const base = parseSlotDateTime('2026-10-21', '10.00 AM');
    expect(addMinutes(base, 30).toISOString()).toBe('2026-10-21T04:30:00.000Z');
    expect(subMinutes(base, 10).toISOString()).toBe('2026-10-21T03:50:00.000Z');
  });
});
