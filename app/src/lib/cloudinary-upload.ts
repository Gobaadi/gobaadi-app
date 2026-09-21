import { File } from 'expo-file-system';
import * as Crypto from 'expo-crypto';

export async function uploadImageToCloudinary(localUri: string): Promise<string> {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
  const apiKey = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET || '';
  const folder = 'gobadi';

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary not configured. Check EXPO_PUBLIC_CLOUDINARY_* env vars.');
  }

  const file = new File(localUri);
  const base64 = await file.base64();

  const timestamp = Math.floor(Date.now() / 1000).toString();

  const paramsToSign: Record<string, string> = {
    folder,
    timestamp,
    upload_preset: 'ml_default',
  };

  const sorted = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join('&');

  const signature = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA1,
    sorted + apiSecret
  );

  const formData = new FormData();
  formData.append('file', `data:image/jpeg;base64,${base64}`);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('upload_preset', 'ml_default');
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to upload image to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
}
