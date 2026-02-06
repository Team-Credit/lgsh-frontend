/**
 * 기초데이터조회 API 서비스
 */
import api from './api';
import type { ApiResponse, PageResponse } from '@/types/common';
import type {
  RawDataListItem,
  RawDataListSearchParams,
  RawDataExcludeRequest,
  RawDataRowsRequest,
  RawDataStats,
  RawDataIdItem,
} from '@/types/rawDataList';

const BASE_URL = '/admin/rawdata';

export const rawDataListService = {
  /**
   * 기초 데이터 목록 조회 (전체 컬럼)
   */
  getList: async (
    params: RawDataListSearchParams
  ): Promise<ApiResponse<PageResponse<RawDataListItem>>> => {
    const response = await api.get<ApiResponse<PageResponse<RawDataListItem>>>(
      `${BASE_URL}/list`,
      { params }
    );
    return response.data;
  },

  /**
   * 기초 데이터 엑셀 다운로드용 조회 (50000건씩)
   */
  getListForExport: async (
    params: RawDataListSearchParams
  ): Promise<ApiResponse<RawDataListItem[]>> => {
    const response = await api.get<ApiResponse<RawDataListItem[]>>(
      `${BASE_URL}/list/export`,
      { params }
    );
    return response.data;
  },

  /**
   * 기초 데이터 일괄 제외 처리
   */
  excludeBatch: async (
    request: RawDataExcludeRequest
  ): Promise<ApiResponse<{ updatedCount: number; message: string }>> => {
    const response = await api.put<
      ApiResponse<{ updatedCount: number; message: string }>
    >(`${BASE_URL}/list/exclude`, request);
    return response.data;
  },

  /**
   * 상태별 통계 조회 (검색 조건 포함)
   */
  getStats: async (params: RawDataListSearchParams): Promise<ApiResponse<RawDataStats[]>> => {
    const response = await api.get<ApiResponse<RawDataStats[]>>(
      `${BASE_URL}/list/stats`,
      { params }
    );
    return response.data;
  },

  /**
   * 기초 데이터 일괄 복원 처리 (X → N)
   */
  restoreBatch: async (
    request: RawDataExcludeRequest
  ): Promise<ApiResponse<{ updatedCount: number; message: string }>> => {
    const response = await api.put<
      ApiResponse<{ updatedCount: number; message: string }>
    >(`${BASE_URL}/list/restore`, request);
    return response.data;
  },

  /**
   * 데이터ID 목록 조회 (팝업용)
   */
  getRawDataIds: async (companyId?: string): Promise<ApiResponse<RawDataIdItem[]>> => {
    const response = await api.get<ApiResponse<RawDataIdItem[]>>(
      `${BASE_URL}/list/raw-data-ids`,
      { params: { companyId } }
    );
    return response.data;
  },

  /**
   * 조회 조건 기반 전체 제외 처리
   */
  excludeAll: async (
    params: RawDataListSearchParams
  ): Promise<ApiResponse<{ updatedCount: number; message: string }>> => {
    const response = await api.put<
      ApiResponse<{ updatedCount: number; message: string }>
    >(`${BASE_URL}/list/exclude-all`, null, { params });
    return response.data;
  },

  /**
   * 조회 조건 기반 전체 복원 처리
   */
  restoreAll: async (
    params: RawDataListSearchParams
  ): Promise<ApiResponse<{ updatedCount: number; message: string }>> => {
    const response = await api.put<
      ApiResponse<{ updatedCount: number; message: string }>
    >(`${BASE_URL}/list/restore-all`, null, { params });
    return response.data;
  },

  /**
   * 개별 행 단위 제외 처리 (PK 기반)
   */
  excludeRows: async (
    request: RawDataRowsRequest
  ): Promise<ApiResponse<{ updatedCount: number; message: string }>> => {
    const response = await api.put<
      ApiResponse<{ updatedCount: number; message: string }>
    >(`${BASE_URL}/list/exclude-rows`, request);
    return response.data;
  },

  /**
   * 개별 행 단위 복원 처리 (PK 기반)
   */
  restoreRows: async (
    request: RawDataRowsRequest
  ): Promise<ApiResponse<{ updatedCount: number; message: string }>> => {
    const response = await api.put<
      ApiResponse<{ updatedCount: number; message: string }>
    >(`${BASE_URL}/list/restore-rows`, request);
    return response.data;
  },
};

export default rawDataListService;
