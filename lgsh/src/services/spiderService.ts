/**
 * 스파이더웹 분석 API 서비스
 * 화면 ID: SWB001
 */
import api from './api';
import type {
  SpiderAnalyzeRequest,
  SpiderAnalysisResult,
  AiSummaryResult,
  SpiderPdfResponse,
  FilterOptionsResponse,
  PersonSearchItem,
} from '@/types/spider';

const API_BASE = '/spider';

const spiderService = {
  /** 스파이더웹 분석 실행 */
  analyze: async (request: SpiderAnalyzeRequest) => {
    const { data } = await api.post<{ success: boolean; data: SpiderAnalysisResult; code: string; message: string }>(
      `${API_BASE}/analyze`,
      request
    );
    return data;
  },

  /** AI 분석 요약 요청 */
  aiSummary: async (analysisData: SpiderAnalysisResult) => {
    const { data } = await api.post<{ success: boolean; data: AiSummaryResult; code: string; message: string }>(
      `${API_BASE}/ai-summary`,
      analysisData
    );
    return data;
  },

  /** PDF 생성 */
  generatePdf: async (request: any) => {
    const { data } = await api.post<{ success: boolean; data: SpiderPdfResponse; code: string; message: string }>(
      `${API_BASE}/generate-pdf`,
      request
    );
    return data;
  },

  /** 필터 옵션 목록 */
  getFilterOptions: async () => {
    const { data } = await api.get<{ success: boolean; data: FilterOptionsResponse; code: string; message: string }>(
      `${API_BASE}/filter-options`
    );
    return data;
  },

  /** 분석 이력 조회 */
  getHistory: async (params: { companyId?: string; year?: number; page?: number; size?: number }) => {
    const { data } = await api.get(`${API_BASE}/history`, { params });
    return data;
  },

  /** 대상자 검색 */
  searchPerson: async (keyword: string, companyId?: string) => {
    const { data } = await api.get<{ success: boolean; data: PersonSearchItem[]; code: string; message: string }>(
      `${API_BASE}/search-person`,
      { params: { keyword, companyId: companyId || '' } }
    );
    return data;
  },

  /** 분석 이력 저장 */
  saveHistory: async (request: any) => {
    const { data } = await api.post(`${API_BASE}/history`, request);
    return data;
  },
};

export default spiderService;
