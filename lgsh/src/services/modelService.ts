/**
 * 모델관리 API 서비스
 */
import api from './api';
import type {
  ModelListResponse,
  ModelDetailResponse,
  ModelSearchParams,
  ModelCreateRequest,
  ModelUpdateRequest,
  ModelTrainRequest,
  ModelTrainStatusResponse,
  ModelDeployRequest,
} from '@/types';
import type { ApiResponse, PageResponse } from '@/types/common';

const BASE_URL = '/models';

export const modelService = {
  /**
   * 모델 목록 조회
   */
  list: (params: ModelSearchParams = {}) =>
    api.get<ApiResponse<PageResponse<ModelListResponse>>>(BASE_URL, { params }),

  /**
   * 모델 상세 조회
   */
  detail: (modelId: string) =>
    api.get<ApiResponse<ModelDetailResponse>>(`${BASE_URL}/${modelId}`),

  /**
   * 모델 등록
   */
  create: (data: ModelCreateRequest) =>
    api.post<ApiResponse<ModelDetailResponse>>(BASE_URL, data),

  /**
   * 모델 수정
   */
  update: (modelId: string, data: ModelUpdateRequest) =>
    api.put<ApiResponse<ModelDetailResponse>>(`${BASE_URL}/${modelId}`, data),

  /**
   * 모델 학습 시작
   */
  train: (data: ModelTrainRequest) =>
    api.post<ApiResponse<ModelTrainStatusResponse>>(`${BASE_URL}/train`, data),

  /**
   * 학습 상태 조회
   */
  getTrainStatus: (modelId: string) =>
    api.get<ApiResponse<ModelTrainStatusResponse>>(`${BASE_URL}/train/${modelId}`),

  /**
   * 모델 배포
   */
  deploy: (modelId: string, data: ModelDeployRequest = {}) =>
    api.put<ApiResponse<ModelDetailResponse>>(`${BASE_URL}/${modelId}/deploy`, data),

  /**
   * 모델 삭제 (DRAFT/FAILED 상태만 가능)
   */
  delete: (modelId: string) =>
    api.delete<ApiResponse<void>>(`${BASE_URL}/${modelId}`),
};

export default modelService;
