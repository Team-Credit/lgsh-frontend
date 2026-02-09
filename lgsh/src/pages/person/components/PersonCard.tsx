import React from 'react';
import { Tag, Button, Progress, Typography } from 'antd';
import { EyeOutlined, ThunderboltOutlined, UserOutlined } from '@ant-design/icons';
import type { PersonCardItem } from '@/types';

const { Text } = Typography;

interface PersonCardProps {
  item: PersonCardItem;
  onDetailClick: (personId: string) => void;
  onSimulationClick: (personId: string) => void;
}

const GRADE_COLOR_MAP: Record<string, string> = {
  A: '#1D4ED8',
  B: '#16A34A',
  C: '#FACC15',
  D: '#F97316',
  E: '#EF4444',
};

const PersonCard: React.FC<PersonCardProps> = ({
  item,
  onDetailClick,
  onSimulationClick,
}) => {
  const hasScore = item.creditScore !== null && item.creditScore !== undefined;
  const scorePercent = hasScore ? Math.round(item.creditScore! / 10) : 0;

  const gradeColor = item.gradeColor
    || (item.creditGrade ? GRADE_COLOR_MAP[item.creditGrade] : null)
    || '#999';

  return (
    <div className="person-card" role="listitem">
      <div className="person-card-header">
        <span className="person-card-name">
          <UserOutlined style={{ marginRight: 6 }} />
          {item.personNm}
        </span>
        {hasScore && item.creditGradeNm ? (
          <Tag color={gradeColor}>
            {item.creditGradeNm}
          </Tag>
        ) : (
          <Tag color="#999">미평가</Tag>
        )}
      </div>

      <div className="person-card-id">
        ID: {item.personId}
      </div>

      <div className="person-card-score">
        {hasScore ? (
          <>
            <div className="person-card-score-text">
              <span
                className="person-card-score-value"
                style={{ color: gradeColor }}
              >
                {item.creditScore}
                <span style={{ fontSize: 14, fontWeight: 400, color: '#999' }}> 점</span>
              </span>
              <Text type="secondary">/ 1000</Text>
            </div>
            <Progress
              percent={scorePercent}
              showInfo={false}
              strokeColor={gradeColor}
              trailColor="#f0f0f0"
              size="small"
            />
          </>
        ) : (
          <div className="person-card-no-score">
            아직 평가되지 않았습니다
          </div>
        )}
      </div>

      <div className="person-card-footer">
        <Button
          type="default"
          icon={<EyeOutlined />}
          onClick={() => onDetailClick(item.personId)}
          block
        >
          상세보기
        </Button>
        <Button
          type="primary"
          ghost
          icon={<ThunderboltOutlined />}
          onClick={() => onSimulationClick(item.personId)}
          block
        >
          시뮬레이션
        </Button>
      </div>
    </div>
  );
};

export default PersonCard;
