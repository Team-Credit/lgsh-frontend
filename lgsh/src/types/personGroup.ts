/**
 * 관리그룹 타입 정의 (계층형)
 */

// 관리그룹 엔티티 (계층 필드 포함)
export interface PersonGroup {
  personGrp: string;        // PK (단일키)
  parentGrp: string | null; // 상위 관리그룹 (NULL=루트)
  companyId: string;
  companyNm?: string;
  personGrpNm: string;
  personNmEng: string | null;
  grpLevel: number;         // 계층 깊이 (1~3)
  grpPath: string | null;   // 경로 문자열
  sortOrder: number;        // 정렬 순서
  useYn: 'Y' | 'N';
  regUserId: string;
  regDt: string;
  updUserId: string | null;
  updDt: string | null;
}

// 트리 노드 (children 포함)
export interface PersonGroupTreeNode extends PersonGroup {
  userCount: number;        // 소속 사용자 수
  personCount: number;      // 직속 대상자 수
  children: PersonGroupTreeNode[];
}

// 등록/수정 요청 (계층 필드 추가)
export interface PersonGroupRequest {
  personGrp: string;
  parentGrp?: string | null;  // NULL=루트
  companyId: string;
  personGrpNm: string;
  personNmEng?: string;
  sortOrder?: number;
  useYn?: 'Y' | 'N';
}

// 목록 조회 요청
export interface PersonGroupListRequest {
  page?: number;
  size?: number;
  personGrp?: string;
  personGrpNm?: string;
  companyId?: string;
  useYn?: 'Y' | 'N';
}

// 사용자-그룹 매핑
export interface UserGrpMap {
  userId: string;
  userNm?: string;
  personGrp: string;
  grpRole: 'ADMIN' | 'MANAGER' | 'VIEWER';
  grpRoleNm?: string;
  useYn: 'Y' | 'N';
  regUserId: string;
  regDt: string;
  updUserId: string | null;
  updDt: string | null;
}

// 그룹 이동 요청
export interface PersonGroupMoveRequest {
  newParentGrp: string | null;
  sortOrder?: number;
}
