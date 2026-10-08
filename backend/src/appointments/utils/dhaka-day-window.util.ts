export interface DhakaDayWindow {
  start: Date;
  end: Date;
}

export function dhakaDateKey(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(
    now,
  );
}

export function dhakaDayWindow(now: Date): DhakaDayWindow {
  const start = new Date(`${dhakaDateKey(now)} 00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
