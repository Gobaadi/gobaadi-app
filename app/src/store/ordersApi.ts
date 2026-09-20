import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface OrderItem {
  id: number;
  productId?: number;
  livestockId?: number;
  quantity: number;
  price: number;
  discount: number;
  name: string;
}

export interface Order {
  id: string;
  userId: number;
  totalPrice: number;
  tax: number;
  shippingFee: number;
  discountAmount: number;
  netAmount: number;
  deliveryAddress: any;
  deliveryMethod: string;
  trackingNumber?: string;
  eta?: string;
  status: string;
  paymentStatus: string;
  transactionId?: string;
  deliveryNotes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export const ordersApi = createApi({
  reducerPath: 'ordersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Order'],
  endpoints: (builder) => ({
    getMyOrders: builder.query<Order[], void>({
      query: () => '/orders/my',
      providesTags: (result) =>
        result
          ? [...result.map((o) => ({ type: 'Order' as const, id: o.id })), { type: 'Order', id: 'LIST' }]
          : [{ type: 'Order', id: 'LIST' }],
    }),
    getOrder: builder.query<Order, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),
    createOrder: builder.mutation<
      Order,
      { deliveryAddress: any; deliveryMethod: string; deliveryNotes?: string }
    >({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Order', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetMyOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
} = ordersApi;
