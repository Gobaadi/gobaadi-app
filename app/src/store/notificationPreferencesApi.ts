import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface NotificationPreference {
  id: number;
  userId: number;
  appointmentReminders: boolean;
  chatMessages: boolean;
  promotionalOffers: boolean;
  systemUpdates: boolean;
  weatherAlerts: boolean;
  taskReminders: boolean;
  followUpReminders: boolean;
  hygieneReminders: boolean;
  prescriptionUpdates: boolean;
  labResults: boolean;
  vaccinationReminders: boolean;
  createdAt: string;
  updatedAt: string;
}

export const notificationPreferencesApi = createApi({
  reducerPath: 'notificationPreferencesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['NotificationPreference'],
  endpoints: (builder) => ({
    getPreferences: builder.query<NotificationPreference, void>({
      query: () => '/notifications/preferences',
      providesTags: ['NotificationPreference'],
    }),
    updatePreferences: builder.mutation<NotificationPreference, Partial<NotificationPreference>>({
      query: (body) => ({
        url: '/notifications/preferences',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['NotificationPreference'],
    }),
  }),
});

export const {
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
} = notificationPreferencesApi;
