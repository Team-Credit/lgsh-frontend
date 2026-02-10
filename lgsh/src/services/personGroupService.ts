/**
 * 관리그룹 API 서비스 (계층형)
 */
import api from './api';
import type {
  PersonGroup,
  PersonGroupTreeNode,
  PersonGroupRequest,
  PersonGroupListRequest,
  UserGrpMap,
  ApiResponse,
  PageResponse,
} from '@/types';

export const personGroupService = {
  // 목록 조회 (플랫)
  list: async (params: PersonGroupListRequest): Promise<ApiResponse<PageResponse<PersonGroup>>> => {
    const response = await api.get<ApiResponse<PersonGroup[]>>('/person-grps', {
      params,
    });

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

  // 단건 조회
  get: async (personGrp: string): Promise<ApiResponse<PersonGroup>> => {
    const response = await api.get<ApiResponse<PersonGroup>>(
      `/person-grps/${personGrp}`
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
    data: PersonGroupRequest
  ): Promise<ApiResponse<PersonGroup>> => {
    const response = await api.put<ApiResponse<PersonGroup>>(
      `/person-grps/${personGrp}`,
      data
    );
    return response.data;
  },

  // 삭제
  delete: async (personGrp: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(
      `/person-grps/${personGrp}`
    );
    return response.data;
  },

  // 일괄 등록 (배치)
  createBatch: async (items: PersonGroupRequest[]): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/person-grps/batch', { items });
    return response.data;
  },

  // === 신규 API ===

  // 계층 트리 조회
  tree: async (companyId?: string): Promise<ApiResponse<PersonGroupTreeNode[]>> => {
    const response = await api.get<ApiResponse<PersonGroupTreeNode[]>>(
      '/person-grps/tree',
      { params: { companyId } }
    );
    return response.data;
  },

  // 그룹 이동
  move: async (personGrp: string, data: { newParentGrp: string | null; sortOrder?: number }): Promise<ApiResponse<null>> => {
    const response = await api.put<ApiResponse<null>>(
      `/person-grps/${personGrp}/move`,
      data
    );
    return response.data;
  },

  // 하위 그룹 코드 목록
  getChildren: async (personGrp: string): Promise<ApiResponse<string[]>> => {
    const response = await api.get<ApiResponse<string[]>>(
      `/person-grps/${personGrp}/children`
    );
    return response.data;
  },

  // 소속 사용자 목록
  getUsers: async (personGrp: string): Promise<ApiResponse<UserGrpMap[]>> => {
    const response = await api.get<ApiResponse<UserGrpMap[]>>(
      `/person-grps/${personGrp}/users`
    );
    return response.data;
  },

  // 사용자 매핑 추가
  addUser: async (personGrp: string, data: { userId: string; grpRole: string }): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>(
      `/person-grps/${personGrp}/users`,
      data
    );
    return response.data;
  },

  // 사용자 매핑 제거
  removeUser: async (personGrp: string, userId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(
      `/person-grps/${personGrp}/users/${userId}`
    );
    return response.data;
  },

  // 사용자 역할 변경
  updateUserRole: async (personGrp: string, userId: string, grpRole: string): Promise<ApiResponse<null>> => {
    const response = await api.put<ApiResponse<null>>(
      `/person-grps/${personGrp}/users/${userId}/role`,
      { grpRole }
    );
    return response.data;
  },
};

export default personGroupService;
