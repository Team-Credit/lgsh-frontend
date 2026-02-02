/**
 * 모델 변수 관리 타입 정의
 * 테이블: TB_MODEL_VARIABLE
 * 화면ID: VAR-001
 */

// 모델 변수 정보
export interface Variable {
    variableSeq: number;
    modelId: string;
    modelNm: string;
    variableId: string;
    variableNm: string;
    variableGroup: string;
    variableGroupNm: string;
    variableType: string;
    variableTypeNm: string;
    encodingType: string;
    encodingTypeNm: string;
    variableOrder: number | null;
    weight: number | null;
    useYn: 'Y' | 'N';
    regUserId: string;
    regDt: string;
    updUserId?: string;
    updDt?: string;
}

// 목록 조회 파라미터
export interface VariableListParams {
    modelId?: string;
    variableGroup?: string;
    keyword?: string;
    page?: number;
    size?: number;
}

// 등록 요청
export interface VariableCreateRequest {
    modelId: string;
    variableId: string;
    variableNm: string;
    variableGroup: string;
    variableType: string;
    encodingType?: string;
    variableOrder?: number | null;
    weight?: number | null;
    useYn?: string;
    regUserId?: string;
}

// 수정 요청
export interface VariableUpdateRequest {
    modelId: string;
    variableId: string;
    variableNm: string;
    variableGroup: string;
    variableType: string;
    encodingType?: string;
    variableOrder?: number | null;
    weight?: number | null;
    useYn?: string;
    updUserId?: string;
}
