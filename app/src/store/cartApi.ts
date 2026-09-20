import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface CartItemSummary {
  id: number;
  productId?: number;
  livestockId?: number;
  name: string;
  image?: string;
  unitPrice: number;
  discountPrice: number;
  quantity: number;
  rowTotal: number;
  isAvailable: boolean;
  warning?: string;
}

export interface CartSummary {
  items: CartItemSummary[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export const cartApi = createApi({
  reducerPath: 'cartApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Cart'],
  endpoints: (builder) => ({
    getCart: builder.query<CartSummary, void>({
      query: () => '/cart',
      providesTags: [{ type: 'Cart', id: 'CURRENT' }],
    }),
    addCartItem: builder.mutation<
      any,
      { productId?: number; livestockId?: number; quantity: number }
    >({
      query: (body) => ({
        url: '/cart/add',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Cart', id: 'CURRENT' }],
    }),
    updateCartItem: builder.mutation<any, { id: number; quantity: number }>({
      query: ({ id, quantity }) => ({
        url: `/cart/item/${id}`,
        method: 'PUT',
        body: { quantity },
      }),
      invalidatesTags: [{ type: 'Cart', id: 'CURRENT' }],
    }),
    removeCartItem: builder.mutation<any, number>({
      query: (id) => ({
        url: `/cart/item/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Cart', id: 'CURRENT' }],
    }),
    clearCart: builder.mutation<any, void>({
      query: () => ({
        url: '/cart',
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Cart', id: 'CURRENT' }],
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddCartItemMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} = cartApi;
