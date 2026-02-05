import api from './api';
import type {
  ChatMessage,
  ChatMessageSendRequest,
  ChatRoom,
  ChatRoomCreateRequest,
  ChatUnreadCountResponse,
} from '@/types';
import type { ApiResponse } from '@/types/common';

const BASE_URL = '/chat';

interface RoomListParams {
  offset?: number;
  limit?: number;
}

interface MessageListParams {
  offset?: number;
  limit?: number;
}

export const chatService = {
  getRooms: (params: RoomListParams = {}) =>
    api.get<ApiResponse<ChatRoom[]>>(`${BASE_URL}/rooms`, { params }),

  createRoom: (data: ChatRoomCreateRequest) =>
    api.post<ApiResponse<string>>(`${BASE_URL}/rooms`, data),

  getMessages: (roomId: string, params: MessageListParams = {}) =>
    api.get<ApiResponse<ChatMessage[]>>(`${BASE_URL}/rooms/${roomId}/messages`, { params }),

  sendMessage: (data: ChatMessageSendRequest) =>
    api.post<ApiResponse<void>>(`${BASE_URL}/messages`, data),

  getUnreadCount: () =>
    api.get<ApiResponse<ChatUnreadCountResponse>>(`${BASE_URL}/unread-count`),

  markRoomRead: (roomId: string) =>
    api.put<ApiResponse<void>>(`${BASE_URL}/rooms/${roomId}/read`),
};

export default chatService;
