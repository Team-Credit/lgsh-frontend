/**
 * 배치관리 서비스
 * API 호출을 담당
 */
import api from './api';
import type {
  BatchHistory,
  BatchHistoryParams,
  BatchHistoryListResponse,
  BatchTriggerRequest,
  BatchTriggerResponse,
  BatchStatusUpdateRequest,
  BatchSchedule,
  BatchScheduleRequest,
  BatchScheduleListResponse,
} from '@/types/batch';
import type { ApiResponse } from '@/types/common';

const BASE_URL = '/admin/batches';

export const batchService = {
  /**
   * 배치 실행 이력 목록 조회
   * @param params 검색 조건
   */
  getBatchHistory: async (params?: BatchHistoryParams): Promise<BatchHistoryListResponse> => {
    const response = await api.get<ApiResponse<BatchHistoryListResponse>>(BASE_URL, {
      params: {
        batchType: params?.batchType,
        status: params?.status,
        startDtFrom: params?.startDtFrom,
        startDtTo: params?.startDtTo,
        page: params?.page ?? 0,
        size: params?.size ?? 100,
      },
    });
    return response.data.data!;
  },

  /**
   * 배치 실행 이력 상세 조회
   * @param batchSeq 배치 SEQ
   */
  getBatchDetail: async (batchSeq: number): Promise<BatchHistory> => {
    const response = await api.get<ApiResponse<BatchHistory>>(`${BASE_URL}/${batchSeq}`);
    return response.data.data!;
  },

  /**
   * 배치 수동 실행
   * @param request 실행 요청
   */
  triggerBatch: async (request: BatchTriggerRequest): Promise<BatchTriggerResponse> => {
    const response = await api.post<ApiResponse<BatchTriggerResponse>>(`${BASE_URL}/trigger`, request);
    return response.data.data!;
  },

  /**
   * 배치 상태 업데이트 (외부 배치 프로그램에서 호출)
   * @param batchSeq 배치 SEQ
   * @param request 상태 업데이트 요청
   */
  updateBatchStatus: async (batchSeq: number, request: BatchStatusUpdateRequest): Promise<void> => {
    await api.put(`${BASE_URL}/${batchSeq}/status`, null, {
      params: {
        status: request.status,
        totalCnt: request.totalCnt,
        successCnt: request.successCnt,
        failCnt: request.failCnt,
        errorMessage: request.errorMessage,
      },
    });
  },

  // ==================== 배치 스케줄 ====================

  /**
   * 스케줄 목록 조회
   */
  getScheduleList: async (batchType?: string): Promise<BatchScheduleListResponse> => {
    const response = await api.get<ApiResponse<BatchScheduleListResponse>>(`${BASE_URL}/schedules`, {
      params: { batchType },
    });
    return response.data.data!;
  },

  /**
   * 스케줄 등록
   */
  createSchedule: async (request: BatchScheduleRequest): Promise<BatchSchedule> => {
    const response = await api.post<ApiResponse<BatchSchedule>>(`${BASE_URL}/schedules`, request);
    return response.data.data!;
  },

  /**
   * 스케줄 수정
   */
  updateSchedule: async (scheduleSeq: number, request: BatchScheduleRequest): Promise<BatchSchedule> => {
    const response = await api.put<ApiResponse<BatchSchedule>>(`${BASE_URL}/schedules/${scheduleSeq}`, request);
    return response.data.data!;
  },

  /**
   * 스케줄 삭제
   */
  deleteSchedule: async (scheduleSeq: number): Promise<void> => {
    await api.delete(`${BASE_URL}/schedules/${scheduleSeq}`);
  },

  /**
   * 스케줄 활성화/비활성화 토글
   */
  toggleSchedule: async (scheduleSeq: number, enable: boolean): Promise<void> => {
    await api.put(`${BASE_URL}/schedules/${scheduleSeq}/toggle`, null, {
      params: { enable },
    });
  },
};

export default batchService;
