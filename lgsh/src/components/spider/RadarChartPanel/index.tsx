/**
 * 레이더 차트 3분할 패널
 * 분석 대상 단독 / 비교 기준 단독 / 겹침 비교
 */
import React from 'react';
import { Col, Row } from 'antd';
import SingleRadarChart from './SingleRadarChart';
import OverlayRadarChart from './OverlayRadarChart';
import type { SpiderAnalysisResult } from '@/types/spider';
import './styles.css';

interface Props {
  result: SpiderAnalysisResult;
}

const RadarChartPanel: React.FC<Props> = ({ result }) => {
  const { experiment, control } = result;

  return (
    <div className="spider-radar-panel">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <SingleRadarChart
            data={experiment.axes}
            color="#4096FF"
            fillColor="rgba(64,150,255,0.25)"
            title={`분석 대상 (${experiment.count.toLocaleString()}명)`}
            subtitle={experiment.label}
            avgScore={experiment.avgScore}
            avgGrade={experiment.avgGrade}
          />
        </Col>
        <Col xs={24} md={8}>
          <SingleRadarChart
            data={control.axes}
            color="#FF6B6B"
            fillColor="rgba(255,107,107,0.25)"
            title={`비교 기준 (${control.count.toLocaleString()}명)`}
            subtitle={control.label}
            avgScore={control.avgScore}
            avgGrade={control.avgGrade}
          />
        </Col>
        <Col xs={24} md={8}>
          <OverlayRadarChart
            expData={experiment.axes}
            ctlData={control.axes}
            expLabel={experiment.count === 1 ? '해당고객' : '분석 대상 그룹'}
            ctlLabel="비교 기준"
          />
        </Col>
      </Row>
    </div>
  );
};

export default RadarChartPanel;
