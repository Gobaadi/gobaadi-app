import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface AlertItem {
  id: number;
  title: string;
  location: string;
  crop: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionType: 'MANAGE' | 'SCHEDULE';
  isActive: boolean;
}

export const alertsApi = createApi({
  reducerPath: 'alertsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Alert'],
  endpoints: (builder) => ({
    getAlerts: builder.query<AlertItem[], void>({
      query: () => '/alerts',
      providesTags: (result) =>
        result
          ? [...result.map((a) => ({ type: 'Alert' as const, id: a.id })), { type: 'Alert', id: 'LIST' }]
          : [{ type: 'Alert', id: 'LIST' }],
    }),
    actOnAlert: builder.mutation<{ success: boolean }, { id: number; actionChoice: 'MANAGE' | 'SCHEDULE' }>({
      query: ({ id, actionChoice }) => ({
        url: `/alerts/${id}/action`,
        method: 'POST',
        body: { actionChoice },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Alert', id }, { type: 'Alert', id: 'LIST' }],
    }),
  }),
});

export const { useGetAlertsQuery, useActOnAlertMutation } = alertsApi;
