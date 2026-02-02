/**
 * 원청사 설정(라이선스) API 서비스
 * REST API 엔드포인트: /api/v1/companies/settings
 */
import api from './api';
import type {
  CompanySettings,
  CompanySettingsParams,
  CompanySettingsListResponse,
  LicenseUpdateRequest,
} from '@/types/companySetting';
import type { ApiResponse } from '@/types/common';

const BASE_URL = '/companies/settings';

export const companySettingsService = {
  /**
   * 원청사 설정 목록 조회
   * @param params 검색 조건
   */
  getSettingsList: async (params?: CompanySettingsParams): Promise<CompanySettingsListResponse> => {
    const response = await api.get<ApiResponse<CompanySettingsListResponse>>(BASE_URL, {
      params: {
        keyword: params?.keyword,
        companyType: params?.companyType,
        contractStatus: params?.contractStatus,
        useYn: params?.useYn,
        page: params?.page ?? 0,
        size: params?.size ?? 100,
      },
    });
    return response.data.data ?? { content: [], totalCount: 0 };
  },

  /**
   * 원청사 라이선스 정보 조회
   * @param companyId 원청사 ID
   */
  getLicense: async (companyId: string): Promise<CompanySettings> => {
    const response = await api.get<ApiResponse<CompanySettings>>(
      `${BASE_URL}/${companyId}/license`
    );
    if (!response.data.data) {
      throw new Error('라이선스 정보가 없습니다.');
    }
    return response.data.data;
  },

  /**
   * 원청사 라이선스 정보 수정
   * @param companyId 원청사 ID
   * @param request 수정 요청 데이터
   */
  updateLicense: async (companyId: string, request: LicenseUpdateRequest): Promise<void> => {
    await api.put<ApiResponse<void>>(`${BASE_URL}/${companyId}/license`, request);
  },

  /**
   * 사용자 등록 전 라이선스 체크
   * @param companyId 원청사 ID
   * @returns 라이선스 사용 가능 여부 (에러 발생 시 사용 불가)
   */
  checkLicense: async (companyId: string): Promise<boolean> => {
    try {
      await api.get<ApiResponse<void>>(`${BASE_URL}/${companyId}/license/check`);
      return true;
    } catch (error) {
      return false;
    }
  },
};

export default companySettingsService;
