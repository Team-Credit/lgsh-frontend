/**
 * 대시보드 메인 페이지
 * - 사용자별 커스터마이징 가능한 위젯 기반 대시보드
 * - react-grid-layout 사용
 */
import React, { useEffect, useCallback, useState } from 'react';
import { Spin, Alert, Modal, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboardStore } from '@/stores/dashboardStore';
import DashboardToolbar from './components/DashboardToolbar';
import WidgetContainer from './components/WidgetContainer';
import WidgetSelector from './components/WidgetSelector';
import type { LayoutItem, DashboardLayoutItem } from '@/types/dashboard';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const {
    config,
    settings,
    isEditMode,
    isLoading,
    error,
    hasUnsavedChanges,
    selectedYearMonth,
    lastEvalMonth,
    isLoadingYearMonth,
    loadConfig,
    loadSettings,
    updateLayout,
    setEditMode,
    saveConfig,
    cancelEdit,
    resetConfig,
    loadAllWidgets,
    refreshAllWidgets,
    autoArrangeWidgets,
    loadLastEvalMonth,
    setSelectedYearMonth,
  } = useDashboardStore();

  const [widgetSelectorOpen, setWidgetSelectorOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);

  // 초기 로드
  useEffect(() => {
    loadConfig();
    loadSettings();
    loadLastEvalMonth();
  }, [loadConfig, loadSettings, loadLastEvalMonth]);

  // 위젯 데이터 자동 갱신
  useEffect(() => {
    if (!config) return;

    // 초기 데이터 로드 (캐시에서 조회 - 빠름)
    loadAllWidgets();

    // 자동 갱신이 비활성화되었거나 주기가 0이면 갱신 안함
    if (!settings.autoRefreshEnabled || settings.refreshInterval <= 0) {
      return;
    }

    // 환경설정에서 가져온 주기로 자동 갱신 (초 단위 -> 밀리초 변환)
    // 캐시에서 조회하므로 빠름 (원본 테이블 조회 X)
    const interval = setInterval(() => {
      if (!isEditMode) {
        loadAllWidgets();
      }
    }, settings.refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [config, settings.autoRefreshEnabled, settings.refreshInterval, isEditMode, loadAllWidgets]);

  // 컨테이너 너비 계산
  useEffect(() => {
    const updateWidth = () => {
      const container = document.querySelector('.dashboard-content-area');
      if (container) {
        setContainerWidth(container.clientWidth - 32);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 레이아웃 변경 핸들러
  const handleLayoutChange = useCallback(
    (newLayout: unknown) => {
      if (isEditMode && Array.isArray(newLayout)) {
        const layoutItems: LayoutItem[] = (newLayout as Layout[]).map((l) => ({
          i: l.i,
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
        }));
        updateLayout(layoutItems);
      }
    },
    [isEditMode, updateLayout]
  );

  // 편집 모드 토글
  const handleEditToggle = () => {
    if (isEditMode && hasUnsavedChanges) {
      Modal.confirm({
        title: '변경사항 저장',
        icon: <ExclamationCircleOutlined />,
        content: '저장하지 않은 변경사항이 있습니다. 저장하시겠습니까?',
        okText: '저장',
        cancelText: '저장 안함',
        onOk: saveConfig,
        onCancel: cancelEdit,
      });
    } else {
      setEditMode(!isEditMode);
    }
  };

  // 저장 핸들러
  const handleSave = async () => {
    await saveConfig();
  };

  // 취소 핸들러
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Modal.confirm({
        title: '변경 취소',
        icon: <ExclamationCircleOutlined />,
        content: '변경사항이 저장되지 않습니다. 취소하시겠습니까?',
        okText: '확인',
        cancelText: '돌아가기',
        onOk: cancelEdit,
      });
    } else {
      cancelEdit();
    }
  };

  // 초기화 핸들러
  const handleReset = () => {
    Modal.confirm({
      title: '대시보드 초기화',
      icon: <ExclamationCircleOutlined />,
      content: '대시보드 설정을 기본값으로 초기화하시겠습니까?',
      okText: '초기화',
      cancelText: '취소',
      okButtonProps: { danger: true },
      onOk: resetConfig,
    });
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    refreshAllWidgets();
    message.success('데이터가 새로고침되었습니다.');
  };

  // 그리드 레이아웃 생성
  const gridLayout: Layout[] = config
    ? config.layout
        .filter((item: DashboardLayoutItem) => item.visible)
        .map((item: DashboardLayoutItem) => ({
          i: item.widgetId,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          minW: item.minW,
          minH: item.minH,
          maxW: item.maxW,
          maxH: item.maxH,
          static: !isEditMode,
        }))
    : [];

  if (isLoading && !config) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" tip="대시보드를 불러오는 중..." />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="dashboard-error">
        <Alert
          message="오류"
          description={error}
          type="error"
          showIcon
          action={
            <button onClick={() => loadConfig()} className="retry-button">
              다시 시도
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <DashboardToolbar
        isEditMode={isEditMode}
        hasUnsavedChanges={hasUnsavedChanges}
        selectedYearMonth={selectedYearMonth}
        lastEvalMonth={lastEvalMonth}
        isLoadingYearMonth={isLoadingYearMonth}
        onEditToggle={handleEditToggle}
        onSave={handleSave}
        onCancel={handleCancel}
        onReset={handleReset}
        onRefresh={handleRefresh}
        onWidgetSelect={() => setWidgetSelectorOpen(true)}
        onAutoArrange={autoArrangeWidgets}
        onYearMonthChange={setSelectedYearMonth}
      />

      <div className="dashboard-content-area">
        {config && config.layout.filter((item: DashboardLayoutItem) => item.visible).length === 0 ? (
          <div className="dashboard-empty">
            <Alert
              message="표시할 위젯이 없습니다"
              description="편집 버튼을 눌러 표시할 위젯을 선택해주세요."
              type="info"
              showIcon
            />
          </div>
        ) : (
          /* @ts-ignore */
          <GridLayout
            className={`dashboard-grid ${isEditMode ? 'edit-mode' : ''}`}
            layout={gridLayout}
            cols={12}
            rowHeight={120}
            width={containerWidth}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            onLayoutChange={handleLayoutChange}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            compactType="vertical"
            preventCollision={false}
            useCSSTransforms={true}
          >
            {config?.layout
              .filter((item: DashboardLayoutItem) => item.visible)
              .map((item: DashboardLayoutItem) => (
                <div key={item.widgetId} className="widget-wrapper">
                  <WidgetContainer
                    widget={item}
                    isEditMode={isEditMode}
                  />
                </div>
              ))}
          </GridLayout>
        )}
      </div>

      <WidgetSelector
        open={widgetSelectorOpen}
        onClose={() => setWidgetSelectorOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;
