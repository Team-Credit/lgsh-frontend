/**
 * ??곸옄 API ?쒕퉬?? */
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
  // 紐⑸줉 議고쉶
  list: async (params: PersonSearchParams): Promise<ApiResponse<PersonListResponse>> => {
    // 諛깆뿏??API媛 吏?먰븯???뚮씪誘명꽣留??꾨떖
    const queryParams: Record<string, string | undefined> = {};
    if (params.companyId) queryParams.companyId = params.companyId;
    if (params.personNm) queryParams.personNm = params.personNm;

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
      message: data.message || '?곗씠??議고쉶 ?ㅽ뙣',
      errorCode: data.errorCode,
    };
  },

  // ?곸꽭 議고쉶
  get: async (personId: string): Promise<ApiResponse<PersonFull>> => {
    const response = await api.get<ApiResponse<PersonFull>>(`/persons/${personId}`);
    return response.data;
  },

  // 이름 조회 (personId → personNm)
  getName: async (personId: string): Promise<ApiResponse<{ personNm?: string }>> => {
    const response = await api.get<ApiResponse<any>>(`/persons/${personId}`);
    return response.data;
  },

  // ?깅줉: POST /persons
  create: async (data: PersonRequest): Promise<ApiResponse<PersonFull>> => {
    const response = await api.post<ApiResponse<PersonFull>>('/persons', data);
    return response.data;
  },

  // ?섏젙: PUT /persons/{personId}
  update: async (personId: string, data: PersonRequest): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>(`/persons/${personId}`, data);
    return response.data;
  },

  // ??젣: DELETE /persons/{personId}
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

  // ?쇨큵 ??젣
  deleteBatch: async (personIds: string[]): Promise<ApiResponse<null>> => {
    // 媛쒕퀎 ??젣瑜??쒖감?곸쑝濡??몄텧
    await Promise.all(
      personIds.map(personId => api.delete(`/persons/${personId}`))
    );

    return {
      success: true,
      data: null,
      message: `${personIds.length}嫄댁씠 ??젣?섏뿀?듬땲??`,
      errorCode: null,
    };
  },
};

export default personService;


