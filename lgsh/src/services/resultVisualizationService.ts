import api from './api';
import type { ApiResponse, ResultVisualizationRequestParams, ResultVisualizationResponse } from '@/types';

const BASE_URL = '/analysis/result-visualization';

export const resultVisualizationService = {
  getData: async (
    params: ResultVisualizationRequestParams
  ): Promise<ApiResponse<ResultVisualizationResponse>> => {
    const response = await api.get<ApiResponse<ResultVisualizationResponse>>(BASE_URL, { params });
    return response.data;
  },
};

export default resultVisualizationService;
