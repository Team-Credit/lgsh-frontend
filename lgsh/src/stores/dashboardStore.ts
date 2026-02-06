/**
 * 대시보드 상태 관리(Zustand)
 */
import { create } from 'zustand';
import type {
  DashboardConfig,
  DashboardLayoutItem,
  LayoutItem,
  WidgetDataCache,
  Widget,
  DashboardSettings,
} from '@/types/dashboard';
import { dashboardService } from '@/services/dashboardService';
import { message } from 'antd';

// 기본 설정값
const DEFAULT_SETTINGS: DashboardSettings = {
  autoRefreshEnabled: true,
  refreshInterval: 60,
  minWidgetCount: 4,
  maxWidgetCount: 8,
};
const FALLBACK_CONFIG: DashboardConfig = {
  isCustomized: false,
  layout: [],
  refreshInterval: DEFAULT_SETTINGS.refreshInterval,
};

const CREDIT_BATCH_STORAGE_KEY = 'credit_batch_in_progress';

export const isCreditBatchRunning = (): boolean => {
  try {
    const raw = localStorage.getItem(CREDIT_BATCH_STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    const batch = saved?.batchResult;
    return !!(batch && batch.batchId && batch.runId);
  } catch {
    return false;
  }
};


interface DashboardState {
  // 상태
  config: DashboardConfig | null;
  settings: DashboardSettings;
  widgetDataCache: WidgetDataCache;
  isEditMode: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  // 년월 관련 상태
  selectedYearMonth: string | null;  // 선택된 년월 (YYYYMM)
  lastEvalMonth: string | null;      // 마지막 평가 년월 (기본값)
  isLoadingYearMonth: boolean;       // 년월 로딩 중 여부

  // Actions
  loadConfig: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveConfig: () => Promise<void>;
  resetConfig: () => Promise<void>;
  setEditMode: (mode: boolean) => void;
  updateLayout: (layout: LayoutItem[]) => void;
  toggleWidget: (widgetId: string, visible: boolean, widgetInfo?: Widget) => void;
  loadWidgetData: (widgetId: string, yearMonth?: string, refresh?: boolean) => Promise<void>;
  loadAllWidgets: () => Promise<void>;
  refreshAllWidgets: () => Promise<void>;
  refreshWidgetData: (widgetId: string, yearMonth?: string) => Promise<void>;
  cancelEdit: () => void;
  autoArrangeWidgets: () => void;
  // 년월 관련 Actions
  loadLastEvalMonth: () => Promise<void>;
  setSelectedYearMonth: (yearMonth: string | null) => void;
  // 스토어 초기화 (유저 변경 시)
  resetStore: () => void;
}

// 원본 레이아웃 저장(취소 시 복원용)
let originalLayout: DashboardLayoutItem[] | null = null;

export const useDashboardStore = create<DashboardState>((set, get) => ({
  config: null,
  settings: DEFAULT_SETTINGS,
  widgetDataCache: {},
  isEditMode: false,
  isLoading: false,
  isSaving: false,
  error: null,
  hasUnsavedChanges: false,
  // 년월 관련 초기 상태
  selectedYearMonth: null,
  lastEvalMonth: null,
  isLoadingYearMonth: false,

  loadConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await dashboardService.getConfig();
      set({ config, isLoading: false });
      originalLayout = [...config.layout];
    } catch (error) {
      console.error('Dashboard config load failed:', error);
      set({
        config: FALLBACK_CONFIG,
        error: 'Failed to load dashboard config.',
        isLoading: false,
      });
      message.warning('Failed to load dashboard config. Using defaults.');
    }
  },

  loadSettings: async () => {
    try {
      const settings = await dashboardService.getSettings();
      set({ settings });
    } catch (error) {
      console.error('대시보드 설정 로드 실패:', error);
      // 실패 시 기본값 유지
    }
  },

  saveConfig: async () => {
    const { config } = get();
    if (!config) return;

    set({ isSaving: true });
    try {
      await dashboardService.saveConfig({
        layout: config.layout.map((item) => ({
          widgetId: item.widgetId,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          visible: item.visible,
        })),
      });
      set({ isSaving: false, isEditMode: false, hasUnsavedChanges: false });
      originalLayout = [...config.layout];
      message.success('대시보드 설정이 저장되었습니다.');
    } catch (error) {
      console.error('대시보드 설정 저장 실패:', error);
      set({ error: '저장에 실패했습니다.', isSaving: false });
      message.error('대시보드 설정 저장에 실패했습니다.');
    }
  },

  resetConfig: async () => {
    set({ isLoading: true });
    try {
      const config = await dashboardService.resetConfig();
      set({ config, isLoading: false, isEditMode: false, hasUnsavedChanges: false });
      originalLayout = [...config.layout];
      message.success('대시보드 설정이 초기화되었습니다.');
    } catch (error) {
      console.error('대시보드 설정 초기화 실패:', error);
      set({ error: '초기화에 실패했습니다.', isLoading: false });
      message.error('대시보드 설정 초기화에 실패했습니다.');
    }
  },

  setEditMode: (mode) => {
    if (mode && get().config) {
      originalLayout = [...get().config!.layout];
    }
    set({ isEditMode: mode });
  },

  updateLayout: (layout) => {
    const { config } = get();
    if (!config) return;

    const updatedLayout = config.layout.map((item) => {
      const updated = layout.find((l) => l.i === item.widgetId);
      if (updated) {
        return { ...item, x: updated.x, y: updated.y, w: updated.w, h: updated.h };
      }
      return item;
    });

    set({
      config: { ...config, layout: updatedLayout },
      hasUnsavedChanges: true,
    });
  },

  toggleWidget: (widgetId, visible, widgetInfo) => {
    const { config } = get();
    if (!config) return;

    const existingWidget = config.layout.find((item) => item.widgetId === widgetId);

    let updatedLayout: DashboardLayoutItem[];

    if (existingWidget) {
      // 기존 위젯의 visible 토글
      updatedLayout = config.layout.map((item) =>
        item.widgetId === widgetId ? { ...item, visible } : item
      );
    } else if (visible && widgetInfo) {
      // 새 위젯 추가 (레이아웃에 없는 경우)
      const maxY = Math.max(...config.layout.map((item) => item.y + item.h), 0);
      const newWidget: DashboardLayoutItem = {
        widgetId: widgetInfo.widgetId,
        widgetNm: widgetInfo.widgetNm,
        widgetNmEn: widgetInfo.widgetNmEn,
        widgetType: widgetInfo.widgetType,
        widgetDesc: widgetInfo.widgetDesc,
        dataApiUrl: widgetInfo.dataApiUrl,
        x: 0,
        y: maxY,
        w: widgetInfo.defaultWidth,
        h: widgetInfo.defaultHeight,
        minW: widgetInfo.minWidth,
        minH: widgetInfo.minHeight,
        maxW: widgetInfo.maxWidth,
        maxH: widgetInfo.maxHeight,
        visible: true,
        refreshInterval: widgetInfo.refreshInterval,
        iconNm: widgetInfo.iconNm,
        sortOrder: widgetInfo.sortOrder,
      };
      updatedLayout = [...config.layout, newWidget];
    } else {
      return; // 위젯 정보 없이 새 위젯 추가 불가
    }

    set({
      config: { ...config, layout: updatedLayout },
      hasUnsavedChanges: true,
    });
  },

  loadWidgetData: async (widgetId, yearMonth, refresh = false) => {
    if (isCreditBatchRunning()) return;
    set((state) => ({
      widgetDataCache: {
        ...state.widgetDataCache,
        [widgetId]: {
          ...state.widgetDataCache[widgetId],
          loading: true,
          error: undefined,
        },
      },
    }));

    try {
      const response = await dashboardService.getWidgetData(widgetId, yearMonth, refresh);
      set((state) => ({
        widgetDataCache: {
          ...state.widgetDataCache,
          [widgetId]: {
            data: response.data,
            updatedAt: new Date(),
            loading: false,
          },
        },
      }));
    } catch (error) {
      console.error(`위젯 데이터 로드 실패 (${widgetId}):`, error);
      set((state) => ({
        widgetDataCache: {
          ...state.widgetDataCache,
          [widgetId]: {
            ...state.widgetDataCache[widgetId],
            loading: false,
            error: '데이터를 불러올 수 없습니다.',
          },
        },
      }));
    }
  },

  /**
   * 마지막 평가 년월 로드
   */
  loadLastEvalMonth: async () => {
    set({ isLoadingYearMonth: true });
    try {
      const lastEvalMonth = await dashboardService.getLastEvalMonth();
      set({
        lastEvalMonth,
        selectedYearMonth: lastEvalMonth, // 기본값으로 설정
        isLoadingYearMonth: false,
      });
    } catch (error) {
      console.error('마지막 평가 년월 로드 실패:', error);
      // 실패 시 현재 월로 설정
      const currentMonth = new Date().toISOString().slice(0, 7).replace('-', '');
      set({
        lastEvalMonth: currentMonth,
        selectedYearMonth: currentMonth,
        isLoadingYearMonth: false,
      });
    }
  },

  /**
   * 선택된 년월 변경
   * - 년월 변경 시 자동으로 위젯 데이터 새로 로드
   */
  setSelectedYearMonth: (yearMonth: string | null) => {
    const { lastEvalMonth, selectedYearMonth: currentYearMonth } = get();
    const newYearMonth = yearMonth || lastEvalMonth;

    // 같은 년월이면 무시
    if (newYearMonth === currentYearMonth) return;

    set({ selectedYearMonth: newYearMonth });

    // 위젯 데이터 새로 로드
    get().loadAllWidgets();
  },

  /**
   * 모든 위젯 데이터 로드 (벌크 조회 - 성능 최적화)
   * - 자동 새로고침 주기에 사용
   * - 한 번의 API 호출로 모든 위젯 데이터를 조회 (DB 부하 감소)
   * - 선택된 년월에 따라 캐시 또는 원본 테이블에서 조회
   */
  loadAllWidgets: async () => {
    const { config, selectedYearMonth, lastEvalMonth } = get();
    if (!config) return;

    const visibleWidgets = config.layout.filter((item) => item.visible);
    if (visibleWidgets.length === 0) return;

    // 모든 위젯을 loading 상태로 변경
    const loadingCache: WidgetDataCache = {};
    visibleWidgets.forEach((widget) => {
      loadingCache[widget.widgetId] = {
        ...get().widgetDataCache[widget.widgetId],
        loading: true,
        error: undefined,
      };
    });
    set((state) => ({
      widgetDataCache: { ...state.widgetDataCache, ...loadingCache },
    }));

    try {
      // 선택된 년월이 기본값(마지막 평가 년월)과 다르면 yearMonth 파라미터 전달
      const yearMonthParam = selectedYearMonth !== lastEvalMonth ? selectedYearMonth : undefined;

      // 벌크 API로 한 번에 모든 위젯 데이터 조회
      const allData = await dashboardService.getAllWidgetData(yearMonthParam || undefined);

      // 캐시 업데이트
      const newCache: WidgetDataCache = {};
      visibleWidgets.forEach((widget) => {
        const widgetData = allData[widget.widgetId];
        if (widgetData) {
          newCache[widget.widgetId] = {
            data: widgetData.data,
            updatedAt: new Date(widgetData.updatedAt),
            loading: false,
          };
        } else {
          // 캐시에 없는 경우 기존 데이터 유지
          newCache[widget.widgetId] = {
            ...get().widgetDataCache[widget.widgetId],
            loading: false,
          };
        }
      });

      set((state) => ({
        widgetDataCache: { ...state.widgetDataCache, ...newCache },
      }));
    } catch (error) {
      console.error('위젯 데이터 벌크 조회 실패:', error);
      // 실패 시 개별 조회로 폴백
      await Promise.all(
        visibleWidgets.map((widget) => get().loadWidgetData(widget.widgetId, undefined, false))
      );
    }
  },

  /**
   * 모든 위젯 데이터 새로고침 (캐시 갱신)
   * - 수동 새로고침 버튼에 사용
   * - 원본 테이블에서 최신 데이터를 가져와 캐시 갱신
   */
  refreshAllWidgets: async () => {
    const { config } = get();
    if (!config) return;
    if (isCreditBatchRunning()) return;

    const visibleWidgets = config.layout.filter((item) => item.visible);
    const refresh = !isCreditBatchRunning();
    // refresh=true forces cache bypass and fetches fresh data.
    await Promise.all(
      visibleWidgets.map((widget) => get().loadWidgetData(widget.widgetId, undefined, refresh))
    );
  },

  /**
   * 특정 위젯 데이터 새로고침 (캐시 갱신)
   */
  refreshWidgetData: async (widgetId, yearMonth) => {
    if (isCreditBatchRunning()) return;
    const refresh = !isCreditBatchRunning();
    await get().loadWidgetData(widgetId, yearMonth, refresh);
  },

  cancelEdit: () => {
    const { config } = get();
    if (!config || !originalLayout) return;

    set({
      config: { ...config, layout: originalLayout },
      isEditMode: false,
      hasUnsavedChanges: false,
    });
  },

  autoArrangeWidgets: () => {
    const { config } = get();
    if (!config) return;

    const GRID_COLS = 12;

    // visible 위젯만 정렬 대상
    const visibleWidgets = config.layout
      .filter((item) => item.visible)
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

    // hidden 위젯은 그대로 유지
    const hiddenWidgets = config.layout.filter((item) => !item.visible);

    // 자동 배치 계산
    let currentX = 0;
    let currentY = 0;
    let rowMaxHeight = 0;

    const arrangedWidgets: DashboardLayoutItem[] = visibleWidgets.map((widget) => {
      // 기본 크기로 리셋 (minW, minH 또는 현재 크기 사용)
      const defaultW = widget.minW ?? Math.min(widget.w, 4);
      const defaultH = widget.minH ?? Math.min(widget.h, 2);

      // 현재 행에 안들어가면 다음 행으로
      if (currentX + defaultW > GRID_COLS) {
        currentX = 0;
        currentY += rowMaxHeight;
        rowMaxHeight = 0;
      }

      const newWidget = {
        ...widget,
        x: currentX,
        y: currentY,
        w: defaultW,
        h: defaultH,
      };

      // 다음 위젯 위치 계산
      currentX += defaultW;
      rowMaxHeight = Math.max(rowMaxHeight, defaultH);

      return newWidget;
    });

    set({
      config: {
        ...config,
        layout: [...arrangedWidgets, ...hiddenWidgets],
      },
      hasUnsavedChanges: true,
    });

    message.success('위젯이 자동 정렬되었습니다.');
  },

  /**
   * 스토어 초기화 (유저 변경 시)
   * - 모든 상태를 초기값으로 리셋
   * - 유저가 변경되면 이전 유저의 대시보드 데이터가 남아 있으면 안됨
   */
  resetStore: () => {
    originalLayout = null;
    set({
      config: null,
      settings: DEFAULT_SETTINGS,
      widgetDataCache: {},
      isEditMode: false,
      isLoading: false,
      isSaving: false,
      error: null,
      hasUnsavedChanges: false,
      selectedYearMonth: null,
      lastEvalMonth: null,
      isLoadingYearMonth: false,
    });
  },
}));

export default useDashboardStore;
