export type ChatRoomType = 'COMPANY' | 'SUPPORT' | 'ADMIN';

export interface ChatRoom {
  roomId: string;
  roomNm: string;
  roomType: ChatRoomType;
  companyId: string | null;
  latestMsg: string | null;
  unreadCnt: number;
  regUserId: string;
  regDt: string;
  updDt: string;
}

export interface ChatMessage {
  msgId?: number;
  roomId: string;
  senderId: string;
  message: string;
  readYn?: 'Y' | 'N';
  regDt?: string;
}

export interface ChatRoomCreateRequest {
  roomNm: string;
  roomType: ChatRoomType;
  companyId?: string;
}

export interface ChatMessageSendRequest {
  roomId: string;
  senderId?: string;
  message: string;
}

export interface ChatUnreadCountResponse {
  unreadCount: number;
}
