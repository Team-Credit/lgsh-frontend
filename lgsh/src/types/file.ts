/**
 * 파일 관리 타입 정의
 */

/**
 * 파일 정보
 */
export interface FileInfo {
  fileId: string;
  fileGrpId?: string;
  fileNm: string;
  filePath: string;
  fileSize: number;
  fileSizeFormatted: string;
  fileExt: string;
  mimeType: string;
  fileCategory: string;
  fileCategoryNm?: string;
  description?: string;
  downloadCnt: number;
  useYn: string;
  regUserId?: string;
  regDt?: string;
  updUserId?: string;
  updDt?: string;
  totalCount?: number;
}

/**
 * 파일 수정 요청
 */
export interface FileRequest {
  fileId?: string;
  fileNm?: string;
  fileCategory?: string;
  description?: string;
  useYn?: string;
}

/**
 * 파일 업로드 응답
 */
export interface FileUploadResponse {
  fileId: string;
  fileNm: string;
  filePath: string;
  fileSize: number;
  fileSizeFormatted: string;
  fileExt: string;
  mimeType: string;
  fileCategory: string;
  downloadCnt: number;
  useYn: string;
}

/**
 * 파일 설정
 */
export interface FileConfig {
  configCode: string;
  configCodeNm: string;
  configValue: string;
  defaultValue: string;
  description: string;
}

/**
 * 파일 목록 조회 파라미터
 */
export interface FileListParams {
  fileCategory?: string;
  fileExt?: string;
  searchKeyword?: string;
  useYn?: string;
  page?: number;
  size?: number;
}

/**
 * 파일 목록 응답
 */
export interface FileListResponse {
  content: FileInfo[];
  totalCount: number;
}

/**
 * 파일 카테고리
 */
export type FileCategory = 'DOCUMENT' | 'IMAGE' | 'DATA' | 'REPORT';
