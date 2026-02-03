/**
 * 신용평가 API (실서버)
 */
import api from './api';
import type { ApiResponse } from '@/types';
import type {
  CreditBasicStatsResult,
  CreditBatchRunResult,
  CreditBatchStatus,
  CreditCorrelationResult,
  CreditDistributionResult,
  CreditMissingPatternResult,
  CreditOutlierResult,
  CreditPredictRequest,
  CreditPredictResult,
} from '@/types';

const creditService = {
  predict: async (payload: CreditPredictRequest): Promise<ApiResponse<CreditPredictResult>> => {
    const response = await api.post<ApiResponse<CreditPredictResult>>('/credit/run', payload);
    return response.data;
  },

  warmup: async (payload: { modelId: string }): Promise<ApiResponse<{ modelId: string; trainingDataCnt?: number; modelMetrics?: any }>> => {
    const response = await api.post<ApiResponse<{ modelId: string; trainingDataCnt?: number; modelMetrics?: any }>>(
      '/credit/model/warmup',
      payload,
      { timeout: 300000 }
    );
    return response.data;
  },

  /**
   * 배치 신용평가 실행 (개인/그룹/전체)
   */
  runBatch: async (payload: CreditPredictRequest): Promise<ApiResponse<CreditBatchRunResult>> => {
    const response = await api.post<ApiResponse<CreditBatchRunResult>>('/credit/run', payload);
    return response.data;
  },

  /**
   * 배치 실행 상태 조회
   */
  getBatchStatus: async (
    batchId: string,
    runId: string,
    params?: { mode?: string; userId?: string }
  ): Promise<ApiResponse<CreditBatchStatus>> => {
    const response = await api.get<ApiResponse<CreditBatchStatus>>('/credit/run/status', {
      params: { batchId, runId, ...params },
    });
    return response.data;
  },
  distribution: async (): Promise<ApiResponse<CreditDistributionResult>> => {
    const response = await api.get<ApiResponse<CreditDistributionResult>>('/credit/distribution');
    return response.data;
  },
  analysis: async (modelId?: string): Promise<ApiResponse<CreditCorrelationResult>> => {
    const response = await api.get<ApiResponse<CreditCorrelationResult>>('/analysis', {
      params: modelId ? { modelId } : undefined,
    });
    return response.data;
  },
  basicStats: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    modelId?: string;
  }): Promise<ApiResponse<CreditBasicStatsResult>> => {
    const response = await api.get<ApiResponse<CreditBasicStatsResult>>('/analysis/basic-stats', {
      params,
    });
    return response.data;
  },
  missingPatterns: async (params?: {
    variableSeq?: number | string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<CreditMissingPatternResult | CreditMissingPatternResult[]>> => {
    const variableSeq = params?.variableSeq ?? 0;
    const response = await api.get<ApiResponse<CreditMissingPatternResult | CreditMissingPatternResult[]>>(
      `/analysis/missing/${variableSeq}`,
      {
        params: {
          startDate: params?.startDate,
          endDate: params?.endDate,
        },
      }
    );
    return response.data;
  },
  outliers: async (params: {
    variableSeq: number | string;
    method: string;
    threshold: number;
  }): Promise<ApiResponse<CreditOutlierResult | CreditOutlierResult[]>> => {
    const response = await api.get<ApiResponse<CreditOutlierResult | CreditOutlierResult[]>>(
      `/analysis/outliers/${params.variableSeq}`,
      {
        params: {
          method: params.method,
          threshold: params.threshold,
        },
      }
    );
    return response.data;
  },
};

export default creditService;
