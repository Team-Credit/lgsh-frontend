/**
 * 로지신해 - 인증 관련 타입 정의
 * Ant Design + TypeScript
 */

// 로그인 요청
export interface LoginRequest {
  userId: string;
  password: string;
  rememberMe?: boolean;
}

// 로그인 응답
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  userNm: string;
  roleId: string;
  roleNm: string;
  companyId: string;
  companyNm: string;
  accessTokenExpireTime: number;
}

// 토큰 갱신 요청
export interface TokenRefreshRequest {
  refreshToken: string;
}

// 토큰 갱신 응답
export interface TokenRefreshResponse {
  accessToken: string;
  accessTokenExpireTime: number;
}

// 사용자 정보
export interface UserInfo {
  userId: string;
  userNm: string;
  roleId: string;
  roleNm: string;
  companyId: string;
  companyNm: string;
}

// 인증 상태
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
}

// API 공통 응답
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  errorCode: string | null;
}

// 테스트 계정 타입
export interface TestAccount {
  userId: string;
  password: string;
  name: string;
  role: string;
  roleColor: string;
}
