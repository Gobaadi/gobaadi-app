import { useCallback } from 'react';
import {
  useCreatePrescriptionMutation,
  useSendPrescriptionMutation,
} from '@/store/prescriptionsApi';
import {
  useSendMessageMutation,
  useSendAttachmentMessageMutation,
} from '@/store/chatApi';
import { sendPrescriptionPdf, savePdfToTempFile } from '@/lib/pdf-service';

export interface PrescriptionFormMedication {
  id?: string;
  name: string;
  type: string;
  dosage: string;
  dosageUnit: string;
  frequency: string;
  duration: string;
  durationUnit: string;
  quantity: string;
  quantityUnit: string;
  isExpanded?: boolean;
  searchQuery?: string;
}

export interface SendPrescriptionInput {
  appointmentId: string;
  /** Optional — backend falls back to the appointment animal / owner's animal. */
  animalId?: string;
  conversationId?: number;
  patientName: string;
  medications: PrescriptionFormMedication[];
  instructions: string;
  note: string;
}

export interface SendPrescriptionResult {
  summary: string;
  pdfUri: string | null;
  pdfSizeKB: number;
}

/**
 * Shared doctor-side prescription pipeline used by both the chat screen and
 * the video-call quick actions:
 *   1. create prescription record
 *   2. mark it sent
 *   3. generate branded PDF (+ optional email) via the PDF service
 *   4. post the PDF as a chat attachment (or the summary as text when PDF
 *      generation failed) + optional email notice
 */
export function useSendPrescription() {
  const [createPrescription] = useCreatePrescriptionMutation();
  const [sendPrescriptionApi] = useSendPrescriptionMutation();
  const [sendMessage] = useSendMessageMutation();
  const [sendAttachment] = useSendAttachmentMessageMutation();

  const sendPrescription = useCallback(
    async (input: SendPrescriptionInput): Promise<SendPrescriptionResult> => {
      const {
        appointmentId,
        animalId,
        conversationId,
        patientName,
        medications,
        instructions,
        note,
      } = input;

      if (!appointmentId) {
        throw new Error('Missing appointment information.');
      }

      const medicines = medications.map((m) => ({
        name: m.name,
        dosage: `${m.dosage} ${m.dosageUnit} ${m.frequency}`,
        duration: `${m.duration} ${m.durationUnit}`,
        notes: instructions || undefined,
      }));

      const prescription = await createPrescription({
        appointmentId: parseInt(appointmentId, 10),
        ...(animalId ? { animalId: parseInt(animalId, 10) } : {}),
        medicines,
      }).unwrap();

      await sendPrescriptionApi(prescription.id).unwrap();

      let pdfUri: string | null = null;
      let pdfSizeKB = 0;
      let emailSent = false;

      try {
        const pdfResult = await sendPrescriptionPdf({
          patientName,
          userEmail: '',
          medications,
          instructions,
          note,
        });

        if (pdfResult.data?.pdfBase64) {
          const fileName = `Prescription_${new Date().toISOString().split('T')[0]}.pdf`;
          pdfUri = await savePdfToTempFile(pdfResult.data.pdfBase64, fileName);
          pdfSizeKB = pdfResult.data.pdfSizeKB;
        }

        emailSent = pdfResult.data?.messageId !== 'no-email';
      } catch (pdfError) {
        console.warn('PDF generation failed, continuing without PDF:', pdfError);
      }

      const summary = `Prescription - ${new Date().toLocaleDateString()}`;

      if (pdfUri) {
        const fileName = `Prescription_${new Date().toISOString().split('T')[0]}.pdf`;
        await sendAttachment({
          conversationId,
          caption: summary,
          file: {
            uri: pdfUri,
            name: fileName,
            type: 'application/pdf',
          },
        }).unwrap();
      } else {
        await sendMessage({ text: summary, conversationId }).unwrap();
      }

      if (emailSent) {
        await sendMessage({
          text: 'I have sent you an email with the prescription PDF. Please check your inbox for the medicine details.',
          conversationId,
        }).unwrap();
      }

      return { summary, pdfUri, pdfSizeKB };
    },
    [createPrescription, sendPrescriptionApi, sendMessage, sendAttachment],
  );

  return { sendPrescription };
}
