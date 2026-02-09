/**
 * 스파이더웹 비교 분석 페이지
 * 화면 ID: SWB001
 * 메뉴 ID: M0407
 * URL: /analysis/spider
 *
 * 분석 대상과 비교 기준의 신용 상태를
 * 6축 레이더 차트(스파이더웹)로 시각화하여 비교 분석
 */
import React from 'react';
import { Button, Space, Spin, Typography, Divider } from 'antd';
import {
  SearchOutlined,
  ClearOutlined,
  FilePdfOutlined,
  RadarChartOutlined,
} from '@ant-design/icons';
import HashTagFilter from '@/components/spider/HashTagFilter';
import RadarChartPanel from '@/components/spider/RadarChartPanel';
import AxisCompareTable from '@/components/spider/AxisCompareTable';
import AiSummaryPanel from '@/components/spider/AiSummaryPanel';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  analyze,
  requestAiSummary,
  generatePdf,
  resetAll,
} from '@/store/slices/spiderSlice';
import './SpiderAnalysisPage.css';

const { Title } = Typography;

const SpiderAnalysisPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    analysisResult,
    aiSummary,
    isAnalyzing,
    isAiLoading,
    isPdfLoading,
  } = useAppSelector((state) => state.spider);

  return (
    <div className="spider-analysis-page fade-in">
      <div className="spider-page-header">
        <Space align="center">
          <RadarChartOutlined style={{ fontSize: 22, color: '#003366' }} />
          <Title level={4} style={{ margin: 0 }}>
            신용평가 비교 분석 (스파이더웹)
          </Title>
        </Space>
      </div>

      <HashTagFilter />

      <div className="spider-action-bar">
        <Space>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => dispatch(analyze())}
            loading={isAnalyzing}
            size="middle"
          >
            조회
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={() => dispatch(resetAll())}
            size="middle"
          >
            초기화
          </Button>
        </Space>
      </div>

      <Spin spinning={isAnalyzing} tip="분석 중...">
        {analysisResult && (
          <>
            <Divider />

            <RadarChartPanel result={analysisResult} />

            <AxisCompareTable result={analysisResult} />

            <AiSummaryPanel
              aiSummary={aiSummary}
              isLoading={isAiLoading}
              onRequestAi={() => dispatch(requestAiSummary())}
            />

            <div className="spider-bottom-actions">
              <Space>
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  onClick={() => dispatch(generatePdf())}
                  loading={isPdfLoading}
                >
                  PDF 다운로드
                </Button>
              </Space>
            </div>
          </>
        )}
      </Spin>
    </div>
  );
};

export default SpiderAnalysisPage;
