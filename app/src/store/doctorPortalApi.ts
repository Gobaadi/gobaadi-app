import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface DoctorProfile {
  id: number;
  userId?: number | null;
  name: string;
  specialty: string;
  experience: string;
  rating: number;
  avatar: string;
  bio: string;
  qualifications: string[];
}

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'RESCHEDULED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface DoctorAppointment {
  id: number;
  doctorId: number;
  patientId: number;
  patientName?: string;
  patientPhone?: string;
  animalName?: string;
  animalSpecies?: string;
  animalBreed?: string;
  animalAge?: string;
  animalImage?: string;
  symptoms?: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface AvailabilityEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
  bufferMinutes?: number;
}

export interface Availability extends AvailabilityEntry {
  id: number;
  doctorId: number;
  isActive: boolean;
}

export const doctorPortalApi = createApi({
  reducerPath: 'doctorPortalApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['DoctorBookings', 'Availability'],
  endpoints: (builder) => ({
    getMyDoctorProfile: builder.query<DoctorProfile, void>({
      query: () => '/doctors/me',
    }),
    getDoctorBookings: builder.query<DoctorAppointment[], void>({
      query: () => '/doctors/bookings/all',
      providesTags: ['DoctorBookings'],
    }),
    completeBooking: builder.mutation<DoctorAppointment, string>({
      query: (id) => ({ url: `/doctors/bookings/${id}/complete`, method: 'PATCH' }),
      invalidatesTags: ['DoctorBookings'],
    }),
    cancelBooking: builder.mutation<DoctorAppointment, string>({
      query: (id) => ({ url: `/doctors/bookings/${id}/cancel`, method: 'PATCH' }),
      invalidatesTags: ['DoctorBookings'],
    }),
    rescheduleBooking: builder.mutation<
      DoctorAppointment,
      { id: string; date: string; time: string }
    >({
      query: ({ id, date, time }) => ({
        url: `/doctors/bookings/${id}/reschedule`,
        method: 'PATCH',
        body: { date, time },
      }),
      invalidatesTags: ['DoctorBookings'],
    }),
    getAvailability: builder.query<Availability[], number>({
      query: (doctorId) => `/doctors/${doctorId}/availability`,
      providesTags: ['Availability'],
    }),
    setAvailability: builder.mutation<
      Availability[],
      { doctorId: number; entries: AvailabilityEntry[] }
    >({
      query: ({ doctorId, entries }) => ({
        url: `/doctors/${doctorId}/availability`,
        method: 'POST',
        body: { entries },
      }),
      invalidatesTags: ['Availability'],
    }),
  }),
});

export const {
  useGetMyDoctorProfileQuery,
  useGetDoctorBookingsQuery,
  useCompleteBookingMutation,
  useCancelBookingMutation,
  useRescheduleBookingMutation,
  useGetAvailabilityQuery,
  useSetAvailabilityMutation,
} = doctorPortalApi;
