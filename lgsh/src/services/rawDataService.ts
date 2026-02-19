/**
 * 기초 데이터 업로드 서비스
 * API 호출을 담당
 */
import api from './api';
import type {
  CsvMapping,
  CsvMappingRequest,
  CsvMappingListParams,
  CodeMapping,
  CodeMappingRequest,
  UploadHistory,
  UploadProgress,
  UploadHistoryListParams,
  ErrorLog,
  ErrorLogListParams,
  ErrorResolveRequest,
  ErrorSummary,
  RawData,
  RawDataListParams,
} from '@/types/rawData';
import type { ApiResponse, PageResponse } from '@/types/common';

const BASE_URL = '/admin/rawdata';

export const rawDataService = {
  // ============================================================
  // CSV 매핑 API
  // ============================================================

  /**
   * CSV 매핑 목록 조회
   */
  getMappingList: async (params: CsvMappingListParams): Promise<PageResponse<CsvMapping>> => {
    const response = await api.get<ApiResponse<PageResponse<CsvMapping>>>(
      `${BASE_URL}/mappings`,
      { params }
    );
    return response.data.data!;
  },

  /**
   * CSV 매핑 상세 조회
   */
  getMappingDetail: async (mappingId: string): Promise<CsvMapping> => {
    const response = await api.get<ApiResponse<CsvMapping>>(
      `${BASE_URL}/mappings/${mappingId}`
    );
    return response.data.data!;
  },

  /**
   * CSV 매핑 등록
   */
  createMapping: async (request: CsvMappingRequest): Promise<CsvMapping> => {
    const response = await api.post<ApiResponse<CsvMapping>>(
      `${BASE_URL}/mappings`,
      request
    );
    // API가 success=false를 반환하면 에러 throw
    if (!response.data.success) {
      throw new Error(response.data.message || '매핑 규칙 등록에 실패했습니다.');
    }
    return response.data.data!;
  },

  /**
   * CSV 매핑 수정
   */
  updateMapping: async (mappingId: string, request: CsvMappingRequest): Promise<CsvMapping> => {
    const response = await api.put<ApiResponse<CsvMapping>>(
      `${BASE_URL}/mappings/${mappingId}`,
      request
    );
    // API가 success=false를 반환하면 에러 throw
    if (!response.data.success) {
      throw new Error(response.data.message || '매핑 규칙 수정에 실패했습니다.');
    }
    return response.data.data!;
  },

  /**
   * CSV 매핑 삭제
   */
  deleteMapping: async (mappingId: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`${BASE_URL}/mappings/${mappingId}`);
    // API가 success=false를 반환하면 에러 throw
    if (!response.data.success) {
      throw new Error(response.data.message || '매핑 규칙 삭제에 실패했습니다.');
    }
  },

  // ============================================================
  // 코드 매핑 API
  // ============================================================

  /**
   * 코드 매핑 목록 조회
   */
  getCodeMappingList: async (
    companyId: string,
    mappingType?: string
  ): Promise<CodeMapping[]> => {
    const response = await api.get<ApiResponse<CodeMapping[]>>(
      `${BASE_URL}/code-mappings`,
      { params: { companyId, mappingType } }
    );
    return response.data.data!;
  },

  /**
   * 코드 매핑 저장
   */
  saveCodeMappings: async (request: CodeMappingRequest): Promise<void> => {
    await api.post(`${BASE_URL}/code-mappings`, request);
  },

  // ============================================================
  // 파일 업로드 API
  // ============================================================

  /**
   * CSV 파일 업로드
   */
  uploadCsv: async (
    file: File,
    companyId: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadProgress> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('companyId', companyId);

    const response = await api.post<ApiResponse<UploadProgress>>(
      `${BASE_URL}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      }
    );
    return response.data.data!;
  },

  /**
   * 업로드 취소 요청
   */
  cancelUpload: async (uploadId: string): Promise<{ uploadId: string; cancelled: boolean }> => {
    const response = await api.post<ApiResponse<{ uploadId: string; cancelled: boolean }>>(
      `${BASE_URL}/upload/${uploadId}/cancel`
    );
    return response.data.data!;
  },

  /**
   * 업로드 진행상황 조회
   */
  getUploadProgress: async (uploadId: string): Promise<UploadProgress> => {
    const response = await api.get<ApiResponse<UploadProgress>>(
      `${BASE_URL}/upload/${uploadId}/progress`
    );
    return response.data.data!;
  },

  /**
   * 업로드 이력 목록 조회
   */
  getUploadHistoryList: async (
    params: UploadHistoryListParams
  ): Promise<PageResponse<UploadHistory>> => {
    const response = await api.get<ApiResponse<PageResponse<UploadHistory>>>(
      `${BASE_URL}/history`,
      { params }
    );
    return response.data.data!;
  },

  // ============================================================
  // 에러 관련 API
  // ============================================================

  /**
   * 에러 로그 목록 조회
   */
  getErrorList: async (params: ErrorLogListParams): Promise<PageResponse<ErrorLog>> => {
    const response = await api.get<ApiResponse<PageResponse<ErrorLog>>>(
      `${BASE_URL}/errors/${params.uploadId}`,
      {
        params: {
          errorType: params.errorType,
          resolvedYn: params.resolvedYn,
          page: params.page,
          size: params.size,
        },
      }
    );
    return response.data.data!;
  },

  /**
   * 에러 해결 처리
   */
  resolveError: async (
    errorLogId: string,
    request: ErrorResolveRequest
  ): Promise<void> => {
    await api.put(`${BASE_URL}/errors/${errorLogId}/resolve`, request);
  },

  /**
   * AI 제안 요청
   */
  requestAiSuggestion: async (
    errorLogId: string,
    additionalContext?: string
  ): Promise<void> => {
    await api.post(`${BASE_URL}/errors/${errorLogId}/ai-suggest`, {
      errorLogId,
      additionalContext,
    });
  },

  /**
   * 에러 요약 조회
   */
  getErrorSummary: async (uploadId: string): Promise<ErrorSummary[]> => {
    const response = await api.get<ApiResponse<ErrorSummary[]>>(
      `${BASE_URL}/errors/${uploadId}/summary`
    );
    return response.data.data!;
  },

  // ============================================================
  // 기초 데이터 API
  // ============================================================

  /**
   * 기초 데이터 목록 조회
   */
  getRawDataList: async (params: RawDataListParams): Promise<PageResponse<RawData>> => {
    const response = await api.get<ApiResponse<PageResponse<RawData>>>(
      `${BASE_URL}/data`,
      { params }
    );
    return response.data.data!;
  },

  /**
   * 기초 데이터 상세 조회
   */
  getRawDataDetail: async (rawDataId: string): Promise<RawData> => {
    const response = await api.get<ApiResponse<RawData>>(
      `${BASE_URL}/data/${rawDataId}`
    );
    return response.data.data!;
  },

  /**
   * 대상자 연결
   */
  linkPerson: async (rawDataId: string, personId: string): Promise<void> => {
    await api.put(`${BASE_URL}/data/${rawDataId}/link-person`, null, {
      params: { personId },
    });
  },

  /**
   * 대상자 자동 등록
   */
  autoRegisterPersons: async (
    uploadId: string,
    companyId: string
  ): Promise<{ registeredCount: number; linkedCount: number }> => {
    const response = await api.post<
      ApiResponse<{ registeredCount: number; linkedCount: number }>
    >(`${BASE_URL}/data/${uploadId}/register-persons`, null, {
      params: { companyId },
      timeout: 900000,
    });
    return response.data.data!;
  },

  // ============================================================
  // 진행상황 폴링
  // ============================================================

  /**
   * 업로드 진행상황 폴링
   * @param uploadId 업로드 ID
   * @param onProgress 진행상황 콜백
   * @param onComplete 완료 콜백
   * @param onError 에러 콜백
   * @param interval 폴링 간격 (ms)
   */
  pollUploadProgress: (
    uploadId: string,
    onProgress: (progress: UploadProgress) => void,
    onComplete: (progress: UploadProgress) => void,
    onError: (error: Error) => void,
    interval: number = 2000
  ): (() => void) => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let isActive = true;

    const poll = async () => {
      if (!isActive) return;

      try {
        const progress = await rawDataService.getUploadProgress(uploadId);
        onProgress(progress);

        if (
          progress.uploadStatus === 'COMPLETED' ||
          progress.uploadStatus === 'FAILED' ||
          progress.uploadStatus === 'CANCELLED'
        ) {
          onComplete(progress);
          return;
        }

        timerId = setTimeout(poll, interval);
      } catch (error) {
        onError(error as Error);
      }
    };

    poll();

    // 클린업 함수 반환
    return () => {
      isActive = false;
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  },
};

export default rawDataService;
