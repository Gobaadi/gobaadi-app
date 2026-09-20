import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface Service {
  id: number;
  providerType: string;
  providerId: number;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  preparationInstructions?: string;
  requirements?: string;
  isOnline: boolean;
  isOffline: boolean;
  location?: string;
  isActive: boolean;
}

export const servicesApi = createApi({
  reducerPath: 'servicesApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getServices: builder.query<Service[], { providerType?: string; providerId?: number }>({
      query: (params) => ({
        url: '/services',
        params,
      }),
    }),
    getService: builder.query<Service, number>({
      query: (id) => `/services/${id}`,
    }),
  }),
});

export const {
  useGetServicesQuery,
  useGetServiceQuery,
} = servicesApi;
