/**
 * 월간레포트 API 서비스
 */
import api from './api';
import type { ApiResponse } from '@/types';
import type {
  ReportItem,
  ReportItemCreateRequest,
  ReportItemUpdateRequest,
  ReportGenerateRequest,
  ReportPreviewRequest,
  ReportPreviewData,
  ReportHistory,
  ReportHistorySearchParams,
  ReportHistoryResponse,
  MonthlyClose,
  MonthlyCloseRequest,
  CloseCancelRequest,
  CloseChangeHistory,
  ReportYearlyStats,
  AiSummaryResponse,
} from '@/types/report';

export const reportService = {
  // ============ 레포트 항목 ============

  /**
   * 레포트 항목 목록 조회
   */
  getItems: async (companyId: string): Promise<ApiResponse<ReportItem[]>> => {
    const response = await api.get<ApiResponse<ReportItem[]>>('/report/items', {
      params: { companyId },
    });
    return response.data;
  },

  /**
   * 레포트 항목 상태 변경 (칸반 드래그앤드롭)
   */
  updateItemStatus: async (
    companyId: string,
    itemId: string,
    status: 'SELECTED' | 'REQUIRED' | 'EXCLUDED'
  ): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>('/report/items/status', {
      companyId,
      itemId,
      status,
    });
    return response.data;
  },

  /**
   * 사용자별 항목 선택 조회
   */
  getUserItemSelections: async (): Promise<ApiResponse<{ itemId: string; itemStatus: string; itemOrder: number }[]>> => {
    const response = await api.get<ApiResponse<{ itemId: string; itemStatus: string; itemOrder: number }[]>>('/report/items/selections');
    return response.data;
  },

  /**
   * 레포트 항목 일괄 저장
   */
  saveItemSelections: async (
    companyId: string,
    selections: { itemId: string; status: string; displayOrder: number }[]
  ): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>('/report/items/batch', {
      companyId,
      selections,
    });
    return response.data;
  },

  // ============ 레포트 항목 관리 (관리자) ============

  /**
   * 레포트 항목 상세 조회
   */
  getItem: async (itemId: string): Promise<ApiResponse<ReportItem>> => {
    const response = await api.get<ApiResponse<ReportItem>>(`/report/items/${itemId}`);
    return response.data;
  },

  /**
   * 레포트 항목 등록 (커스텀 SP 항목)
   */
  createItem: async (request: ReportItemCreateRequest): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>('/report/items', request);
    return response.data;
  },

  /**
   * 레포트 항목 수정
   */
  updateItem: async (itemId: string, request: ReportItemUpdateRequest): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>(`/report/items/${itemId}`, request);
    return response.data;
  },

  /**
   * 레포트 항목 삭제 (시스템 항목 제외)
   */
  deleteItem: async (itemId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/report/items/${itemId}`);
    return response.data;
  },

  /**
   * 레포트 항목 순서 저장
   */
  updateItemOrders: async (items: { itemId: string; itemOrder: number }[]): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>('/report/items/order', items);
    return response.data;
  },

  // ============ 레포트 생성 ============

  /**
   * 레포트 미리보기 데이터 조회
   */
  getPreview: async (request: ReportPreviewRequest): Promise<ApiResponse<ReportPreviewData>> => {
    // 백엔드 DTO 필드명에 맞게 변환
    const payload = {
      year: request.year,
      month: request.month,
      selectedItemIds: request.itemIds || request.selectedItemIds,
      includeAiSummary: request.includeAiSummary ?? true,
      includeCharts: request.includeCharts ?? false,
    };
    const response = await api.post<ApiResponse<ReportPreviewData>>('/report/preview', payload);
    return response.data;
  },

  /**
   * 레포트 PDF 생성
   */
  generate: async (request: ReportGenerateRequest): Promise<ApiResponse<ReportHistory>> => {
    const response = await api.post<ApiResponse<ReportHistory>>('/report/generate', request);
    return response.data;
  },

  /**
   * AI 요약 생성
   */
  getAiSummary: async (
    companyId: string,
    year: number,
    month: number,
    includeComparison: boolean = true
  ): Promise<ApiResponse<AiSummaryResponse>> => {
    const response = await api.post<ApiResponse<AiSummaryResponse>>('/report/ai-summary', {
      companyId,
      year,
      month,
      includeComparison,
    });
    return response.data;
  },

  // ============ 레포트 이력 ============

  /**
   * 레포트 이력 목록 조회
   */
  getHistory: async (params: ReportHistorySearchParams): Promise<ApiResponse<ReportHistoryResponse>> => {
    const response = await api.get<ApiResponse<ReportHistoryResponse>>('/report/history', {
      params,
    });
    return response.data;
  },

  /**
   * 레포트 이력 상세 조회
   */
  getHistoryDetail: async (reportSeq: number): Promise<ApiResponse<ReportHistory>> => {
    const response = await api.get<ApiResponse<ReportHistory>>(`/report/history/${reportSeq}`);
    return response.data;
  },

  /**
   * 레포트 파일 다운로드
   */
  download: async (reportSeq: number): Promise<Blob> => {
    const response = await api.get(`/report/download/${reportSeq}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * 레포트 삭제
   */
  deleteHistory: async (reportSeq: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/report/history/${reportSeq}`);
    return response.data;
  },

  // ============ 월간 마감 ============

  /**
   * 월간 마감 현황 조회
   */
  getCloseStatus: async (companyId: string, year: number): Promise<ApiResponse<MonthlyClose[]>> => {
    const response = await api.get<ApiResponse<MonthlyClose[]>>('/report/close/status', {
      params: { companyId, year },
    });
    return response.data;
  },

  /**
   * 월간 마감 처리
   */
  processClose: async (request: MonthlyCloseRequest): Promise<ApiResponse<MonthlyClose>> => {
    const response = await api.post<ApiResponse<MonthlyClose>>('/report/close', request);
    return response.data;
  },

  /**
   * 월간 마감 취소
   */
  cancelClose: async (request: CloseCancelRequest): Promise<ApiResponse<MonthlyClose>> => {
    const response = await api.post<ApiResponse<MonthlyClose>>('/report/close/cancel', request);
    return response.data;
  },

  /**
   * 마감 변경 이력 조회
   */
  getCloseHistory: async (
    companyId: string,
    year: number,
    month?: number
  ): Promise<ApiResponse<CloseChangeHistory[]>> => {
    const response = await api.get<ApiResponse<CloseChangeHistory[]>>('/report/close/history', {
      params: { companyId, year, month },
    });
    return response.data;
  },

  // ============ 통계 ============

  /**
   * 연간 레포트 통계 조회
   */
  getYearlyStats: async (companyId: string, year: number): Promise<ApiResponse<ReportYearlyStats>> => {
    const response = await api.get<ApiResponse<ReportYearlyStats>>('/report/stats', {
      params: { companyId, year },
    });
    return response.data;
  },
};

export default reportService;
