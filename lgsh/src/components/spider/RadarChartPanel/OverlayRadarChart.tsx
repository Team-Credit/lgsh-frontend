/**
 * 겹침 레이더 차트 컴포넌트 (실험군 + 대조군 오버레이)
 */
import React from 'react';
import {
  RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend,
} from 'recharts';
import { Card } from 'antd';
import type { RadarAxis } from '@/types/spider';

interface Props {
  expData: RadarAxis[];
  ctlData: RadarAxis[];
  expLabel: string;
  ctlLabel: string;
}

const OverlayRadarChart: React.FC<Props> = ({ expData, ctlData, expLabel, ctlLabel }) => {
  const mergedData = expData.map((item, idx) => ({
    axis: item.axis,
    experiment: item.value,
    control: ctlData[idx]?.value ?? 0,
  }));

  return (
    <Card
      size="small"
      title="겹침 비교"
      styles={{ body: { padding: '8px 0' } }}
    >
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={mergedData} outerRadius={100}>
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
            name={expLabel}
            dataKey="experiment"
            stroke="#4096FF"
            fill="rgba(64,150,255,0.25)"
            strokeWidth={2}
            dot={{ r: 4, fill: '#4096FF', strokeWidth: 0 }}
          />
          <Radar
            name={ctlLabel}
            dataKey="control"
            stroke="#FF6B6B"
            fill="rgba(255,107,107,0.25)"
            strokeWidth={2}
            dot={{ r: 4, fill: '#FF6B6B', strokeWidth: 0 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default OverlayRadarChart;
