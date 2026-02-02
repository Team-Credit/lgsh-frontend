/**
 * 모델관리 타입 정의
 * 기존 테이블 구조에 맞게 수정됨
 */

// 신용평가 모델
export interface CreditModel {
  modelId: string;
  companyId: string;
  companyNm?: string;
  modelNm: string;
  modelType: ModelType;
  modelTypeNm?: string;
  modelVersion: string;
  algorithmType: AlgorithmType;
  algorithmTypeNm?: string;
  modelFilePath?: string;

  // 성능 지표
  trainingDataCnt?: number;
  aucScore?: number;
  ksStat?: number;
  ar?: number;

  // JSON 데이터
  evalReportJson?: string;
  featureListJson?: string;

  // 상태 정보
  approvalStatus: ApprovalStatus;
  approvalStatusNm?: string;
  approvedDt?: string;
  deployedDt?: string;
  retiredDt?: string;

  // 공통 필드
  useYn?: string;
  regUserId?: string;
  regDt?: string;
  updUserId?: string;
  updDt?: string;
}

// 모델 유형
export type ModelType = 'MAIN' | 'CHALLENGER' | 'REFERENCE';

// 알고리즘 유형
export type AlgorithmType = 'LOGISTIC' | 'XGBOOST' | 'TABNET';

// 승인 상태 (기존 테이블 기준)
export type ApprovalStatus = 'DRAFT' | 'APPROVED' | 'DEPLOYED' | 'TRAINING' | 'READY' | 'ARCHIVED' | 'FAILED';

// 모델 변수
export interface ModelVariable {
  variableSeq: number;
  modelId: string;
  variableNm: string;
  variableType?: 'NUMERIC' | 'CATEGORICAL';
  encodingType: 'WOE' | 'ONE-HOT' | 'EMBEDDING';
  variableOrder?: number;
  weight?: number;
  useYn?: string;
  regUserId?: string;
  regDt?: string;
  updUserId?: string;
  updDt?: string;
}

// 변경 이력
export interface ModelChangeHist {
  changeSeq: number;
  modelId: string;
  changeType: string;
  changeTypeNm?: string;
  changeReason?: string;
  beforeStatus?: string;
  afterStatus: string;
  changeUserId: string;
  changeDt: string;
}

// 모델 목록 응답
export interface ModelListResponse {
  modelId: string;
  companyId: string;
  companyNm?: string;
  modelNm: string;
  modelType: ModelType;
  modelTypeNm?: string;
  modelVersion: string;
  algorithmType: AlgorithmType;
  algorithmTypeNm?: string;
  approvalStatus: ApprovalStatus;
  approvalStatusNm?: string;
  aucScore?: number;
  ksStat?: number;
  ar?: number;
  trainingDataCnt?: number;
  deployedDt?: string;
  regUserId?: string;
  regDt?: string;
}

// 모델 상세 응답
export interface ModelDetailResponse extends CreditModel {
  variables?: ModelVariable[];
  changeHistory?: ModelChangeHist[];
}

// 모델 검색 파라미터
export interface ModelSearchParams {
  companyId?: string;
  algorithmType?: string;
  modelType?: string;
  approvalStatus?: string;
  keyword?: string;
  page?: number;
  size?: number;
}

// 모델 등록 요청
export interface ModelCreateRequest {
  modelNm: string;
  modelType: ModelType;
  algorithmType: AlgorithmType;
  hyperParameters?: Record<string, unknown>;
}

// 모델 수정 요청
export interface ModelUpdateRequest {
  modelNm: string;
  modelType: ModelType;
  algorithmType: AlgorithmType;
}

// 모델 학습 설정
export interface TrainingConfig {
  testSize?: number;
  randomState?: number;
  crossValidation?: number;
}

// 모델 학습 요청
export interface ModelTrainRequest {
  modelId: string;
  trainingConfig?: TrainingConfig;
}

// 학습 단계
export interface TrainStep {
  step: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  duration?: number;
}

// 학습 상태 응답
export interface ModelTrainStatusResponse {
  modelId: string;
  modelNm: string;
  approvalStatus: ApprovalStatus;
  approvalStatusNm?: string;
  progress: number;
  currentStep?: string;
  steps?: TrainStep[];
  trainingStartDt?: string;
  estimatedEndDt?: string;
  errorMessage?: string;
}

// 모델 배포 요청
export interface ModelDeployRequest {
  deployReason?: string;
}

// 하이퍼파라미터 타입 (알고리즘별) - Django AI Engine 연동용
export interface LogisticHyperParams {
  C?: number;
  maxIter?: number;
  solver?: string;
}

export interface XGBoostHyperParams {
  maxDepth?: number;
  learningRate?: number;
  nEstimators?: number;
  minChildWeight?: number;
  subsample?: number;
  colsampleBytree?: number;
}

export interface TabNetHyperParams {
  nSteps?: number;
  nD?: number;
  nA?: number;
  gamma?: number;
  nIndependent?: number;
  nShared?: number;
}

export type HyperParameters = LogisticHyperParams | XGBoostHyperParams | TabNetHyperParams;
