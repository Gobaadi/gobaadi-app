import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface Medicine {
  name: string;
  dosage?: string;
  quantity?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

export interface Prescription {
  id: number;
  doctorId: number;
  patientId: number;
  appointmentId: number;
  animalId: number;
  medicines: Medicine[];
  attachmentUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrescriptionInput {
  appointmentId: number;
  animalId?: number;
  medicines: Medicine[];
}

export const prescriptionsApi = createApi({
  reducerPath: 'prescriptionsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Prescription'],
  endpoints: (builder) => ({
    createPrescription: builder.mutation<Prescription, CreatePrescriptionInput>({
      query: (body) => ({
        url: '/prescriptions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Prescription'],
    }),
    getByAppointment: builder.query<Prescription, string>({
      query: (appointmentId) => `/prescriptions/by-appointment/${appointmentId}`,
      providesTags: (_result, _error, appointmentId) => [{ type: 'Prescription', id: appointmentId }],
    }),
    getByAnimalPrescriptions: builder.query<Prescription[], string>({
      query: (animalId) => `/prescriptions/by-animal/${animalId}`,
      providesTags: (_result, _error, animalId) => [{ type: 'Prescription', id: animalId }],
    }),
    updatePrescription: builder.mutation<Prescription, { id: number; data: Partial<Prescription> }>({
      query: ({ id, data }) => ({
        url: `/prescriptions/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Prescription', id }],
    }),
    addAttachment: builder.mutation<any, { id: number; formData: FormData }>({
      query: ({ id, formData }) => ({
        url: `/prescriptions/${id}/attachment`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Prescription', id }],
    }),
    sendPrescription: builder.mutation<any, number>({
      query: (id) => ({
        url: `/prescriptions/${id}/send`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Prescription', id }],
    }),
  }),
});

export const {
  useCreatePrescriptionMutation,
  useGetByAppointmentQuery,
  useGetByAnimalPrescriptionsQuery,
  useUpdatePrescriptionMutation,
  useAddAttachmentMutation,
  useSendPrescriptionMutation,
} = prescriptionsApi;
