import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Typography, Select, Spin, Table, Row, Col, Statistic, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { creditService } from '@/services';
import { modelService } from '@/services/modelService';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, Tooltip, Legend);

const { Title } = Typography;

const GRADE_COLORS: Record<string, string> = {
  A: '#1d4ed8',
  B: '#16a34a',
  C: '#facc15',
  D: '#f97316',
  E: '#ef4444',
};

interface VisRow {
  personId: string;
  personNm: string;
  creditScore: number;
  creditGrade: string;
  scoreDt: string;
  marriageYn: string;
  childrenCnt: number;
  educationCode: string;
  homeTypeCode: string;
  carYn: string;
  assetAmt: number;
  debtAmt: number;
  creditCardCnt: number;
  annualIncome: number;
  notes: string;
}

interface VisData {
  modelId: string;
  modelNm: string;
  deployedDt: string;
  totalCount: number;
  rows: VisRow[];
}

const ResultVisualizationPage: React.FC = () => {
  const [models, setModels] = useState<Array<{ modelId: string; modelNm: string }>>([]);
  const [modelId, setModelId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VisData | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await modelService.list({ page: 0, size: 200 });
        if (response.data?.success && response.data?.data?.content) {
          setModels(response.data.data.content);
          if (!modelId && response.data.data.content.length > 0) {
            setModelId(response.data.data.content[0].modelId);
          }
        }
      } catch {
        message.error('모델 목록을 불러오지 못했습니다.');
      }
    };
    loadModels();
  }, []);

  const fetchData = useCallback(async () => {
    if (!modelId) return;
    setLoading(true);
    try {
      const res = await creditService.resultVisualization({ modelId });
      if (res.success && res.data) {
        setData(res.data);
      } else {
        message.error(res.message || '데이터 조회 실패');
      }
    } catch {
      message.error('결과 시각화 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    if (modelId) fetchData();
  }, [modelId, fetchData]);

  // 등급별 분포 통계
  const gradeStats = useMemo(() => {
    if (!data?.rows) return { counts: {} as Record<string, number>, total: 0 };
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    for (const row of data.rows) {
      const g = row.creditGrade?.charAt(0) || 'E';
      counts[g] = (counts[g] || 0) + 1;
    }
    return { counts, total: data.rows.length };
  }, [data]);

  // 점수 통계
  const scoreStats = useMemo(() => {
    if (!data?.rows || data.rows.length === 0) return null;
    const scores = data.rows.map((r) => r.creditScore).filter((s) => s != null);
    if (scores.length === 0) return null;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return {
      avg: Math.round(avg * 100) / 100,
      median,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: scores.length,
    };
  }, [data]);

  // 등급 분포 차트
  const gradeChartData = useMemo(() => {
    const labels = ['A', 'B', 'C', 'D', 'E'];
    return {
      labels,
      datasets: [
        {
          label: '인원수',
          data: labels.map((g) => gradeStats.counts[g] || 0),
          backgroundColor: labels.map((g) => GRADE_COLORS[g]),
        },
      ],
    };
  }, [gradeStats]);

  // 점수 분포 차트 (히스토그램)
  const scoreHistData = useMemo(() => {
    if (!data?.rows) return null;
    const bins = Array.from({ length: 20 }, (_, i) => ({
      min: i * 50,
      max: (i + 1) * 50,
      count: 0,
    }));
    for (const row of data.rows) {
      if (row.creditScore == null) continue;
      const idx = Math.min(Math.floor(row.creditScore / 50), 19);
      bins[idx].count++;
    }
    return {
      labels: bins.map((b) => `${b.min}-${b.max}`),
      datasets: [
        {
          label: '인원수',
          data: bins.map((b) => b.count),
          backgroundColor: '#3b82f6',
        },
      ],
    };
  }, [data]);

  // 점수 vs 소득 산점도
  const scatterData = useMemo(() => {
    if (!data?.rows) return null;
    const points = data.rows
      .filter((r) => r.creditScore != null && r.annualIncome != null)
      .slice(0, 5000)
      .map((r) => ({ x: r.annualIncome, y: r.creditScore }));
    return {
      datasets: [
        {
          label: '점수 vs 연소득',
          data: points,
          backgroundColor: 'rgba(59, 130, 246, 0.4)',
          pointRadius: 2,
        },
      ],
    };
  }, [data]);

  const columns: ColumnsType<VisRow> = [
    {
      title: '대상자ID',
      dataIndex: 'personId',
      width: 120,
      ellipsis: true,
    },
    {
      title: '이름',
      dataIndex: 'personNm',
      width: 100,
    },
    {
      title: '신용점수',
      dataIndex: 'creditScore',
      width: 100,
      sorter: (a, b) => (a.creditScore || 0) - (b.creditScore || 0),
      render: (v: number) => (v != null ? Math.round(v) : '-'),
    },
    {
      title: '등급',
      dataIndex: 'creditGrade',
      width: 80,
      filters: ['A', 'B', 'C', 'D', 'E'].map((g) => ({ text: g, value: g })),
      onFilter: (value, record) => record.creditGrade?.startsWith(value as string),
      render: (v: string) => {
        const g = v?.charAt(0) || 'E';
        return <Tag color={GRADE_COLORS[g]}>{v}</Tag>;
      },
    },
    {
      title: '평가일시',
      dataIndex: 'scoreDt',
      width: 160,
      render: (v: string) => (v ? v.replace('T', ' ').substring(0, 16) : '-'),
    },
    {
      title: '연소득',
      dataIndex: 'annualIncome',
      width: 120,
      sorter: (a, b) => (a.annualIncome || 0) - (b.annualIncome || 0),
      render: (v: number) => (v != null ? v.toLocaleString() : '-'),
    },
    {
      title: '자산',
      dataIndex: 'assetAmt',
      width: 120,
      render: (v: number) => (v != null ? v.toLocaleString() : '-'),
    },
    {
      title: '부채',
      dataIndex: 'debtAmt',
      width: 120,
      render: (v: number) => (v != null ? v.toLocaleString() : '-'),
    },
    {
      title: '결혼',
      dataIndex: 'marriageYn',
      width: 60,
      render: (v: string) => (v === 'Y' ? '기혼' : v === 'N' ? '미혼' : '-'),
    },
    {
      title: '자녀수',
      dataIndex: 'childrenCnt',
      width: 70,
    },
    {
      title: '차량',
      dataIndex: 'carYn',
      width: 60,
      render: (v: string) => (v === 'Y' ? '보유' : v === 'N' ? '미보유' : '-'),
    },
    {
      title: '카드수',
      dataIndex: 'creditCardCnt',
      width: 70,
    },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            결과 시각화
          </Title>
          <Select
            style={{ width: 260 }}
            placeholder="모델 선택"
            value={modelId || undefined}
            onChange={(v) => setModelId(v)}
            options={models.map((m) => ({
              label: `${m.modelNm} (${m.modelId})`,
              value: m.modelId,
            }))}
          />
          {data && (
            <span style={{ color: '#888', fontSize: 13 }}>
              총 {data.totalCount?.toLocaleString()}명
            </span>
          )}
        </div>

        {/* 통계 카드 */}
        {scoreStats && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}>
              <Card size="small">
                <Statistic title="평균 점수" value={scoreStats.avg} precision={1} />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic title="중앙값" value={scoreStats.median} />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic title="최소" value={scoreStats.min} />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic title="최대" value={scoreStats.max} />
              </Card>
            </Col>
            {['A', 'B', 'C', 'D', 'E'].map((g) => (
              <Col span={Math.floor(8 / 5) || 1} key={g} style={{ flex: 1 }}>
                <Card size="small">
                  <Statistic
                    title={<Tag color={GRADE_COLORS[g]}>{g}등급</Tag>}
                    value={gradeStats.counts[g] || 0}
                    suffix="명"
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* 차트 영역 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card title="등급 분포" size="small">
              <div style={{ height: 260 }}>
                <Bar
                  data={gradeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="점수 분포" size="small">
              <div style={{ height: 260 }}>
                {scoreHistData && (
                  <Bar
                    data={scoreHistData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { ticks: { maxRotation: 60, font: { size: 10 } } },
                        y: { beginAtZero: true },
                      },
                    }}
                  />
                )}
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="점수 vs 연소득" size="small">
              <div style={{ height: 260 }}>
                {scatterData && (
                  <Scatter
                    data={scatterData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { title: { display: true, text: '연소득' } },
                        y: { title: { display: true, text: '신용점수' }, beginAtZero: true },
                      },
                    }}
                  />
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* 데이터 테이블 */}
        <Card title="평가 결과 상세" size="small">
          <Table
            dataSource={data?.rows || []}
            columns={columns}
            rowKey="personId"
            size="small"
            scroll={{ x: 1200, y: 500 }}
            pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `총 ${t}건` }}
          />
        </Card>
      </div>
    </Spin>
  );
};

export default ResultVisualizationPage;
