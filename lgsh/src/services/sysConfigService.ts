/**
 * 시스템 환경설정 서비스
 * API 호출을 담당
 */
import api from './api';
import type {
  SysConfig,
  SysConfigRequest,
  SysConfigListResponse,
  SysConfigSearchParams,
} from '@/types/sysConfig';
import type { ApiResponse } from '@/types/common';

const BASE_URL = '/admin/configs';

export const sysConfigService = {
  /**
   * 환경설정 목록 조회
   */
  getList: async (params?: SysConfigSearchParams): Promise<SysConfigListResponse> => {
    const response = await api.get<ApiResponse<SysConfigListResponse>>(BASE_URL, {
      params: {
        majorCode: params?.majorCode,
        minorCode: params?.minorCode,
        configKey: params?.configKey,
        dataType: params?.dataType,
        useYn: params?.useYn,
        page: params?.page ?? 0,
        size: params?.size ?? 100,
      },
    });
    return response.data.data!;
  },

  /**
   * 환경설정 단건 조회
   */
  getOne: async (majorCode: string, minorCode: string, configKey: string): Promise<SysConfig> => {
    const response = await api.get<ApiResponse<SysConfig>>(
      `${BASE_URL}/${majorCode}/${minorCode}/${encodeURIComponent(configKey)}`
    );
    return response.data.data!;
  },

  /**
   * 환경설정 등록
   */
  create: async (request: SysConfigRequest): Promise<void> => {
    await api.post(BASE_URL, request);
  },

  /**
   * 환경설정 수정
   */
  update: async (
    majorCode: string,
    minorCode: string,
    configKey: string,
    request: SysConfigRequest
  ): Promise<void> => {
    await api.put(
      `${BASE_URL}/${majorCode}/${minorCode}/${encodeURIComponent(configKey)}`,
      request
    );
  },

  /**
   * 환경설정 삭제
   */
  delete: async (majorCode: string, minorCode: string, configKey: string): Promise<void> => {
    await api.delete(
      `${BASE_URL}/${majorCode}/${minorCode}/${encodeURIComponent(configKey)}`
    );
  },

  /**
   * 특정 마이너코드의 환경설정 목록 조회
   */
  getByMinorCode: async (
    majorCode: string,
    minorCode: string,
    params?: { useYn?: string; page?: number; size?: number }
  ): Promise<SysConfigListResponse> => {
    const response = await api.get<ApiResponse<SysConfigListResponse>>(
      `${BASE_URL}/${majorCode}/${minorCode}`,
      {
        params: {
          useYn: params?.useYn,
          page: params?.page ?? 0,
          size: params?.size ?? 100,
        },
      }
    );
    return response.data.data!;
  },

  /**
   * 환경설정값이 있는 마이너코드 목록 조회
   */
  getMinorCodesWithConfig: async (majorCode?: string): Promise<{ majorCode: string; minorCode: string; configCount: number }[]> => {
    const response = await api.get<ApiResponse<{ majorCode: string; minorCode: string; configCount: number }[]>>(
      `${BASE_URL}/minor-codes`,
      {
        params: { majorCode },
      }
    );
    return response.data.data ?? [];
  },

  /**
   * 환경설정값이 있는 메이저코드 목록 조회
   */
  getMajorCodesWithConfig: async (): Promise<{ majorCode: string; configCount: number }[]> => {
    const response = await api.get<ApiResponse<{ majorCode: string; configCount: number }[]>>(
      `${BASE_URL}/major-codes`
    );
    return response.data.data ?? [];
  },
};

export default sysConfigService;
