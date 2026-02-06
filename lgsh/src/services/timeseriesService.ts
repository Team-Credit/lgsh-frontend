import api from './api';
import type { ApiResponse } from '@/types';
import type {
  TsSnapshotSummary,
  TsScoreBin,
  TsFeatureStats,
  TsPsiPoint,
  TsMigration,
} from '@/types/timeseries';

const BASE_URL = '/ts';

export const timeseriesService = {
  snapshotSummary: async (params: {
    companyId: string;
    modelId: string;
    fromMonth?: string;
    toMonth?: string;
  }): Promise<ApiResponse<TsSnapshotSummary[]>> => {
    const response = await api.get<ApiResponse<TsSnapshotSummary[]>>(`${BASE_URL}/snapshots/summary`, { params });
    return response.data;
  },
  scoreDistribution: async (params: {
    companyId: string;
    modelId: string;
    month: string;
  }): Promise<ApiResponse<TsScoreBin[]>> => {
    const response = await api.get<ApiResponse<TsScoreBin[]>>(`${BASE_URL}/score/distribution`, { params });
    return response.data;
  },
  featureList: async (params: {
    companyId: string;
    modelId: string;
  }): Promise<ApiResponse<string[]>> => {
    const response = await api.get<ApiResponse<string[]>>(`${BASE_URL}/features/list`, { params });
    return response.data;
  },
  featureStats: async (params: {
    companyId: string;
    modelId: string;
    feature: string;
    fromMonth?: string;
    toMonth?: string;
  }): Promise<ApiResponse<TsFeatureStats[]>> => {
    const response = await api.get<ApiResponse<TsFeatureStats[]>>(`${BASE_URL}/features/stats`, { params });
    return response.data;
  },
  psi: async (params: {
    companyId: string;
    modelId: string;
    baseMonth: string;
    targetType: string;
    targetName: string;
    fromMonth?: string;
    toMonth?: string;
  }): Promise<ApiResponse<TsPsiPoint[]>> => {
    const response = await api.get<ApiResponse<TsPsiPoint[]>>(`${BASE_URL}/psi`, { params });
    return response.data;
  },
  migration: async (params: {
    companyId: string;
    modelId: string;
    fromMonth: string;
    toMonth: string;
  }): Promise<ApiResponse<TsMigration>> => {
    const response = await api.get<ApiResponse<TsMigration>>(`${BASE_URL}/migration`, { params });
    return response.data;
  },
  rebuild: async (payload: {
    companyId: string;
    modelId: string;
    fromMonth?: string;
    toMonth?: string;
  }): Promise<ApiResponse<Record<string, any>>> => {
    const response = await api.post<ApiResponse<Record<string, any>>>(`${BASE_URL}/rebuild`, payload);
    return response.data;
  },
};

export default timeseriesService;
