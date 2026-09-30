export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatRelativeTime(iso: string | Date | undefined): string {
  if (!iso) return 'just now';
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return 'just now';

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} Min Ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} Hour${hours > 1 ? 's' : ''} Ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} Day${days > 1 ? 's' : ''} Ago`;

  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatLocalDateKey(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );
}
