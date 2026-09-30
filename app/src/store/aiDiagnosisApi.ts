import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export type AiDiagnosisStatus = 'PENDING' | 'READY' | 'FAILED';

export interface AiDiagnosis {
  id: number;
  userId: number;
  images: string[];
  symptoms: string[];
  status: AiDiagnosisStatus;
  failureReason?: string;
  analysisResult?: string;
  confidenceScore?: number;
  recommendations: string[];
  recommendedDoctorIds: number[];
  createdAt: string;
}

export const aiDiagnosisApi = createApi({
  reducerPath: 'aiDiagnosisApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['AiDiagnosis'],
  endpoints: (builder) => ({
    getDiagnosisHistory: builder.query<AiDiagnosis[], void>({
      query: () => '/ai-diagnosis/history',
      providesTags: [{ type: 'AiDiagnosis', id: 'LIST' }],
    }),
    getDiagnosisById: builder.query<AiDiagnosis, number>({
      query: (id) => `/ai-diagnosis/${id}`,
      providesTags: (result, error, id) => [{ type: 'AiDiagnosis', id }],
    }),
    uploadDiagnosisImage: builder.mutation<{ url: string }, FormData>({
      query: (formData) => ({
        url: '/ai-diagnosis/upload-image',
        method: 'POST',
        body: formData,
      }),
    }),
    analyzeSymptoms: builder.mutation<AiDiagnosis, { symptoms: string[]; images?: string[] }>({
      query: (body) => ({
        url: '/ai-diagnosis/analyze',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'AiDiagnosis', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetDiagnosisHistoryQuery,
  useGetDiagnosisByIdQuery,
  useLazyGetDiagnosisByIdQuery,
  useUploadDiagnosisImageMutation,
  useAnalyzeSymptomsMutation,
} = aiDiagnosisApi;
