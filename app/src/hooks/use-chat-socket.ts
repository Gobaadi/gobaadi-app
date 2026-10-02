import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { socketManager } from '@/lib/socket-manager';
import { chatApi, ChatMessage, useMarkConversationReadMutation } from '@/store/chatApi';
import type { AppDispatch } from '@/store/store';

interface TypingPayload {
  userId: number;
  isTyping: boolean;
}

interface MessageStatusPayload {
  id: number;
  status: ChatMessage['status'];
}

/**
 * Subscribes an active chat screen to live updates for one conversation:
 * new messages, typing indicators, and read/delivered status changes.
 * REST (chatApi) remains the source of initial history; this only patches
 * the existing RTK Query cache from socket events, per the REST-for-history
 * / sockets-for-live-updates split.
 */
export function useChatSocket(conversationId: number | undefined) {
  const dispatch = useDispatch<AppDispatch>();
  const [typingUserId, setTypingUserId] = useState<number | null>(null);
  const [markConversationRead] = useMarkConversationReadMutation();

  useEffect(() => {
    if (!conversationId) return;

    socketManager.joinConversation(conversationId);

    const handleMessageReceived = (message: ChatMessage) => {
      if (message.conversationId !== conversationId) return;
      dispatch(
        chatApi.util.updateQueryData('getMessages', conversationId, (draft) => {
          if (draft.some((m) => m.id === message.id)) return;
          draft.push(message);
        }),
      );
      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          const conversation = draft.find((c) => c.id === conversationId);
          if (conversation) {
            conversation.lastMessageAt = message.createdAt;
            conversation.lastMessageText = message.text;
          }
        }),
      );
      // This hook only runs while the chat screen is OPEN, so the message is
      // being read right now — mark the conversation read instead of bumping
      // the unread badge (the server recomputes unreadCount from message status).
      markConversationRead(conversationId);
    };

    const handleTyping = (payload: TypingPayload) => {
      setTypingUserId(payload.isTyping ? payload.userId : null);
    };

    const handleStatusUpdate = (payload: MessageStatusPayload) => {
      dispatch(
        chatApi.util.updateQueryData('getMessages', conversationId, (draft) => {
          const message = draft.find((m) => m.id === payload.id);
          if (message) {
            message.status = payload.status;
          }
        }),
      );
    };

    const handleReconnected = () => {
      dispatch(chatApi.util.invalidateTags(['ChatMessage', 'Conversation']));
      markConversationRead(conversationId);
    };

    socketManager.on('messageReceived', handleMessageReceived);
    socketManager.on('typingIndicator', handleTyping);
    socketManager.on('messageStatusUpdate', handleStatusUpdate);
    socketManager.on('reconnected', handleReconnected);

    return () => {
      socketManager.off('messageReceived', handleMessageReceived);
      socketManager.off('typingIndicator', handleTyping);
      socketManager.off('messageStatusUpdate', handleStatusUpdate);
      socketManager.off('reconnected', handleReconnected);
    };
  }, [conversationId, dispatch, markConversationRead]);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emitTyping = (isTyping: boolean) => {
    if (!conversationId) return;
    socketManager.emitTyping(conversationId, isTyping);
    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketManager.emitTyping(conversationId, false);
      }, 3000);
    }
  };

  return { isOtherUserTyping: typingUserId !== null, emitTyping };
}

/**
 * Subscribes a conversation-list screen (e.g. doctor-messages) to
 * conversation-level updates without joining every conversation's room —
 * the gateway broadcasts `conversationUpdated` to each participant's
 * personal `user:{id}` room, which every connected client already joins.
 */
export function useConversationListSocket() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const handleConversationUpdated = () => {
      dispatch(chatApi.util.invalidateTags(['Conversation']));
    };
    const handleReconnected = () => {
      dispatch(chatApi.util.invalidateTags(['Conversation']));
    };

    socketManager.on('conversationUpdated', handleConversationUpdated);
    socketManager.on('reconnected', handleReconnected);

    return () => {
      socketManager.off('conversationUpdated', handleConversationUpdated);
      socketManager.off('reconnected', handleReconnected);
    };
  }, [dispatch]);
}
