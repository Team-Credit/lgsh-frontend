/**
 * 대시보드 API 서비스
 */
import api from './api';
import axios from 'axios';
import type {
  Widget,
  DashboardConfig,
  DashboardConfigRequest,
  WidgetData,
  DashboardLayoutItem,
  DashboardSettings,
  AllWidgetDataResponse,
} from '@/types/dashboard';

const BASE_URL = '/dashboard';

const YEAR_MONTH_RE = /^\d{6}$/;

const normalizeYearMonth = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return YEAR_MONTH_RE.test(trimmed) ? trimmed : null;
};

export const dashboardService = {
  /**
   * 위젯 목록 조회
   */
  async getWidgets(widgetType?: string, useYn: string = 'Y'): Promise<Widget[]> {
    const params = new URLSearchParams();
    if (widgetType) params.append('widgetType', widgetType);
    params.append('useYn', useYn);

    const response = await api.get(`${BASE_URL}/widgets?${params.toString()}`);
    return response.data.data;
  },

  /**
   * 사용자 대시보드 설정 조회
   */
  async getConfig(): Promise<DashboardConfig> {
    const response = await api.get(`${BASE_URL}/config`);
    return response.data.data;
  },

  /**
   * 사용자 대시보드 설정 저장
   */
  async saveConfig(request: DashboardConfigRequest): Promise<void> {
    await api.put(`${BASE_URL}/config`, request);
  },

  /**
   * 사용자 대시보드 설정 초기화
   */
  async resetConfig(): Promise<DashboardConfig> {
    const response = await api.delete(`${BASE_URL}/config`);
    return response.data.data;
  },

  /**
   * 위젯 데이터 조회
   * @param widgetId 위젯 ID
   * @param yearMonth 년월 (선택)
   * @param refresh true이면 캐시 무시하고 새로 조회 (기본값: false)
   */
  async getWidgetData<T = unknown>(
    widgetId: string,
    yearMonth?: string,
    refresh: boolean = false
  ): Promise<WidgetData<T>> {
    const params = new URLSearchParams();
    if (yearMonth) params.append('yearMonth', yearMonth);
    if (refresh) params.append('refresh', 'true');

    const queryString = params.toString();
    const url = `${BASE_URL}/widgets/${widgetId}/data${queryString ? `?${queryString}` : ''}`;
    const batchRunning = (() => {
      try {
        const raw = localStorage.getItem('credit_batch_in_progress');
        if (!raw) return false;
        const saved = JSON.parse(raw);
        const batch = saved?.batchResult;
        return !!(batch && batch.batchId && batch.runId);
      } catch {
        return false;
      }
    })();
    const response = await api.get(url, {
      headers: {
        'X-Credit-Batch-Running': batchRunning ? 'true' : 'false',
      },
    });
    return response.data.data;
  },

  /**
   * 역할별 기본 레이아웃 조회
   */
  async getRoleDefaultLayout(roleId: string): Promise<DashboardLayoutItem[]> {
    const response = await api.get(`${BASE_URL}/roles/${roleId}/layout`);
    return response.data.data;
  },

  /**
   * 대시보드 시스템 설정 조회
   */
  async getSettings(): Promise<DashboardSettings> {
    const response = await api.get(`${BASE_URL}/settings`);
    return response.data.data;
  },

  /**
   * 마지막 평가 년월 조회
   * - 가장 최근 평가가 이루어진 년월을 반환
   */
  async getLastEvalMonth(): Promise<string> {
    try {
      const response = await api.get(`${BASE_URL}/last-eval-month`);
      const candidate =
        normalizeYearMonth(response?.data?.data?.lastEvalMonth) ||
        normalizeYearMonth(response?.data?.lastEvalMonth) ||
        normalizeYearMonth(response?.data?.data);

      if (candidate) {
        return candidate;
      }
      throw new Error('Invalid lastEvalMonth response format');
    } catch (primaryError) {
      try {
        // Fallback for environments where /last-eval-month is unavailable.
        const bulk = await api.get(`${BASE_URL}/widgets/data/all`);
        const all = bulk?.data?.data;
        const candidate =
          normalizeYearMonth(all?.WGT_STAT_EVAL_CNT?.data?.yearMonth) ||
          normalizeYearMonth(all?.WGT_STAT_AVG_SCORE?.data?.yearMonth) ||
          normalizeYearMonth(all?.WGT_STAT_EVAL_DIFF?.data?.yearMonth);

        if (candidate) {
          return candidate;
        }
      } catch {
        // Ignore fallback error and rethrow enriched primary error below.
      }

      if (axios.isAxiosError(primaryError)) {
        const status = primaryError.response?.status ?? 'NO_RESPONSE';
        const url = primaryError.config?.url ?? `${BASE_URL}/last-eval-month`;
        const code = primaryError.code ?? 'UNKNOWN';
        throw new Error(`getLastEvalMonth failed (${status}, ${code}, ${url})`);
      }
      throw primaryError;
    }
  },

  /**
   * 모든 위젯 데이터 벌크 조회
   * - yearMonth가 없거나 마지막 평가 년월과 같으면: 캐시에서 조회 (빠름)
   * - yearMonth가 다르면: 원본 테이블에서 직접 조회
   * @param yearMonth 조회할 년월 (선택, YYYYMM 형식)
   */
  async getAllWidgetData(yearMonth?: string): Promise<AllWidgetDataResponse> {
    const params = new URLSearchParams();
    if (yearMonth) params.append('yearMonth', yearMonth);

    const queryString = params.toString();
    const url = `${BASE_URL}/widgets/data/all${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return response.data.data;
  },
};

export default dashboardService;
