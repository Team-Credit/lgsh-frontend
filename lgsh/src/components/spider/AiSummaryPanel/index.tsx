/**
 * AI 분석 요약 패널 컴포넌트
 */
import React from 'react';
import { Card, Button, Spin, Tag, Typography, Divider, Space } from 'antd';
import { ReloadOutlined, RobotOutlined } from '@ant-design/icons';
import type { AiSummaryResult } from '@/types/spider';
import './styles.css';

const { Text, Paragraph, Title } = Typography;

interface Props {
  aiSummary: AiSummaryResult | null;
  isLoading: boolean;
  onRequestAi: () => void;
}

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  HIGH: { color: '#ff4d4f', label: '높음' },
  MEDIUM: { color: '#faad14', label: '보통' },
  LOW: { color: '#52c41a', label: '낮음' },
};

const RISK_CONFIG: Record<string, { color: string; label: string }> = {
  HIGH: { color: '#ff4d4f', label: '위험' },
  MEDIUM_HIGH: { color: '#ff7a45', label: '다소 위험' },
  MEDIUM: { color: '#faad14', label: '보통' },
  MEDIUM_LOW: { color: '#a0d911', label: '다소 양호' },
  LOW: { color: '#52c41a', label: '양호' },
};

const AiSummaryPanel: React.FC<Props> = ({ aiSummary, isLoading, onRequestAi }) => {
  if (!aiSummary && !isLoading) {
    return (
      <Card size="small" style={{ marginBottom: 16, textAlign: 'center', padding: '24px 0' }}>
        <RobotOutlined style={{ fontSize: 32, color: '#bbb', marginBottom: 12 }} />
        <div>
          <Text type="secondary">AI 분석 요약을 생성하려면 아래 버튼을 클릭하세요.</Text>
        </div>
        <Button
          type="primary"
          icon={<RobotOutlined />}
          onClick={onRequestAi}
          style={{ marginTop: 12 }}
        >
          AI 분석 요약 생성
        </Button>
      </Card>
    );
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <RobotOutlined style={{ color: '#4096FF' }} />
          <span>AI 분석 요약</span>
          {aiSummary?.overallRisk && (
            <Tag color={RISK_CONFIG[aiSummary.overallRisk]?.color || '#999'}>
              전체 리스크: {RISK_CONFIG[aiSummary.overallRisk]?.label || aiSummary.overallRisk}
            </Tag>
          )}
        </Space>
      }
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={onRequestAi}
          loading={isLoading}
        >
          재분석
        </Button>
      }
      style={{ marginBottom: 16 }}
    >
      <Spin spinning={isLoading} tip="AI 분석 중...">
        {aiSummary && (
          <div className="spider-ai-summary">
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8 }}>
              {aiSummary.summary}
            </Paragraph>

            {aiSummary.keyFindings && aiSummary.keyFindings.length > 0 && (
              <>
                <Divider orientation="left" plain style={{ fontSize: 13 }}>
                  주요 발견
                </Divider>
                <div className="spider-ai-findings">
                  {aiSummary.keyFindings.map((finding, idx) => {
                    const config = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.MEDIUM;
                    return (
                      <div key={idx} className="spider-ai-finding-item">
                        <span
                          className="spider-ai-finding-dot"
                          style={{ backgroundColor: config.color }}
                        />
                        <Text>
                          <Text strong style={{ color: config.color }}>
                            [{finding.category}]
                          </Text>{' '}
                          {finding.finding}
                        </Text>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {aiSummary.recommendations && aiSummary.recommendations.length > 0 && (
              <>
                <Divider orientation="left" plain style={{ fontSize: 13 }}>
                  권고사항
                </Divider>
                <ul className="spider-ai-recommendations">
                  {aiSummary.recommendations.map((rec, idx) => (
                    <li key={idx}><Text>{rec}</Text></li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Spin>
    </Card>
  );
};

export default AiSummaryPanel;
