/**
 * Parses a mobile-supplied {date, time} pair into a Date.
 * Mobile sends date as 'YYYY-MM-DD' and time with a dot separator, e.g. '09.00 AM'.
 * Slot labels describe Asia/Dhaka wall-clock times, so the parsed instant is
 * anchored at +06:00 and stored as a true UTC instant.
 */
export function parseSlotDateTime(date: string, time: string): Date {
  const normalizedTime = time.replace('.', ':').trim();
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(normalizedTime);
  if (!match) {
    throw new Error(`Unable to parse date/time: ${date} ${time}`);
  }
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  const parsed = new Date(`${date}T${hh}:${mm}:00+06:00`);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Unable to parse date/time: ${date} ${time}`);
  }
  return parsed;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

export function subMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() - minutes * 60000);
}
