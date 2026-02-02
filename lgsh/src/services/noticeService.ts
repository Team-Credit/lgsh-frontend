/**
 * 공지사항 API 서비스
 */
import api from './api';

import {
  Notice,
  NoticeListParams,
  NoticeCreateRequest,
  NoticeUpdateRequest,
  PageResponse,
  ApiResponse
} from '../types';

export const noticeService = {
  // 목록 조회
  list: async (params: NoticeListParams): Promise<ApiResponse<PageResponse<Notice>>> => {
    // 레거시 패턴: 수동 파라미터 매핑
    const queryParams: Record<string, string | number | undefined> = {};
    if (params.keyword) queryParams.keyword = params.keyword;
    queryParams.page = params.page || 1; // Backend uses 1-based indexing
    queryParams.size = params.size || 10;

    const response = await api.get<ApiResponse<PageResponse<Notice>>>('/notices', {
      params: queryParams,
    });

    return response.data;
  },

  // 상세 조회
  get: async (noticeId: number): Promise<ApiResponse<Notice>> => {
    const response = await api.get<ApiResponse<Notice>>(`/notices/${noticeId}`);
    return response.data;
  },

  // 등록
  create: async (data: NoticeCreateRequest): Promise<ApiResponse<Notice>> => {
    const response = await api.post<ApiResponse<Notice>>('/admin/notices', data);
    return response.data;
  },

  // 수정
  update: async (noticeId: number, data: NoticeUpdateRequest): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>(`/admin/notices/${noticeId}`, data);
    return response.data;
  },

  // 삭제
  delete: async (noticeId: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/admin/notices/${noticeId}`);
    return response.data;
  },
};

export default noticeService;
