import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface WishlistItem {
  id: number;
  userId: number;
  productId?: number;
  livestockId?: number;
  createdAt: string;
  product?: any;
  livestock?: any;
}

export const wishlistApi = createApi({
  reducerPath: 'wishlistApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Wishlist'],
  endpoints: (builder) => ({
    getWishlist: builder.query<WishlistItem[], void>({
      query: () => '/wishlist',
      providesTags: (result) =>
        result
          ? [...result.map((i) => ({ type: 'Wishlist' as const, id: i.id })), { type: 'Wishlist', id: 'LIST' }]
          : [{ type: 'Wishlist', id: 'LIST' }],
    }),
    addToWishlist: builder.mutation<WishlistItem, { productId?: number; livestockId?: number }>({
      query: (body) => ({
        url: '/wishlist',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Wishlist', id: 'LIST' }],
    }),
    removeFromWishlist: builder.mutation<any, number>({
      query: (id) => ({
        url: `/wishlist/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Wishlist', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} = wishlistApi;
