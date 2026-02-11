/**
 * 배치관리 타입 정의
 * TB_BATCH_EXECUTION_HIST 테이블 기반
 */

// ========== 배치 상태 ==========
export type BatchStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'CANCELED';

// ========== 배치 유형 ==========
export type BatchType = 'RAW_DATA_LOAD' | 'SCORE_CALC' | 'MISSING_FIX' | 'REPORT' | 'ARCHIVE' | 'MONITORING';

// ========== 배치 실행 이력 ==========
export interface BatchHistory {
  batchSeq: number;           // 배치 SEQ (PK)
  batchId: string;            // 배치 ID
  batchType: string;          // 배치 유형
  batchTypeName?: string;     // 배치 유형명
  dataClass?: string;         // 데이터 분류
  startDt?: string;           // 시작 일시
  endDt?: string;             // 종료 일시
  status: BatchStatus;        // 상태
  statusName?: string;        // 상태명
  totalCnt: number;           // 총 건수
  successCnt: number;         // 성공 건수
  failCnt: number;            // 실패 건수
  errorMessage?: string;      // 에러 메시지
  execUserId: string;         // 실행자 ID
  regUserId?: string;         // 등록자 ID
  regDt?: string;             // 등록일시
  updUserId?: string;         // 수정자 ID
  updDt?: string;             // 수정일시
}

// ========== 배치 수동 실행 요청 ==========
export interface BatchTriggerRequest {
  batchType: string;          // 배치 유형 (필수)
  dataClass?: string;         // 데이터 분류 (선택)
}

// ========== 배치 수동 실행 응답 ==========
export interface BatchTriggerResponse {
  batchSeq: number;           // 생성된 배치 SEQ
  batchId?: string;           // 생성된 배치 ID
  message?: string;           // 결과 메시지
}

// ========== 배치 이력 조회 파라미터 ==========
export interface BatchHistoryParams {
  batchType?: string;         // 배치 유형 필터
  status?: string;            // 상태 필터
  startDtFrom?: string;       // 시작일시 시작 (YYYY-MM-DD)
  startDtTo?: string;         // 시작일시 종료 (YYYY-MM-DD)
  page?: number;              // 페이지 번호 (0부터)
  size?: number;              // 페이지 크기
}

// ========== 배치 이력 목록 응답 ==========
export interface BatchHistoryListResponse {
  content: BatchHistory[];
  totalCount: number;
}

// ========== 배치 상태 업데이트 요청 ==========
export interface BatchStatusUpdateRequest {
  batchSeq: number;
  status: BatchStatus;
  totalCnt?: number;
  successCnt?: number;
  failCnt?: number;
  errorMessage?: string;
}

// ========== 배치 상태별 색상 매핑 ==========
export const BATCH_STATUS_COLOR: Record<BatchStatus, string> = {
  QUEUED: 'blue',
  RUNNING: 'processing',
  SUCCESS: 'success',
  FAILED: 'error',
  PARTIAL: 'warning',
  CANCELED: 'default',
};

// ========== 배치 상태 레이블 ==========
export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  QUEUED: '대기중',
  RUNNING: '실행중',
  SUCCESS: '성공',
  FAILED: '실패',
  PARTIAL: '부분성공',
  CANCELED: '취소됨',
};

// ========== 배치 유형 레이블 ==========
export const BATCH_TYPE_LABEL: Record<BatchType, string> = {
  RAW_DATA_LOAD: '데이터수집',
  SCORE_CALC: '점수산출',
  MISSING_FIX: '결측치보정',
  REPORT: '리포트생성',
  ARCHIVE: '데이터아카이빙',
  MONITORING: '모니터링',
};

// ========== 배치 스케줄 ==========
export type ScheduleType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CRON';

export interface BatchSchedule {
  scheduleSeq: number;          // 스케줄 SEQ
  batchType: string;            // 배치 유형
  scheduleName: string;         // 스케줄명
  scheduleType: ScheduleType;   // 스케줄 유형
  cronExpression: string;       // Cron 표현식
  useYn: string;                // 사용여부 (Y/N)
  lastExecDt?: string;          // 최종 실행일시
  nextExecDt?: string;          // 다음 실행일시
  description?: string;         // 설명
  regUserId?: string;           // 등록자 ID
  regDt?: string;               // 등록일시
  updUserId?: string;           // 수정자 ID
  updDt?: string;               // 수정일시
}

export interface BatchScheduleRequest {
  batchType: string;            // 배치 유형 (필수)
  scheduleName: string;         // 스케줄명 (필수)
  scheduleType: string;         // 스케줄 유형 (필수)
  cronExpression: string;       // Cron 표현식 (필수)
  useYn?: string;               // 사용여부 (기본 Y)
  description?: string;         // 설명 (선택)
}

export interface BatchScheduleListResponse {
  content: BatchSchedule[];
  totalCount: number;
}

// ========== 스케줄 유형 레이블 ==========
export const SCHEDULE_TYPE_LABEL: Record<ScheduleType, string> = {
  DAILY: '매일',
  WEEKLY: '매주',
  MONTHLY: '매월',
  CRON: 'Cron 직접입력',
};
