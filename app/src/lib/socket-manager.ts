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
  private serverRejectCount = 0;
  private healthTimer: ReturnType<typeof setInterval> | null = null;

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }
    const token = await getToken();
    if (!token) {
      return;
    }

    if (this.socket) {
      // A live socket instance already exists: reuse it instead of creating
      // a duplicate connection (and losing any in-flight auto-reconnect).
      if (this.socket.active) {
        return;
      }
      this.socket.auth = { token };
      this.socket.connect();
      this.startHealthCheck();
      return;
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
      this.serverRejectCount = 0;
      this.replayHandlers();
    });

    this.socket.on('connect_error', async () => {
      // The gateway disconnects unauthenticated/expired-token clients rather
      // than emitting a distinct "auth failed" event, so a connect_error is
      // our signal to try refreshing the access token once before giving up.
      await this.reauthenticateAndReconnect();
    });

    this.socket.on('disconnect', (reason) => {
      // A server-initiated disconnect ("io server disconnect", typically an
      // invalid/expired token) STOPS socket.io's auto-reconnect permanently.
      // Without this handler the socket dies silently and the user never
      // receives incoming calls again until app restart.
      if (reason === 'io server disconnect') {
        void this.handleServerRejection();
      }
    });

    this.socket.io.on('reconnect', () => {
      // Reconciliation: after any reconnect, cached message/conversation
      // state may be stale, so let subscribers refetch via RTK Query tags.
      this.emitLocal('reconnected');
    });

    this.startHealthCheck();
  }

  /**
   * Belt-and-suspenders: every 30s, if the socket is neither connected nor
   * trying (e.g. a rejected handshake stalled the client), refresh the token
   * and force a reconnect. No-op while connected or while socket.io is
   * already auto-reconnecting.
   */
  private startHealthCheck(): void {
    if (this.healthTimer) return;
    this.healthTimer = setInterval(() => {
      if (!this.socket || this.socket.connected || this.socket.active) return;
      void this.reauthenticateAndReconnect();
    }, 30000);
  }

  private async handleServerRejection(): Promise<void> {
    this.serverRejectCount += 1;
    if (this.serverRejectCount > 5) return;
    const delay = Math.min(2000 * 2 ** (this.serverRejectCount - 1), 60000);
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (!this.socket) return;
    await this.reauthenticateAndReconnect();
  }

  private async reauthenticateAndReconnect(): Promise<void> {
    if (this.isRefreshingAuth) return;
    this.isRefreshingAuth = true;
    try {
      if (!_storeRef || !this.socket) return;
      const newAccessToken = await refreshAccessToken(_storeRef.dispatch, _storeRef.getState);
      if (newAccessToken && this.socket) {
        this.socket.auth = { token: newAccessToken };
        if (!this.socket.connected && !this.socket.active) {
          this.socket.connect();
        }
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
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    this.socket?.disconnect();
    this.socket = null;
    this.serverRejectCount = 0;
    this.pendingHandlers.clear();
  }
}

export const socketManager = new SocketManager();
