/**
 * 원청사 설정(라이선스) 타입 정의
 * TB_COMPANY + TB_COMPANY_CONFIG 테이블 기반
 */

// ========== 원청사 설정 응답 ==========
export interface CompanySettings {
  companyId: string;            // 원청사 ID
  companyNm: string;            // 원청사명
  companyType: string;          // 원청사 유형
  companyTypeNm?: string;       // 원청사 유형명
  contractStatus: string;       // 계약 상태
  contractStatusNm?: string;    // 계약 상태명
  useYn: string;                // 사용여부

  // 계약 기간
  contractStartDt?: string;     // 계약 시작일 (YYYY-MM-DD)
  contractEndDt?: string;       // 계약 종료일 (YYYY-MM-DD)
  daysUntilExpiry?: number;     // 계약 만료까지 남은 일수

  // 라이선스 정보
  maxUsers: number;             // 최대 사용자 수
  currentUsers: number;         // 현재 사용자 수
  usageRate?: number;           // 사용률 (%)
  availableUsers?: number;      // 가용 사용자 수

  regDt?: string;               // 등록일시
  updDt?: string;               // 수정일시
}

// ========== 원청사 설정 목록 조회 파라미터 ==========
export interface CompanySettingsParams {
  keyword?: string;             // 검색어 (원청사명, 사업자번호)
  companyType?: string;         // 원청사 유형 필터
  contractStatus?: string;      // 계약상태 필터
  useYn?: string;               // 사용여부 필터
  page?: number;                // 페이지 번호 (0부터)
  size?: number;                // 페이지 크기
}

// ========== 원청사 설정 목록 응답 ==========
export interface CompanySettingsListResponse {
  content: CompanySettings[];
  totalCount: number;
}

// ========== 라이선스 정보 수정 요청 ==========
export interface LicenseUpdateRequest {
  maxUsers: number;             // 최대 사용자 수
  contractStartDt?: string;     // 계약 시작일 (YYYY-MM-DD)
  contractEndDt?: string;       // 계약 종료일 (YYYY-MM-DD)
}

// ========== 라이선스 정보 응답 ==========
export interface LicenseInfo {
  companyId: string;
  companyNm: string;
  maxUsers: number;
  currentUsers: number;
  usageRate: number;
  availableUsers: number;
}

// ========== 라이선스 사용률 색상 ==========
export const getLicenseUsageColor = (usageRate: number): string => {
  if (usageRate >= 90) return '#ff4d4f';      // 위험 (빨강)
  if (usageRate >= 70) return '#faad14';      // 경고 (주황)
  if (usageRate >= 50) return '#1890ff';      // 보통 (파랑)
  return '#52c41a';                           // 여유 (초록)
};

// ========== 라이선스 상태 레이블 ==========
export const getLicenseStatusLabel = (usageRate: number): string => {
  if (usageRate >= 90) return '초과 임박';
  if (usageRate >= 70) return '주의';
  if (usageRate >= 50) return '보통';
  return '여유';
};
