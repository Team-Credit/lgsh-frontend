/**
 * 시스템 메시지 관리 서비스
 * API 호출을 담당
 * 다국어 지원 (LANG_CODE)
 */
import api from './api';
import type {
  SysMessage,
  SysMessageRequest,
  SysMessageListParams,
  SysMessageListResponse,
} from '@/types';
import type { ApiResponse } from '@/types/common';

const BASE_URL = '/admin/messages';

export const sysMessageService = {
  /**
   * 메시지 목록 조회
   * @param params 검색 조건 (langCode 기본값: KO)
   */
  getMessageList: async (params?: SysMessageListParams): Promise<SysMessageListResponse> => {
    const response = await api.get<ApiResponse<SysMessageListResponse>>(BASE_URL, {
      params: {
        langCode: params?.langCode ?? 'KO',
        msgType: params?.msgType,
        searchKeyword: params?.searchKeyword,
        useYn: params?.useYn,
        page: params?.page ?? 0,
        size: params?.size ?? 100,
      },
    });
    return response.data.data!;
  },

  /**
   * 메시지 단건 조회
   * @param msgCode 메시지 코드
   * @param langCode 언어 코드 (기본값: KO)
   */
  getMessage: async (msgCode: string, langCode: string = 'KO'): Promise<SysMessage> => {
    const response = await api.get<ApiResponse<SysMessage>>(`${BASE_URL}/${msgCode}`, {
      params: { langCode },
    });
    return response.data.data!;
  },

  /**
   * 메시지 등록
   * @param request 등록 요청 (langCode 포함)
   */
  createMessage: async (request: SysMessageRequest): Promise<void> => {
    await api.post(BASE_URL, request);
  },

  /**
   * 메시지 수정
   * @param msgCode 메시지 코드
   * @param langCode 언어 코드
   * @param request 수정 요청
   */
  updateMessage: async (msgCode: string, langCode: string, request: SysMessageRequest): Promise<void> => {
    await api.put(`${BASE_URL}/${msgCode}`, request, {
      params: { langCode },
    });
  },

  /**
   * 메시지 삭제
   * @param msgCode 메시지 코드
   * @param langCode 언어 코드 (기본값: KO)
   */
  deleteMessage: async (msgCode: string, langCode: string = 'KO'): Promise<void> => {
    await api.delete(`${BASE_URL}/${msgCode}`, {
      params: { langCode },
    });
  },
};

export default sysMessageService;
