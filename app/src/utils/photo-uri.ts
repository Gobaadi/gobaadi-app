const MOCK_HOST_MARKER = 'res.cloudinary.com/demo/';
const PDF_PATTERN = /\.pdf(\?|#|$)/i;

/**
 * Returns true when a stored photo URL is plausibly renderable as an image.
 * Filters out empty values and known dead/mock URLs (e.g. the backend's
 * sample.pdf fallback that always returns 404).
 */
export function isRenderableImageUri(uri?: string | null): uri is string {
  if (!uri || typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase().includes(MOCK_HOST_MARKER)) return false;
  if (PDF_PATTERN.test(trimmed)) return false;
  return true;
}
