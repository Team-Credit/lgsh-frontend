/**
 * Mock 인증 서비스
 * 백엔드 없이 개발 테스트용
 */
import type { LoginRequest, LoginResponse, ApiResponse } from '@/types';

// Mock 사용자 데이터
// 참고: admin은 전체 관리자로 companyId 없음 (모든 원청사 데이터 조회 가능)
const MOCK_USERS = {
  admin: {
    userId: 'admin',
    password: 'password123!',
    userNm: '홍길동',
    email: 'admin@lgsh.com',
    roleId: 'ADMIN',
    roleNm: '관리자',
    companyId: '', // 전체 관리자 - 원청사 제한 없음
    companyNm: '',
  },
  manager: {
    userId: 'manager',
    password: 'password123!',
    userNm: '김매니저',
    email: 'manager@lgsh.com',
    roleId: 'MANAGER',
    roleNm: '매니저',
    companyId: 'COMP_001',
    companyNm: '로지신해금융',
  },
  user01: {
    userId: 'user01',
    password: 'password123!',
    userNm: '이사용자',
    email: 'user01@test.com',
    roleId: 'USER',
    roleNm: '일반사용자',
    companyId: 'COMP_002',
    companyNm: '테스트원청사',
  },
  analyst: {
    userId: 'analyst',
    password: 'password123!',
    userNm: '박분석가',
    email: 'analyst@lgsh.com',
    roleId: 'ANALYST',
    roleNm: '분석가',
    companyId: 'COMP_001',
    companyNm: '로지신해금융',
  },
};

export const mockLogin = (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = MOCK_USERS[credentials.userId as keyof typeof MOCK_USERS];

      if (!user || user.password !== credentials.password) {
        reject({
          success: false,
          data: null,
          message: '아이디 또는 비밀번호가 일치하지 않습니다.',
          errorCode: 'AUTH_FAILED',
        });
        return;
      }

      const { password, ...userInfo } = user;

      resolve({
        success: true,
        data: {
          user: userInfo,
          accessToken: `mock-access-token-${Date.now()}`,
          refreshToken: `mock-refresh-token-${Date.now()}`,
        },
        message: '로그인 성공',
        errorCode: null,
      });
    }, 500); // 네트워크 지연 시뮬레이션
  });
};

export const mockLogout = (): Promise<ApiResponse<null>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: null,
        message: '로그아웃 성공',
        errorCode: null,
      });
    }, 300);
  });
};
