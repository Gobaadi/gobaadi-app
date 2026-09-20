import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface ReferralInfo {
  referralCode: string;
  totalEarned: number;
  pendingAmount: number;
  referralCount: number;
  shareLink: string;
}

export const referralsApi = createApi({
  reducerPath: 'referralsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Referral'],
  endpoints: (builder) => ({
    getMyReferral: builder.query<ReferralInfo, void>({
      query: () => '/referrals/me',
      providesTags: ['Referral'],
    }),
    claimReferral: builder.mutation<ReferralInfo, string>({
      query: (code) => ({ url: '/referrals/claim', method: 'POST', body: { code } }),
      invalidatesTags: ['Referral'],
    }),
  }),
});

export const { useGetMyReferralQuery, useClaimReferralMutation } = referralsApi;
