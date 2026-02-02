/**
 * 대시보드 타입 정의
 */

// 위젯 유형
export type WidgetType = 'STAT_CARD' | 'CHART' | 'LIST' | 'INFO';

// 차트 유형
export type ChartType = 'PIE' | 'BAR' | 'LINE' | 'AREA';

// 비교 방향
export type ComparisonDirection = 'UP' | 'DOWN' | 'SAME';

// 비교 유형
export type ComparisonType = 'MOM' | 'YOY' | 'WOW';

// 위젯 정의 (서버에서 조회)
export interface Widget {
  widgetId: string;
  widgetNm: string;
  widgetNmEn?: string;
  widgetType: WidgetType;
  widgetDesc?: string;
  dataApiUrl: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  refreshInterval: number;
  iconNm?: string;
  sortOrder?: number;
}

// 레이아웃 아이템 (react-grid-layout 호환)
export interface LayoutItem {
  i: string;          // widgetId
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;   // 편집 모드가 아닐 때 true
}

// 대시보드 레이아웃 아이템 (서버 응답)
export interface DashboardLayoutItem {
  widgetId: string;
  widgetNm: string;
  widgetNmEn?: string;
  widgetType: WidgetType;
  widgetDesc?: string;
  dataApiUrl: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  maxW: number;
  maxH: number;
  visible: boolean;
  refreshInterval: number;
  iconNm?: string;
  sortOrder?: number;
}

// 사용자 대시보드 설정
export interface DashboardConfig {
  isCustomized: boolean;
  layout: DashboardLayoutItem[];
  refreshInterval: number;
}

// 설정 저장 요청
export interface DashboardConfigRequest {
  layout: {
    widgetId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    visible: boolean;
  }[];
}

// 위젯 데이터 (공통)
export interface WidgetData<T = unknown> {
  widgetId: string;
  data: T;
  updatedAt: string;
  loading?: boolean;
  error?: string;
}

// 통계 카드 데이터
export interface StatCardData {
  value: number;
  unit: string;
  yearMonth?: string;  // 조회된 년월 (YYYYMM)
  comparison?: {
    type: ComparisonType;
    value: number;
    direction: ComparisonDirection;
  };
}

// 차트 아이템
export interface ChartItem {
  name: string;
  value: number;
  color?: string;
  [key: string]: unknown;
}

// 차트 데이터
export interface ChartData {
  chartType: ChartType;
  chartData: ChartItem[];
}

// 최근 평가 아이템
export interface RecentEvalItem {
  personId: string;
  personNm: string;
  score: number;
  grade: string;
  evalDt: string;
}

// 주의 대상자 아이템
export interface AlertPersonItem {
  personId: string;
  personNm: string;
  score: number;
  grade: string;
  alertType: string;
}

// 공지사항 아이템
export interface NoticeItem {
  noticeId: number;
  title: string;
  noticeLevel: string;
  regDt: string;
}

// 모델 정보
export interface ModelInfo {
  modelId: string;
  modelNm: string;
  modelVersion: string;
  modelStatus: string;
  algorithmType?: string;      // 알고리즘 코드 (LOGISTIC, RF, XGB 등)
  algorithmTypeNm?: string;    // 알고리즘 명칭 (로지스틱 회귀, 랜덤포레스트 등)
  aucScore?: number;           // AUC 성능지표
  deployDt: string;
}

// 목록 데이터
export interface ListData<T> {
  items: T[];
  totalCount: number;
  displayCount: number;
}

// 위젯 데이터 캐시
export interface WidgetDataCache {
  [widgetId: string]: {
    data: unknown;
    updatedAt: Date;
    loading: boolean;
    error?: string;
  };
}

// 그리드 레이아웃 변경 이벤트
export interface LayoutChangeEvent {
  layout: LayoutItem[];
}

// 대시보드 시스템 설정
export interface DashboardSettings {
  autoRefreshEnabled: boolean;
  refreshInterval: number;
  minWidgetCount: number;
  maxWidgetCount: number;
}
