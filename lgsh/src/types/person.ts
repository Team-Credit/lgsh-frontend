/**
 * 대상자 관련 타입 정의
 */

// 대상자 기본정보 (TB_PERSON)
export interface Person {
  personId: string;         // 대상자 ID
  companyId: string;        // 소속 원청사 ID
  companyNm?: string;       // 소속 원청사명 (조회용)
  personNo: string;         // 원청사별 대상자번호
  personNm: string;         // 대상자명
  personNmEng?: string;     // 대상자 영문명
  gender?: string;          // 성별 (M/F)
  birthDt?: string;         // 생년월일
  mobileNo?: string;        // 휴대폰번호
  telNo?: string;           // 전화번호
  email?: string;           // 이메일
  address?: string;         // 주소
  jobCode?: string;         // 직업코드
  jobNm?: string;           // 직업명 (조회용)
  annualIncome?: number;    // 연봉
  personGrp?: string;       // 관리그룹
  personGrpNm?: string;     // 관리그룹명 (조회용)
  useYn?: string;           // 사용여부
  regUserId?: string;       // 등록자 ID
  regDt?: string;           // 등록일시
  updUserId?: string;       // 수정자 ID
  updDt?: string;           // 수정일시
}

// 대상자 상세정보 (TB_PERSON_DETAIL)
export interface PersonDetail {
  personId: string;         // 대상자 ID
  marriageYn?: string;      // 결혼여부 (Y/N)
  childrenCnt?: number;     // 자녀수
  educationCode?: string;   // 학력코드
  educationNm?: string;     // 학력명 (조회용)
  homeTypeCode?: string;    // 주거형태 코드
  homeTypeNm?: string;      // 주거형태명 (조회용)
  carYn?: string;           // 자동차보유 (Y/N)
  assetAmt?: number;        // 자산금액
  debtAmt?: number;         // 부채금액
  creditCardCnt?: number;   // 신용카드 보유수
  notes?: string;           // 비고
}

// 대상자 전체 정보 (기본 + 상세)
export interface PersonFull extends Person {
  // 상세정보
  marriageYn?: string;
  childrenCnt?: number;
  educationCode?: string;
  educationNm?: string;
  homeTypeCode?: string;
  homeTypeNm?: string;
  carYn?: string;
  assetAmt?: number;
  debtAmt?: number;
  creditCardCnt?: number;
  notes?: string;
}

// 대상자 등록/수정 요청
export interface PersonRequest {
  personId?: string;        // 수정 시에만 사용
  companyId: string;
  personNo: string;
  personNm: string;
  personNmEng?: string;
  gender?: string;
  birthDt?: string;
  mobileNo?: string;
  telNo?: string;
  email?: string;
  address?: string;
  jobCode?: string;
  annualIncome?: number;
  personGrp?: string;
  // 상세정보
  marriageYn?: string;
  childrenCnt?: number;
  educationCode?: string;
  homeTypeCode?: string;
  carYn?: string;
  assetAmt?: number;
  debtAmt?: number;
  creditCardCnt?: number;
  notes?: string;
}

// 대상자 검색 파라미터
export interface PersonSearchParams {
  personId?: string;
  companyId?: string;
  personNo?: string;
  personIdFrom?: string;
  personIdTo?: string;
  personNm?: string;
  personGrp?: string;
  useYn?: string;
  page?: number;
  size?: number;
}

// 대상자 목록 응답
export interface PersonListResponse {
  content: PersonFull[];
  totalCount: number;
  page: number;
  size: number;
}

// 카드보드 아이템 (목록 조회 결과)
export interface PersonCardItem {
  personId: string;
  personNo: string;
  personNm: string;
  gender?: string;
  companyId: string;
  companyNm?: string;
  personGrp?: string;
  personGrpNm?: string;
  useYn: string;
  creditScore: number | null;
  creditGrade: string | null;
  creditGradeNm: string | null;
  gradeColor: string | null;
  scoreDt: string | null;
}

// 카드보드 검색 파라미터
export interface PersonCardSearchParams {
  page?: number;
  size?: number;
  sortBy?: 'SCORE_DESC' | 'SCORE_ASC' | 'RECENT';
  personNo?: string;
  personNm?: string;
  companyId?: string;
  personGrp?: string;
  useYn?: string;
  creditGrade?: string;
}

// 카드보드 목록 응답
export interface PersonCardListResponse {
  content: PersonCardItem[];
  totalCount: number;
  page: number;
  size: number;
  totalPages: number;
}
