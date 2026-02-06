/**
 * 기초 데이터 업로드 타입 정의
 */

// ============================================================
// CSV 매핑 관련
// ============================================================

/**
 * CSV 매핑 규칙
 */
export interface CsvMapping {
  mappingId: string;
  companyId: string;
  companyNm?: string;
  mappingNm?: string;
  mappingVersion?: string;
  sourceType?: string;
  sourceTypeNm?: string;
  targetTable?: string;
  sourceColumn: string;
  sourceColumnIdx?: number;
  targetColumn: string;
  targetColumnNm?: string;
  dataType?: string;
  dataTypeNm?: string;
  dataLength?: number;
  dateFormat?: string;
  defaultValue?: string;
  isRequired?: string;
  isKey?: string;
  transformRule?: string;
  validationRule?: string;
  description?: string;
  displayOrder?: number;
  useYn?: string;
  regUserId?: string;
  regDt?: string;
  updUserId?: string;
  updDt?: string;
  totalCount?: number;
}

/**
 * CSV 매핑 요청
 */
export interface CsvMappingRequest {
  mappingId?: string;
  companyId: string;
  mappingNm?: string;
  mappingVersion?: string;
  sourceType?: string;
  targetTable?: string;
  sourceColumn: string;
  sourceColumnIdx?: number;
  targetColumn: string;
  dataType?: string;
  dataLength?: number;
  dateFormat?: string;
  defaultValue?: string;
  isRequired?: string;
  isKey?: string;
  transformRule?: string;
  validationRule?: string;
  description?: string;
  displayOrder?: number;
  useYn?: string;
}

// ============================================================
// 코드 매핑 관련
// ============================================================

/**
 * 코드 매핑
 */
export interface CodeMapping {
  codeMappingId: string;
  companyId: string;
  companyNm?: string;
  mappingType: string;
  mappingTypeNm?: string;
  sourceCode: string;
  sourceCodeNm?: string;
  targetCode: string;
  targetCodeNm?: string;
  description?: string;
  useYn?: string;
  regUserId?: string;
  regDt?: string;
  updUserId?: string;
  updDt?: string;
  totalCount?: number;
}

/**
 * 코드 매핑 요청
 */
export interface CodeMappingRequest {
  companyId: string;
  mappingType: string;
  mappings: CodeMappingItem[];
}

export interface CodeMappingItem {
  codeMappingId?: string;
  sourceCode: string;
  sourceCodeNm?: string;
  targetCode: string;
  targetCodeNm?: string;
  description?: string;
  useYn?: string;
}

// ============================================================
// 업로드 관련
// ============================================================

/**
 * 업로드 이력
 */
export interface UploadHistory {
  uploadId: string;
  companyId: string;
  companyNm?: string;
  fileNm: string;
  fileId?: string;
  uploadType: string;
  uploadTypeNm?: string;
  fileSize?: number;
  fileSizeFormatted?: string;
  totalRows?: number;
  processedRows?: number;
  successRows?: number;
  errorRows?: number;
  skippedRows?: number;
  uploadStatus: string;
  uploadStatusNm?: string;
  errorMsg?: string;
  startDt?: string;
  endDt?: string;
  durationSec?: number;
  durationFormatted?: string;
  regUserId?: string;
  regDt?: string;
  totalCount?: number;
}

/**
 * 업로드 진행상황
 */
export interface UploadProgress {
  uploadId: string;
  uploadStatus: string;
  uploadStatusNm?: string;
  totalRows?: number;
  processedRows?: number;
  successRows?: number;
  errorRows?: number;
  skippedRows?: number;
  progressPercent?: number;
  errorMsg?: string;
}

// ============================================================
// 에러 관련
// ============================================================

/**
 * 에러 로그
 */
export interface ErrorLog {
  errorLogId: string;
  uploadId: string;
  rowNum: number;
  columnNm: string;
  columnIdx?: number;
  sourceValue?: string;
  errorCode: string;
  errorType: string;
  errorTypeNm?: string;
  errorMsg: string;
  errorDetail?: string;
  aiSuggestion?: string;
  aiSuggestedAt?: string;
  resolvedYn: string;
  resolvedValue?: string;
  resolvedMethod?: string;
  resolvedMethodNm?: string;
  resolvedUserId?: string;
  resolvedDt?: string;
  regDt?: string;
  totalCount?: number;
}

/**
 * 에러 해결 요청
 */
export interface ErrorResolveRequest {
  errorLogId: string;
  resolvedValue?: string;
  resolvedMethod: string;
}

/**
 * 에러 요약
 */
export interface ErrorSummary {
  errorType: string;
  errorTypeNm?: string;
  errorCode: string;
  errorCodeNm?: string;
  errorCount: number;
  resolvedCount: number;
  unresolvedCount: number;
  resolvedPercent?: number;
}

// ============================================================
// 기초 데이터 관련
// ============================================================

/**
 * 기초 데이터
 */
export interface RawData {
  rawDataId: string;
  uploadId: string;
  companyId: string;
  companyNm?: string;
  personId?: string;
  personNo: string;
  personNm: string;
  personNmEng?: string;
  gender?: string;
  genderNm?: string;
  birthDt?: string;
  age?: number;
  mobileNo?: string;
  telNo?: string;
  email?: string;
  zipCode?: string;
  address?: string;
  addressDetail?: string;
  jobCode?: string;
  jobNm?: string;
  companyNmWork?: string;
  annualIncome?: number;
  monthlyIncome?: number;
  dataStatus: string;
  dataStatusNm?: string;
  validationMsg?: string;
  personLinkedYn?: string;
  evalYn?: string;
  dataDate?: string;
  regUserId?: string;
  regDt?: string;
  updUserId?: string;
  updDt?: string;
  totalCount?: number;
}

// ============================================================
// 조회 파라미터
// ============================================================

export interface CsvMappingListParams {
  companyId?: string;
  mappingVersion?: string;
  targetTable?: string;
  useYn?: string;
  page?: number;
  size?: number;
}

export interface UploadHistoryListParams {
  companyId: string;
  uploadType?: string;
  uploadStatus?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export interface ErrorLogListParams {
  uploadId: string;
  errorType?: string;
  resolvedYn?: string;
  page?: number;
  size?: number;
}

export interface RawDataListParams {
  companyId: string;
  uploadId?: string;
  personId?: string;
  personNm?: string;
  personNo?: string;
  dataStatus?: string;
  snapshotFrom?: string;
  snapshotTo?: string;
  personLinkedYn?: string;
  page?: number;
  size?: number;
}

// ============================================================
// 대상 컬럼 옵션 (TB_CREDIT_RAW_DATA 테이블 기준)
// ============================================================

export const TARGET_COLUMN_OPTIONS = [
  // 기본 정보 (시스템 자동 생성 제외)
  { value: 'PERSON_ID', label: '대상자ID', dataType: 'VARCHAR', required: true },
  { value: 'DATA_COLLECT_DT', label: '데이터수집일', dataType: 'DATE', required: true },
  { value: 'SNAPSHOT_DATE', label: '스냅샷일자', dataType: 'DATE', required: true },

  // 주소 관련
  { value: 'LIV_ADD', label: '거주지주소코드', dataType: 'VARCHAR', required: true },
  { value: 'RES_ADD', label: '주민등록주소코드', dataType: 'VARCHAR', required: true },
  { value: 'LIV_RES_MATCH_YN', label: '거주지일치여부', dataType: 'VARCHAR', required: true },
  { value: 'ADD_YN', label: '주소여부', dataType: 'VARCHAR', required: true },
  { value: 'HOME_ID_REGISTER_DAYS', label: '주민등록거주일수', dataType: 'NUMBER', required: true },

  // 카드 관련
  { value: 'CARD_ISSUE_RECENCY_DAYS', label: '카드발급최근일수', dataType: 'NUMBER', required: true },
  { value: 'NEW_CARD_ISSUE_CNT_6M', label: '신규카드발급건수_6개월', dataType: 'NUMBER', required: true },
  { value: 'NEW_CARD_ISSUE_CNT_12M', label: '신규카드발급건수_12개월', dataType: 'NUMBER', required: true },
  { value: 'CURRENT_CARD_CNT', label: '현재카드보유수', dataType: 'NUMBER', required: true },
  { value: 'CARD_CNT_CHANGE_12M', label: '카드수변동_12개월', dataType: 'NUMBER', required: true },
  { value: 'MAIN_CARD_6M_AVG_LIMIT_USAGE_RATIO', label: '주카드6개월평균한도사용률', dataType: 'NUMBER', required: true },
  { value: 'CARD_LIMIT_AMT', label: '카드한도금액', dataType: 'NUMBER', required: true },

  // 대출 관련
  { value: 'LOAN_LIMIT_AMT', label: '대출한도금액', dataType: 'NUMBER', required: true },
  { value: 'LOAN_INT_RATE', label: '대출이자율', dataType: 'NUMBER', required: true },

  // 결제금액 변동
  { value: 'LUMP_AMT_CHG_1M', label: '일시불변동_1개월', dataType: 'NUMBER', required: true },
  { value: 'LUMP_AMT_CHG_3M', label: '일시불변동_3개월', dataType: 'NUMBER', required: true },
  { value: 'LUMP_AMT_CHG_6M', label: '일시불변동_6개월', dataType: 'NUMBER', required: true },
  { value: 'INST_AMT_CHG_1M', label: '할부변동_1개월', dataType: 'NUMBER', required: true },
  { value: 'INST_AMT_CHG_3M', label: '할부변동_3개월', dataType: 'NUMBER', required: true },
  { value: 'INST_AMT_CHG_6M', label: '할부변동_6개월', dataType: 'NUMBER', required: true },
  { value: 'CASH_ADV_AMT_CHG_1M', label: '현금서비스변동_1개월', dataType: 'NUMBER', required: true },
  { value: 'CASH_ADV_AMT_CHG_3M', label: '현금서비스변동_3개월', dataType: 'NUMBER', required: true },
  { value: 'CASH_ADV_AMT_CHG_6M', label: '현금서비스변동_6개월', dataType: 'NUMBER', required: true },

  // 연체 관련
  { value: 'RECENT_DELQ_AMT', label: '최근연체금액', dataType: 'NUMBER', required: true },
  { value: 'MAX_DELQ_AMT', label: '최대연체금액', dataType: 'NUMBER', required: true },
  { value: 'SUM_DELQ_AMT', label: '연체금액합계', dataType: 'NUMBER', required: true },
  { value: 'MEAN_DELQ_AMT', label: '평균연체금액', dataType: 'NUMBER', required: true },
  { value: 'MAX_DPD_DAYS', label: '최대연체일수', dataType: 'NUMBER', required: true },
  { value: 'RECENT_DPD_DAYS', label: '최근연체일수', dataType: 'NUMBER', required: true },

  // DPD 통계 (3개월)
  { value: 'DPD_MEAN_3M', label: 'DPD평균_3개월', dataType: 'NUMBER', required: true },
  { value: 'DPD_MAX_3M', label: 'DPD최대_3개월', dataType: 'NUMBER', required: true },
  { value: 'DPD_STD_3M', label: 'DPD표준편차_3개월', dataType: 'NUMBER', required: true },

  // DPD 통계 (6개월)
  { value: 'DPD_MEAN_6M', label: 'DPD평균_6개월', dataType: 'NUMBER', required: true },
  { value: 'DPD_MAX_6M', label: 'DPD최대_6개월', dataType: 'NUMBER', required: true },
  { value: 'DPD_STD_6M', label: 'DPD표준편차_6개월', dataType: 'NUMBER', required: true },

  // DPD 통계 (12개월)
  { value: 'DPD_MEAN_12M', label: 'DPD평균_12개월', dataType: 'NUMBER', required: true },
  { value: 'DPD_MAX_12M', label: 'DPD최대_12개월', dataType: 'NUMBER', required: true },
  { value: 'DPD_STD_12M', label: 'DPD표준편차_12개월', dataType: 'NUMBER', required: true },

  // 신규 대출
  { value: 'NEW_LOAN_ISSUE_CNT_1M', label: '신규대출건수_1개월', dataType: 'NUMBER', required: true },
  { value: 'NEW_LOAN_ISSUE_CNT_3M', label: '신규대출건수_3개월', dataType: 'NUMBER', required: true },
  { value: 'NEW_LOAN_ISSUE_CNT_6M', label: '신규대출건수_6개월', dataType: 'NUMBER', required: true },
  { value: 'LOAN_RECENCY_DAYS', label: '대출최근일수', dataType: 'NUMBER', required: true },
  { value: 'LOAN_TENURE_DAYS', label: '대출기간일수', dataType: 'NUMBER', required: true },
  { value: 'LENDER_CNT_CHANGE_12M', label: '대출기관수변동_12개월', dataType: 'NUMBER', required: true },
  { value: 'BUDO', label: '부도정보', dataType: 'NUMBER', required: true },

  // 카드 일시불 (3개월)
  { value: 'CARD_LUMP_SUM_3M', label: '카드일시불합계_3개월', dataType: 'NUMBER', required: true },
  { value: 'CARD_LUMP_AVG_3M', label: '카드일시불평균_3개월', dataType: 'NUMBER', required: true },
  { value: 'CARD_LUMP_MAX_3M', label: '카드일시불최대_3개월', dataType: 'NUMBER', required: true },

  // 카드 할부 (3개월)
  { value: 'CARD_INST_SUM_3M', label: '카드할부합계_3개월', dataType: 'NUMBER', required: true },
  { value: 'CARD_INST_AVG_3M', label: '카드할부평균_3개월', dataType: 'NUMBER', required: true },
  { value: 'CARD_INST_MAX_3M', label: '카드할부최대_3개월', dataType: 'NUMBER', required: true },

  // 카드 현금서비스 (3개월)
  { value: 'CARD_CASH_ADV_SUM_3M', label: '카드현금서비스합계_3개월', dataType: 'NUMBER', required: true },
  { value: 'CARD_CASH_ADV_AVG_3M', label: '카드현금서비스평균_3개월', dataType: 'NUMBER', required: true },
  { value: 'CARD_CASH_ADV_MAX_3M', label: '카드현금서비스최대_3개월', dataType: 'NUMBER', required: true },

  // 카드 일시불 (6개월)
  { value: 'CARD_LUMP_SUM_6M', label: '카드일시불합계_6개월', dataType: 'NUMBER', required: true },
  { value: 'CARD_LUMP_AVG_6M', label: '카드일시불평균_6개월', dataType: 'NUMBER', required: true },
  { value: 'CARD_LUMP_MAX_6M', label: '카드일시불최대_6개월', dataType: 'NUMBER', required: true },

  // 카드 할부 (6개월)
  { value: 'CARD_INST_SUM_6M', label: '카드할부합계_6개월', dataType: 'NUMBER', required: true },
  { value: 'CARD_INST_AVG_6M', label: '카드할부평균_6개월', dataType: 'NUMBER', required: true },
  { value: 'CARD_INST_MAX_6M', label: '카드할부최대_6개월', dataType: 'NUMBER', required: true },

  // 카드 현금서비스 (6개월)
  { value: 'CARD_CASH_ADV_SUM_6M', label: '카드현금서비스합계_6개월', dataType: 'NUMBER', required: true },
  { value: 'CARD_CASH_ADV_AVG_6M', label: '카드현금서비스평균_6개월', dataType: 'NUMBER', required: true },
  { value: 'CARD_CASH_ADV_MAX_6M', label: '카드현금서비스최대_6개월', dataType: 'NUMBER', required: true },

  // 현금서비스 비율
  { value: 'CARD_CASH_ADV_RATIO_3M', label: '현금서비스비율_3개월', dataType: 'NUMBER', required: true },
  { value: 'CARD_CASH_ADV_RATIO_6M', label: '현금서비스비율_6개월', dataType: 'NUMBER', required: true },

  // 대출 잔액/상환
  { value: 'LOAN_BAL_AVG_3M', label: '대출잔액평균_3개월', dataType: 'NUMBER', required: true },
  { value: 'LOAN_BAL_AVG_6M', label: '대출잔액평균_6개월', dataType: 'NUMBER', required: true },
  { value: 'LOAN_REPAY_SUM_3M', label: '대출상환합계_3개월', dataType: 'NUMBER', required: true },
  { value: 'LOAN_REPAY_SUM_6M', label: '대출상환합계_6개월', dataType: 'NUMBER', required: true },
  { value: 'LOAN_INT_PAY_SUM_3M', label: '대출이자지급합계_3개월', dataType: 'NUMBER', required: true },
  { value: 'LOAN_INT_PAY_SUM_6M', label: '대출이자지급합계_6개월', dataType: 'NUMBER', required: true },
];

export const DATA_TYPE_OPTIONS = [
  { value: 'VARCHAR', label: '문자열' },
  { value: 'NUMBER', label: '숫자' },
  { value: 'DATE', label: '날짜' },
  { value: 'CODE', label: '코드매핑' },
];

export const TARGET_TABLE_OPTIONS = [
  { value: 'TB_CREDIT_RAW_DATA', label: '기초데이터' },
];

export const CODE_MAPPING_TYPE_OPTIONS = [
  { value: 'GENDER', label: '성별' },
  { value: 'JOB', label: '직업' },
  { value: 'EDUCATION', label: '학력' },
  { value: 'MARRIAGE', label: '결혼여부' },
  { value: 'HOME_TYPE', label: '주거형태' },
];
