/**
 * AI 챗봇 서비스
 * SSE 스트리밍 및 REST API 클라이언트
 */
import api from './api';
import type { ApiResponse } from '@/types';
import type {
  AiFeedbackRequest,
  AiSuggestion,
  AiChatHistoryItem,
  AiConversation,
} from '@/types/aiChat';

/**
 * AI 챗봇 서비스
 */
const aiChatService = {
  /**
   * SSE 스트리밍 채팅
   * @param question 사용자 질문
   * @param conversationId 대화 ID (연속 대화 시)
   * @param personId 대상자 ID (특정 대상자 질문 시)
   * @param onChunk 청크 수신 콜백
   * @param onDone 완료 콜백
   * @param onError 에러 콜백
   * @param onSuggestions 추천 질문 콜백
   * @returns AbortController (취소용)
   */
  streamChat: (
    question: string,
    conversationId?: string,
    personId?: string,
    clientMessageId?: string,
    onChunk?: (chunk: string) => void,
    onDone?: (messageId: string, convId: string) => void,
    onError?: (errorCode: string, message: string) => void,
    onSuggestions?: (suggestions: AiSuggestion[]) => void
  ): AbortController => {
    const controller = new AbortController();
    const token = localStorage.getItem('accessToken');
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

    // 5분 타임아웃
    const timeoutId = setTimeout(() => controller.abort(), 300_000);

    fetch(`${baseUrl}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question,
        conversationId,
        personId,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Network response was not ok');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No reader available');
        }

        let buffer = '';
        let currentEvent = 'message';
        let receivedDone = false;
        let receivedError = false;
        let receivedTextChunk = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();

            // SSE 주석 무시
            if (trimmedLine.startsWith(':')) continue;

            // 이벤트 타입 파싱
            if (trimmedLine.startsWith('event:')) {
              currentEvent = trimmedLine.substring(6).trim();
              continue;
            }

            // 데이터 파싱
            if (trimmedLine.startsWith('data:')) {
              try {
                const jsonStr = trimmedLine.substring(5).trim();
                if (!jsonStr) continue;

                const data = JSON.parse(jsonStr);

                // SSE event type이 strip된 경우 data 필드로 감지
                if (currentEvent === 'message' && data.errorCode && !data.chunk) {
                  currentEvent = 'error';
                }
                if (currentEvent === 'message' && data.messageId && data.conversationId && !data.chunk) {
                  currentEvent = 'done';
                }

                switch (currentEvent) {
                  case 'message':
                    if (data.chunk && onChunk) {
                      onChunk(data.chunk);
                    }
                    if (typeof data.chunk === 'string' && data.chunk.length > 0) {
                      receivedTextChunk = true;
                    }
                    break;

                  case 'done':
                    receivedDone = true;
                    if (onDone) {
                      onDone(
                        data.messageId || clientMessageId || `ai-${Date.now()}`,
                        data.conversationId || conversationId || 'local'
                      );
                    }
                    break;

                  case 'error':
                    receivedError = true;
                    if (onError) {
                      onError(
                        data.errorCode || 'ERR_AI_001',
                        data.message || 'AI 응답 생성에 실패했습니다.'
                      );
                    }
                    break;

                  case 'suggestions':
                    if (Array.isArray(data) && onSuggestions) {
                      onSuggestions(data);
                    }
                    break;

                  default:
                    if (data.chunk && onChunk) {
                      onChunk(data.chunk);
                    }
                }

                currentEvent = 'message';
              } catch (parseError) {
                console.warn('SSE 데이터 파싱 실패:', parseError);
              }
            }
          }
        }

        // 스트림 종료 후 done/error 이벤트 없이 끝난 경우 cleanup
        if (!receivedDone && !receivedError) {
          // Backend may not emit an explicit done event. If we received any text chunks,
          // treat the stream as successfully completed.
          if (receivedTextChunk && onDone) {
            onDone(clientMessageId || `ai-${Date.now()}`, conversationId || 'local');
          } else if (onError) {
            onError('ERR_AI_001', 'AI 응답이 비정상적으로 종료되었습니다.');
          }
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          if (onError) {
            onError('ERR_AI_001', 'AI 응답 시간이 초과되었습니다.');
          }
        } else if (onError) {
          onError('ERR_AI_001', error.message || 'AI 서비스 연결에 실패했습니다.');
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return controller;
  },

  /**
   * 피드백 저장
   */
  saveFeedback: async (request: AiFeedbackRequest): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>('/ai/chat/feedback', request);
    return response.data;
  },

  /**
   * 추천 질문 조회
   */
  getSuggestions: async (
    personId?: string,
    lastQuestion?: string
  ): Promise<ApiResponse<AiSuggestion[]>> => {
    const params: Record<string, string> = {};
    if (personId) params.personId = personId;
    if (lastQuestion) params.lastQuestion = lastQuestion;

    const response = await api.get<ApiResponse<AiSuggestion[]>>('/ai/chat/suggestions', {
      params,
    });
    return response.data;
  },

  /**
   * 대화 이력 조회
   */
  getChatHistory: async (
    conversationId: string
  ): Promise<ApiResponse<AiChatHistoryItem[]>> => {
    const response = await api.get<ApiResponse<AiChatHistoryItem[]>>(
      `/ai/chat/history/${conversationId}`
    );
    return response.data;
  },

  /**
   * 대화 세션 목록 조회
   */
  getConversations: async (
    page: number = 1,
    pageSize: number = 20
  ): Promise<
    ApiResponse<{
      conversations: AiConversation[];
      totalCount: number;
      page: number;
      pageSize: number;
    }>
  > => {
    const response = await api.get('/ai/chat/conversations', {
      params: { page, pageSize },
    });
    return response.data;
  },

  /**
   * 대화 삭제
   */
  deleteConversation: async (conversationId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/ai/chat/conversations/${conversationId}`
    );
    return response.data;
  },
};

export default aiChatService;
