/**
 * 위젯 선택 모달 컴포넌트
 */
import React, { useEffect, useState } from 'react';
import { Modal, Checkbox, Row, Col, Card, Typography, Tag, message } from 'antd';
import * as Icons from '@ant-design/icons';
import { useDashboardStore } from '@/stores/dashboardStore';
import { dashboardService } from '@/services/dashboardService';
import type { Widget, DashboardLayoutItem } from '@/types/dashboard';
import './WidgetSelector.css';

const { Text } = Typography;

interface WidgetSelectorProps {
  open: boolean;
  onClose: () => void;
}

const WidgetSelector: React.FC<WidgetSelectorProps> = ({ open, onClose }) => {
  const { config, settings, toggleWidget } = useDashboardStore();
  const [widgets, setWidgets] = useState<Widget[]>([]);

  const { minWidgetCount, maxWidgetCount } = settings;

  // 위젯 목록 로드
  useEffect(() => {
    if (open) {
      loadWidgets();
    }
  }, [open]);

  const loadWidgets = async () => {
    try {
      const data = await dashboardService.getWidgets();
      setWidgets(data);
    } catch (error) {
      console.error('위젯 목록 로드 실패:', error);
      message.error('위젯 목록을 불러올 수 없습니다.');
    }
  };

  // 위젯 선택 상태 확인
  const isWidgetSelected = (widgetId: string): boolean => {
    if (!config) return false;
    const item = config.layout.find((l: DashboardLayoutItem) => l.widgetId === widgetId);
    return item?.visible ?? false;
  };

  // 선택된 위젯 수
  const selectedCount = config?.layout.filter((l: DashboardLayoutItem) => l.visible).length ?? 0;

  // 위젯 선택 핸들러
  const handleWidgetToggle = (widget: Widget, checked: boolean) => {
    if (checked && selectedCount >= maxWidgetCount) {
      message.warning(`최대 ${maxWidgetCount}개의 위젯만 선택할 수 있습니다.`);
      return;
    }
    if (!checked && selectedCount <= minWidgetCount) {
      message.warning(`최소 ${minWidgetCount}개의 위젯을 선택해야 합니다.`);
      return;
    }
    toggleWidget(widget.widgetId, checked, widget);
  };

  // 아이콘 컴포넌트 가져오기
  const getIconComponent = (iconName?: string) => {
    if (!iconName) return null;
    const iconsMap = Icons as unknown as Record<string, React.ComponentType<{ style?: React.CSSProperties }>>;
    const IconComponent = iconsMap[iconName];
    return IconComponent ? <IconComponent style={{ fontSize: 24 }} /> : null;
  };

  // 위젯 유형 태그 색상
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'STAT_CARD':
        return 'blue';
      case 'CHART':
        return 'green';
      case 'LIST':
        return 'orange';
      case 'INFO':
        return 'purple';
      default:
        return 'default';
    }
  };

  // 위젯 유형 한글명
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'STAT_CARD':
        return '통계';
      case 'CHART':
        return '차트';
      case 'LIST':
        return '목록';
      case 'INFO':
        return '정보';
      default:
        return type;
    }
  };

  return (
    <Modal
      title="위젯 선택"
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      className="widget-selector-modal"
    >
      <div className="widget-selector-header">
        <Text type="secondary">
          표시할 위젯을 선택하세요 (최소 {minWidgetCount}개, 최대 {maxWidgetCount}개)
        </Text>
        <Tag color={selectedCount >= minWidgetCount && selectedCount <= maxWidgetCount ? 'success' : 'warning'}>
          {selectedCount}/{maxWidgetCount} 선택됨
        </Tag>
      </div>

      <Row gutter={[16, 16]} className="widget-selector-list">
        {widgets.map((widget) => {
          const isSelected = isWidgetSelected(widget.widgetId);
          return (
            <Col xs={24} sm={12} md={8} key={widget.widgetId}>
              <Card
                className={`widget-selector-card ${isSelected ? 'selected' : ''}`}
                size="small"
                hoverable
                onClick={() => handleWidgetToggle(widget, !isSelected)}
              >
                <div className="widget-selector-card-content">
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => handleWidgetToggle(widget, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="widget-selector-icon">
                    {getIconComponent(widget.iconNm)}
                  </div>
                  <div className="widget-selector-info">
                    <div className="widget-selector-name">{widget.widgetNm}</div>
                    <Tag color={getTypeColor(widget.widgetType)} style={{ fontSize: 11 }}>
                      {getTypeLabel(widget.widgetType)}
                    </Tag>
                  </div>
                </div>
                {widget.widgetDesc && (
                  <Text type="secondary" className="widget-selector-desc">
                    {widget.widgetDesc}
                  </Text>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    </Modal>
  );
};

export default WidgetSelector;
