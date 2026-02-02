/**
 * 파일 관리 서비스
 * API 호출을 담당
 */
import api from './api';
import type {
  FileInfo,
  FileRequest,
  FileUploadResponse,
  FileConfig,
  FileListParams,
  FileListResponse,
} from '@/types';
import type { ApiResponse } from '@/types/common';

const BASE_URL = '/admin/files';

export const fileService = {
  /**
   * 파일 목록 조회
   * @param params 검색 조건
   */
  getFileList: async (params?: FileListParams): Promise<FileListResponse> => {
    const response = await api.get<ApiResponse<{ content: FileInfo[]; totalCount: number }>>(
      BASE_URL,
      {
        params: {
          fileCategory: params?.fileCategory,
          fileExt: params?.fileExt,
          searchKeyword: params?.searchKeyword,
          useYn: params?.useYn,
          page: params?.page ?? 0,
          size: params?.size ?? 20,
        },
      }
    );
    return response.data.data!;
  },

  /**
   * 파일 상세 조회
   * @param fileId 파일 ID
   */
  getFileDetail: async (fileId: string): Promise<FileInfo> => {
    const response = await api.get<ApiResponse<FileInfo>>(`${BASE_URL}/${fileId}`);
    return response.data.data!;
  },

  /**
   * 단일 파일 업로드
   * @param file 파일
   * @param fileCategory 파일 카테고리
   * @param description 설명
   */
  uploadFile: async (
    file: File,
    fileCategory: string = 'DOCUMENT',
    description?: string
  ): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileCategory', fileCategory);
    if (description) {
      formData.append('description', description);
    }

    const response = await api.post<ApiResponse<FileUploadResponse>>(
      `${BASE_URL}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  },

  /**
   * 다중 파일 업로드
   * @param files 파일 배열
   * @param fileCategory 파일 카테고리
   * @param description 설명
   */
  uploadMultipleFiles: async (
    files: File[],
    fileCategory: string = 'DOCUMENT',
    description?: string
  ): Promise<FileUploadResponse[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('fileCategory', fileCategory);
    if (description) {
      formData.append('description', description);
    }

    const response = await api.post<ApiResponse<FileUploadResponse[]>>(
      `${BASE_URL}/upload-multiple`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  },

  /**
   * 파일 정보 수정
   * @param fileId 파일 ID
   * @param request 수정 요청
   */
  updateFile: async (fileId: string, request: FileRequest): Promise<void> => {
    await api.put(`${BASE_URL}/${fileId}`, request);
  },

  /**
   * 파일 삭제
   * @param fileId 파일 ID
   */
  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`${BASE_URL}/${fileId}`);
  },

  /**
   * 파일 다운로드 URL 반환
   * @param fileId 파일 ID
   */
  getDownloadUrl: (fileId: string): string => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${baseUrl}${BASE_URL}/download/${fileId}`;
  },

  /**
   * 파일 다운로드
   * @param fileId 파일 ID
   * @param fileName 파일명
   */
  downloadFile: async (fileId: string, fileName: string): Promise<void> => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(fileService.getDownloadUrl(fileId), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('파일 다운로드에 실패했습니다.');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * 파일 설정 조회
   */
  getFileConfigs: async (): Promise<FileConfig[]> => {
    const response = await api.get<ApiResponse<FileConfig[]>>(`${BASE_URL}/config`);
    return response.data.data!;
  },
};

export default fileService;
