/**
 * 공통 타입 정의
 */

// API 응답 래퍼
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  errorCode: string | null;
}

// 페이징 응답
export interface PageResponse<T> {
  content: T[];
  totalCount: number;
  page: number;
  size: number;
  totalPages: number;
}

// 페이징 요청
export interface PageRequest {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

// 버튼 타입
export type ButtonType = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default';

// 크기
export type SizeType = 'small' | 'middle' | 'large';
