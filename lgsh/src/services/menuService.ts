/**
 * 메뉴 API 서비스
 */
import api from './api';
import mockMenuService from './mockMenu';
import type { MenuItem, MenuPermission, ApiResponse } from '@/types';

export interface MenuResponse {
  menus: MenuItem[];
  permissions: MenuPermission[];
}

export const menuService = {
  // 사용자 메뉴 조회 (역할 기반)
  // 참고: 메뉴 API가 백엔드에 미구현 시 Mock 사용 (메뉴는 기본 제공 필요)
  getUserMenus: async (): Promise<ApiResponse<MenuResponse>> => {
    try {
      const response = await api.get<ApiResponse<MenuResponse>>('/menus/user');
      return response.data;
    } catch (error) {
      console.warn('메뉴 API 미구현, Mock 메뉴 사용');
      return mockMenuService.getUserMenus();
    }
  },

  // 메뉴 접근 기록 (Redis 저장용)
  recordMenuAccess: async (menuId: string): Promise<void> => {
    try {
      await api.post('/menus/access', { menuId });
    } catch (error) {
      // 메뉴 접근 기록 실패는 무시 (사용자 경험에 영향 없음)
      console.debug('메뉴 접근 기록 실패:', error);
    }
  },

  // ===== ??? ?? ?? =====
  getAdminMenuTree: async (): Promise<ApiResponse<MenuResponse>> => {
    const response = await api.get<ApiResponse<MenuResponse>>('/admin/menus/tree');
    return response.data;
  },

  getAdminMenuDetail: async (menuId: string): Promise<ApiResponse<MenuItem>> => {
    const response = await api.get<ApiResponse<MenuItem>>(`/admin/menus/${menuId}`);
    return response.data;
  },

  saveAdminMenu: async (
    menuId: string | null,
    payload: Partial<MenuItem> & Record<string, any>
  ): Promise<ApiResponse<MenuItem>> => {
    if (menuId) {
      const response = await api.put<ApiResponse<MenuItem>>(`/admin/menus/${menuId}`, payload);
      return response.data;
    }
    const response = await api.post<ApiResponse<MenuItem>>('/admin/menus', payload);
    return response.data;
  },

  deleteAdminMenu: async (menuId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/admin/menus/${menuId}`);
    return response.data;
  },

  activateAdminMenu: async (menuId: string): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>(`/admin/menus/${menuId}/activate`);
    return response.data;
  },

  deactivateAdminMenu: async (menuId: string): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>(`/admin/menus/${menuId}/deactivate`);
    return response.data;
  },

  updateAdminMenuOrder: async (payload: Record<string, any>): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>('/admin/menus/order', payload);
    return response.data;
  },

};

export default menuService;
