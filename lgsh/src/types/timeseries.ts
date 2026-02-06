export interface TsSnapshotSummary {
  snapshotMonth: string;
  popCnt: number;
  scoreAvg?: number | null;
  scoreP50?: number | null;
  scoreP10?: number | null;
  scoreP90?: number | null;
  gradeCntJson?: string | null;
  newCnt?: number | null;
  churnCnt?: number | null;
}

export interface TsScoreBin {
  binNo: number;
  binMin?: number | null;
  binMax?: number | null;
  binCnt: number;
  binRate?: number | null;
}

export interface TsFeatureStats {
  snapshotMonth: string;
  missingRate?: number | null;
  zeroRate?: number | null;
  mean?: number | null;
  std?: number | null;
  min?: number | null;
  p01?: number | null;
  p05?: number | null;
  p50?: number | null;
  p95?: number | null;
  p99?: number | null;
  max?: number | null;
  outlierRate?: number | null;
}

export interface TsPsiPoint {
  snapshotMonth: string;
  psiValue?: number | null;
  detailJson?: string | null;
}

export interface TsMigration {
  matrixJson?: string | null;
  scoreDeltaStatsJson?: string | null;
  upgradeRate?: number | null;
  downgradeRate?: number | null;
  stayRate?: number | null;
}
