import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface Review {
  id: number;
  userId: number;
  targetType: string;
  targetId: number | string;
  rating: number;
  text: string;
  images?: string[];
  videos?: string[];
  reply?: string;
  helpfulCount: number;
  isReported: boolean;
  isApproved: boolean;
  createdAt: string;
  user?: { name: string; avatar?: string };
}

export const reviewsApi = createApi({
  reducerPath: 'reviewsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Review'],
  endpoints: (builder) => ({
    getReviews: builder.query<Review[], { targetType: string; targetId: number | string }>({
      query: ({ targetType, targetId }) => `/reviews/${targetType}/${targetId}`,
      providesTags: (result) =>
        result
          ? [...result.map((r) => ({ type: 'Review' as const, id: r.id })), { type: 'Review', id: 'LIST' }]
          : [{ type: 'Review', id: 'LIST' }],
    }),
    createReview: builder.mutation<Review, Partial<Review>>({
      query: (body) => ({
        url: '/reviews',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Review', id: 'LIST' }],
    }),
    voteHelpful: builder.mutation<any, number>({
      query: (id) => ({
        url: `/reviews/${id}/helpful`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Review', id }],
    }),
    reportReview: builder.mutation<any, number>({
      query: (id) => ({
        url: `/reviews/${id}/report`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Review', id }],
    }),
  }),
});

export const {
  useGetReviewsQuery,
  useCreateReviewMutation,
  useVoteHelpfulMutation,
  useReportReviewMutation,
} = reviewsApi;
