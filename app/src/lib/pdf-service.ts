import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Medication {
  name: string;
  type?: string;
  dosage?: string;
  dosageUnit?: string;
  frequency?: string;
  duration?: string;
  durationUnit?: string;
  quantity?: string;
  quantityUnit?: string;
  instructions?: string;
}

export interface SendPrescriptionPdfInput {
  patientName: string;
  userEmail: string;
  doctorName?: string;
  medications: Medication[];
  instructions?: string;
  note?: string;
}

export interface SendPrescriptionPdfResponse {
  success: boolean;
  message: string;
  data?: {
    recipient: string;
    patientName: string;
    messageId: string;
    pdfBase64: string;
    pdfSizeKB: number;
    timestamp: string;
  };
  error?: {
    code: string;
    description: string;
  };
}

// ─── Config ─────────────────────────────────────────────────────────────────

const PDF_SERVICE_URL = process.env.EXPO_PUBLIC_PDF_SERVICE_URL || '';
const PDF_SERVICE_SECRET = process.env.EXPO_PUBLIC_PDF_SERVICE_SECRET || '';

// ─── Send Prescription PDF ──────────────────────────────────────────────────

/**
 * Call the PDF email service to generate a branded prescription PDF,
 * send it via email, and return the PDF buffer for chat attachment.
 */
export async function sendPrescriptionPdf(
  input: SendPrescriptionPdfInput,
): Promise<SendPrescriptionPdfResponse> {
  if (!PDF_SERVICE_URL) {
    throw new Error('PDF service URL not configured. Add EXPO_PUBLIC_PDF_SERVICE_URL to .env');
  }

  if (!PDF_SERVICE_SECRET) {
    throw new Error('PDF service secret not configured. Add EXPO_PUBLIC_PDF_SERVICE_SECRET to .env');
  }

  const response = await fetch(PDF_SERVICE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-secret': PDF_SERVICE_SECRET,
    },
    body: JSON.stringify(input),
  });

  const result: SendPrescriptionPdfResponse = await response.json();

  if (!result.success) {
    throw new Error(result.error?.description || 'Failed to generate prescription PDF');
  }

  return result;
}

/**
 * Save a base64 PDF string to a temp file and return the file URI.
 */
export async function savePdfToTempFile(
  pdfBase64: string,
  fileName: string,
): Promise<string> {
  const cacheDir = Paths.cache;
  const file = new File(cacheDir, fileName);

  // Decode base64 to binary string, then to Uint8Array
  const binaryString = atob(pdfBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  await file.write(bytes);
  return file.uri;
}

/**
 * Share a PDF file using the system share sheet.
 */
export async function sharePdfFile(fileUri: string, fileName: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    dialogTitle: `Share ${fileName}`,
    UTI: 'com.adobe.pdf',
  });
}
