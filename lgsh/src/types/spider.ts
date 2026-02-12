/**
 * 스파이더웹 분석 타입 정의
 * 화면 ID: SWB001
 */

/** 6축 레이더 데이터 포인트 */
export interface RadarAxis {
  axis: string;
  key: string;
  value: number;
}

/** 분석 대상/비교 기준 그룹 데이터 */
export interface GroupData {
  label: string;
  count: number;
  avgScore: number;
  avgGrade: string;
  axes: RadarAxis[];
  conditions: FilterCondition;
}

/** 축별 차이 */
export interface AxisDiff {
  axis: string;
  key: string;
  diff: number;
}

/** 필터 조건 */
export interface FilterCondition {
  personId?: string;
  ageGroup?: string;
  gender?: string;
  region?: string;
  jobCode?: string;
  incomeMin?: number;
  incomeMax?: number;
}

/** 해시태그 유형 */
export type HashTagType = 'yearMonth' | 'person' | 'age' | 'gender' | 'region' | 'job' | 'income';

/** 해시태그 */
export interface HashTag {
  id: string;
  type: HashTagType;
  label: string;
  value: string;
  color: string;
}

/** 해시태그 유형별 색상 매핑 */
export const TAG_COLORS: Record<HashTagType, string> = {
  yearMonth: '#1890ff',
  person: '#52c41a',
  age: '#fa8c16',
  gender: '#722ed1',
  region: '#13c2c2',
  job: '#eb2f96',
  income: '#faad14',
};

/** AI 분석 키 발견 항목 */
export interface KeyFinding {
  category: string;
  finding: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

/** AI 분석 결과 */
export interface AiSummaryResult {
  summary: string;
  keyFindings: KeyFinding[];
  recommendations: string[];
  overallRisk: string;
  generatedAt: string;
}

/** 분석 전체 결과 */
export interface SpiderAnalysisResult {
  year: number;
  month: number;
  ctlYear?: number;       // 비교 기준 년도
  ctlMonth?: number;      // 비교 기준 월
  experiment: GroupData;
  control: GroupData;
  diff: AxisDiff[];
}

/** 분석 요청 DTO */
export interface SpiderAnalyzeRequest {
  year: number;
  month: number;
  ctlYear?: number;       // 비교 기준 년도 (미입력 시 year 사용)
  ctlMonth?: number;      // 비교 기준 월 (미입력 시 month 사용)
  companyId?: string;
  experiment: FilterCondition;
  control: FilterCondition;
}

/** PDF 생성 요청 DTO */
export interface SpiderPdfRequest {
  year: number;
  month: number;
  title: string;
  experiment: GroupData;
  control: GroupData;
  diff: AxisDiff[];
  aiSummary?: AiSummaryResult;
}

/** PDF 생성 응답 */
export interface SpiderPdfResponse {
  pdfBase64: string;
  fileName: string;
  fileSize: number;
  analysisSeq?: number;
}

/** 필터 옵션 항목 */
export interface OptionItem {
  value: string;
  label: string;
}

/** 연봉 구간 옵션 항목 */
export interface IncomeRangeItem extends OptionItem {
  min: number;
  max: number | null;
}

/** 필터 옵션 응답 */
export interface FilterOptionsResponse {
  ageGroups: OptionItem[];
  genders: OptionItem[];
  regions: OptionItem[];
  jobCodes: OptionItem[];
  incomeRanges: IncomeRangeItem[];
}

/** 분석 이력 항목 */
export interface SpiderHistoryItem {
  analysisSeq: number;
  snapshotMonth: string;    // YYMM 형식 (예: '2601')
  expCondition: string;
  ctlCondition: string;
  expCount: number;
  ctlCount: number;
  hasAiSummary: boolean;
  hasPdf: boolean;
  analysisUserNm: string;
  regDt: string;
}

/** 대상자 검색 결과 */
export interface PersonSearchItem {
  personId: string;
  personNm: string;
}
