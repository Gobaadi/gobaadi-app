import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface UserProfile {
  id: number;
  phone: string;
  role: string;
  name?: string;
  email?: string;
  avatar?: string;
  verified: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  phone?: string;
}

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Profile'],
  endpoints: (builder) => ({
    getMyProfile: builder.query<UserProfile, void>({
      query: () => '/users/me',
      providesTags: ['Profile'],
    }),
    updateMyProfile: builder.mutation<UserProfile, UpdateProfileInput>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      invalidatesTags: ['Profile'],
    }),
  }),
});

export const { useGetMyProfileQuery, useUpdateMyProfileMutation } = usersApi;
