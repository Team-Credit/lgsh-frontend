/**
 * 인증 관련 타입 정의
 */

// 로그인 요청
export interface LoginRequest {
  userId: string;
  password: string;
}

// 계약 만료 경고 정보
export interface ContractWarning {
  showWarning: boolean;
  daysUntilExpiry?: number;
  contractEndDt?: string;
  message?: string;
}

// 비밀번호 만료 경고 정보
export interface PasswordWarning {
  passwordExpired: boolean;
  showWarning: boolean;
  daysUntilExpiry?: number;
  pwdExpireDt?: string;
  message?: string;
}

// 로그인 응답
export interface LoginResponse {
  grantType?: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn?: number;
  user: UserInfo;
  contractWarning?: ContractWarning;
  passwordWarning?: PasswordWarning;
}

// 사용자 정보
export interface UserInfo {
  userId: string;
  userNm: string;
  email: string;
  roleId: string;
  roleNm: string;
  companyId: string;
  companyNm: string;
}

// 토큰 갱신 요청
export interface RefreshTokenRequest {
  refreshToken: string;
}

// 토큰 갱신 응답
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// 인증 상태
export interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  contractWarning: ContractWarning | null;
  passwordWarning: PasswordWarning | null;
}
