/**
 * JWT 토큰 유틸리티
 * - 토큰 파싱, 만료 시간 확인
 */

interface JwtPayload {
  exp: number; // 만료 시간 (Unix timestamp, seconds)
  iat: number; // 발급 시간
  sub?: string; // 사용자 ID
  [key: string]: unknown;
}

/**
 * JWT 토큰 디코딩 (payload 추출)
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Base64URL -> Base64 변환
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload;
  } catch (error) {
    console.error('토큰 디코딩 실패:', error);
    return null;
  }
};

/**
 * 토큰 만료 여부 확인
 */
export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;

  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;

  // exp는 초 단위, Date.now()는 밀리초 단위
  const expirationTime = payload.exp * 1000;
  return Date.now() >= expirationTime;
};

/**
 * 토큰 만료까지 남은 시간 (밀리초)
 */
export const getTokenTimeRemaining = (token: string | null): number => {
  if (!token) return 0;

  const payload = decodeToken(token);
  if (!payload || !payload.exp) return 0;

  const expirationTime = payload.exp * 1000;
  const remaining = expirationTime - Date.now();
  return Math.max(0, remaining);
};

/**
 * 토큰 만료까지 남은 시간 (분)
 */
export const getTokenMinutesRemaining = (token: string | null): number => {
  const ms = getTokenTimeRemaining(token);
  return Math.floor(ms / 60000);
};

/**
 * 토큰 갱신이 필요한지 확인 (만료 N분 전)
 */
export const shouldRefreshToken = (token: string | null, thresholdMinutes: number = 5): boolean => {
  const minutesRemaining = getTokenMinutesRemaining(token);
  return minutesRemaining > 0 && minutesRemaining <= thresholdMinutes;
};

/**
 * 토큰 만료 시간 포맷팅 (MM:SS)
 */
export const formatTimeRemaining = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
