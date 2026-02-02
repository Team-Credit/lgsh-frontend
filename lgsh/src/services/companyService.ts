/**
 * 원청사 API 서비스
 */
import api from './api';
import type { Company, CompanyListRequest, CompanyRequest, CompanyListResponse, ApiResponse } from '@/types';

export const companyService = {
  // 목록 조회 (페이징, 검색 지원)
  list: async (params?: CompanyListRequest): Promise<ApiResponse<CompanyListResponse>> => {
    const response = await api.get<ApiResponse<CompanyListResponse>>('/companies', {
      params,
    });
    return response.data;
  },

  // 콤보박스용 목록 조회
  combo: async (useYn?: string): Promise<ApiResponse<Company[]>> => {
    const response = await api.get<ApiResponse<Company[]>>('/companies/combo', {
      params: { useYn: useYn || 'Y' },
    });
    return response.data;
  },

  // 단건 조회
  get: async (companyId: string): Promise<ApiResponse<Company>> => {
    const response = await api.get<ApiResponse<Company>>(`/companies/${companyId}`);
    return response.data;
  },

  // 등록
  create: async (data: CompanyRequest): Promise<ApiResponse<{ companyId: string }>> => {
    const response = await api.post<ApiResponse<{ companyId: string }>>('/companies', data);
    return response.data;
  },

  // 수정
  update: async (companyId: string, data: CompanyRequest): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>(`/companies/${companyId}`, data);
    return response.data;
  },

  // 삭제
  delete: async (companyId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/companies/${companyId}`);
    return response.data;
  },

  // 일괄 삭제
  deleteBatch: async (companyIds: string[]): Promise<void> => {
    await Promise.all(companyIds.map((id) => companyService.delete(id)));
  },
};

export default companyService;
