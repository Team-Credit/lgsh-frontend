export interface SimulationAdjustment {
  key: string;
  value: number;
  mode: string;
}

export interface SimulationBreakdown {
  key: string;
  inputValue: number;
  delta: number;
}

export interface SimulationRequest {
  personId: string;
  modelId?: string;
  runId?: string;
  adjustments: SimulationAdjustment[];
}

export interface SimulationResult {
  beforeScore: number;
  afterScore: number;
  delta: number;
  beforeGrade: string;
  afterGrade: string;
  appliedColumns: string[];
  breakdown: SimulationBreakdown[];
}

export interface SimulationSaveRequest {
  personId: string;
  modelId?: string;
  scenarioType: string;
  beforeScore: number;
  afterScore: number;
  scoreDiff: number;
  adjustments: SimulationAdjustment[];
  appliedColumns: string[];
  breakdown: SimulationBreakdown[];
  userId?: string;
}

export interface SimulationSaveResponse {
  simId: number;
}

export interface SimulationHistoryItem {
  simId: number;
  personId: string;
  personName: string;
  scenarioType: string;
  beforeScore: number;
  afterScore: number;
  scoreDiff: number;
  simDt: string;
  simScenario: string;
}

export interface SimulationHistoryResponse {
  items: SimulationHistoryItem[];
  page: number;
  size: number;
  total: number;
}
