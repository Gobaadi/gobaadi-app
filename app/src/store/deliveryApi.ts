import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface DeliveryLog {
  status: string;
  timestamp: string;
  message?: string;
  location?: string;
}

export interface Delivery {
  id: number;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  timeline: DeliveryLog[];
  createdAt: string;
  updatedAt: string;
}

export const deliveryApi = createApi({
  reducerPath: 'deliveryApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    trackDelivery: builder.query<Delivery, string>({
      query: (trackingNumber) => `/delivery/track/${trackingNumber}`,
    }),
    getDeliveryByOrderId: builder.query<Delivery, string>({
      query: (orderId) => `/delivery/order/${orderId}`,
    }),
  }),
});

export const {
  useTrackDeliveryQuery,
  useGetDeliveryByOrderIdQuery,
} = deliveryApi;
