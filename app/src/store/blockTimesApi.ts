import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface BlockTime {
  id: number;
  doctorId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  note?: string;
  createdAt: string;
}

export interface CreateBlockTimeInput {
  startDate: string;
  endDate: string;
  reason?: string;
  note?: string;
  force?: boolean;
}

export interface FeeEstimate {
  totalFee: number;
  appointments: { id: number; patientName: string; fee: number }[];
}

export interface BlockTimeConflict {
  id: number;
  startAt: string;
  patientId: number;
  price: number;
  animalId?: number | null;
  paymentStatus?: string;
  animalName?: string | null;
  ownerName?: string | null;
}

export interface BlockTimeBilling {
  appointmentsFeeTotal: number;
  cancellationFeesTotal: number;
  totalFee: number;
  cancellationFeeRate: number;
  status: 'Pending' | 'Paid';
}

export interface BlockTimeConflictPayload {
  statusCode: number;
  message: string;
  conflicts: BlockTimeConflict[];
  estimatedWalletDeduction: number;
  billing: BlockTimeBilling;
}

export interface CreateBlockTimeResult {
  timeOff: BlockTime;
  cancelledAppointments: BlockTimeConflict[];
  refundedTotal: number;
  cancellationFeesTotal: number;
  walletDeduction: number;
  billing: BlockTimeBilling;
}

export const blockTimesApi = createApi({
  reducerPath: 'blockTimesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['BlockTime'],
  endpoints: (builder) => ({
    getBlockTimes: builder.query<BlockTime[], string>({
      query: (doctorId) => `/doctors/${doctorId}/block-times`,
      providesTags: ['BlockTime'],
    }),
    createBlockTime: builder.mutation<CreateBlockTimeResult, { id: number; data: CreateBlockTimeInput }>({
      query: ({ id, data }) => ({
        url: `/doctors/${id}/block-times`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['BlockTime'],
    }),
    removeBlockTime: builder.mutation<void, { id: number; blockId: number }>({
      query: ({ id, blockId }) => ({
        url: `/doctors/${id}/block-times/${blockId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BlockTime'],
    }),
    calculateFee: builder.query<FeeEstimate, { id: number; appointmentId: string }>({
      query: ({ id, appointmentId }) => ({
        url: `/doctors/${id}/block-times/calculate-fee`,
        params: { appointmentId },
      }),
    }),
  }),
});

export const {
  useGetBlockTimesQuery,
  useCreateBlockTimeMutation,
  useRemoveBlockTimeMutation,
  useCalculateFeeQuery,
} = blockTimesApi;
