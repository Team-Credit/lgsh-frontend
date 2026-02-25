/**
 * 위젯 컨테이너 컴포넌트
 */
import React, { useEffect } from 'react';
import { Card, Spin, Button, Tooltip, Empty } from 'antd';
import { ReloadOutlined, CloseOutlined } from '@ant-design/icons';
import { useDashboardStore } from '@/stores/dashboardStore';
import type {
  DashboardLayoutItem,
  StatCardData,
  ChartData,
  ListData,
  RecentEvalItem,
  AlertPersonItem,
  NoticeItem,
  ModelInfo,
} from '@/types/dashboard';
import StatCardWidget from './widgets/StatCardWidget';
import ChartWidget from './widgets/ChartWidget';
import ListWidget from './widgets/ListWidget';
import InfoWidget from './widgets/InfoWidget';
import './WidgetContainer.css';

interface WidgetContainerProps {
  widget: DashboardLayoutItem;
  isEditMode: boolean;
}

const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  isEditMode,
}) => {
  const { widgetDataCache, loadWidgetData, refreshWidgetData, toggleWidget } = useDashboardStore();

  const widgetData = widgetDataCache[widget.widgetId];
  const isLoading = widgetData?.loading ?? true;
  const error = widgetData?.error;
  const data = widgetData?.data;

  // 데이터 로드
  useEffect(() => {
    if (!widgetData) {
      loadWidgetData(widget.widgetId);
    }
  }, [widget.widgetId, widgetData, loadWidgetData]);

  // 새로고침 핸들러
  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    refreshWidgetData(widget.widgetId);
  };

  // 제거 핸들러
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWidget(widget.widgetId, false);
  };

  // 위젯 유형별 컴포넌트 렌더링
  const renderWidgetContent = () => {
    if (isLoading) {
      return (
        <div className="widget-loading">
          <Spin size="small" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="widget-error">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={error}
          />
        </div>
      );
    }

    if (!data) {
      return (
        <div className="widget-empty">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="데이터 없음"
          />
        </div>
      );
    }

    switch (widget.widgetType) {
      case 'STAT_CARD':
        return <StatCardWidget data={data as StatCardData} widget={widget} />;
      case 'CHART':
        return <ChartWidget data={data as ChartData} widget={widget} />;
      case 'LIST':
        return <ListWidget data={data as ListData<RecentEvalItem | AlertPersonItem | NoticeItem>} widget={widget} />;
      case 'INFO':
        return <InfoWidget data={data as ModelInfo} widget={widget} />;
      default:
        return <div>알 수 없는 위젯 유형</div>;
    }
  };

  const cardExtra = (
    <div className="widget-actions">
      <Tooltip title="새로고침">
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined spin={isLoading} />}
          onClick={handleRefresh}
        />
      </Tooltip>
      {isEditMode && (
        <Tooltip title="제거">
          <Button
            type="text"
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={handleRemove}
          />
        </Tooltip>
      )}
    </div>
  );

  return (
    <Card
      className={`widget-card ${isEditMode ? 'edit-mode' : ''} widget-type-${widget.widgetType.toLowerCase()}`}
      title={widget.widgetNm}
      extra={cardExtra}
      size="small"
      variant="borderless"
    >
      {renderWidgetContent()}
    </Card>
  );
};

export default WidgetContainer;
