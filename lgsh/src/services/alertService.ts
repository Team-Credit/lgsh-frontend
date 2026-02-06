/**
 * 사용자 알림 서비스
 */
import api from './api';
import type { ApiResponse } from '@/types/common';

export interface UserAlert {
  alertId: number;
  alertType: string;
  alertTypeNm: string;
  alertTitle: string;
  alertMsg: string;
  linkUrl: string;
  readYn: string;
  readDt: string | null;
  regDt: string;
  timeAgo: string;
}

export interface AlertListResponse {
  content: UserAlert[];
  totalCount: number;
  page: number;
  size: number;
  totalPages: number;
}

const BASE_URL = '/alerts';

export const alertService = {
  /**
   * 알림 목록 조회
   */
  getAlertList: async (params?: {
    readYn?: string;
    page?: number;
    size?: number;
  }): Promise<AlertListResponse> => {
    const response = await api.get<ApiResponse<AlertListResponse>>(BASE_URL, {
      params,
    });
    return response.data.data!;
  },

  /**
   * 미읽음 건수 조회
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<ApiResponse<{ unreadCount: number }>>(
      `${BASE_URL}/unread-count`
    );
    return response.data.data?.unreadCount || 0;
  },

  /**
   * 알림 읽음 처리
   */
  readAlert: async (alertId: number): Promise<void> => {
    await api.put(`${BASE_URL}/${alertId}/read`);
  },

  /**
   * 전체 읽음 처리
   */
  readAllAlerts: async (): Promise<number> => {
    const response = await api.put<ApiResponse<{ updatedCount: number }>>(
      `${BASE_URL}/read-all`
    );
    return response.data.data?.updatedCount || 0;
  },
};

export default alertService;
