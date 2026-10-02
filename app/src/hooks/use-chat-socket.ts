import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { socketManager } from '@/lib/socket-manager';
import { chatApi, ChatMessage } from '@/store/chatApi';
import type { AppDispatch } from '@/store/store';

interface TypingPayload {
  userId: number;
  isTyping: boolean;
}

interface MessageStatusPayload {
  id: number;
  status: ChatMessage['status'];
}

type ChatSender = ChatMessage['sender'];

/**
 * Subscribes an active chat screen to live updates for one conversation:
 * new messages, typing indicators, and read/delivered status changes.
 * REST (chatApi) remains the source of initial history; this only patches
 * the existing RTK Query cache from socket events, per the REST-for-history
 * / sockets-for-live-updates split.
 *
 * While the chat is open, every incoming message is immediately marked read
 * (socket `markRead`, REST PATCH as fallback when the socket is down), and the
 * conversation-list cache is patched to badge 0. The backend derives each
 * viewer's unread count from message status, so a reply never re-badges the
 * sender.
 */
export function useChatSocket(
  conversationId: number | undefined,
  viewerRole: ChatSender,
) {
  const dispatch = useDispatch<AppDispatch>();
  const [typingUserId, setTypingUserId] = useState<number | null>(null);
  const markedReadRef = useRef<Set<number>>(new Set());

  const messagesResult = useSelector(
    conversationId !== undefined
      ? chatApi.endpoints.getMessages.select(conversationId)
      : () => undefined,
  );

  const markConversationRead = useCallback(
    (messageId: number) => {
      if (markedReadRef.current.has(messageId)) return;
      markedReadRef.current.add(messageId);
      if (socketManager.isConnected) {
        socketManager.emitMarkRead(messageId);
      } else {
        // Socket down: socket-manager would silently drop the emit, leaving
        // the server's message status unread and the badge stuck. REST still
        // marks the message read authoritatively.
        dispatch(chatApi.endpoints.markMessageRead.initiate(messageId)).catch(
          () => {},
        );
      }
      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          const conversation = draft.find((c) => c.id === conversationId);
          if (conversation) conversation.unreadCount = 0;
        }),
      );
    },
    [conversationId, dispatch],
  );

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
      if (message.sender !== viewerRole) {
        markConversationRead(message.id);
      }
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
      // Any markRead emitted before the drop may have been lost — allow the
      // catch-up effect to re-mark messages the refetch still reports unread.
      markedReadRef.current.clear();
      dispatch(chatApi.util.invalidateTags(['ChatMessage', 'Conversation']));
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
      // Leaving the chat: let the conversation list refetch the server's
      // authoritative (derived) unread count.
      dispatch(chatApi.util.invalidateTags(['Conversation']));
    };
  }, [conversationId, dispatch, viewerRole, markConversationRead]);

  // Catch-up: history may load (or refetch) after mount — mark every incoming
  // message as read so the badge clears and the sender's ticks turn blue for
  // the whole history, not just the newest message.
  const messages = messagesResult?.data;
  useEffect(() => {
    if (!conversationId || !messages?.length) return;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.sender !== viewerRole && m.status !== 'READ') {
        markConversationRead(m.id);
      }
    }
  }, [messages, conversationId, viewerRole, markConversationRead]);

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
