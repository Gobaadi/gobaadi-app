import type { DoctorAppointment } from '@/store/doctorPortalApi';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/**
 * Latest non-cancelled booking dated up to today for this patient —
 * "Today" when it's the same calendar day, "14th August" otherwise.
 * Returns null when the patient has no past/today bookings.
 */
export function getLastAppointmentText(
  bookings: DoctorAppointment[],
  patientId: number,
): string | null {
  if (!patientId) return null;
  const now = new Date();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();

  const candidates = bookings.filter((b) => {
    if (b.patientId !== patientId) return false;
    if (b.status === 'CANCELLED') return false;
    const start = new Date(b.startAt).getTime();
    return !Number.isNaN(start) && start <= endOfToday;
  });
  if (candidates.length === 0) return null;

  const latest = candidates.reduce((a, b) =>
    new Date(a.startAt).getTime() >= new Date(b.startAt).getTime() ? a : b,
  );
  const d = new Date(latest.startAt);
  if (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  ) {
    return 'Today';
  }
  return `${ordinal(d.getDate())} ${MONTH_NAMES[d.getMonth()]}`;
}
