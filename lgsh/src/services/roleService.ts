/**
 * 역할 API 서비스
 */
import api from './api';
import type { Role, RoleListRequest, ApiResponse, RoleMenu } from '@/types';

export const roleService = {
  // 목록 조회
  list: async (params?: RoleListRequest): Promise<ApiResponse<Role[]>> => {
    const response = await api.get<ApiResponse<Role[]>>('/roles', {
      params,
    });
    return response.data;
  },

  // 단건 조회
  get: async (roleId: string): Promise<ApiResponse<Role>> => {
    const response = await api.get<ApiResponse<Role>>(`/roles/${roleId}`);
    return response.data;
  },

  // 역할 저장 (등록/수정)
  save: async (role: Partial<Role>): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>('/roles', role);
    return response.data;
  },

  // 역할별 메뉴 권한 조회
  getMenus: async (roleId: string): Promise<ApiResponse<RoleMenu[]>> => {
    const response = await api.get<ApiResponse<RoleMenu[]>>(`/roles/${roleId}/menus`);
    return response.data;
  },

  // 역할 메뉴 권한 저장
  saveMenus: async (roleId: string, menus: RoleMenu[]): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>(`/roles/${roleId}/menus`, menus);
    return response.data;
  },
};

export default roleService;
