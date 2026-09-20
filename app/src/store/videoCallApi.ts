import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface JoinSessionResponse {
  token: string;
  channelName: string;
  appId: string;
}

export interface CreateSessionResponse {
  sessionId: number;
  channelName: string;
}

export const videoCallApi = createApi({
  reducerPath: 'videoCallApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['VideoSession'],
  endpoints: (builder) => ({
    createSession: builder.mutation<CreateSessionResponse, number>({
      query: (appointmentId) => ({
        url: '/video-call/create',
        method: 'POST',
        body: { appointmentId },
      }),
    }),
    joinSession: builder.query<JoinSessionResponse, number>({
      query: (appointmentId) => `/video-call/join/${appointmentId}`,
    }),
    endSession: builder.mutation<void, number>({
      query: (appointmentId) => ({
        url: `/video-call/end/${appointmentId}`,
        method: 'POST',
      }),
    }),
    getToken: builder.query<JoinSessionResponse, number>({
      query: (appointmentId) => `/video-call/token/${appointmentId}`,
    }),
  }),
});

export const {
  useCreateSessionMutation,
  useJoinSessionQuery,
  useEndSessionMutation,
  useGetTokenQuery,
} = videoCallApi;
