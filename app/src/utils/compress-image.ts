import { Image } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';

// nginx in front of the API rejects request bodies over 1 MiB with 413, so we
// target well under that (multipart boundaries + headers add a few KB).
export const MAX_UPLOAD_BYTES = 900 * 1024;

export interface UploadableImage {
  uri: string;
  name: string;
  type: string;
}

export interface CompressOptions {
  fileName?: string;
  mimeType?: string;
}

const LADDER: { maxEdge: number; quality: number }[] = [
  { maxEdge: 1600, quality: 0.7 },
  { maxEdge: 1600, quality: 0.5 },
  { maxEdge: 1280, quality: 0.5 },
  { maxEdge: 1024, quality: 0.4 },
];

function getLocalFileSize(uri: string): number | null {
  try {
    const info = new File(uri).info();
    return typeof info.size === 'number' ? info.size : null;
  } catch {
    return null;
  }
}

function jpgName(fileName?: string, uri?: string): string {
  const base = (fileName || uri?.split('/').pop() || `upload-${Date.now()}`)
    .replace(/\.[^.]+$/, '');
  return `${base}.jpg`;
}

async function resizeTo(
  uri: string,
  width: number | null,
  height: number | null,
  quality: number,
): Promise<string | null> {
  try {
    const context = ImageManipulator.manipulate(uri);
    if (width || height) {
      context.resize({ width, height });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality });
    return saved.uri;
  } catch {
    return null;
  }
}

/**
 * Returns an image that is safe to POST to the API (under MAX_UPLOAD_BYTES),
 * JPEG-encoded and capped in resolution. Falls back to the original image if
 * anything goes wrong, so a compression failure never blocks an upload.
 */
export async function compressImageForUpload(
  uri: string,
  options: CompressOptions = {},
): Promise<UploadableImage> {
  const original: UploadableImage = {
    uri,
    name: options.fileName || uri.split('/').pop() || `upload-${Date.now()}`,
    type: options.mimeType || 'image/jpeg',
  };

  const size = getLocalFileSize(uri);
  if (size !== null && size <= MAX_UPLOAD_BYTES) {
    return original;
  }

  let dims: { width: number; height: number } | null = null;
  try {
    dims = await Image.getSize(uri);
  } catch {
    dims = null;
  }

  const compressed: UploadableImage = { ...original, name: jpgName(options.fileName, uri), type: 'image/jpeg' };

  for (const { maxEdge, quality } of LADDER) {
    let width: number | null = null;
    let height: number | null = null;

    if (dims) {
      const longEdge = Math.max(dims.width, dims.height);
      if (longEdge > maxEdge) {
        const scale = maxEdge / longEdge;
        width = Math.round(dims.width * scale);
        height = Math.round(dims.height * scale);
      }
    }

    const nextUri = await resizeTo(uri, width, height, quality);
    if (!nextUri) {
      break;
    }
    compressed.uri = nextUri;

    const nextSize = getLocalFileSize(nextUri);
    if (nextSize !== null && nextSize <= MAX_UPLOAD_BYTES) {
      return compressed;
    }
  }

  // Ladder exhausted (e.g. getImageSize failed so no resize was applied) —
  // force one aggressive pass so the upload stays under the proxy's 1 MiB cap.
  const forced = await resizeTo(uri, 800, 800, 0.3);
  if (forced) {
    compressed.uri = forced;
    const forcedSize = getLocalFileSize(forced);
    if (forcedSize === null || forcedSize <= MAX_UPLOAD_BYTES) {
      return compressed;
    }
  }

  return compressed.uri === original.uri ? original : compressed;
}
