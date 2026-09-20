import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface Notification {
  id: number;
  userId: number;
  title: string;
  body: string;
  type: string;
  referenceType?: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Notification'],
  endpoints: (builder) => ({
    getNotifications: builder.query<Notification[], void>({
      query: () => '/notifications',
      providesTags: (result) =>
        result
          ? [...result.map((n) => ({ type: 'Notification' as const, id: n.id })), { type: 'Notification', id: 'LIST' }]
          : [{ type: 'Notification', id: 'LIST' }],
    }),
    markNotificationRead: builder.mutation<Notification, number>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    markAllNotificationsRead: builder.mutation<any, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    registerPushToken: builder.mutation<{ success: boolean }, { token: string; deviceId?: string }>({
      query: (body) => ({
        url: '/notifications/push-token',
        method: 'POST',
        body,
      }),
    }),
    unregisterPushToken: builder.mutation<{ success: boolean }, { token: string }>({
      query: (body) => ({
        url: '/notifications/push-token',
        method: 'DELETE',
        body,
      }),
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useRegisterPushTokenMutation,
  useUnregisterPushTokenMutation,
} = notificationsApi;
