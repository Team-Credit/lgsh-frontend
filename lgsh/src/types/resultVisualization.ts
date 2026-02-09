export interface ResultVisualizationRow {
  personId: string;
  personNm?: string;
  creditScore?: number;
  creditGrade?: string;
  scoreDt?: string;
  marriageYn?: string;
  childrenCnt?: number;
  educationCode?: string;
  homeTypeCode?: string;
  carYn?: string;
  assetAmt?: number;
  debtAmt?: number;
  creditCardCnt?: number;
  annualIncome?: number;
  notes?: string;
}

export interface ResultVisualizationResponse {
  modelId: string | null;
  modelNm: string | null;
  deployedDt: string | null;
  totalCount: number;
  rows: ResultVisualizationRow[];
}

export interface ResultVisualizationRequestParams {
  modelId?: string;
  maxRows?: number;
}
