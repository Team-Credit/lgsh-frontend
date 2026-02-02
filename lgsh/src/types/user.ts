/**
 * 사용자 관련 타입 정의
 */

// 사용자 정보
export interface User {
  userId: string;
  userNm: string;
  userPwd?: string;
  companyId?: string;
  companyNm?: string;
  roleId?: string;
  roleNm?: string;
  email?: string;
  telNo?: string;
  useYn?: string;
  accountLockYn?: string;
  failLoginCnt?: number;
  lastLoginDt?: string;
  pwdChangeDt?: string;
  pwdExpireDt?: string;
  regUserId?: string;
  regDt?: string;
  updUserId?: string;
  updDt?: string;
}

// 사용자 등록/수정 요청
export interface UserRequest {
  userId: string;
  userNm: string;
  userPwd?: string;
  companyId: string;
  roleId: string;
  email?: string;
  telNo?: string;
  useYn?: string;
}

// 사용자 목록 조회 요청
export interface UserListRequest {
  userId?: string;
  userNm?: string;
  companyId?: string;
  roleId?: string;
  useYn?: string;
  accountLockYn?: string;
  page?: number;
  size?: number;
}

// Role 관련 타입은 role.ts 로 이동됨

// 로그인 이력
export interface UserLoginHist {
  loginSeq?: number;    // 로그인 SEQ (PK)
  userId: string;
  loginDt: string;
  loginIp?: string;
  loginResult: string;  // SUCCESS, FAILED
  failReason?: string;
  userAgent?: string;
  sessionId?: string;
}

// 최근 사용 메뉴
export interface RecentMenu {
  menuId: string;
  menuNm: string;
  menuPath?: string;
  menuIcon?: string;
  lastAccessDt?: string;
  accessCount?: number;
}

// 사용자 상세 정보 (기본정보 + 로그인이력 + 최근메뉴)
export interface UserDetail extends User {
  loginHistory?: UserLoginHist[];
  recentMenus?: RecentMenu[];
}
