/**
 * 모델 변수 관리 API 서비스
 * 테이블: TB_MODEL_VARIABLE
 * 화면ID: VAR-001
 */
import api from './api';
import {
    Variable,
    VariableListParams,
    VariableCreateRequest,
    VariableUpdateRequest,
    PageResponse,
    ApiResponse
} from '../types';

export const variableService = {
    // 목록 조회
    list: async (params: VariableListParams): Promise<ApiResponse<PageResponse<Variable>>> => {
        const queryParams: Record<string, string | number | undefined> = {};
        if (params.modelId) queryParams.modelId = params.modelId;
        if (params.variableGroup) queryParams.variableGroup = params.variableGroup;
        if (params.keyword) queryParams.keyword = params.keyword;
        queryParams.page = params.page || 1;
        queryParams.size = params.size || 10;

        const response = await api.get<ApiResponse<PageResponse<Variable>>>('/admin/variables', {
            params: queryParams,
        });

        return response.data;
    },

    // 상세 조회
    get: async (variableSeq: number): Promise<ApiResponse<Variable>> => {
        const response = await api.get<ApiResponse<Variable>>(`/admin/variables/${variableSeq}`);
        return response.data;
    },

    // 등록
    create: async (data: VariableCreateRequest): Promise<ApiResponse<number>> => {
        const response = await api.post<ApiResponse<number>>('/admin/variables', data);
        return response.data;
    },

    // 수정
    update: async (variableSeq: number, data: VariableUpdateRequest): Promise<ApiResponse<void>> => {
        const response = await api.put<ApiResponse<void>>(`/admin/variables/${variableSeq}`, data);
        return response.data;
    },

    // 삭제
    delete: async (variableSeq: number): Promise<ApiResponse<void>> => {
        const response = await api.delete<ApiResponse<void>>(`/admin/variables/${variableSeq}`);
        return response.data;
    },
};

export default variableService;
