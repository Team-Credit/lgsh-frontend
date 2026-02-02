/**
 * 공통코드 타입 정의
 */

// 대분류 코드
export interface MajorCode {
  majorCode: string;
  majorCodeNm: string;
  majorCodeDesc?: string;
  sysYn: string;
  useYn: string;
  sortOrder: number;
  childCnt?: number;
  regUserId: string;
  regDt: string;
  updUserId?: string;
  updDt?: string;
}

// 소분류 코드
export interface MinorCode {
  majorCode: string;
  minorCode: string;
  minorCodeNm: string;
  minorCodeDesc?: string;
  codeValue?: string;
  sysYn: string;
  useYn: string;
  sortOrder: number;
  attr1?: string;
  attr2?: string;
  attr3?: string;
  regUserId: string;
  regDt: string;
  updUserId?: string;
  updDt?: string;
}

// 대분류 코드 등록/수정 요청
export interface MajorCodeRequest {
  majorCode: string;
  majorCodeNm: string;
  majorCodeDesc?: string;
  sysYn?: string;
  useYn?: string;
  sortOrder?: number;
}

// 소분류 코드 등록/수정 요청
export interface MinorCodeRequest {
  majorCode: string;
  minorCode: string;
  minorCodeNm: string;
  minorCodeDesc?: string;
  codeValue?: string;
  sysYn?: string;
  useYn?: string;
  sortOrder?: number;
  attr1?: string;
  attr2?: string;
  attr3?: string;
}

// 대분류 코드 목록 응답
export interface MajorCodeListResponse {
  content: MajorCode[];
  totalCount: number;
}

// 소분류 코드 목록 응답
export interface MinorCodeListResponse {
  content: MinorCode[];
  totalCount: number;
}

// 공통코드 검색 파라미터
export interface CodeSearchParams {
  majorCode?: string;
  majorCodeNm?: string;
  minorCode?: string;
  minorCodeNm?: string;
  useYn?: string;
  page?: number;
  size?: number;
}
