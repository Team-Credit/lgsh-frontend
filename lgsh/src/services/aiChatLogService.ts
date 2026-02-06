/**
 * AI 챗봇 로그 API 서비스
 */
import api from './api';
import type { ApiResponse, PageResponse } from '@/types/common';
import type { AiChatLog, AiChatLogDetail, AiChatLogSearchParams } from '@/types/aiChatLog';

export const aiChatLogService = {
  /**
   * 채팅 로그 목록 조회
   */
  list: async (params: AiChatLogSearchParams): Promise<ApiResponse<PageResponse<AiChatLog>>> => {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params.userId) queryParams.userId = params.userId;
    if (params.question) queryParams.question = params.question;
    if (params.questionType) queryParams.questionType = params.questionType;
    if (params.status) queryParams.status = params.status;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    queryParams.page = params.page || 0;
    queryParams.size = params.size || 20;

    const response = await api.get<ApiResponse<{ content: AiChatLog[]; totalCount: number }>>('/ai/chatlogs', {
      params: queryParams,
    });

    const data = response.data;
    if (data.success && data.data) {
      const { content, totalCount } = data.data;
      return {
        success: data.success,
        data: {
          content: content || [],
          totalCount: totalCount || 0,
          page: params.page || 0,
          size: params.size || 20,
          totalPages: Math.ceil((totalCount || 0) / (params.size || 20)),
        },
        message: data.message,
        errorCode: data.errorCode,
      };
    }

    return {
      success: false,
      data: null,
      message: data.message || '데이터 조회 실패',
      errorCode: data.errorCode,
    };
  },

  /**
   * 채팅 로그 상세 조회
   */
  get: async (messageId: string): Promise<ApiResponse<AiChatLogDetail>> => {
    const response = await api.get<ApiResponse<AiChatLogDetail>>(`/ai/chatlogs/${messageId}`);
    return response.data;
  },

  /**
   * 대화 내 모든 메시지 조회
   */
  getConversation: async (conversationId: string): Promise<ApiResponse<AiChatLog[]>> => {
    const response = await api.get<ApiResponse<AiChatLog[]>>(`/ai/chatlogs/conversation/${conversationId}`);
    return response.data;
  },

  /**
   * 채팅 로그 삭제
   */
  delete: async (messageId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/ai/chatlogs/${messageId}`);
    return response.data;
  },

  /**
   * 대화 전체 삭제
   */
  deleteConversation: async (conversationId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/ai/chatlogs/conversation/${conversationId}`);
    return response.data;
  },
};

export default aiChatLogService;
