import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface Livestock {
  id: number;
  sellerId: number;
  species: string;
  breed: string;
  age: string;
  weight: number;
  gender: string;
  vaccinationHistory?: any;
  medicalHistory?: any;
  healthStatus: string;
  pregnancyStatus?: string;
  certification?: string;
  farmName: string;
  location: string;
  images: string[];
  videos: string[];
  documents: string[];
  price: number;
  isNegotiable: boolean;
  isFeatured: boolean;
  isReserved: boolean;
  isSold: boolean;
  status: string;
  isVerified: boolean;
  createdAt: string;
}

export const livestockApi = createApi({
  reducerPath: 'livestockApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Livestock', 'MyLivestock'],
  endpoints: (builder) => ({
    getLivestock: builder.query<
      Livestock[] | { data: Livestock[]; total: number },
      { page?: number; limit?: number; species?: string; breed?: string; minPrice?: number; maxPrice?: number }
    >({
      query: (params) => ({
        url: '/livestock',
        params,
      }),
      providesTags: (result) => {
        const items = result && 'data' in result ? result.data : (result || []);
        return [
          ...items.map((i) => ({ type: 'Livestock' as const, id: i.id })),
          { type: 'Livestock', id: 'LIST' },
        ];
      },
    }),
    getLivestockItem: builder.query<Livestock, number>({
      query: (id) => `/livestock/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Livestock', id }],
    }),
    getFeaturedLivestock: builder.query<Livestock[], void>({
      query: () => '/livestock/featured',
      providesTags: [{ type: 'Livestock', id: 'FEATURED' }],
    }),
    getMyListings: builder.query<Livestock[], void>({
      query: () => '/livestock/my',
      providesTags: [{ type: 'MyLivestock', id: 'LIST' }],
    }),
    createListing: builder.mutation<Livestock, Partial<Livestock>>({
      query: (body) => ({
        url: '/livestock',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Livestock', id: 'LIST' },
        { type: 'Livestock', id: 'FEATURED' },
        { type: 'MyLivestock', id: 'LIST' },
      ],
    }),
    updateListing: builder.mutation<Livestock, { id: number; body: Partial<Livestock> }>({
      query: ({ id, body }) => ({
        url: `/livestock/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Livestock', id },
        { type: 'Livestock', id: 'LIST' },
        { type: 'Livestock', id: 'FEATURED' },
        { type: 'MyLivestock', id: 'LIST' },
      ],
    }),
    reserveListing: builder.mutation<Livestock, { id: number; isReserved: boolean }>({
      query: ({ id, isReserved }) => ({
        url: `/livestock/${id}/reserve`,
        method: 'PATCH',
        body: { isReserved },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Livestock', id },
        { type: 'Livestock', id: 'LIST' },
        { type: 'Livestock', id: 'FEATURED' },
        { type: 'MyLivestock', id: 'LIST' },
      ],
    }),
    markSold: builder.mutation<Livestock, { id: number; isSold: boolean }>({
      query: ({ id, isSold }) => ({
        url: `/livestock/${id}/sold`,
        method: 'PATCH',
        body: { isSold },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Livestock', id },
        { type: 'Livestock', id: 'LIST' },
        { type: 'Livestock', id: 'FEATURED' },
        { type: 'MyLivestock', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetLivestockQuery,
  useGetLivestockItemQuery,
  useGetFeaturedLivestockQuery,
  useGetMyListingsQuery,
  useCreateListingMutation,
  useUpdateListingMutation,
  useReserveListingMutation,
  useMarkSoldMutation,
} = livestockApi;
