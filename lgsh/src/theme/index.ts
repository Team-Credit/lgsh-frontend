import type { ThemeConfig } from 'antd';

/**
 * 로지신해 브랜드 컬러 (Ant Design 채도 낮춤 커스텀)
 * - Primary: #1e3a8a (네이비)
 * - Success: #059669 (차분한 녹색)
 * - Warning: #d97706 (차분한 주황)
 * - Error: #dc2626 (차분한 빨강)
 */
export const brandColors = {
  primary: '#1e3a8a',      // 네이비 (메인)
  primaryLight: '#3b5cb8',
  primaryDark: '#152a6e',
  secondary: '#00bcd4',    // 시안 (보조)
  secondaryLight: '#4dd0e1',
  secondaryDark: '#0097a7',
};

/**
 * 신용등급 컬러 (채도 낮춤 커스텀)
 */
export const gradeColors = {
  A: '#059669', // 우수 - 차분한 녹색
  B: '#10b981', // 양호 - 에메랄드
  C: '#d97706', // 보통 - 차분한 주황
  D: '#ea580c', // 주의 - 오렌지
  E: '#dc2626', // 위험 - 차분한 빨강
};

/**
 * Ant Design 테마 설정
 */
export const themeConfig: ThemeConfig = {
  token: {
    // 색상 (로지신해 커스텀 - 채도 낮춤)
    colorPrimary: brandColors.primary,  // #1e3a8a
    colorSuccess: '#059669',            // 차분한 녹색
    colorWarning: '#d97706',            // 차분한 주황
    colorError: '#dc2626',              // 차분한 빨강
    colorInfo: '#2563eb',
    
    // 배경
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f7fa',
    
    // 텍스트
    colorText: '#1a1a2e',
    colorTextSecondary: '#4a5568',
    
    // 경계선
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#edf2f7',
    
    // 폰트
    fontFamily: `'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    fontSize: 14,
    
    // 둥근 모서리
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    
    // 그림자
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0px 4px 16px rgba(0, 0, 0, 0.12)',
  },
  
  components: {
    // 버튼
    Button: {
      borderRadius: 8,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
    },
    
    // 입력 필드
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    
    // 카드
    Card: {
      borderRadiusLG: 12,
    },
    
    // 테이블
    Table: {
      headerBg: '#f8fafc',
      headerColor: brandColors.primary,
      rowHoverBg: '#f8fafc',
    },
    
    // 메뉴 (사이드바)
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#e8f0fe',
      itemSelectedColor: brandColors.primary,
      itemHoverBg: '#f0f5ff',
    },
    
    // 레이아웃
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      bodyBg: '#f5f7fa',
    },
    
    // 탭
    Tabs: {
      itemSelectedColor: brandColors.primary,
      inkBarColor: brandColors.primary,
    },
    
    // 모달
    Modal: {
      borderRadiusLG: 16,
    },
    
    // 알림
    Notification: {
      borderRadiusLG: 12,
    },
    
    // 메시지
    Message: {
      borderRadiusLG: 8,
    },
  },
};

export default themeConfig;
