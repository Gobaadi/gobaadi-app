import { io, Socket } from 'socket.io-client';
import { API_URL, getToken } from '@/constants/api';
import { refreshAccessToken } from '@/store/base-query-with-reauth';

let _storeRef: any = null;
export function setStoreRef(storeRef: any) {
  _storeRef = storeRef;
}

type SocketEventHandler = (...args: any[]) => void;

/**
 * Singleton wrapper around the app's single Socket.IO connection to the
 * existing backend ChatGateway. Not a Redux store — the project has no
 * Zustand and sockets are inherently a side-effectful singleton, not
 * serializable state, so a plain module-level instance matches the existing
 * "RTK Query for server state, plain modules for side effects" pattern.
 */
class SocketManager {
  private socket: Socket | null = null;
  private pendingHandlers = new Map<string, Set<SocketEventHandler>>();
  private isRefreshingAuth = false;

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }
    const token = await getToken();
    if (!token) {
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(API_URL, {
      auth: { token },
      // socket.io-client already implements exponential backoff between
      // reconnectionDelay and reconnectionDelayMax — no custom loop needed.
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      this.replayHandlers();
    });

    this.socket.on('connect_error', async () => {
      // The gateway disconnects unauthenticated/expired-token clients rather
      // than emitting a distinct "auth failed" event, so a connect_error is
      // our signal to try refreshing the access token once before giving up.
      await this.reauthenticateAndReconnect();
    });

    this.socket.io.on('reconnect', () => {
      // Reconciliation: after any reconnect, cached message/conversation
      // state may be stale, so let subscribers refetch via RTK Query tags.
      this.emitLocal('reconnected');
    });
  }

  private async reauthenticateAndReconnect(): Promise<void> {
    if (this.isRefreshingAuth) return;
    this.isRefreshingAuth = true;
    try {
      if (!_storeRef) return;
      const newAccessToken = await refreshAccessToken(_storeRef.dispatch, _storeRef.getState);
      if (newAccessToken && this.socket) {
        this.socket.auth = { token: newAccessToken };
        this.socket.connect();
      }
    } finally {
      this.isRefreshingAuth = false;
    }
  }

  private localHandlers = new Map<string, Set<SocketEventHandler>>();

  private emitLocal(event: string, ...args: any[]) {
    this.localHandlers.get(event)?.forEach((handler) => handler(...args));
  }

  private replayHandlers() {
    for (const [event, handlers] of this.pendingHandlers.entries()) {
      handlers.forEach((handler) => this.socket?.on(event, handler));
    }
  }

  on(event: string, handler: SocketEventHandler): void {
    if (event === 'reconnected') {
      if (!this.localHandlers.has(event)) this.localHandlers.set(event, new Set());
      this.localHandlers.get(event)!.add(handler);
      return;
    }
    if (!this.pendingHandlers.has(event)) {
      this.pendingHandlers.set(event, new Set());
    }
    this.pendingHandlers.get(event)!.add(handler);
    this.socket?.on(event, handler);
  }

  off(event: string, handler: SocketEventHandler): void {
    if (event === 'reconnected') {
      this.localHandlers.get(event)?.delete(handler);
      return;
    }
    this.pendingHandlers.get(event)?.delete(handler);
    this.socket?.off(event, handler);
  }

  joinConversation(conversationId: number): void {
    this.socket?.emit('joinConversation', { conversationId });
  }

  emitTyping(conversationId: number, isTyping: boolean): void {
    this.socket?.emit('typing', { conversationId, isTyping });
  }

  emitMarkRead(messageId: number): void {
    this.socket?.emit('markRead', { messageId });
  }

  emit(event: string, data?: Record<string, unknown>): void {
    this.socket?.emit(event, data);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.pendingHandlers.clear();
  }
}

export const socketManager = new SocketManager();
