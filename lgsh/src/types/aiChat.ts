/**
 * AI 챗봇 타입 정의
 */

/**
 * 채팅 메시지
 */
export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  feedback?: 'like' | 'dislike';
  isStreaming?: boolean;
  questionType?: string;
}

/**
 * AI 챗봇 요청
 */
export interface AiChatRequest {
  conversationId?: string;
  question: string;
  personId?: string;
  questionType?: string;
}

/**
 * AI 피드백 요청
 */
export interface AiFeedbackRequest {
  messageId: string;
  rating: number; // 1: 좋아요, -1: 싫어요
  feedback?: string;
  feedbackType?: string;
}

/**
 * AI 추천 질문
 */
export interface AiSuggestion {
  suggestionId?: string;
  suggestionText: string;
  suggestionType: string;
  questionType?: string;
  sortOrder?: number;
}

/**
 * AI 대화 이력 응답
 */
export interface AiChatHistoryItem {
  messageId: string;
  conversationId: string;
  messageType: string;
  content: string;
  questionType?: string;
  responseTimeMs?: number;
  feedbackRating?: number;
  regDt: string;
}

/**
 * AI 대화 세션
 */
export interface AiConversation {
  conversationId: string;
  firstQuestion: string;
  lastQuestion: string;
  messageCount: number;
  firstRegDt: string;
  lastRegDt: string;
}

/**
 * SSE 이벤트 데이터
 */
export interface SseEventData {
  chunk?: string;
  messageId?: string;
  conversationId?: string;
  errorCode?: string;
  message?: string;
}
