import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface Clinic {
  id: number;
  userId: number;
  name: string;
  location: string;
  description: string;
  avatar?: string;
  businessHours?: any;
  rating: number;
  isVerified: boolean;
  doctors: any[];
}

export const clinicsApi = createApi({
  reducerPath: 'clinicsApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getClinics: builder.query<Clinic[], void>({
      query: () => '/clinics',
    }),
    getClinic: builder.query<Clinic, number>({
      query: (id) => `/clinics/${id}`,
    }),
  }),
});

export const {
  useGetClinicsQuery,
  useGetClinicQuery,
} = clinicsApi;
