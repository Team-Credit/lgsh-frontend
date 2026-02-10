/**
 * 단독 레이더 차트 컴포넌트
 */
import React from 'react';
import {
  RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import { Card, Typography } from 'antd';
import type { RadarAxis } from '@/types/spider';

const { Text } = Typography;

interface Props {
  data: RadarAxis[];
  color: string;
  fillColor: string;
  title: string;
  subtitle: string;
  avgScore?: number;
  avgGrade?: string;
}

const SingleRadarChart: React.FC<Props> = ({
  data, color, fillColor, title, subtitle, avgScore, avgGrade,
}) => (
  <Card
    size="small"
    title={<span style={{ color }}>{title}</span>}
    extra={<Text type="secondary" style={{ fontSize: 12 }}>{subtitle}</Text>}
    styles={{ body: { padding: '8px 0' } }}
  >
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius={100}>
        <PolarGrid gridType="polygon" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fontSize: 11, fill: '#666' }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fontSize: 9, fill: '#999' }}
          tickCount={6}
        />
        <Radar
          dataKey="value"
          stroke={color}
          fill={fillColor}
          fillOpacity={0.25}
          strokeWidth={2}
          dot={{ r: 5, fill: color, strokeWidth: 0 }}
        />
      </RadarChart>
    </ResponsiveContainer>
    {avgScore !== undefined && (
      <div style={{ textAlign: 'center', paddingBottom: 8 }}>
        <Text strong>점수: {avgScore}</Text>
        {avgGrade && <Text type="secondary"> ({avgGrade})</Text>}
      </div>
    )}
  </Card>
);

export default SingleRadarChart;
