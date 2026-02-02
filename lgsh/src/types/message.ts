/**
 * 메시지 코드 정의
 * - TB_SYS_MESSAGE 테이블과 동기화
 * - 프론트엔드에서 사용하는 메시지 코드 상수
 */

// ========== 메시지 타입 ==========
export type MessageType = 'SUCCESS' | 'ERROR' | 'WARN' | 'INFO' | 'CONFIRM';

// ========== 메시지 데이터 ==========
export interface SystemMessage {
  msgCode: string;
  msgType: MessageType;
  msgText: string;
  msgDesc?: string;
}

// ========== 메시지 코드 상수 ==========

/**
 * 성공 메시지 (S로 시작)
 */
export const MSG_SUCCESS = {
  /** 저장되었습니다. */
  SAVE: 'S001',
  /** 삭제되었습니다. */
  DELETE: 'S002',
  /** 수정되었습니다. */
  UPDATE: 'S003',
  /** 등록되었습니다. */
  CREATE: 'S004',
  /** 승인되었습니다. */
  APPROVE: 'S005',
  /** 반려되었습니다. */
  REJECT: 'S006',
  /** 복사되었습니다. */
  COPY: 'S007',
  /** 로그인되었습니다. */
  LOGIN: 'S008',
  /** 로그아웃되었습니다. */
  LOGOUT: 'S009',
  /** 다운로드가 완료되었습니다. */
  DOWNLOAD: 'S010',
  /** 업로드가 완료되었습니다. */
  UPLOAD: 'S011',
  /** 처리가 완료되었습니다. */
  COMPLETE: 'S012',
  /** 전송되었습니다. */
  SEND: 'S013',
  /** 초기화되었습니다. */
  RESET: 'S014',
  /** 적용되었습니다. */
  APPLY: 'S015',
} as const;

/**
 * 에러 메시지 (E로 시작)
 */
export const MSG_ERROR = {
  /** 저장에 실패했습니다. */
  SAVE_FAIL: 'E001',
  /** 삭제에 실패했습니다. */
  DELETE_FAIL: 'E002',
  /** 수정에 실패했습니다. */
  UPDATE_FAIL: 'E003',
  /** 등록에 실패했습니다. */
  CREATE_FAIL: 'E004',
  /** 조회에 실패했습니다. */
  SEARCH_FAIL: 'E005',
  /** 서버 연결에 실패했습니다. */
  SERVER_ERROR: 'E006',
  /** 인증에 실패했습니다. */
  AUTH_FAIL: 'E007',
  /** 권한이 없습니다. */
  NO_PERMISSION: 'E008',
  /** 세션이 만료되었습니다. */
  SESSION_EXPIRED: 'E009',
  /** 파일 업로드에 실패했습니다. */
  UPLOAD_FAIL: 'E010',
  /** 파일 다운로드에 실패했습니다. */
  DOWNLOAD_FAIL: 'E011',
  /** 데이터를 찾을 수 없습니다. */
  NOT_FOUND: 'E012',
  /** 중복된 데이터가 존재합니다. */
  DUPLICATE: 'E013',
  /** 처리 중 오류가 발생했습니다. */
  PROCESS_FAIL: 'E014',
  /** 유효하지 않은 요청입니다. */
  INVALID_REQUEST: 'E015',
} as const;

/**
 * 경고 메시지 (W로 시작)
 */
export const MSG_WARN = {
  /** 필수 항목을 입력해주세요. */
  REQUIRED: 'W001',
  /** 선택된 항목이 없습니다. */
  NO_SELECTION: 'W002',
  /** 변경된 내용이 없습니다. */
  NO_CHANGE: 'W003',
  /** 형식이 올바르지 않습니다. */
  INVALID_FORMAT: 'W004',
  /** 입력 범위를 초과했습니다. */
  OUT_OF_RANGE: 'W005',
  /** 이미 처리된 항목입니다. */
  ALREADY_PROCESSED: 'W006',
  /** 사용 중인 데이터입니다. */
  IN_USE: 'W007',
  /** 비밀번호가 일치하지 않습니다. */
  PASSWORD_MISMATCH: 'W008',
  /** 파일 크기가 초과되었습니다. */
  FILE_SIZE_EXCEED: 'W009',
  /** 허용되지 않는 파일 형식입니다. */
  INVALID_FILE_TYPE: 'W010',
} as const;

/**
 * 안내 메시지 (I로 시작)
 */
export const MSG_INFO = {
  /** 처리 중입니다. */
  PROCESSING: 'I001',
  /** 로딩 중입니다. */
  LOADING: 'I002',
  /** 검색 결과가 없습니다. */
  NO_RESULT: 'I003',
  /** 데이터가 없습니다. */
  NO_DATA: 'I004',
  /** 저장 중입니다. */
  SAVING: 'I005',
  /** 업로드 중입니다. */
  UPLOADING: 'I006',
  /** 다운로드 중입니다. */
  DOWNLOADING: 'I007',
  /** 잠시만 기다려주세요. */
  PLEASE_WAIT: 'I008',
} as const;

/**
 * 확인 메시지 (C로 시작)
 */
export const MSG_CONFIRM = {
  /** 삭제하시겠습니까? */
  DELETE: 'C001',
  /** 저장하시겠습니까? */
  SAVE: 'C002',
  /** 수정하시겠습니까? */
  UPDATE: 'C003',
  /** 등록하시겠습니까? */
  CREATE: 'C004',
  /** 승인하시겠습니까? */
  APPROVE: 'C005',
  /** 반려하시겠습니까? */
  REJECT: 'C006',
  /** 취소하시겠습니까? 변경 내용이 저장되지 않습니다. */
  CANCEL: 'C007',
  /** 로그아웃 하시겠습니까? */
  LOGOUT: 'C008',
  /** 초기화하시겠습니까? */
  RESET: 'C009',
  /** 이 작업은 되돌릴 수 없습니다. 계속하시겠습니까? */
  IRREVERSIBLE: 'C010',
} as const;

// ========== 전체 메시지 코드 ==========
export const MSG = {
  SUCCESS: MSG_SUCCESS,
  ERROR: MSG_ERROR,
  WARN: MSG_WARN,
  INFO: MSG_INFO,
  CONFIRM: MSG_CONFIRM,
} as const;

// ========== 기본 메시지 (API 로드 전 폴백용) ==========
export const DEFAULT_MESSAGES: Record<string, SystemMessage> = {
  // 성공 메시지
  [MSG_SUCCESS.SAVE]: { msgCode: 'S001', msgType: 'SUCCESS', msgText: '저장되었습니다.' },
  [MSG_SUCCESS.DELETE]: { msgCode: 'S002', msgType: 'SUCCESS', msgText: '삭제되었습니다.' },
  [MSG_SUCCESS.UPDATE]: { msgCode: 'S003', msgType: 'SUCCESS', msgText: '수정되었습니다.' },
  [MSG_SUCCESS.CREATE]: { msgCode: 'S004', msgType: 'SUCCESS', msgText: '등록되었습니다.' },
  [MSG_SUCCESS.APPROVE]: { msgCode: 'S005', msgType: 'SUCCESS', msgText: '승인되었습니다.' },
  [MSG_SUCCESS.REJECT]: { msgCode: 'S006', msgType: 'SUCCESS', msgText: '반려되었습니다.' },
  [MSG_SUCCESS.COPY]: { msgCode: 'S007', msgType: 'SUCCESS', msgText: '복사되었습니다.' },
  [MSG_SUCCESS.LOGIN]: { msgCode: 'S008', msgType: 'SUCCESS', msgText: '로그인되었습니다.' },
  [MSG_SUCCESS.LOGOUT]: { msgCode: 'S009', msgType: 'SUCCESS', msgText: '로그아웃되었습니다.' },
  [MSG_SUCCESS.DOWNLOAD]: { msgCode: 'S010', msgType: 'SUCCESS', msgText: '다운로드가 완료되었습니다.' },
  [MSG_SUCCESS.UPLOAD]: { msgCode: 'S011', msgType: 'SUCCESS', msgText: '업로드가 완료되었습니다.' },
  [MSG_SUCCESS.COMPLETE]: { msgCode: 'S012', msgType: 'SUCCESS', msgText: '처리가 완료되었습니다.' },
  [MSG_SUCCESS.SEND]: { msgCode: 'S013', msgType: 'SUCCESS', msgText: '전송되었습니다.' },
  [MSG_SUCCESS.RESET]: { msgCode: 'S014', msgType: 'SUCCESS', msgText: '초기화되었습니다.' },
  [MSG_SUCCESS.APPLY]: { msgCode: 'S015', msgType: 'SUCCESS', msgText: '적용되었습니다.' },

  // 에러 메시지
  [MSG_ERROR.SAVE_FAIL]: { msgCode: 'E001', msgType: 'ERROR', msgText: '저장에 실패했습니다.' },
  [MSG_ERROR.DELETE_FAIL]: { msgCode: 'E002', msgType: 'ERROR', msgText: '삭제에 실패했습니다.' },
  [MSG_ERROR.UPDATE_FAIL]: { msgCode: 'E003', msgType: 'ERROR', msgText: '수정에 실패했습니다.' },
  [MSG_ERROR.CREATE_FAIL]: { msgCode: 'E004', msgType: 'ERROR', msgText: '등록에 실패했습니다.' },
  [MSG_ERROR.SEARCH_FAIL]: { msgCode: 'E005', msgType: 'ERROR', msgText: '조회에 실패했습니다.' },
  [MSG_ERROR.SERVER_ERROR]: { msgCode: 'E006', msgType: 'ERROR', msgText: '서버 연결에 실패했습니다.' },
  [MSG_ERROR.AUTH_FAIL]: { msgCode: 'E007', msgType: 'ERROR', msgText: '인증에 실패했습니다.' },
  [MSG_ERROR.NO_PERMISSION]: { msgCode: 'E008', msgType: 'ERROR', msgText: '권한이 없습니다.' },
  [MSG_ERROR.SESSION_EXPIRED]: { msgCode: 'E009', msgType: 'ERROR', msgText: '세션이 만료되었습니다.' },
  [MSG_ERROR.UPLOAD_FAIL]: { msgCode: 'E010', msgType: 'ERROR', msgText: '파일 업로드에 실패했습니다.' },
  [MSG_ERROR.DOWNLOAD_FAIL]: { msgCode: 'E011', msgType: 'ERROR', msgText: '파일 다운로드에 실패했습니다.' },
  [MSG_ERROR.NOT_FOUND]: { msgCode: 'E012', msgType: 'ERROR', msgText: '데이터를 찾을 수 없습니다.' },
  [MSG_ERROR.DUPLICATE]: { msgCode: 'E013', msgType: 'ERROR', msgText: '중복된 데이터가 존재합니다.' },
  [MSG_ERROR.PROCESS_FAIL]: { msgCode: 'E014', msgType: 'ERROR', msgText: '처리 중 오류가 발생했습니다.' },
  [MSG_ERROR.INVALID_REQUEST]: { msgCode: 'E015', msgType: 'ERROR', msgText: '유효하지 않은 요청입니다.' },

  // 경고 메시지
  [MSG_WARN.REQUIRED]: { msgCode: 'W001', msgType: 'WARN', msgText: '필수 항목을 입력해주세요.' },
  [MSG_WARN.NO_SELECTION]: { msgCode: 'W002', msgType: 'WARN', msgText: '선택된 항목이 없습니다.' },
  [MSG_WARN.NO_CHANGE]: { msgCode: 'W003', msgType: 'WARN', msgText: '변경된 내용이 없습니다.' },
  [MSG_WARN.INVALID_FORMAT]: { msgCode: 'W004', msgType: 'WARN', msgText: '형식이 올바르지 않습니다.' },
  [MSG_WARN.OUT_OF_RANGE]: { msgCode: 'W005', msgType: 'WARN', msgText: '입력 범위를 초과했습니다.' },
  [MSG_WARN.ALREADY_PROCESSED]: { msgCode: 'W006', msgType: 'WARN', msgText: '이미 처리된 항목입니다.' },
  [MSG_WARN.IN_USE]: { msgCode: 'W007', msgType: 'WARN', msgText: '사용 중인 데이터입니다.' },
  [MSG_WARN.PASSWORD_MISMATCH]: { msgCode: 'W008', msgType: 'WARN', msgText: '비밀번호가 일치하지 않습니다.' },
  [MSG_WARN.FILE_SIZE_EXCEED]: { msgCode: 'W009', msgType: 'WARN', msgText: '파일 크기가 초과되었습니다.' },
  [MSG_WARN.INVALID_FILE_TYPE]: { msgCode: 'W010', msgType: 'WARN', msgText: '허용되지 않는 파일 형식입니다.' },

  // 안내 메시지
  [MSG_INFO.PROCESSING]: { msgCode: 'I001', msgType: 'INFO', msgText: '처리 중입니다.' },
  [MSG_INFO.LOADING]: { msgCode: 'I002', msgType: 'INFO', msgText: '로딩 중입니다.' },
  [MSG_INFO.NO_RESULT]: { msgCode: 'I003', msgType: 'INFO', msgText: '검색 결과가 없습니다.' },
  [MSG_INFO.NO_DATA]: { msgCode: 'I004', msgType: 'INFO', msgText: '데이터가 없습니다.' },
  [MSG_INFO.SAVING]: { msgCode: 'I005', msgType: 'INFO', msgText: '저장 중입니다.' },
  [MSG_INFO.UPLOADING]: { msgCode: 'I006', msgType: 'INFO', msgText: '업로드 중입니다.' },
  [MSG_INFO.DOWNLOADING]: { msgCode: 'I007', msgType: 'INFO', msgText: '다운로드 중입니다.' },
  [MSG_INFO.PLEASE_WAIT]: { msgCode: 'I008', msgType: 'INFO', msgText: '잠시만 기다려주세요.' },

  // 확인 메시지
  [MSG_CONFIRM.DELETE]: { msgCode: 'C001', msgType: 'CONFIRM', msgText: '삭제하시겠습니까?' },
  [MSG_CONFIRM.SAVE]: { msgCode: 'C002', msgType: 'CONFIRM', msgText: '저장하시겠습니까?' },
  [MSG_CONFIRM.UPDATE]: { msgCode: 'C003', msgType: 'CONFIRM', msgText: '수정하시겠습니까?' },
  [MSG_CONFIRM.CREATE]: { msgCode: 'C004', msgType: 'CONFIRM', msgText: '등록하시겠습니까?' },
  [MSG_CONFIRM.APPROVE]: { msgCode: 'C005', msgType: 'CONFIRM', msgText: '승인하시겠습니까?' },
  [MSG_CONFIRM.REJECT]: { msgCode: 'C006', msgType: 'CONFIRM', msgText: '반려하시겠습니까?' },
  [MSG_CONFIRM.CANCEL]: { msgCode: 'C007', msgType: 'CONFIRM', msgText: '취소하시겠습니까? 변경 내용이 저장되지 않습니다.' },
  [MSG_CONFIRM.LOGOUT]: { msgCode: 'C008', msgType: 'CONFIRM', msgText: '로그아웃 하시겠습니까?' },
  [MSG_CONFIRM.RESET]: { msgCode: 'C009', msgType: 'CONFIRM', msgText: '초기화하시겠습니까?' },
  [MSG_CONFIRM.IRREVERSIBLE]: { msgCode: 'C010', msgType: 'CONFIRM', msgText: '이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?' },
};

export default MSG;

// ========== 메시지 관리 (CRUD) 타입 ==========

// DB 메시지 유형
export type SysMessageType = 'CONFIRM' | 'ERROR' | 'INFO' | 'SUCCESS' | 'WARNING';

// 시스템 메시지 (DB 기반) - 다국어 지원
export interface SysMessage {
  msgCode: string;           // 메시지 코드 (PK1)
  langCode: string;          // 언어 코드 (PK2) - KO, EN 등
  msgType: SysMessageType;   // 메시지 유형
  msgCategory?: string;      // 메시지 카테고리
  msgTitle?: string;         // 메시지 제목
  msgDesc: string;           // 메시지 내용
  msgParams?: string;        // 메시지 파라미터
  displayLocation?: string;  // 표시 위치
  relatedUrl?: string;       // 관련 URL
  useYn: string;             // 사용여부
  regUserId?: string;        // 등록자 ID
  regDt?: string;            // 등록일시
  updUserId?: string;        // 수정자 ID
  updDt?: string;            // 수정일시
}

// 메시지 등록/수정 요청
export interface SysMessageRequest {
  msgCode: string;           // 메시지 코드
  langCode: string;          // 언어 코드
  msgType: SysMessageType;   // 메시지 유형
  msgCategory?: string;      // 메시지 카테고리
  msgTitle?: string;         // 메시지 제목
  msgDesc: string;           // 메시지 내용
  msgParams?: string;        // 메시지 파라미터
  displayLocation?: string;  // 표시 위치
  relatedUrl?: string;       // 관련 URL
  useYn?: string;            // 사용여부
}

// 메시지 목록 조회 파라미터
export interface SysMessageListParams {
  langCode?: string;         // 언어 코드 필터 (기본: KO)
  msgType?: SysMessageType;  // 메시지 유형 필터
  searchKeyword?: string;    // 검색어 (코드, 메시지 내용)
  useYn?: string;            // 사용여부 필터
  page?: number;             // 페이지 번호
  size?: number;             // 페이지 크기
}

// 메시지 목록 응답
export interface SysMessageListResponse {
  content: SysMessage[];
  totalCount: number;
}
