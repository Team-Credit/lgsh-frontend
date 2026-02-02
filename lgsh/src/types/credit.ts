/**
 * 신용평가 타입 정의
 */

export type CreditRunMode = 'single' | 'group' | 'all';

export interface CreditPredictRequest {
  mode?: CreditRunMode;
  personId?: string;
  userId?: string;
  modelId: string;
  batchDesc: string;
  chunkSize?: number;
  useCelery?: boolean;
}

export interface CreditPredictResult {
  evalId: string;
  creditScore: number;
  creditGrade: string;
  itemScores: Record<string, number>;
}

export interface CreditBatchRunResult {
  batchId: string;
  mode: CreditRunMode;
  runStart: string;
  userId: string;
  personGrp?: string | null;
  runId: string;
  modelMetrics?: {
    auc?: number;
    ks_stat?: number;
    ar?: number;
  };
  trainingDataCnt?: number;
}

export interface CreditBatchStatus {
  batchId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  totalCount: number;
  processedCount: number;
  successCount: number;
  failCount: number;
  startedAt?: string;
  endedAt?: string;
}

export interface CreditDistributionStats {
  average: number;
  median: number;
  max: number;
  min: number;
  stddev: number;
}

export interface CreditDistributionResult {
  gradeCounts: Record<string, number>;
  stats: CreditDistributionStats;
}

export interface CreditCorrelationPair {
  var1: string;
  var2: string;
  corrCoef: number;
  sampleCount: number;
}

export interface CreditCorrelationResult {
  modelId?: string;
  variables: string[];
  correlationMatrix: number[][];
  stabilityMatrix?: number[][] | null;
  pairs: CreditCorrelationPair[];
  sampleCount: number;
}

export interface CreditBasicStatsVariable {
  name: string;
  displayName?: string | null;
  count: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  stddev: number | null;
}

export interface CreditBasicStatsResult {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  totalRows: number;
  variables: CreditBasicStatsVariable[];
}

export interface CreditMissingPatternItem {
  rownum?: number | string;
  variableName?: string;
  totalCount?: number;
  missingCount?: number;
  missingRate?: number;
  missingStatus?: string | null;
}

export interface CreditMissingPatternResult {
  items?: CreditMissingPatternItem[];
  list?: CreditMissingPatternItem[];
  rows?: CreditMissingPatternItem[];
}

export interface CreditOutlierItem {
  personId?: string;
  personName?: string;
  variableValue?: number;
  zScore?: number;
  isOutlier?: boolean;
}

export interface CreditOutlierSummary {
  totalCount?: number;
  outlierCount?: number;
  method?: string;
  threshold?: number;
}

export interface CreditOutlierResult {
  outliers?: CreditOutlierItem[];
  list?: CreditOutlierItem[];
  rows?: CreditOutlierItem[];
  summary?: CreditOutlierSummary | null;
}
