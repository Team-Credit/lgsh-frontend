/**
 * 즐겨찾기 API 서비스
 */
import api from './api';
import type { ApiResponse, FavoriteListResponse, FavoriteToggleResponse } from '@/types';

export const favoriteService = {
  /**
   * 즐겨찾기 목록 조회
   * GET /api/v1/favorites
   */
  getFavorites: async (): Promise<ApiResponse<FavoriteListResponse>> => {
    const response = await api.get<ApiResponse<FavoriteListResponse>>('/favorites');
    return response.data;
  },

  /**
   * 즐겨찾기 추가
   * POST /api/v1/favorites
   */
  addFavorite: async (menuId: string): Promise<ApiResponse<FavoriteToggleResponse>> => {
    const response = await api.post<ApiResponse<FavoriteToggleResponse>>('/favorites', { menuId });
    return response.data;
  },

  /**
   * 즐겨찾기 삭제
   * DELETE /api/v1/favorites/{menuId}
   */
  removeFavorite: async (menuId: string): Promise<ApiResponse<FavoriteToggleResponse>> => {
    const response = await api.delete<ApiResponse<FavoriteToggleResponse>>(`/favorites/${menuId}`);
    return response.data;
  },

  /**
   * 즐겨찾기 토글 (있으면 삭제, 없으면 추가)
   * POST /api/v1/favorites/toggle
   */
  toggleFavorite: async (menuId: string): Promise<ApiResponse<FavoriteToggleResponse>> => {
    const response = await api.post<ApiResponse<FavoriteToggleResponse>>('/favorites/toggle', { menuId });
    return response.data;
  },
};

export default favoriteService;
