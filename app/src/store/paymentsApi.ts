import { createApi } from '@reduxjs/toolkit/query/react';
import { ordersApi } from './ordersApi';
import { doctorPortalApi } from './doctorPortalApi';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface PaymentIntentResponse {
  transactionId: string;
  amount: number;
  status: string;
  provider: string;
  redirectUrl?: string;
  callbackUrl?: string;
}

export const paymentsApi = createApi({
  reducerPath: 'paymentsApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    createPaymentIntent: builder.mutation<
      PaymentIntentResponse,
      { orderId?: string; bookingId?: number; provider: string }
    >({
      query: (body) => ({
        url: '/payments/intent',
        method: 'POST',
        body,
      }),
    }),
    simulateSuccess: builder.mutation<any, string>({
      query: (transactionId) => ({
        url: '/payments/simulate-success',
        method: 'POST',
        body: { transactionId },
      }),
      async onQueryStarted(_transactionId, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        // Cross-slice invalidation: a payment status change makes cached orders/bookings stale.
        dispatch(ordersApi.util.invalidateTags(['Order']));
        dispatch(doctorPortalApi.util.invalidateTags(['DoctorBookings']));
      },
    }),
    simulateFailure: builder.mutation<any, string>({
      query: (transactionId) => ({
        url: '/payments/simulate-fail',
        method: 'POST',
        body: { transactionId },
      }),
      async onQueryStarted(_transactionId, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(ordersApi.util.invalidateTags(['Order']));
        dispatch(doctorPortalApi.util.invalidateTags(['DoctorBookings']));
      },
    }),
  }),
});

export const {
  useCreatePaymentIntentMutation,
  useSimulateSuccessMutation,
  useSimulateFailureMutation,
} = paymentsApi;
