/**
 * 공통코드 서비스
 * API 호출을 담당
 */
import api from './api';
import type {
  MajorCode,
  MinorCode,
  MajorCodeRequest,
  MinorCodeRequest,
  MajorCodeListResponse,
  MinorCodeListResponse,
  CodeSearchParams,
} from '@/types';
import type { ApiResponse } from '@/types/common';

const BASE_URL = '/codes';

export const codeService = {
  // ==================== MAJOR CODE ====================

  /**
   * 대분류 코드 목록 조회
   */
  getMajorCodeList: async (params?: CodeSearchParams): Promise<MajorCodeListResponse> => {
    const response = await api.get<ApiResponse<MajorCodeListResponse>>(`${BASE_URL}/majors`, {
      params: {
        majorCode: params?.majorCode,
        majorCodeNm: params?.majorCodeNm,
        useYn: params?.useYn,
        page: params?.page ?? 0,
        size: params?.size ?? 100,
      },
    });
    return response.data.data!;
  },

  /**
   * 대분류 코드 단건 조회
   */
  getMajorCode: async (majorCode: string): Promise<MajorCode> => {
    const response = await api.get<ApiResponse<MajorCode>>(`${BASE_URL}/majors/${majorCode}`);
    return response.data.data!;
  },

  /**
   * 대분류 코드 등록
   */
  createMajorCode: async (request: MajorCodeRequest): Promise<void> => {
    await api.post(`${BASE_URL}/majors`, request);
  },

  /**
   * 대분류 코드 수정
   */
  updateMajorCode: async (majorCode: string, request: MajorCodeRequest): Promise<void> => {
    await api.put(`${BASE_URL}/majors/${majorCode}`, request);
  },

  /**
   * 대분류 코드 삭제
   */
  deleteMajorCode: async (majorCode: string): Promise<void> => {
    await api.delete(`${BASE_URL}/majors/${majorCode}`);
  },

  // ==================== MINOR CODE ====================

  /**
   * 소분류 코드 목록 조회
   */
  getMinorCodeList: async (params?: CodeSearchParams): Promise<MinorCodeListResponse> => {
    const response = await api.get<ApiResponse<MinorCodeListResponse>>(`${BASE_URL}/minors`, {
      params: {
        majorCode: params?.majorCode,
        minorCode: params?.minorCode,
        minorCodeNm: params?.minorCodeNm,
        useYn: params?.useYn,
        page: params?.page ?? 0,
        size: params?.size ?? 100,
      },
    });
    return response.data.data!;
  },

  /**
   * 소분류 코드 단건 조회
   */
  getMinorCode: async (majorCode: string, minorCode: string): Promise<MinorCode> => {
    const response = await api.get<ApiResponse<MinorCode>>(
      `${BASE_URL}/minors/${majorCode}/${minorCode}`
    );
    return response.data.data!;
  },

  /**
   * 소분류 코드 등록
   */
  createMinorCode: async (request: MinorCodeRequest): Promise<void> => {
    await api.post(`${BASE_URL}/minors`, request);
  },

  /**
   * 소분류 코드 수정
   */
  updateMinorCode: async (
    majorCode: string,
    minorCode: string,
    request: MinorCodeRequest
  ): Promise<void> => {
    await api.put(`${BASE_URL}/minors/${majorCode}/${minorCode}`, request);
  },

  /**
   * 소분류 코드 삭제
   */
  deleteMinorCode: async (majorCode: string, minorCode: string): Promise<void> => {
    await api.delete(`${BASE_URL}/minors/${majorCode}/${minorCode}`);
  },

  // ==================== 공통 조회 ====================

  /**
   * 공통코드 조회 (majorCode로 minorCode 목록 조회)
   * Select Box나 캐시용
   */
  getCodeListByMajorCode: async (majorCode: string): Promise<MinorCode[]> => {
    const response = await api.get<ApiResponse<MinorCode[]>>(`${BASE_URL}/${majorCode}`);
    return response.data.data ?? [];
  },
};

export default codeService;
