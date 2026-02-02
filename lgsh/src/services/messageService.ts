/**
 * 메시지 API 서비스
 * - TB_SYS_MESSAGE API 호출
 */

import type { SystemMessage } from '@/types/message';

// API 기본 URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * API 응답 타입
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  msgCode?: string;
  message?: string;
  errorCode?: string;
}

/**
 * 전체 메시지 목록 조회
 */
export const fetchAllMessages = async (): Promise<SystemMessage[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages`);
    const result: ApiResponse<SystemMessage[]> = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('메시지 조회 실패:', error);
    return [];
  }
};

/**
 * 메시지 유형별 조회
 */
export const fetchMessagesByType = async (type: string): Promise<SystemMessage[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages?type=${type}`);
    const result: ApiResponse<SystemMessage[]> = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('메시지 유형별 조회 실패:', error);
    return [];
  }
};

/**
 * 단일 메시지 조회
 */
export const fetchMessageByCode = async (msgCode: string): Promise<SystemMessage | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${msgCode}`);
    const result: ApiResponse<SystemMessage> = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  } catch (error) {
    console.error('메시지 조회 실패:', error);
    return null;
  }
};

export default {
  fetchAllMessages,
  fetchMessagesByType,
  fetchMessageByCode,
};
