/**
 * 원청사 타입 정의
 */

// 원청사 엔티티
export interface Company {
  companyId: string; // PK
  companyNm: string;
  companyType?: string; // SELF/DEMO/PROD
  companyTypeNm?: string;
  businessNo?: string;
  ceoNm?: string;
  telNo?: string;
  email?: string;
  address?: string;
  dbConnectionInfo?: string;
  serviceUrl?: string;
  contractStartDt?: string;
  contractEndDt?: string;
  contractStatus?: string; // ACTIVE/EXPIRED/WAITING
  contractStatusNm?: string;
  useYn: 'Y' | 'N';
  regUserId?: string;
  regDt?: string;
  updUserId?: string | null;
  updDt?: string | null;
}

// 원청사 목록 조회 요청
export interface CompanyListRequest {
  keyword?: string;
  companyType?: string;
  contractStatus?: string;
  useYn?: 'Y' | 'N';
  page?: number;
  size?: number;
}

// 원청사 등록/수정 요청
export interface CompanyRequest {
  companyId: string;
  companyNm: string;
  companyType: string;
  businessNo?: string;
  ceoNm?: string;
  telNo?: string;
  email?: string;
  address?: string;
  dbConnectionInfo?: string;
  serviceUrl?: string;
  contractStartDt?: string;
  contractEndDt?: string;
  contractStatus?: string; // ACTIVE/EXPIRED/WAITING
  useYn?: 'Y' | 'N';
}

// 원청사 목록 응답
export interface CompanyListResponse {
  content: Company[];
  totalCount: number;
}
