/**
 * 신용평가 API (실서버)
 */
import api from './api';
import type { ApiResponse } from '@/types';
import type {
  CreditBasicStatsResult,
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
  status: async (batchId: string, runId?: string): Promise<ApiResponse<import('@/types').CreditBatchStatus>> => {
    const response = await api.get<ApiResponse<import('@/types').CreditBatchStatus>>('/credit/run/status', {
      params: { batchId, runId },
    });
    return response.data;
  },
};

export default creditService;
