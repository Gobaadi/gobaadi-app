import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export type AttachmentStatus = 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';

export interface Attachment {
  id: number;
  patientId: number;
  appointmentId?: number | null;
  uploadedByUserId: number;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageUrl?: string;
  storagePublicId?: string;
  status: AttachmentStatus;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const medicalRecordsApi = createApi({
  reducerPath: 'medicalRecordsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['MedicalRecord'],
  endpoints: (builder) => ({
    getMedicalRecords: builder.query<Attachment[], void>({
      query: () => '/medical-records',
      providesTags: ['MedicalRecord'],
    }),
    getByPatientMedicalRecords: builder.query<Attachment[], string>({
      query: (patientId) => `/medical-records?patientId=${patientId}`,
      providesTags: (_result, _error, patientId) => [{ type: 'MedicalRecord', id: patientId }],
    }),
    uploadMedicalRecord: builder.mutation<Attachment, FormData>({
      query: (formData) => ({
        url: '/medical-records/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['MedicalRecord'],
    }),
  }),
});

export const { useGetMedicalRecordsQuery, useGetByPatientMedicalRecordsQuery, useUploadMedicalRecordMutation } = medicalRecordsApi;
