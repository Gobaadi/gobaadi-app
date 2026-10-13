import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface WalletBalance {
  balance: number;
  coins: number;
  currency?: string;
}

export interface WalletTransaction {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  createdAt: string;
}

interface BackendWalletTransaction {
  id: number;
  walletId: number;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

interface PaginatedTransactions {
  data: BackendWalletTransaction[];
  page: number;
  limit: number;
  total: number;
}

function mapTransaction(tx: BackendWalletTransaction): WalletTransaction {
  return {
    id: tx.id,
    type: tx.amount >= 0 ? 'credit' : 'debit',
    amount: Math.abs(tx.amount),
    description: tx.reason ?? '',
    createdAt: tx.createdAt,
  };
}

export const walletApi = createApi({
  reducerPath: 'walletApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Wallet', 'WalletTransaction'],
  endpoints: (builder) => ({
    getBalance: builder.query<WalletBalance, void>({
      query: () => '/wallet',
      providesTags: ['Wallet'],
    }),
    getTransactions: builder.query<WalletTransaction[], { page?: string; limit?: string }>({
      query: (params) => ({
        url: '/wallet/transactions',
        params,
      }),
      transformResponse: (response: PaginatedTransactions) =>
        (response?.data ?? []).map(mapTransaction),
      providesTags: ['WalletTransaction'],
    }),
    topUp: builder.mutation<any, { amount: number }>({
      query: (body) => ({
        url: '/wallet/topup',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet', 'WalletTransaction'],
    }),
    pay: builder.mutation<any, { amount: number; description?: string }>({
      query: (body) => ({
        url: '/wallet/pay',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet', 'WalletTransaction'],
    }),
    earnCoins: builder.mutation<any, { amount: number; reason?: string }>({
      query: (body) => ({
        url: '/wallet/earn-coins',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet', 'WalletTransaction'],
    }),
    spendCoins: builder.mutation<any, { amount: number; reason?: string }>({
      query: (body) => ({
        url: '/wallet/spend-coins',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet', 'WalletTransaction'],
    }),
  }),
});

export const {
  useGetBalanceQuery,
  useGetTransactionsQuery,
  useTopUpMutation,
  usePayMutation,
  useEarnCoinsMutation,
  useSpendCoinsMutation,
} = walletApi;
