import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface ChatMessage {
  id: number;
  conversationId: number;
  sender: 'user' | 'doctor';
  text: string;
  time: string;
  createdAt: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'document' | null;
  attachmentMimeType?: string | null;
}

export interface SendAttachmentInput {
  conversationId?: number;
  caption?: string;
  file: { uri: string; name: string; type: string };
}

export interface Conversation {
  id: number;
  doctorId: number;
  doctorUserId?: number | null;
  patientId: number;
  appointmentId?: number | null;
  lastMessageAt?: string | null;
  lastMessageText?: string | null;
  unreadCount?: number;
  createdAt: string;
  patientName?: string;
  patientPhone?: string;
  patientPhoto?: string;
  animalName?: string;
  animalImage?: string;
}

export interface ChatAppointment {
  id: number;
  doctorId: number;
  patientId: number;
  animalId?: number;
  patientName?: string;
  animalName?: string;
  startAt: string;
  endAt: string;
  status: string;
}

export interface ChatAppointmentsResponse {
  data: ChatAppointment[];
  page: number;
  limit: number;
  total: number;
}

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['ChatMessage', 'Conversation', 'ChatAppointment'],
  endpoints: (builder) => ({
    getConversations: builder.query<Conversation[], void>({
      query: () => '/chat/conversations',
      providesTags: ['Conversation'],
    }),
    getMessages: builder.query<ChatMessage[], number | void>({
      query: (conversationId) =>
        conversationId ? `/chat/messages?conversationId=${conversationId}` : '/chat/messages',
      providesTags: ['ChatMessage'],
    }),
    getDoctorAppointments: builder.query<
      ChatAppointmentsResponse,
      { page?: number; limit?: number }
    >({
      query: (params) => {
        const query = new URLSearchParams();
        if (params.page) query.set('page', String(params.page));
        if (params.limit) query.set('limit', String(params.limit));
        const qs = query.toString();
        return `/chat/appointments${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['ChatAppointment'],
    }),
    sendMessage: builder.mutation<ChatMessage, { text: string; conversationId?: number }>({
      query: ({ text, conversationId }) => ({
        url: '/chat/message',
        method: 'POST',
        body: conversationId ? { text, conversationId } : { text },
      }),
      invalidatesTags: ['ChatMessage', 'Conversation'],
    }),
    sendAttachmentMessage: builder.mutation<ChatMessage, SendAttachmentInput>({
      query: ({ conversationId, caption, file }) => {
        const formData = new FormData();
        formData.append('file', file as unknown as Blob);
        if (conversationId) formData.append('conversationId', String(conversationId));
        if (caption) formData.append('caption', caption);
        return {
          url: '/chat/message/attachment',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['ChatMessage', 'Conversation'],
    }),
    createConversation: builder.mutation<
      Conversation,
      { patientId?: number; doctorId?: number; appointmentId?: number }
    >({
      query: (body) => ({
        url: '/chat/conversations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversation'],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useGetDoctorAppointmentsQuery,
  useSendMessageMutation,
  useSendAttachmentMessageMutation,
  useCreateConversationMutation,
} = chatApi;
