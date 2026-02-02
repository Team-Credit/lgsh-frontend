/**
 * 관리그룹 API 서비스
 */
import api from './api';
import type {
  PersonGroup,
  PersonGroupRequest,
  PersonGroupListRequest,
  ApiResponse,
  PageResponse,
} from '@/types';

export const personGroupService = {
  // 목록 조회
  list: async (params: PersonGroupListRequest): Promise<ApiResponse<PageResponse<PersonGroup>>> => {
    const response = await api.get<ApiResponse<PersonGroup[]>>('/person-grps', {
      params,
    });

    // 백엔드는 단순 리스트를 반환하므로 PageResponse 형식으로 변환
    const data = response.data;
    if (data.success && Array.isArray(data.data)) {
      const items = data.data || [];
      return {
        success: data.success,
        data: {
          content: items,
          totalCount: items.length,
          page: 0,
          size: items.length,
          totalPages: 1,
        },
        message: data.message,
        errorCode: data.errorCode,
      };
    }

    return {
      success: false,
      data: null,
      message: data.message || '데이터 조회 실패',
      errorCode: data.errorCode,
    };
  },

  // 상세 조회
  get: async (personGrp: string, userId: string): Promise<ApiResponse<PersonGroup>> => {
    const response = await api.get<ApiResponse<PersonGroup>>(
      `/person-grps/${personGrp}/${userId}`
    );
    return response.data;
  },

  // 등록
  create: async (data: PersonGroupRequest): Promise<ApiResponse<PersonGroup>> => {
    const response = await api.post<ApiResponse<PersonGroup>>('/person-grps', data);
    return response.data;
  },

  // 수정
  update: async (
    personGrp: string,
    userId: string,
    data: PersonGroupRequest
  ): Promise<ApiResponse<PersonGroup>> => {
    const response = await api.put<ApiResponse<PersonGroup>>(
      `/person-grps/${personGrp}/${userId}`,
      data
    );
    return response.data;
  },

  // 삭제
  delete: async (personGrp: string, userId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(
      `/person-grps/${personGrp}/${userId}`
    );
    return response.data;
  },

  // 일괄 등록 (배치)
  createBatch: async (items: PersonGroupRequest[]): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/person-grps/batch', { items });
    return response.data;
  },

  // 일괄 삭제
  deleteBatch: async (items: Array<{ personGrp: string; userId: string }>): Promise<ApiResponse<null>> => {
    // 개별 삭제를 순차적으로 호출
    await Promise.all(
      items.map(item => api.delete(`/person-grps/${item.personGrp}/${item.userId}`))
    );

    return {
      success: true,
      data: null,
      message: `${items.length}건이 삭제되었습니다.`,
      errorCode: null,
    };
  },
};

export default personGroupService;
