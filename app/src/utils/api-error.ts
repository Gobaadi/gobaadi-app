export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as {
      data?: { message?: string | string[]; error?: string };
      status?: number | string;
    };
    const msg = e.data?.message;
    if (Array.isArray(msg) && msg.length > 0) {
      return msg.join('\n');
    }
    if (typeof msg === 'string' && msg.trim()) {
      return msg;
    }
    if (typeof e.data?.error === 'string' && e.data.error.trim()) {
      return e.data.error;
    }
    if (e.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (e.status === 401) {
      return 'Session expired. Please sign in again.';
    }
    if (typeof e.status === 'number') {
      return `${fallback} (HTTP ${e.status})`;
    }
    if (typeof e.status === 'string') {
      return `${fallback} (${e.status})`;
    }
  }
  return fallback;
}
