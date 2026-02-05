/**
 * 대시보드 API 서비스
 */
import api from './api';
import type {
  Widget,
  DashboardConfig,
  DashboardConfigRequest,
  WidgetData,
  DashboardLayoutItem,
  DashboardSettings,
} from '@/types/dashboard';

const BASE_URL = '/dashboard';

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
};

export default dashboardService;
