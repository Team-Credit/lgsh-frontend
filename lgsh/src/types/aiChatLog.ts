/**
 * AI 챗봇 로그 타입 정의
 */

/**
 * AI 채팅 로그 목록 아이템
 */
export interface AiChatLog {
  messageId: string;
  conversationId: string;
  userId: string;
  companyId?: string;
  personId?: string;
  question: string;
  answer?: string;
  questionType?: string;
  responseTimeMs?: number;
  tokenCount?: number;
  modelId?: string;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  regDt: string;
}

/**
 * AI 채팅 로그 상세 (질문/답변 전체 내용 포함)
 */
export interface AiChatLogDetail extends AiChatLog {
  contextData?: string;
  regUserId?: string;
  updUserId?: string;
  updDt?: string;
}

/**
 * AI 채팅 로그 검색 파라미터
 */
export interface AiChatLogSearchParams {
  page?: number;
  size?: number;
  userId?: string;
  question?: string;
  questionType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}
