import { createApi } from '@reduxjs/toolkit/query/react';
import { doctorPortalApi } from './doctorPortalApi';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface DoctorSummary {
  id: number;
  name: string;
  specialty: string;
  experience: string;
  rating: number;
  avatar: string;
  bio: string;
}

export const doctorsApi = createApi({
  reducerPath: 'doctorsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Doctor', 'Slot'],
  endpoints: (builder) => ({
    getDoctors: builder.query<DoctorSummary[], void>({
      query: () => '/doctors',
      providesTags: (result) =>
        result
          ? [...result.map((d) => ({ type: 'Doctor' as const, id: d.id })), { type: 'Doctor', id: 'LIST' }]
          : [{ type: 'Doctor', id: 'LIST' }],
    }),
    getDoctorById: builder.query<DoctorSummary, string>({
      query: (id) => `/doctors/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Doctor', id }],
    }),
    getSlots: builder.query<string[], { doctorId: string; date: string }>({
      query: ({ doctorId, date }) => `/doctors/${doctorId}/slots?date=${date}`,
      providesTags: (_result, _error, { doctorId, date }) => [{ type: 'Slot', id: `${doctorId}-${date}` }],
    }),
    bookSlot: builder.mutation<
      void,
      {
        doctorId: string;
        date: string;
        time: string;
        consultationType?: string;
        animalId?: number;
        reasonForConsultation?: string;
      }
    >({
      query: (body) => ({ url: '/doctors/book', method: 'POST', body }),
      invalidatesTags: (_result, _error, { doctorId, date }) => [{ type: 'Slot', id: `${doctorId}-${date}` }],
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(doctorPortalApi.util.invalidateTags(['DoctorBookings']));
      },
    }),
  }),
});

export const {
  useGetDoctorsQuery,
  useGetDoctorByIdQuery,
  useGetSlotsQuery,
  useBookSlotMutation,
} = doctorsApi;
