export type ScenarioItem = {
  key: string;
  label: string;
  desc: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  mode: 'percent' | 'count' | 'point';
  defaultValue: number;
};

export const SIMULATION_SCENARIO_CONFIG: ScenarioItem[] = [
  {
    key: 'repay_increase',
    label: '대출상환 증가',
    desc: '최근 3~6개월 상환액 증가 (원금/이자 감소 반영)',
    unit: '%',
    min: -30,
    max: 50,
    step: 5,
    mode: 'percent',
    defaultValue: 0,
  },
  {
    key: 'loan_balance_increase',
    label: '대출잔액 증가',
    desc: '평균 잔액 증가 및 한도 일부 증가',
    unit: '%',
    min: -30,
    max: 50,
    step: 5,
    mode: 'percent',
    defaultValue: 0,
  },
  {
    key: 'loan_rate_change',
    label: '대출금리 변화',
    desc: '금리 포인트 변화 및 이자지급액 반영',
    unit: 'p',
    min: -3,
    max: 5,
    step: 0.5,
    mode: 'point',
    defaultValue: 0,
  },
  {
    key: 'new_loan_count',
    label: '신규 대출발생',
    desc: '최근 1~6개월 신규대출 건수',
    unit: '건',
    min: 0,
    max: 5,
    step: 1,
    mode: 'count',
    defaultValue: 0,
  },
  {
    key: 'card_usage_3m',
    label: '3개월 카드 사용 증가',
    desc: '일시불/할부/현금서비스 사용액 반영',
    unit: '%',
    min: -30,
    max: 50,
    step: 5,
    mode: 'percent',
    defaultValue: 0,
  },
  {
    key: 'card_usage_6m',
    label: '6개월 카드 사용 증가',
    desc: '장기 카드 사용액 반영',
    unit: '%',
    min: -30,
    max: 50,
    step: 5,
    mode: 'percent',
    defaultValue: 0,
  },
  {
    key: 'cash_advance_ratio',
    label: '현금서비스 비중 증가',
    desc: '현금서비스 비중 포인트 변화',
    unit: 'p',
    min: -10,
    max: 20,
    step: 1,
    mode: 'point',
    defaultValue: 0,
  },
  {
    key: 'new_card_issue',
    label: '신규 카드 발급',
    desc: '최근 신규 카드 발급 건수',
    unit: '건',
    min: 0,
    max: 5,
    step: 1,
    mode: 'count',
    defaultValue: 0,
  },
  {
    key: 'card_count_change',
    label: '보유 카드 수 변화',
    desc: '보유 카드 수 및 12개월 변화',
    unit: '건',
    min: -3,
    max: 5,
    step: 1,
    mode: 'count',
    defaultValue: 0,
  },
  {
    key: 'card_limit_change',
    label: '카드 한도 변화',
    desc: '카드 한도 증가/감소 및 사용률 반영',
    unit: '%',
    min: -30,
    max: 50,
    step: 5,
    mode: 'percent',
    defaultValue: 0,
  },
];

const normalizeScenarioKey = (value: string): string => {
  const trimmed = value.trim();
  const snakeLike = trimmed
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
  return snakeLike;
};

const scenarioLabelMap = SIMULATION_SCENARIO_CONFIG.reduce<Record<string, string>>((acc, item) => {
  acc[item.key] = item.label;
  acc[normalizeScenarioKey(item.key)] = item.label;
  return acc;
}, {});

export const getSimulationScenarioLabel = (key?: string): string => {
  if (!key) return '항목';
  const normalizedKey = normalizeScenarioKey(key);
  return scenarioLabelMap[key] || scenarioLabelMap[normalizedKey] || key;
};
