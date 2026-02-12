/**
 * 대상자 API 서비스
 */
import api from './api';
import type {
  PersonFull,
  PersonRequest,
  PersonSearchParams,
  PersonListResponse,
  PersonCardSearchParams,
  PersonCardListResponse,
  ApiResponse,
} from '@/types';

export const personService = {
  // 목록 조회
  // 목록 조회
  list: async (params: PersonSearchParams): Promise<ApiResponse<PersonListResponse>> => {
    const queryParams: Record<string, string | undefined> = {};
    if (params.companyId) queryParams.companyId = params.companyId;
    if (params.personNm) queryParams.personNm = params.personNm;
    if (params.personIdFrom) queryParams.personIdFrom = params.personIdFrom;
    if (params.personIdTo) queryParams.personIdTo = params.personIdTo;
    if (params.personGrp) queryParams.personGrp = params.personGrp;

    const response = await api.get<ApiResponse<PersonFull[]>>('/persons', {
      params: queryParams,
    });

    // 백엔드가 단순 리스트를 반환하면 PageResponse 형태로 변환
    const data = response.data;
    if (data.success && Array.isArray(data.data)) {
      const items = data.data || [];
      return {
        success: data.success,
        data: {
          content: items,
          totalCount: items.length,
          page: params.page || 0,
          size: params.size || items.length,
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
  // 상세 조회
  get: async (personId: string): Promise<ApiResponse<PersonFull>> => {
    const response = await api.get<ApiResponse<PersonFull>>(`/persons/${personId}`);
    return response.data;
  },

  // 이름 조회 (personId -> personNm)
  getName: async (personId: string): Promise<ApiResponse<{ personNm?: string }>> => {
    const response = await api.get<ApiResponse<any>>(`/persons/${personId}`);
    return response.data;
  },

  // 등록: POST /persons
  // 등록: POST /persons
  create: async (data: PersonRequest): Promise<ApiResponse<PersonFull>> => {
    const response = await api.post<ApiResponse<PersonFull>>('/persons', data);
    return response.data;
  },

  // 수정: PUT /persons/{personId}
  // 수정: PUT /persons/{personId}
  update: async (personId: string, data: PersonRequest): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>(`/persons/${personId}`, data);
    return response.data;
  },

  // 삭제: DELETE /persons/{personId}
  // 삭제: DELETE /persons/{personId}
  delete: async (personId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/persons/${personId}`);
    return response.data;
  },

  // 카드보드 목록 조회
  cardList: async (params: PersonCardSearchParams): Promise<ApiResponse<PersonCardListResponse>> => {
    const response = await api.get<ApiResponse<PersonCardListResponse>>(
      '/persons/card-list',
      { params }
    );
    return response.data;
  },

  // 일괄 삭제
  deleteBatch: async (personIds: string[]): Promise<ApiResponse<null>> => {
    // 개별 삭제를 순차적으로 실행
    await Promise.all(
      personIds.map(personId => api.delete(`/persons/${personId}`))
    );

    return {
      success: true,
      data: null,
      message: `${personIds.length}건이 삭제되었습니다.`,
      errorCode: null,
    };
  },

  // 관리그룹 일괄 지정
  batchUpdateGrp: async (personIds: string[], personGrp: string): Promise<ApiResponse<{ successCount: number; totalCount: number }>> => {
    const response = await api.put<ApiResponse<{ successCount: number; totalCount: number }>>(
      '/persons/batch-grp',
      { personIds, personGrp }
    );
    return response.data;
  },

  // 관리그룹 조회지정 (검색 조건 기반 일괄 지정)
  batchUpdateGrpByCriteria: async (
    searchParams: PersonSearchParams,
    personGrp: string
  ): Promise<ApiResponse<{ successCount: number; message: string }>> => {
    const params: Record<string, string> = { personGrp };
    if (searchParams.companyId) params.companyId = searchParams.companyId;
    if (searchParams.personNm) params.personNm = searchParams.personNm;
    if (searchParams.personIdFrom) params.personIdFrom = searchParams.personIdFrom;
    if (searchParams.personIdTo) params.personIdTo = searchParams.personIdTo;
    if (searchParams.personGrp) params.personGrpSearch = searchParams.personGrp;
    if (searchParams.useYn) params.useYn = searchParams.useYn;

    const response = await api.put<ApiResponse<{ successCount: number; message: string }>>(
      '/persons/batch-grp-by-criteria', null, { params }
    );
    return response.data;
  },
};

export default personService;
