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
  specializations?: string[];
  experiences?: DoctorExperience[];
  licenseNumber?: string;
  location?: string;
  credentialDocuments?: string[];
  credentialPeriod?: CredentialPeriod | null;
}

export interface CredentialPeriod {
  startMonth?: string;
  startYear?: string;
  endMonth?: string;
  endYear?: string;
  isCurrentlyStudying?: boolean;
}

export interface DoctorExperience {
  title: string;
  organization: string;
  duration: string;
  description?: string;
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
  animalId?: number;
  patientName?: string;
  patientPhone?: string;
  patientAvatar?: string;
  animalName?: string;
  animalSpecies?: string;
  animalBreed?: string;
  animalAge?: string;
  animalImage?: string;
  symptoms?: string | string[];
  consultationType?: string;
  reasonForConsultation?: string;
  price?: number;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  consultationNotes?: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  createdAt: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorAvatar?: string;
  patientImage?: string;
}

export interface TodayStats {
  totalToday: number;
  completedToday: number;
}

export interface DashboardStats {
  totalPatients: number;
  totalConsultations: number;
  yearsOfExperience: string;
  specializations: string[];
  qualifications: string[];
  consultationFee: number;
  rating: number;
}

export interface DoctorSchedule {
  appointments: DoctorAppointment[];
  blockTimes: BlockTime[];
}

export interface BlockTime {
  id: number;
  doctorId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  note?: string;
  isAllDay: boolean;
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
  tagTypes: ['DoctorBookings', 'Availability', 'Dashboard', 'DoctorProfile'],
  endpoints: (builder) => ({
    getMyDoctorProfile: builder.query<DoctorProfile, void>({
      query: () => '/doctors/me',
      providesTags: ['DoctorProfile'],
    }),
    getDoctorBookings: builder.query<DoctorAppointment[], { filter?: string; consultationType?: string; search?: string } | void>({
      query: (params) => {
        const query = new URLSearchParams();
        if (params && 'filter' in params && params.filter) query.set('filter', params.filter);
        if (params && 'consultationType' in params && params.consultationType) query.set('consultationType', params.consultationType);
        if (params && 'search' in params && params.search) query.set('search', params.search);
        const qs = query.toString();
        return `/doctors/bookings/all${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['DoctorBookings'],
    }),
    getBookingById: builder.query<DoctorAppointment, string>({
      query: (id) => `/doctors/bookings/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'DoctorBookings', id }],
    }),
    getTodayStats: builder.query<TodayStats, void>({
      query: () => '/doctors/bookings/stats/today',
      providesTags: ['DoctorBookings'],
    }),
    searchBookings: builder.query<
      DoctorAppointment[],
      { search?: string; date?: string; consultationType?: string; page?: number; limit?: number }
    >({
      query: (params) => {
        const query = new URLSearchParams();
        if (params.search) query.set('search', params.search);
        if (params.date) query.set('date', params.date);
        if (params.consultationType) query.set('consultationType', params.consultationType);
        if (params.page) query.set('page', String(params.page));
        if (params.limit) query.set('limit', String(params.limit));
        const qs = query.toString();
        return `/doctors/bookings/search${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['DoctorBookings'],
    }),
    getRecentCompleted: builder.query<DoctorAppointment[], number>({
      query: (days = 2) => `/doctors/bookings/recent-completed?days=${days}`,
      providesTags: ['DoctorBookings'],
    }),
    completeBooking: builder.mutation<DoctorAppointment, string>({
      query: (id) => ({ url: `/doctors/bookings/${id}/complete`, method: 'PATCH' }),
      invalidatesTags: ['DoctorBookings'],
    }),
    startConsultation: builder.mutation<
      DoctorAppointment,
      { id: string; consultationNotes?: string }
    >({
      query: ({ id, consultationNotes }) => ({
        url: `/doctors/bookings/${id}/start-consultation`,
        method: 'PATCH',
        body: { consultationNotes },
      }),
      invalidatesTags: ['DoctorBookings'],
    }),
    cancelBooking: builder.mutation<
      DoctorAppointment,
      { id: string; reason: string; note?: string }
    >({
      query: ({ id, reason, note }) => ({
        url: `/doctors/bookings/${id}/cancel`,
        method: 'PATCH',
        body: note ? { reason, note } : { reason },
      }),
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
    getDoctorSchedule: builder.query<
      DoctorSchedule,
      { doctorId: number; date?: string; consultationType?: string; status?: string; month?: number; year?: number }
    >({
      query: ({ doctorId, ...params }) => {
        const query = new URLSearchParams();
        if (params.date) query.set('date', params.date);
        if (params.consultationType) query.set('consultationType', params.consultationType);
        if (params.status) query.set('status', params.status);
        if (params.month) query.set('month', String(params.month));
        if (params.year) query.set('year', String(params.year));
        const qs = query.toString();
        return `/doctors/${doctorId}/schedule${qs ? `?${qs}` : ''}`;
      },
    }),
    getDoctorScheduleList: builder.query<
      DoctorAppointment[],
      { doctorId: number; month?: number; year?: number }
    >({
      query: ({ doctorId, ...params }) => {
        const query = new URLSearchParams();
        if (params.month) query.set('month', String(params.month));
        if (params.year) query.set('year', String(params.year));
        const qs = query.toString();
        return `/doctors/${doctorId}/schedule/list${qs ? `?${qs}` : ''}`;
      },
    }),
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => '/doctors/me/dashboard-stats',
      providesTags: ['Dashboard'],
    }),
    updateQualifications: builder.mutation<DoctorProfile, string[]>({
      query: (qualifications) => ({
        url: '/doctors/me/qualifications',
        method: 'PATCH',
        body: { qualifications },
      }),
      invalidatesTags: ['Dashboard', 'DoctorProfile'],
    }),
    updateSpecializations: builder.mutation<DoctorProfile, string[]>({
      query: (specializations) => ({
        url: '/doctors/me/specializations',
        method: 'PATCH',
        body: { specializations },
      }),
      invalidatesTags: ['Dashboard', 'DoctorProfile'],
    }),
    updateExperiences: builder.mutation<DoctorProfile, DoctorExperience[]>({
      query: (experiences) => ({
        url: '/doctors/me/experiences',
        method: 'PATCH',
        body: { experiences },
      }),
      invalidatesTags: ['Dashboard', 'DoctorProfile'],
    }),
    updateProfile: builder.mutation<
      DoctorProfile,
      {
        name?: string;
        specialty?: string;
        experience?: string;
        avatar?: string;
        bio?: string;
        consultationFee?: number;
        licenseNumber?: string;
        location?: string;
        credentialPeriod?: CredentialPeriod;
      }
    >({
      query: (dto) => ({
        url: '/doctors/me',
        method: 'PATCH',
        body: dto,
      }),
      invalidatesTags: ['Dashboard', 'DoctorProfile'],
    }),
    uploadCredentialDocument: builder.mutation<DoctorProfile, FormData>({
      query: (formData) => ({
        url: '/doctors/me/credential-documents',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Dashboard', 'DoctorProfile'],
    }),
    uploadMyPhoto: builder.mutation<{ url: string }, FormData>({
      query: (formData) => ({
        url: '/doctors/me/photo',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Dashboard', 'DoctorProfile'],
    }),
    updateCredentialDocuments: builder.mutation<DoctorProfile, string[]>({
      query: (documents) => ({
        url: '/doctors/me/credential-documents',
        method: 'PATCH',
        body: { documents },
      }),
      invalidatesTags: ['Dashboard', 'DoctorProfile'],
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
  useGetBookingByIdQuery,
  useGetTodayStatsQuery,
  useSearchBookingsQuery,
  useGetRecentCompletedQuery,
  useCompleteBookingMutation,
  useStartConsultationMutation,
  useCancelBookingMutation,
  useRescheduleBookingMutation,
  useGetDoctorScheduleQuery,
  useGetDoctorScheduleListQuery,
  useGetDashboardStatsQuery,
  useUpdateQualificationsMutation,
  useUpdateSpecializationsMutation,
  useUpdateExperiencesMutation,
  useUpdateProfileMutation,
  useUploadCredentialDocumentMutation,
  useUploadMyPhotoMutation,
  useUpdateCredentialDocumentsMutation,
  useGetAvailabilityQuery,
  useSetAvailabilityMutation,
} = doctorPortalApi;
