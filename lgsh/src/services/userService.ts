/**
 * 사용자 API 서비스
 */
import api from './api';
import type { User, UserDetail, UserRequest, UserListRequest, ApiResponse, PageResponse } from '@/types';

export const userService = {
  // 목록 조회
  list: async (params: UserListRequest): Promise<ApiResponse<PageResponse<User>>> => {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params.userId) queryParams.userId = params.userId;
    if (params.userNm) queryParams.userNm = params.userNm;
    if (params.companyId) queryParams.companyId = params.companyId;
    if (params.roleId) queryParams.roleId = params.roleId;
    if (params.useYn) queryParams.useYn = params.useYn;
    if (params.accountLockYn) queryParams.accountLockYn = params.accountLockYn;
    queryParams.page = params.page || 0;
    queryParams.size = params.size || 20;

    // 백엔드 응답: { success, data: { content: [...], totalCount: n }, ... }
    const response = await api.get<ApiResponse<{ content: User[]; totalCount: number }>>('/users', {
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

  // 상세 조회
  get: async (userId: string): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>(`/users/${userId}`);
    return response.data;
  },

  // 등록
  create: async (data: UserRequest): Promise<ApiResponse<User>> => {
    const response = await api.post<ApiResponse<User>>('/users', data);
    return response.data;
  },

  // 수정
  update: async (userId: string, data: UserRequest): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>(`/users/${userId}`, data);
    return response.data;
  },

  // 삭제
  delete: async (userId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/users/${userId}`);
    return response.data;
  },

  // 일괄 삭제
  deleteBatch: async (userIds: string[]): Promise<ApiResponse<null>> => {
    await Promise.all(
      userIds.map(userId => api.delete(`/users/${userId}`))
    );

    return {
      success: true,
      data: null,
      message: `${userIds.length}건이 삭제되었습니다.`,
      errorCode: null,
    };
  },

  // 비밀번호 초기화
  resetPassword: async (userId: string): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>(`/users/${userId}/reset-password`);
    return response.data;
  },

  // 계정 잠금 해제
  unlockAccount: async (userId: string): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>(`/users/${userId}/unlock`);
    return response.data;
  },

  // 사용자 상세 조회 (기본정보 + 로그인이력 + 최근메뉴)
  getDetail: async (userId: string): Promise<ApiResponse<UserDetail>> => {
    const response = await api.get<ApiResponse<UserDetail>>(`/users/${userId}/detail`);
    return response.data;
  },
};

export default userService;
