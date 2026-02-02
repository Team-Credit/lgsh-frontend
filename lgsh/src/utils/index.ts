/**
 * 로지신해 - 유틸리티 함수
 */

// 토큰 유틸리티
export * from './tokenUtils';

/**
 * 숫자를 통화 형식으로 포맷팅
 */
export const formatCurrency = (value: number | null | undefined, currency: string = '원'): string => {
  if (value === null || value === undefined) return '-';
  return `${value.toLocaleString('ko-KR')}${currency}`;
};

/**
 * 날짜 포맷팅
 */
export const formatDate = (
  date: string | Date | null | undefined,
  format: string = 'YYYY-MM-DD'
): string => {
  if (!date) return '-';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * 전화번호 포맷팅 (마스킹)
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '-';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-****-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-***-${cleaned.slice(6)}`;
  }
  
  return phone;
};

/**
 * 이메일 마스킹
 */
export const maskEmail = (email: string | null | undefined): string => {
  if (!email || !email.includes('@')) return '-';
  
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 3 
    ? `${local.slice(0, 3)}${'*'.repeat(local.length - 3)}`
    : `${local[0]}${'*'.repeat(local.length - 1)}`;
  
  return `${maskedLocal}@${domain}`;
};

/**
 * 신용점수 → 등급 변환
 */
export type CreditGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export const scoreToGrade = (score: number | null | undefined): CreditGrade | '-' => {
  if (score === null || score === undefined) return '-';
  if (score >= 900) return 'A';
  if (score >= 800) return 'B';
  if (score >= 700) return 'C';
  if (score >= 600) return 'D';
  return 'E';
};

/**
 * 등급별 색상 반환 (채도 낮춤 커스텀)
 */
export const gradeColor = (grade: string | null | undefined): string => {
  const colors: Record<string, string> = {
    A: '#059669', // 차분한 녹색
    B: '#10b981', // 에메랄드
    C: '#d97706', // 차분한 주황
    D: '#ea580c', // 오렌지
    E: '#dc2626', // 차분한 빨강
  };
  return colors[grade?.toUpperCase() ?? ''] || '#9e9e9e';
};

/**
 * 빈 값 체크
 */
export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * 딥 클론
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * 쿼리스트링 파싱
 */
export const parseQueryString = (queryString: string): Record<string, string> => {
  return Object.fromEntries(new URLSearchParams(queryString));
};

/**
 * 객체를 쿼리스트링으로 변환
 */
export const toQueryString = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
};

/**
 * 디바운스
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number = 300
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * 스로틀
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number = 300
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * 로컬 스토리지 헬퍼
 */
export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  
  set: <T>(key: string, value: T): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  
  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  
  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  },
};
