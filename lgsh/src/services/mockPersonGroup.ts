/**
 * 관리그룹 Mock 서비스
 * 백엔드 없이 개발 테스트용
 */
import type {
  PersonGroup,
  PersonGroupRequest,
  PersonGroupListRequest,
  ApiResponse,
  PageResponse,
} from '@/types';

// Mock 관리그룹 데이터 (실제 DB와 일치)
let mockData: PersonGroup[] = [
  {
    personGrp: 'GRP001',
    userId: 'admin',
    companyId: 'COMP_001',
    companyNm: '로지신해금융',
    personGrpNm: '일반 신용평가 그룹',
    personNmEng: 'General Credit Assessment Group',
    useYn: 'Y',
    regUserId: 'admin',
    regDt: '2026-01-15T09:00:00',
    updUserId: 'admin',
    updDt: '2026-01-15T09:00:00',
  },
  {
    personGrp: 'GRP002',
    userId: 'manager',
    companyId: 'COMP_001',
    companyNm: '로지신해금융',
    personGrpNm: '고위험 대상자 그룹',
    personNmEng: 'High Risk Group',
    useYn: 'Y',
    regUserId: 'manager',
    regDt: '2026-01-16T10:30:00',
    updUserId: null,
    updDt: null,
  },
  {
    personGrp: 'GRP003',
    userId: 'user01',
    companyId: 'COMP_002',
    companyNm: '테스트원청사',
    personGrpNm: '신규 고객 평가 그룹',
    personNmEng: 'New Customer Assessment Group',
    useYn: 'Y',
    regUserId: 'user01',
    regDt: '2026-01-17T14:20:00',
    updUserId: null,
    updDt: null,
  },
  {
    personGrp: 'GRP004',
    userId: 'admin',
    companyId: 'COMP_001',
    companyNm: '로지신해금융',
    personGrpNm: '테스트 그룹',
    personNmEng: 'Test Group',
    useYn: 'N',
    regUserId: 'admin',
    regDt: '2026-01-18T11:00:00',
    updUserId: 'admin',
    updDt: '2026-01-19T16:30:00',
  },
];

// 필터링 함수
const filterData = (params: PersonGroupListRequest): PersonGroup[] => {
  let filtered = [...mockData];

  if (params.personGrp) {
    filtered = filtered.filter((item) =>
      item.personGrp.toLowerCase().includes(params.personGrp!.toLowerCase())
    );
  }

  if (params.personGrpNm) {
    filtered = filtered.filter((item) =>
      item.personGrpNm.toLowerCase().includes(params.personGrpNm!.toLowerCase())
    );
  }

  if (params.companyId) {
    filtered = filtered.filter((item) => item.companyId === params.companyId);
  }

  if (params.useYn) {
    filtered = filtered.filter((item) => item.useYn === params.useYn);
  }

  return filtered;
};

// Mock 목록 조회
export const mockPersonGroupList = (
  params: PersonGroupListRequest
): Promise<ApiResponse<PageResponse<PersonGroup>>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const filtered = filterData(params);
      const page = params.page || 0;
      const size = params.size || 20;
      const start = page * size;
      const end = start + size;
      const paginatedData = filtered.slice(start, end);

      resolve({
        success: true,
        data: {
          content: paginatedData,
          totalCount: filtered.length,
          page: page,
          size: size,
          totalPages: Math.ceil(filtered.length / size),
        },
        message: '조회 성공',
        errorCode: null,
      });
    }, 300);
  });
};

// Mock 상세 조회
export const mockPersonGroupGet = (
  personGrp: string,
  userId: string
): Promise<ApiResponse<PersonGroup>> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const item = mockData.find(
        (d) => d.personGrp === personGrp && d.userId === userId
      );

      if (item) {
        resolve({
          success: true,
          data: item,
          message: '조회 성공',
          errorCode: null,
        });
      } else {
        reject({
          success: false,
          data: null,
          message: '데이터를 찾을 수 없습니다.',
          errorCode: 'NOT_FOUND',
        });
      }
    }, 200);
  });
};

// Mock 등록
export const mockPersonGroupCreate = (
  data: PersonGroupRequest
): Promise<ApiResponse<PersonGroup>> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 중복 체크
      const exists = mockData.find(
        (d) => d.personGrp === data.personGrp && d.userId === data.userId
      );

      if (exists) {
        reject({
          success: false,
          data: null,
          message: '이미 존재하는 관리그룹입니다.',
          errorCode: 'DUPLICATE',
        });
        return;
      }

      // 회사명 매핑 (실제로는 백엔드에서 JOIN으로 가져옴)
      const companyNameMap: Record<string, string> = {
        'COMP_001': '로지신해금융',
        'COMP_002': '테스트원청사',
      };

      const newItem: PersonGroup = {
        personGrp: data.personGrp!,
        userId: data.userId,
        companyId: data.companyId,
        companyNm: companyNameMap[data.companyId] || data.companyId,
        personGrpNm: data.personGrpNm,
        personNmEng: data.personNmEng || null,
        useYn: data.useYn,
        regUserId: 'admin', // 현재 로그인 사용자로 대체 필요
        regDt: new Date().toISOString(),
        updUserId: null,
        updDt: null,
      };

      mockData.unshift(newItem);

      resolve({
        success: true,
        data: newItem,
        message: '등록되었습니다.',
        errorCode: null,
      });
    }, 500);
  });
};

// Mock 수정
export const mockPersonGroupUpdate = (
  personGrp: string,
  userId: string,
  data: PersonGroupRequest
): Promise<ApiResponse<PersonGroup>> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockData.findIndex(
        (d) => d.personGrp === personGrp && d.userId === userId
      );

      if (index === -1) {
        reject({
          success: false,
          data: null,
          message: '존재하지 않는 관리그룹입니다.',
          errorCode: 'NOT_FOUND',
        });
        return;
      }

      // 회사명 매핑 (실제로는 백엔드에서 JOIN으로 가져옴)
      const companyNameMap: Record<string, string> = {
        'COMP_001': '로지신해금융',
        'COMP_002': '테스트원청사',
      };

      const updatedItem: PersonGroup = {
        ...mockData[index],
        companyId: data.companyId,
        companyNm: companyNameMap[data.companyId] || data.companyId,
        personGrpNm: data.personGrpNm,
        personNmEng: data.personNmEng || null,
        useYn: data.useYn,
        updUserId: 'admin',
        updDt: new Date().toISOString(),
      };

      mockData[index] = updatedItem;

      resolve({
        success: true,
        data: updatedItem,
        message: '수정되었습니다.',
        errorCode: null,
      });
    }, 500);
  });
};

// Mock 삭제
export const mockPersonGroupDelete = (
  personGrp: string,
  userId: string
): Promise<ApiResponse<null>> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockData.findIndex(
        (d) => d.personGrp === personGrp && d.userId === userId
      );

      if (index === -1) {
        reject({
          success: false,
          data: null,
          message: '존재하지 않는 관리그룹입니다.',
          errorCode: 'NOT_FOUND',
        });
        return;
      }

      mockData.splice(index, 1);

      resolve({
        success: true,
        data: null,
        message: '삭제되었습니다.',
        errorCode: null,
      });
    }, 300);
  });
};

// Mock 일괄 삭제
export const mockPersonGroupDeleteBatch = (
  items: Array<{ personGrp: string; userId: string }>
): Promise<ApiResponse<null>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let deletedCount = 0;

      items.forEach((item) => {
        const index = mockData.findIndex(
          (d) => d.personGrp === item.personGrp && d.userId === item.userId
        );
        if (index !== -1) {
          mockData.splice(index, 1);
          deletedCount++;
        }
      });

      resolve({
        success: true,
        data: null,
        message: `${deletedCount}건이 삭제되었습니다.`,
        errorCode: null,
      });
    }, 500);
  });
};
