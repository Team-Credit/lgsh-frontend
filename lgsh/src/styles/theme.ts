/**
 * 로지신해 Ant Design 테마 설정
 * - 채도 낮춘 비즈니스 톤
 */
import type { ThemeConfig } from 'antd';

// 컬러 팔레트
export const colors = {
  // Primary (네이비 계열)
  primary: '#1e3a8a',
  primaryHover: '#1e40af',
  primaryActive: '#1d4ed8',
  primaryLight: '#dbeafe',

  // Success (차분한 녹색)
  success: '#059669',
  successHover: '#047857',
  successLight: '#d1fae5',

  // Warning (차분한 주황)
  warning: '#d97706',
  warningHover: '#b45309',
  warningLight: '#fef3c7',

  // Error (차분한 빨강)
  error: '#dc2626',
  errorHover: '#b91c1c',
  errorLight: '#fee2e2',

  // Info (파랑)
  info: '#0284c7',
  infoHover: '#0369a1',
  infoLight: '#e0f2fe',

  // Neutral
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  background: '#f3f4f6',
  white: '#ffffff',

  // Header
  headerBg: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
};

// Ant Design 테마 설정
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: colors.primary,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.error,
    colorInfo: colors.info,
    colorText: colors.text,
    colorTextSecondary: colors.textSecondary,
    colorBorder: colors.border,
    colorBgContainer: colors.white,
    colorBgLayout: colors.background,
    borderRadius: 8,
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Card: {
      borderRadiusLG: 12,
    },
    Menu: {
      itemBorderRadius: 8,
      subMenuItemBorderRadius: 8,
    },
    Table: {
      borderRadius: 8,
      headerBg: colors.primaryLight,
    },
  },
};

export default antdTheme;
