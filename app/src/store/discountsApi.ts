import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface PatientDiscount {
  id: number;
  doctorId: number;
  patientId: number;
  percent: number;
  isActive: boolean;
  createdAt: string;
}

export interface Patient {
  id: number;
  userId?: number | null;
  name: string;
  breed: string;
  weight: string;
  age: string;
  color: string;
  image?: string;
  ownerName?: string;
  ownerAvatar?: string;
  discount?: PatientDiscount;
  /** Row built from the booking owner because they own no animals. */
  ownerOnly?: boolean;
}

export interface Discount {
  id: number;
  patientId: number;
  doctorId: number;
  percent: number;
  type: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AvailableDiscount {
  id: number;
  code: string;
  description: string;
  percent: number;
  type: string;
  expiresAt: string;
  isActive: boolean;
}

export interface MyDiscount {
  id: number;
  code: string;
  percent: number;
  type: string;
  usedAt?: string;
  expiresAt: string;
}

export interface DiscountValidation {
  valid: boolean;
  discount?: AvailableDiscount;
  message: string;
}

export const discountsApi = createApi({
  reducerPath: 'discountsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Discount', 'PatientDiscount'],
  endpoints: (builder) => ({
    getMyPatients: builder.query<Patient[], { search?: string; discountGiven?: string }>({
      query: (params) => ({
        url: '/doctors/me/patients',
        params,
      }),
      providesTags: ['PatientDiscount'],
    }),
    getDiscountForPatient: builder.query<Discount, string>({
      query: (patientId) => `/discounts/${patientId}`,
      providesTags: (_result, _error, patientId) => [{ type: 'Discount', id: patientId }],
    }),
    applyDiscount: builder.mutation<Discount, { code: string }>({
      query: (body) => ({
        url: '/discounts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Discount', 'PatientDiscount'],
    }),
    editDiscount: builder.mutation<Discount, { id: number; data: { percent: number } }>({
      query: ({ id, data }) => ({
        url: `/discounts/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Discount', 'PatientDiscount'],
    }),
    createDiscount: builder.mutation<Discount, { patientId: number; percent: number }>({
      query: (body) => ({
        url: '/discounts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Discount', 'PatientDiscount'],
    }),
    removeDiscount: builder.mutation<void, number>({
      query: (id) => ({
        url: `/discounts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Discount', 'PatientDiscount'],
    }),
    getAvailableDiscounts: builder.query<AvailableDiscount[], void>({
      query: () => '/discounts/available',
      providesTags: ['Discount'],
    }),
    validateDiscount: builder.mutation<DiscountValidation, { code: string }>({
      query: (body) => ({
        url: '/discounts/validate',
        method: 'POST',
        body,
      }),
    }),
    applyDiscountCode: builder.mutation<any, { code: string; appointmentId: number }>({
      query: (body) => ({
        url: '/discounts/apply',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Discount'],
    }),
    getMyDiscounts: builder.query<MyDiscount[], void>({
      query: () => '/discounts/my',
      providesTags: ['Discount'],
    }),
  }),
});

export const {
  useGetMyPatientsQuery,
  useGetDiscountForPatientQuery,
  useApplyDiscountMutation,
  useEditDiscountMutation,
  useCreateDiscountMutation,
  useRemoveDiscountMutation,
  useGetAvailableDiscountsQuery,
  useValidateDiscountMutation,
  useApplyDiscountCodeMutation,
  useGetMyDiscountsQuery,
} = discountsApi;
