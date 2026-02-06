import React, { useEffect, useMemo, useState } from 'react';
import { Card, Typography, DatePicker, Select, Button, Row, Col, Spin, message } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { creditService } from '@/services';
import type { CreditDistributionResult } from '@/types';
import './CreditDistributionPage.css';

const { Title, Text } = Typography;

const gradeLabels = ['A', 'B', 'C', 'D', 'E'];
const gradeRanges = ['900~1000', '800~899', '700~799', '600~699', '0~599'];
const gradeColorMap: Record<string, string> = {
  A: '#1d4ed8',
  B: '#16a34a',
  C: '#facc15',
  D: '#f97316',
  E: '#ef4444',
};

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CreditDistributionPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CreditDistributionResult | null>(null);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.documentElement.classList.contains('dark')
  );

  const stats = data?.stats || {
    average: 0,
    median: 0,
    max: 0,
    min: 0,
    stddev: 0,
  };

  const gradeCounts = data?.gradeCounts || {};

  const chartConfig = useMemo(() => {
    const values = gradeLabels.map((grade) => Number(gradeCounts[grade] || 0));
    const colors = gradeLabels.map((grade) => gradeColorMap[grade] || '#94a3b8');
    const total = values.reduce((sum, value) => sum + value, 0);
    const axisColor = isDark ? '#e5e7eb' : '#0f172a';
    const axisSubColor = isDark ? '#e5e7eb' : '#475569';
    const options: ChartOptions<'bar'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items: any[]) => `${gradeLabels[items[0].dataIndex]} 등급`,
            label: (ctx: any) => {
              const count = ctx.parsed.y ?? 0;
              const percent = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
              return `인원: ${count}명 (비중 ${percent}%)`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: axisColor, font: { weight: 700, size: 16 }, padding: 6 },
        },
        x2: {
          position: 'bottom',
          grid: { display: false, drawTicks: false },
          border: { display: false },
          ticks: {
            color: axisSubColor,
            font: { weight: 700, size: 12 },
            padding: 2,
            callback: (_value: any, index: number) => gradeRanges[index],
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          ticks: { color: axisSubColor, font: { weight: 700 } },
        },
      },
    };
    return {
      data: {
        labels: gradeLabels,
        datasets: [
          {
            label: '대상자 수',
            data: values,
            backgroundColor: colors,
            borderRadius: 10,
            barThickness: 48,
            categoryPercentage: 1.0,
            barPercentage: 1.0,
          },
        ],
      },
      options,
    };
  }, [gradeCounts, isDark]);

  const fetchDistribution = async () => {
    setLoading(true);
    try {
      const response = await creditService.distribution();
      if (response.success && response.data) {
        setData(response.data);
      } else {
        message.error(response.message || '점수 분포 조회에 실패했습니다.');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || '점수 분포 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistribution();
  }, []);

  useEffect(() => {
    const target = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(
        target.getAttribute('data-theme') === 'dark' ||
          target.classList.contains('dark')
      );
    });
    observer.observe(target, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="credit-distribution-page fade-in">
      <div className="page-header">
        <Title level={3} className="page-title">
          <BarChartOutlined style={{ marginRight: 8 }} />
          신용점수 분포 현황
        </Title>
        <Text type="secondary">A~E 등급 분포와 신용점수 통계를 확인합니다.</Text>
      </div>

      <Card className="filter-card" title="조회 조건">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <DatePicker className="filter-input" placeholder="시작일" disabled />
          </Col>
          <Col xs={24} md={6}>
            <DatePicker className="filter-input" placeholder="종료일" disabled />
          </Col>
          <Col xs={24} md={6}>
            <Select className="filter-input" placeholder="그룹 전체" disabled options={[{ value: 'all', label: '그룹 전체' }]} />
          </Col>
          <Col xs={24} md={4}>
            <Select className="filter-input" placeholder="직업 전체" disabled options={[{ value: 'all', label: '직업 전체' }]} />
          </Col>
          <Col xs={24} md={2}>
            <Button type="primary" className="filter-button" disabled>
              검색
            </Button>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} className="stat-row">
          <Col xs={24} sm={12} md={4}>
            <Card className="stat-card">
              <Text type="secondary">평균</Text>
              <div className="stat-value">{stats.average}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card className="stat-card">
              <Text type="secondary">중앙값</Text>
              <div className="stat-value">{stats.median}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card className="stat-card">
              <Text type="secondary">최고</Text>
              <div className="stat-value">{stats.max}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card className="stat-card">
              <Text type="secondary">최저</Text>
              <div className="stat-value">{stats.min}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card className="stat-card">
              <Text type="secondary">표준편차</Text>
              <div className="stat-value">{stats.stddev}</div>
            </Card>
          </Col>
        </Row>

        <Card className="chart-card" title="점수 분포 (등급 기준)">
          <div className="distribution-chart">
            <Bar
              key={isDark ? 'dark' : 'light'}
              data={chartConfig.data}
              options={chartConfig.options}
            />
          </div>
        </Card>
      </Spin>
    </div>
  );
};

export default CreditDistributionPage;
