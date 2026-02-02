/**
 * 정보 위젯 컴포넌트
 */
import React from 'react';
import { Descriptions, Tag, Typography } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { DashboardLayoutItem, ModelInfo } from '@/types/dashboard';
import './InfoWidget.css';

const { Text } = Typography;

interface InfoWidgetProps {
  data: ModelInfo;
  widget?: DashboardLayoutItem;
}

const InfoWidget: React.FC<InfoWidgetProps> = ({ data }) => {
  const { modelNm, modelVersion, modelStatus, algorithmTypeNm, aucScore, deployDt } = data;

  // 상태 태그
  const getStatusTag = () => {
    switch (modelStatus) {
      case 'DEPLOYED':
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            운영중
          </Tag>
        );
      case 'APPROVED':
        return (
          <Tag icon={<ClockCircleOutlined />} color="warning">
            승인됨
          </Tag>
        );
      case 'INACTIVE':
        return <Tag color="default">비활성</Tag>;
      default:
        return <Tag>{modelStatus}</Tag>;
    }
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="info-widget">
      <div className="info-widget-header">
        <Text strong className="info-widget-name">{modelNm}</Text>
        {getStatusTag()}
      </div>
      <Descriptions size="small" column={1} className="info-widget-details">
        <Descriptions.Item label="버전">
          <Tag color="blue">v{modelVersion}</Tag>
        </Descriptions.Item>
        {algorithmTypeNm && (
          <Descriptions.Item label="알고리즘">
            <Tag color="purple">{algorithmTypeNm}</Tag>
          </Descriptions.Item>
        )}
        {aucScore != null && (
          <Descriptions.Item label="AUC">
            <Text strong style={{ color: aucScore >= 0.7 ? '#10b981' : '#f59e0b' }}>
              {typeof aucScore === 'number' ? aucScore.toFixed(4) : aucScore}
            </Text>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="배포일">
          {formatDate(deployDt)}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
};

export default InfoWidget;
