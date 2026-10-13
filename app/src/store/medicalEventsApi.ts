import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface MedicalEvent {
  id: number;
  appointmentId: number;
  animalId: number;
  doctorId: number;
  type: string;
  status?: string;
  data: Record<string, any>;
  nextFollowUpAt?: string;
  createdAt: string;
}

export interface CreateMedicalEventInput {
  appointmentId: number;
  type: string;
  data: Record<string, any>;
  nextFollowUpAt?: string;
}

export const medicalEventsApi = createApi({
  reducerPath: 'medicalEventsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['MedicalEvent'],
  endpoints: (builder) => ({
    getByAnimalMedicalEvents: builder.query<MedicalEvent[], { animalId: string; type?: string; page?: string; limit?: string }>({
      query: ({ animalId, ...params }) => ({
        url: `/animals/${animalId}/medical-events`,
        params,
      }),
      // Backend returns PaginatedResult<MedicalEvent>; older/edge responses
      // may be a bare array — normalise so callers always get an array.
      transformResponse: (response: { data?: MedicalEvent[] } | MedicalEvent[] | null | undefined) =>
        Array.isArray(response) ? response : response?.data ?? [],
      providesTags: (_result, _error, { animalId }) => [{ type: 'MedicalEvent', id: animalId }],
    }),
    createMedicalEvent: builder.mutation<MedicalEvent, { animalId: string; data: CreateMedicalEventInput }>({
      query: ({ animalId, data }) => ({
        url: `/animals/${animalId}/medical-events`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { animalId }) => [
        { type: 'MedicalEvent', id: animalId },
      ],
    }),
    getMedicalEventById: builder.query<MedicalEvent, string>({
      query: (id) => `/medical-events/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'MedicalEvent', id }],
    }),
    updateMedicalEvent: builder.mutation<MedicalEvent, { id: string; data: Partial<MedicalEvent> }>({
      query: ({ id, data }) => ({
        url: `/medical-events/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'MedicalEvent', id }],
    }),
    removeMedicalEvent: builder.mutation<void, string>({
      query: (id) => ({
        url: `/medical-events/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'MedicalEvent', id }],
    }),
  }),
});

export const {
  useGetByAnimalMedicalEventsQuery,
  useCreateMedicalEventMutation,
  useGetMedicalEventByIdQuery,
  useUpdateMedicalEventMutation,
  useRemoveMedicalEventMutation,
} = medicalEventsApi;
