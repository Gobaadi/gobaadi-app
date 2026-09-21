import { File } from 'expo-file-system';

export async function uploadImageToCloudinary(localUri: string): Promise<string> {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured. Add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME to your .env file.');
  }

  const file = new File(localUri);
  const base64 = await file.base64();

  // Upload to Cloudinary
  const formData = new FormData();
  formData.append('file', `data:image/jpeg;base64,${base64}`);
  formData.append('upload_preset', 'ml_default');
  formData.append('folder', 'gobadi');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to upload image to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
}
