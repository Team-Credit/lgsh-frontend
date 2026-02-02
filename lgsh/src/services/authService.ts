/**
 * 인증 API 서비스
 */
import api from './api';
import type { LoginRequest, LoginResponse, RefreshTokenResponse, ApiResponse } from '@/types';

export const authService = {
  // 로그인
  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
    return response.data;
  },

  // 로그아웃
  logout: async (): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>('/auth/logout');
    return response.data;
  },

  // 토큰 갱신
  refresh: async (refreshToken: string): Promise<ApiResponse<RefreshTokenResponse>> => {
    const response = await api.post<ApiResponse<RefreshTokenResponse>>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },
};

export default authService;
