/**
 * 시스템 환경설정 타입 정의
 * TB_SYS_CONFIG 테이블과 매핑
 */

// 환경설정 엔티티
export interface SysConfig {
  majorCode: string;        // 대분류 코드
  minorCode: string;        // 소분류 코드
  configKey: string;        // 설정 키
  configValue: string;      // 설정 값
  configDesc?: string;      // 설정 설명
  dataType: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN';  // 데이터 타입
  minValue?: string;        // 최소값
  maxValue?: string;        // 최대값
  validValues?: string;     // 유효값 목록 (콤마 구분)
  defaultValue?: string;    // 기본값
  editableYn: string;       // 수정 가능 여부 (Y/N)
  useYn: string;            // 사용 여부 (Y/N)
  regUserId: string;        // 등록자 ID
  regDt: string;            // 등록일시
  updUserId?: string;       // 수정자 ID
  updDt?: string;           // 수정일시
  // 조인 필드
  majorCodeNm?: string;     // 대분류명
  minorCodeNm?: string;     // 소분류명
}

// 환경설정 등록/수정 요청
export interface SysConfigRequest {
  majorCode: string;
  minorCode: string;
  configKey: string;
  configValue: string;
  configDesc?: string;
  dataType?: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN';
  minValue?: string;
  maxValue?: string;
  validValues?: string;
  defaultValue?: string;
  editableYn?: string;
  useYn?: string;
}

// 환경설정 목록 응답
export interface SysConfigListResponse {
  content: SysConfig[];
  totalCount: number;
}

// 환경설정 검색 파라미터
export interface SysConfigSearchParams {
  majorCode?: string;
  minorCode?: string;
  configKey?: string;
  dataType?: string;
  useYn?: string;
  page?: number;
  size?: number;
}

// 환경설정값이 있는 마이너코드 목록 응답 (조회용)
export interface MinorCodeWithConfigResponse {
  majorCode: string;
  minorCode: string;
  minorCodeNm: string;
  configCount: number;      // 해당 마이너코드의 환경설정 개수
}
