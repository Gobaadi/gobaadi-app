import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface TicketMessage {
  id: number;
  sender: string;
  message: string;
  createdAt: string;
}

export interface Ticket {
  id: number;
  userId: number;
  subject: string;
  message: string;
  status: string;
  attachmentUrl?: string | null;
  attachmentFileName?: string | null;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketInput {
  subject: string;
  message?: string;
}

export const supportApi = createApi({
  reducerPath: 'supportApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['SupportTicket'],
  endpoints: (builder) => ({
    createTicket: builder.mutation<Ticket, FormData>({
      query: (body) => ({
        url: '/support/tickets',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SupportTicket'],
    }),
    getMyTickets: builder.query<Ticket[], void>({
      query: () => '/support/tickets',
      providesTags: ['SupportTicket'],
    }),
    getTicketById: builder.query<Ticket, string>({
      query: (id) => `/support/tickets/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'SupportTicket', id }],
    }),
    replyToTicket: builder.mutation<any, { id: string; message: string }>({
      query: ({ id, message }) => ({
        url: `/support/tickets/${id}/reply`,
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'SupportTicket', id }],
    }),
  }),
});

export const {
  useCreateTicketMutation,
  useGetMyTicketsQuery,
  useGetTicketByIdQuery,
  useReplyToTicketMutation,
} = supportApi;
