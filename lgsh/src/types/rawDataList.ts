/**
 * 기초데이터조회 관련 타입 정의
 */

/**
 * 기초 데이터 조회 응답
 */
export interface RawDataListItem {
  rawDataId: string;
  personId: string;
  personNm: string | null;
  companyId: string;
  companyNm: string | null;
  regUserId: string;
  regDt: string;
  updUserId: string;
  updDt: string;
  dataCollectDt: string;
  snapshotDate: string;
  // 주소 정보
  livAdd: string;
  resAdd: string;
  livResMatchYn: string;
  addYn: string;
  // 주민등록/카드발급
  homeIdRegisterDays: number;
  cardIssueRecencyDays: number;
  newCardIssueCnt6m: number;
  newCardIssueCnt12m: number;
  currentCardCnt: number;
  cardCntChange12m: number;
  // 카드 한도/사용
  mainCard6mAvgLimitUsageRatio: number;
  cardLimitAmt: number;
  loanLimitAmt: number;
  loanIntRate: number;
  // 일시불/할부/현금서비스 변화액
  lumpAmtChg1m: number;
  lumpAmtChg3m: number;
  lumpAmtChg6m: number;
  instAmtChg1m: number;
  instAmtChg3m: number;
  instAmtChg6m: number;
  cashAdvAmtChg1m: number;
  cashAdvAmtChg3m: number;
  cashAdvAmtChg6m: number;
  // 연체 정보
  recentDelqAmt: number;
  maxDelqAmt: number;
  sumDelqAmt: number;
  meanDelqAmt: number;
  maxDpdDays: number;
  recentDpdDays: number;
  // DPD 통계
  dpdMean3m: number;
  dpdMax3m: number;
  dpdStd3m: number;
  dpdMean6m: number;
  dpdMax6m: number;
  dpdStd6m: number;
  dpdMean12m: number;
  dpdMax12m: number;
  dpdStd12m: number;
  // 대출 정보
  newLoanIssueCnt1m: number;
  newLoanIssueCnt3m: number;
  newLoanIssueCnt6m: number;
  loanRecencyDays: number;
  loanTenureDays: number;
  lenderCntChange12m: number;
  // 부도
  budo: number;
  // 카드 일시불/할부/현금서비스 (3M)
  cardLumpSum3m: number;
  cardLumpAvg3m: number;
  cardLumpMax3m: number;
  cardInstSum3m: number;
  cardInstAvg3m: number;
  cardInstMax3m: number;
  cardCashAdvSum3m: number;
  cardCashAdvAvg3m: number;
  cardCashAdvMax3m: number;
  // 카드 일시불/할부/현금서비스 (6M)
  cardLumpSum6m: number;
  cardLumpAvg6m: number;
  cardLumpMax6m: number;
  cardInstSum6m: number;
  cardInstAvg6m: number;
  cardInstMax6m: number;
  cardCashAdvSum6m: number;
  cardCashAdvAvg6m: number;
  cardCashAdvMax6m: number;
  // 현금서비스 비율
  cardCashAdvRatio3m: number;
  cardCashAdvRatio6m: number;
  // 대출 잔액/상환/이자
  loanBalAvg3m: number;
  loanBalAvg6m: number;
  loanRepaySum3m: number;
  loanRepaySum6m: number;
  loanIntPaySum3m: number;
  loanIntPaySum6m: number;
  // 업로드/상태
  uploadId: string | null;
  dataStatus: string | null;
  validationMsg: string | null;
  applyFlag: string;
  applyFlagNm: string | null;
}

/**
 * 조회 조건
 */
export interface RawDataListSearchParams {
  rawDataId?: string;
  personId?: string;
  companyId?: string;
  snapshotDateFrom?: string;
  snapshotDateTo?: string;
  applyFlag?: string;
  page?: number;
  size?: number;
}

/**
 * 일괄 제외 요청 (rawDataId 기준 - 전체)
 */
export interface RawDataExcludeRequest {
  rawDataIds: string[];
  forceExclude?: boolean;
}

/**
 * 행 식별 복합키 (PK 기반)
 */
export interface RawDataRowKey {
  rawDataId: string;
  personId: string;
  companyId: string;
}

/**
 * 개별 행 단위 제외/복원 요청 (PK 기반)
 */
export interface RawDataRowsRequest {
  rows: RawDataRowKey[];
}

/**
 * 상태별 통계
 */
export interface RawDataStats {
  applyFlag: string;
  applyFlagNm: string | null;
  cnt: number;
}

/**
 * 페이지 응답
 */
export interface RawDataListResponse {
  content: RawDataListItem[];
  totalCount: number;
  page: number;
  size: number;
}

/**
 * 반영 상태 코드
 */
export const APPLY_FLAG = {
  Y: { code: 'Y', name: '반영', color: '#52c41a' },
  N: { code: 'N', name: '미반영', color: '#faad14' },
  H: { code: 'H', name: '진행중', color: '#1890ff' },
  X: { code: 'X', name: '제외', color: '#d9d9d9' },
  E: { code: 'E', name: '오류', color: '#ff4d4f' },
} as const;

/**
 * 제외 가능한 상태
 */
export const EXCLUDABLE_FLAGS = ['E', 'H', 'N'];

/**
 * 복원 가능한 상태
 */
export const RESTORABLE_FLAGS = ['X'];

/**
 * 데이터ID 목록 응답 (팝업용)
 */
export interface RawDataIdItem {
  rawDataId: string;
  uploadId: string | null;
  minSnapshotDate: string;
  maxSnapshotDate: string;
  dataCnt: number;
}
