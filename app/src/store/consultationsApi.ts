import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';
import { doctorPortalApi } from './doctorPortalApi';

export interface Consultation {
  id: number;
  patientId: number;
  appointmentId: number;
  doctorId: number;
  type: string;
  status: 'ONGOING' | 'COMPLETED' | string;
  data: Record<string, any> & { startedAt?: string };
  nextFollowUpAt?: string | null;
  createdAt: string;
}

export function consultationStartedAt(consultation: Consultation): string {
  return consultation.data?.startedAt || consultation.createdAt;
}

export const consultationsApi = createApi({
  reducerPath: 'consultationsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Consultation'],
  endpoints: (builder) => ({
    getById: builder.query<Consultation, string>({
      query: (id) => `/consultations/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Consultation', id }],
    }),
    getForAppointment: builder.query<Consultation | null, string>({
      query: (appointmentId) => `/consultations/appointment/${appointmentId}`,
      providesTags: (_result, _error, appointmentId) => [
        { type: 'Consultation', id: appointmentId },
      ],
    }),
    startForAppointment: builder.mutation<Consultation, string>({
      query: (appointmentId) => ({
        url: `/consultations/appointment/${appointmentId}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, appointmentId) => [
        { type: 'Consultation', id: appointmentId },
      ],
    }),
    endConsultation: builder.mutation<Consultation, string>({
      query: (id) => ({
        url: `/consultations/${id}/end`,
        method: 'POST',
      }),
      // Invalidate every Consultation tag: the id here is the event id while
      // getForAppointment is tagged by appointmentId, and other participants'
      // chats must refetch too when a session ends.
      invalidatesTags: () => [{ type: 'Consultation' }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(doctorPortalApi.util.invalidateTags(['DoctorBookings']));
        } catch {}
      },
    }),
  }),
});

export const {
  useGetByIdQuery,
  useGetForAppointmentQuery,
  useLazyGetForAppointmentQuery,
  useStartForAppointmentMutation,
  useEndConsultationMutation,
} = consultationsApi;
