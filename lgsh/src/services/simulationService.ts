import api from './api';
import type { ApiResponse } from '@/types';
import type {
  SimulationHistoryResponse,
  SimulationRequest,
  SimulationResult,
  SimulationSaveRequest,
  SimulationSaveResponse,
} from '@/types';

const simulationService = {
  runSimulation: async (payload: SimulationRequest): Promise<ApiResponse<SimulationResult>> => {
    const response = await api.post<ApiResponse<SimulationResult>>('/simulation', payload);
    return response.data;
  },
  saveSimulation: async (payload: SimulationSaveRequest): Promise<ApiResponse<SimulationSaveResponse>> => {
    const response = await api.post<ApiResponse<SimulationSaveResponse>>('/simulation/save', payload);
    return response.data;
  },
  fetchHistory: async (params?: {
    scenarioType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }): Promise<ApiResponse<SimulationHistoryResponse>> => {
    const response = await api.get<ApiResponse<SimulationHistoryResponse>>('/simulation/history', { params });
    return response.data;
  },
};

export default simulationService;
