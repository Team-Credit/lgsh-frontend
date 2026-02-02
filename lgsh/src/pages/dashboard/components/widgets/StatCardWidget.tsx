/**
 * 통계 카드 위젯 컴포넌트
 */
import React, { useCallback } from 'react';
import { Statistic, Typography, DatePicker } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import type { DashboardLayoutItem, StatCardData } from '@/types/dashboard';
import { useDashboardStore } from '@/stores/dashboardStore';
import './StatCardWidget.css';

const { Text } = Typography;

interface StatCardWidgetProps {
  data: StatCardData;
  widget?: DashboardLayoutItem;
}

const StatCardWidget: React.FC<StatCardWidgetProps> = ({ data, widget }) => {
  const { value, unit, comparison, yearMonth } = data;
  const { loadWidgetData } = useDashboardStore();

  // 평가 건수 위젯인지 확인
  const isEvalCountWidget = widget?.widgetId === 'WGT_STAT_EVAL_CNT';

  // 년월 변경 핸들러
  const handleMonthChange = useCallback((date: Dayjs | null) => {
    if (date && widget) {
      const newYearMonth = date.format('YYYYMM');
      loadWidgetData(widget.widgetId, newYearMonth);
    }
  }, [widget, loadWidgetData]);

  // yearMonth를 dayjs 객체로 변환
  const selectedMonth = yearMonth ? dayjs(yearMonth, 'YYYYMM') : dayjs();

  // 비교 아이콘 및 색상
  const getComparisonIcon = () => {
    if (!comparison) return null;
    switch (comparison.direction) {
      case 'UP':
        return <ArrowUpOutlined />;
      case 'DOWN':
        return <ArrowDownOutlined />;
      default:
        return <MinusOutlined />;
    }
  };

  const getComparisonColor = () => {
    if (!comparison) return undefined;
    switch (comparison.direction) {
      case 'UP':
        return '#059669';
      case 'DOWN':
        return '#dc2626';
      default:
        return '#64748b';
    }
  };

  // 비교 유형 한글명
  const getComparisonTypeLabel = () => {
    if (!comparison) return '';
    switch (comparison.type) {
      case 'MOM':
        return '전월 대비';
      case 'YOY':
        return '전년 대비';
      case 'WOW':
        return '전주 대비';
      default:
        return '';
    }
  };

  return (
    <div className="stat-card-widget">
      {isEvalCountWidget && yearMonth && (
        <div className="stat-card-month-selector">
          <DatePicker
            picker="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            format="YYYY년 M월"
            allowClear={false}
            size="small"
            style={{ marginBottom: 8 }}
          />
        </div>
      )}
      <Statistic
        value={value}
        suffix={unit}
        valueStyle={{ fontSize: 28, fontWeight: 600 }}
      />
      {comparison && (
        <div className="stat-card-comparison" style={{ color: getComparisonColor() }}>
          {getComparisonIcon()}
          <span className="comparison-value">
            {comparison.value > 0 ? '+' : ''}{comparison.value}%
          </span>
          <Text type="secondary" className="comparison-label">
            {getComparisonTypeLabel()}
          </Text>
        </div>
      )}
    </div>
  );
};

export default StatCardWidget;
