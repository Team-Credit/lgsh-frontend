/**
 * 관리그룹 타입 정의
 */

// 관리그룹 엔티티
export interface PersonGroup {
  personGrp: string; // PK
  userId: string; // PK
  companyId: string;
  companyNm?: string; // 조회 시 조인
  personGrpNm: string;
  personNmEng: string | null;
  useYn: 'Y' | 'N';
  regUserId: string;
  regDt: string;
  updUserId: string | null;
  updDt: string | null;
}

// 관리그룹 등록/수정 요청
export interface PersonGroupRequest {
  personGrp?: string; // 수정 시에만 필수
  userId: string;
  companyId: string;
  personGrpNm: string;
  personNmEng?: string;
  useYn: 'Y' | 'N';
}

// 관리그룹 목록 조회 요청
export interface PersonGroupListRequest {
  page?: number;
  size?: number;
  personGrp?: string;
  personGrpNm?: string;
  companyId?: string;
  useYn?: 'Y' | 'N';
}
