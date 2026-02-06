import { Client, type IFrame, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import type { ChatMessage } from '@/types';

interface ChatSocketHandlers {
  onRoomMessage?: (message: ChatMessage) => void;
  onScopeMessage?: (message: ChatMessage) => void;
  onConnect?: () => void;
  onError?: (message: string) => void;
}

interface ChatSocketConnectOptions extends ChatSocketHandlers {
  token: string;
  roomId?: string;
  isAdmin: boolean;
  companyId?: string;
}

class ChatSocket {
  private client: Client | null = null;

  private subscriptions: StompSubscription[] = [];

  private manualDisconnect = false;

  connect(options: ChatSocketConnectOptions): void {
    this.disconnect();
    this.manualDisconnect = false;
    let connectedOnce = false;

    const nextClient = new Client({
      webSocketFactory: () => new SockJS('/ws/chat'),
      connectHeaders: {
        Authorization: `Bearer ${options.token}`,
      },
      reconnectDelay: 3000,
      onConnect: () => {
        if (this.client !== nextClient) return;
        connectedOnce = true;
        this.subscribeScope(options);
        if (options.roomId) {
          this.subscribeRoom(options.roomId, options.onRoomMessage);
        }
        options.onConnect?.();
      },
      onStompError: (frame: IFrame) => {
        if (this.client !== nextClient) return;
        const details = frame.headers.message || 'STOMP connection failed';
        if (!this.manualDisconnect) {
          options.onError?.(details);
        }
      },
      onWebSocketError: () => {
        if (this.client !== nextClient) return;
        if (!this.manualDisconnect) {
          if (!connectedOnce) return;
          options.onError?.('WebSocket connection failed');
        }
      },
    });

    this.client = nextClient;
    this.client.activate();
  }

  subscribeRoom(roomId: string, callback?: (message: ChatMessage) => void): void {
    if (!this.client || !this.client.connected) return;
    const subscription = this.client.subscribe(`/sub/chat/room/${roomId}`, (frame: IMessage) => {
      callback?.(this.parseMessage(frame));
    });
    this.subscriptions.push(subscription);
  }

  disconnect(): void {
    this.manualDisconnect = true;
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }

  private subscribeScope(options: ChatSocketConnectOptions): void {
    if (!this.client || !this.client.connected) return;

    const scopePath = options.isAdmin
      ? '/sub/chat/admin/global'
      : `/sub/chat/company/${options.companyId ?? ''}`;

    if (!options.isAdmin && !options.companyId) return;

    const scopeSubscription = this.client.subscribe(scopePath, (frame: IMessage) => {
      options.onScopeMessage?.(this.parseMessage(frame));
    });
    this.subscriptions.push(scopeSubscription);
  }

  private parseMessage(frame: IMessage): ChatMessage {
    try {
      const parsed = JSON.parse(frame.body) as ChatMessage;
      return parsed;
    } catch {
      return {
        roomId: '',
        senderId: 'SYSTEM',
        message: frame.body,
      };
    }
  }
}

export const chatSocket = new ChatSocket();
