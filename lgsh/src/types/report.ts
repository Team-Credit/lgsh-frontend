/**
 * 월간레포트 타입 정의
 */

// 레포트 항목
export interface ReportItem {
  itemId: string;
  itemNm: string;
  itemNmEng?: string;
  itemDesc: string;
  itemCategory?: 'SUMMARY' | 'STAT' | 'CHART' | 'LIST' | 'ANALYSIS';
  chartType: 'TEXT' | 'BAR' | 'PIE' | 'LINE' | 'HISTOGRAM' | 'TABLE' | null;
  serviceMethod?: string;
  isRequired?: boolean;
  displayOrder?: number;
  itemOrder?: number;
  iconClass?: string;
  status?: 'SELECTED' | 'REQUIRED' | 'EXCLUDED';
  defaultStatus?: 'REQUIRED' | 'AVAILABLE' | 'EXCLUDED';
  useYn: string;
  // SP 설정 필드
  dataSource?: 'FIXED' | 'SP';
  spName?: string;
  spParams?: string;
  outputFormat?: 'SINGLE' | 'LIST' | 'CHART' | 'TABLE';
  xAxisColumn?: string;
  yAxisColumn?: string;
  seriesColumn?: string;
  labelFormat?: string;
  colorScheme?: string;
  customConfig?: string;
  systemYn?: string;
  regDt?: string;
  updDt?: string;
}

// 레포트 항목 생성 요청
export interface ReportItemCreateRequest {
  itemId: string;
  itemNm: string;
  itemNmEng?: string;
  itemDesc?: string;
  defaultStatus?: 'REQUIRED' | 'AVAILABLE' | 'EXCLUDED';
  chartType?: 'TEXT' | 'BAR' | 'PIE' | 'LINE' | 'HISTOGRAM' | 'TABLE';
  itemOrder?: number;
  iconClass?: string;
  dataSource?: 'FIXED' | 'SP';
  spName?: string;
  spParams?: string;
  outputFormat?: 'SINGLE' | 'LIST' | 'CHART' | 'TABLE';
  xAxisColumn?: string;
  yAxisColumn?: string;
  seriesColumn?: string;
  labelFormat?: string;
  colorScheme?: string;
  customConfig?: string;
  useYn?: string;
}

// 레포트 항목 수정 요청
export interface ReportItemUpdateRequest extends Partial<ReportItemCreateRequest> {
  itemId: string;
}

// 칸반 컬럼 타입
export type KanbanColumnType = 'available' | 'required' | 'excluded';

// 칸반 컬럼 정의
export interface KanbanColumn {
  id: KanbanColumnType;
  title: string;
  color: string;
  items: ReportItem[];
}

// 레포트 항목 선택 요청
export interface ReportItemSelectRequest {
  companyId: string;
  itemId: string;
  status: 'SELECTED' | 'REQUIRED' | 'EXCLUDED';
}

// 선택된 항목
export interface SelectedItem {
  itemId: string;
  status: 'REQUIRED' | 'SELECTED' | 'EXCLUDED';
  order?: number;
}

// 사용자 편집 AI 요약
export interface CustomAiSummary {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  riskLevel: string;
}

// 레포트 생성 요청
export interface ReportGenerateRequest {
  year: number;
  month: number;
  title: string;
  selectedItems: SelectedItem[];
  includeAiSummary?: boolean;
  customAiSummary?: CustomAiSummary;
}

// 레포트 미리보기 요청
export interface ReportPreviewRequest {
  companyId: string;
  year: number;
  month: number;
  itemIds?: string[];           // 프론트엔드 사용
  selectedItemIds?: string[];   // 백엔드 DTO 필드명
  includeAiSummary?: boolean;
  includeCharts?: boolean;
}

// AI 요약 데이터
export interface AiSummaryData {
  success: boolean;
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  riskLevel?: string;
  trend?: string;
  editable?: boolean;
  source?: string;
  error?: string;
}

// 에러 항목
export interface ErrorItem {
  itemId: string;
  error: string;
  message?: string;
}

// 레포트 미리보기 응답
export interface ReportPreviewData {
  stats: {
    evalCount: number;
    avgScore: number;
    gradeDistribution?: {
      gradeACount?: number;
      gradeBCount?: number;
      gradeCCount?: number;
      gradeDCount?: number;
      gradeECount?: number;
    };
  };
  items: Record<string, ReportItemData>;
  aiSummary?: AiSummaryData;
  chartImages?: Record<string, string>;
  errorItems?: ErrorItem[];
}

// 레포트 항목 데이터
export interface ReportItemData {
  chartType: string;
  data: any[];
}

// 레포트 이력
export interface ReportHistory {
  reportSeq: number;
  companyId: string;
  year: number;
  month: number;
  title: string;
  genStatus: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  genStatusNm?: string;
  filePath: string | null;
  fileNm: string | null;
  fileSize: number | null;
  pageCnt: number | null;
  errorMsg: string | null;
  createdBy: string;
  createdByNm?: string;
  createdDt: string;
  completedDt: string | null;
}

// 레포트 이력 검색 조건
export interface ReportHistorySearchParams {
  companyId: string;
  year?: number;
  month?: number;
  page?: number;
  pageSize?: number;
}

// 레포트 이력 응답
export interface ReportHistoryResponse {
  content: ReportHistory[];
  totalCount: number;
  page: number;
  size: number;
}

// 월간 마감 상태
export interface MonthlyClose {
  closeSeq?: number;  // 마감 일련번호 (마감 취소 시 필요)
  companyId: string;
  year: number;
  month: number;
  closeStatus: 'OPEN' | 'CLOSED' | 'CANCELLED';
  closeStatusNm?: string;
  closedDt: string | null;
  closedBy: string | null;
  closedByNm?: string;
  closeNote: string | null;
  canCancel: boolean | string;  // 백엔드에서 'Y'/'N' 또는 boolean으로 올 수 있음
}

// 마감 처리 요청
export interface MonthlyCloseRequest {
  companyId: string;
  year: number;
  month: number;
  closeNote?: string;
}

// 마감 취소 요청
export interface CloseCancelRequest {
  closeSeq: number;  // 마감 일련번호 (필수)
  reason: string;    // 취소 사유 (필수)
}

// 마감 이력
export interface CloseChangeHistory {
  histSeq: number;
  companyId: string;
  year: number;
  month: number;
  changeType: 'CLOSE' | 'CANCEL' | 'REOPEN';
  changeTypeNm?: string;
  changeReason: string | null;
  changedBy: string;
  changedByNm?: string;
  changedDt: string;
}

// 레포트 통계
export interface ReportStats {
  month: number;
  reportCount: number;
  closedYn: string;
  closedDt: string | null;
}

// 연간 통계 응답
export interface ReportYearlyStats {
  year: number;
  stats: ReportStats[];
  totalReports: number;
  closedMonths: number;
}

// AI 요약 응답
export interface AiSummaryResponse {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  trend: 'UP' | 'STABLE' | 'DOWN';
  data: Record<string, any>;
}
