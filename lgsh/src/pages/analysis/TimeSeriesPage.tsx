import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, DatePicker, Row, Select, Tabs, Button, Spin, Table, message, Empty, Typography } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { useAppSelector } from '@/store/hooks';
import { modelService } from '@/services/modelService';
import { timeseriesService } from '@/services/timeseriesService';
import type { ModelListResponse } from '@/types';
import type { TsSnapshotSummary, TsScoreBin, TsFeatureStats, TsPsiPoint, TsMigration } from '@/types/timeseries';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const formatMonth = (value?: Dayjs | null) => (value ? value.format('YYYY-MM') : undefined);

const GRADE_COLORS: Record<string, string> = {
  A: '#1d4ed8',
  B: '#16a34a',
  C: '#eab308',
  D: '#f97316',
  E: '#ef4444',
};
const GRADE_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;

/** 숫자 소수점 정리: 정수면 그대로, 소수면 최대 digits자리 */
const fmt = (v: unknown, digits = 2): string => {
  if (v == null) return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(digits);
};
const fmtPsi = (v: unknown) => fmt(v, 4);
const fmtRate = (v: unknown) => fmt(v, 4);

const TimeSeriesPage: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const companyId = user?.companyId || '';

  const [models, setModels] = useState<ModelListResponse[]>([]);
  const [modelId, setModelId] = useState<string>('');
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs('2025-07', 'YYYY-MM'),
    dayjs('2025-12', 'YYYY-MM'),
  ]);
  const [baseMonth, setBaseMonth] = useState<Dayjs>(dayjs('2025-07', 'YYYY-MM'));
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState<TsSnapshotSummary[]>([]);
  const [scoreDist, setScoreDist] = useState<TsScoreBin[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [featureName, setFeatureName] = useState<string>('');
  const [featureStats, setFeatureStats] = useState<TsFeatureStats[]>([]);
  const [psi, setPsi] = useState<TsPsiPoint[]>([]);
  const [migration, setMigration] = useState<TsMigration | null>(null);

  // Dashboard 전용 state
  const [scorePsi, setScorePsi] = useState<TsPsiPoint[]>([]);
  const [scoreDistFirst, setScoreDistFirst] = useState<TsScoreBin[]>([]);

  const monthOptions = useMemo(() => {
    const list: { label: string; value: string }[] = [];
    if (!range) return list;
    const start = range[0].startOf('month');
    const end = range[1].startOf('month');
    let cursor = start;
    while (cursor.isBefore(end) || cursor.isSame(end)) {
      list.push({ label: cursor.format('YYYY-MM'), value: cursor.format('YYYY-MM') });
      cursor = cursor.add(1, 'month');
    }
    return list;
  }, [range]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await modelService.list({ page: 0, size: 200 });
        if (response.data?.success && response.data?.data?.content) {
          setModels(response.data.data.content);
          if (!modelId && response.data.data.content.length > 0) {
            setModelId(response.data.data.content[0].modelId);
          }
        } else {
          message.error(response.data?.message || '모델 목록을 불러오지 못했습니다.');
        }
      } catch (err) {
        message.error('모델 목록을 불러오지 못했습니다.');
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!monthOptions.length) return;
    const first = monthOptions[0]?.value;
    if (first) {
      setBaseMonth(dayjs(first, 'YYYY-MM'));
    }
  }, [monthOptions]);

  const fetchAll = async () => {
    if (!companyId || !modelId || !range) {
      message.warning('companyId/modelId/기간을 확인해주세요.');
      return;
    }

    const fromMonth = formatMonth(range[0]);
    const toMonth = formatMonth(range[1]);
    const baseMonthValue = formatMonth(baseMonth);
    const selectedMonth = toMonth || fromMonth;

    setLoading(true);
    try {
      const [summaryRes, scoreRes, featureListRes, scoreDistFirstRes, scorePsiRes] = await Promise.all([
        timeseriesService.snapshotSummary({ companyId, modelId, fromMonth, toMonth }),
        selectedMonth
          ? timeseriesService.scoreDistribution({ companyId, modelId, month: selectedMonth })
          : Promise.resolve({ success: true, data: [] }),
        timeseriesService.featureList({ companyId, modelId }),
        // Dashboard: 첫 월 점수 분포
        fromMonth && fromMonth !== selectedMonth
          ? timeseriesService.scoreDistribution({ companyId, modelId, month: fromMonth })
          : Promise.resolve({ success: true, data: [] }),
        // Dashboard: Score PSI
        baseMonthValue
          ? timeseriesService.psi({
              companyId,
              modelId,
              baseMonth: baseMonthValue,
              targetType: 'SCORE',
              targetName: 'CREDIT_SCORE',
              fromMonth,
              toMonth,
            })
          : Promise.resolve({ success: true, data: [] }),
      ]);

      setSummary(summaryRes.data || []);
      setScoreDist(scoreRes.data || []);
      setScoreDistFirst(scoreDistFirstRes.data || []);
      setScorePsi(scorePsiRes.data || []);

      const featureList = featureListRes.data || [];
      setFeatures(featureList);
      const selectedFeature = featureName || featureList[0] || '';
      setFeatureName(selectedFeature);

      if (selectedFeature) {
        const featureStatsRes = await timeseriesService.featureStats({
          companyId,
          modelId,
          feature: selectedFeature,
          fromMonth,
          toMonth,
        });
        setFeatureStats(featureStatsRes.data || []);

        if (baseMonthValue) {
          const psiRes = await timeseriesService.psi({
            companyId,
            modelId,
            baseMonth: baseMonthValue,
            targetType: 'FEATURE',
            targetName: selectedFeature,
            fromMonth,
            toMonth,
          });
          setPsi(psiRes.data || []);
        }
      } else {
        setFeatureStats([]);
        setPsi([]);
      }

      if (fromMonth && toMonth) {
        const migrationRes = await timeseriesService.migration({
          companyId,
          modelId,
          fromMonth,
          toMonth,
        });
        setMigration(migrationRes.data || null);
      }
    } catch (err) {
      message.error('데이터 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRebuild = async () => {
    if (!companyId || !modelId || !range) {
      message.warning('companyId/modelId/기간을 확인해주세요.');
      return;
    }
    try {
      const response = await timeseriesService.rebuild({
        companyId,
        modelId,
        fromMonth: formatMonth(range[0]),
        toMonth: formatMonth(range[1]),
      });
      if (response.success) {
        message.success('리빌드 요청 완료');
      } else {
        message.error(response.message || '리빌드 요청 실패');
      }
    } catch (err) {
      message.error('리빌드 요청 실패');
    }
  };

  // ─── Dashboard 차트 데이터 파생 ───

  /** 월별 등급 분포 (Stacked Bar) */
  const gradeChartData = useMemo(() => {
    return summary.map((row) => {
      let grades: Record<string, number> = {};
      try {
        grades = row.gradeCntJson ? JSON.parse(row.gradeCntJson) : {};
      } catch {
        grades = {};
      }
      return {
        month: row.snapshotMonth,
        A: grades.A || 0,
        B: grades.B || 0,
        C: grades.C || 0,
        D: grades.D || 0,
        E: grades.E || 0,
      };
    });
  }, [summary]);

  /** 점수 추이 (Multi-Line) */
  const scoreTrendData = useMemo(() => {
    return summary.map((row) => ({
      month: row.snapshotMonth,
      평균: row.scoreAvg ?? null,
      P10: row.scoreP10 ?? null,
      P50: row.scoreP50 ?? null,
      P90: row.scoreP90 ?? null,
    }));
  }, [summary]);

  /** 대상자 변동 (Composed) */
  const populationData = useMemo(() => {
    return summary.map((row) => ({
      month: row.snapshotMonth,
      전체: row.popCnt,
      신규: row.newCnt ?? 0,
      이탈: row.churnCnt ?? 0,
    }));
  }, [summary]);

  /** PSI 추이 (Score 기반) */
  const psiChartData = useMemo(() => {
    return scorePsi.map((row) => ({
      month: row.snapshotMonth,
      PSI: row.psiValue ?? 0,
    }));
  }, [scorePsi]);

  /** 등급 이동률 */
  const migrationChartData = useMemo(() => {
    if (!migration) return [];
    return [
      {
        name: '등급 이동',
        상승: Number(((migration.upgradeRate ?? 0) * 100).toFixed(1)),
        유지: Number(((migration.stayRate ?? 0) * 100).toFixed(1)),
        하락: Number(((migration.downgradeRate ?? 0) * 100).toFixed(1)),
      },
    ];
  }, [migration]);

  /** 점수 분포 비교 (첫 월 vs 마지막 월) */
  const scoreDistCompareData = useMemo(() => {
    const fromMonth = formatMonth(range[0]) || '';
    const toMonth = formatMonth(range[1]) || '';
    const first = scoreDistFirst.length > 0 ? scoreDistFirst : [];
    const last = scoreDist.length > 0 ? scoreDist : [];
    if (first.length === 0 && last.length === 0) return [];

    const maxBins = Math.max(first.length, last.length);
    const result: { bin: string; [key: string]: string | number }[] = [];
    for (let i = 0; i < maxBins; i++) {
      const binLabel = first[i]
        ? `${first[i].binMin ?? ''}-${first[i].binMax ?? ''}`
        : last[i]
        ? `${last[i].binMin ?? ''}-${last[i].binMax ?? ''}`
        : `Bin ${i + 1}`;
      result.push({
        bin: binLabel,
        [fromMonth]: first[i]?.binCnt ?? 0,
        [toMonth]: last[i]?.binCnt ?? 0,
      });
    }
    return result;
  }, [scoreDist, scoreDistFirst, range]);

  const fromMonthLabel = formatMonth(range[0]) || '';
  const toMonthLabel = formatMonth(range[1]) || '';

  // ─── 기존 테이블 컬럼 ───

  const summaryColumns = [
    { title: '월', dataIndex: 'snapshotMonth', key: 'snapshotMonth' },
    { title: '대상자수', dataIndex: 'popCnt', key: 'popCnt', render: (v: number) => fmt(v, 0) },
    { title: '평균점수', dataIndex: 'scoreAvg', key: 'scoreAvg', render: (v: number) => fmt(v) },
    { title: 'P50', dataIndex: 'scoreP50', key: 'scoreP50', render: (v: number) => fmt(v) },
    { title: 'P10', dataIndex: 'scoreP10', key: 'scoreP10', render: (v: number) => fmt(v) },
    { title: 'P90', dataIndex: 'scoreP90', key: 'scoreP90', render: (v: number) => fmt(v) },
    { title: '신규', dataIndex: 'newCnt', key: 'newCnt', render: (v: number) => fmt(v, 0) },
    { title: '이탈', dataIndex: 'churnCnt', key: 'churnCnt', render: (v: number) => fmt(v, 0) },
  ];

  const scoreColumns = [
    { title: 'Bin', dataIndex: 'binNo', key: 'binNo' },
    { title: 'Min', dataIndex: 'binMin', key: 'binMin', render: (v: number) => fmt(v) },
    { title: 'Max', dataIndex: 'binMax', key: 'binMax', render: (v: number) => fmt(v) },
    { title: 'Count', dataIndex: 'binCnt', key: 'binCnt', render: (v: number) => fmt(v, 0) },
    { title: 'Rate', dataIndex: 'binRate', key: 'binRate', render: (v: number) => fmtRate(v) },
  ];

  const featureColumns = [
    { title: '월', dataIndex: 'snapshotMonth', key: 'snapshotMonth' },
    { title: '결측률', dataIndex: 'missingRate', key: 'missingRate', render: (v: number) => fmtRate(v) },
    { title: '0비율', dataIndex: 'zeroRate', key: 'zeroRate', render: (v: number) => fmtRate(v) },
    { title: '평균', dataIndex: 'mean', key: 'mean', render: (v: number) => fmt(v) },
    { title: '표준편차', dataIndex: 'std', key: 'std', render: (v: number) => fmt(v) },
    { title: 'P50', dataIndex: 'p50', key: 'p50', render: (v: number) => fmt(v) },
  ];

  const psiColumns = [
    { title: '월', dataIndex: 'snapshotMonth', key: 'snapshotMonth' },
    { title: 'PSI', dataIndex: 'psiValue', key: 'psiValue', render: (v: number) => fmtPsi(v) },
  ];

  // ─── Dashboard 탭 렌더링 ───

  const dashboardTab = (
    <Row gutter={[16, 16]}>
      {/* Row 1: 등급 분포 + 점수 추이 */}
      <Col span={12}>
        <Card title="월별 등급 분포" size="small">
          {gradeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmt(v, 0)} />
                <Legend />
                {GRADE_KEYS.map((grade) => (
                  <Bar key={grade} dataKey={grade} stackId="grade" fill={GRADE_COLORS[grade]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty description="데이터 없음" style={{ height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
          )}
        </Card>
      </Col>
      <Col span={12}>
        <Card title="점수 추이" size="small">
          {scoreTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scoreTrendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Line type="monotone" dataKey="평균" stroke="#1e3a8a" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="P90" stroke="#16a34a" strokeWidth={1.5} strokeDasharray="5 5" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="P50" stroke="#8b5cf6" strokeWidth={1.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="P10" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty description="데이터 없음" style={{ height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
          )}
        </Card>
      </Col>

      {/* Row 2: 대상자 변동 + PSI 추이 */}
      <Col span={12}>
        <Card title="대상자 변동" size="small">
          {populationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={populationData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmt(v, 0)} />
                <Legend />
                <Bar dataKey="전체" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                <Line type="monotone" dataKey="신규" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="이탈" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <Empty description="데이터 없음" style={{ height: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
          )}
        </Card>
      </Col>
      <Col span={12}>
        <Card title="PSI 추이 (점수 기반)" size="small">
          {psiChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={psiChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 'auto']} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmtPsi(v)} />
                <Legend />
                <ReferenceLine y={0.25} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '위험 0.25', position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }} />
                <ReferenceLine y={0.1} stroke="#f97316" strokeDasharray="4 4" label={{ value: '주의 0.10', position: 'insideTopRight', fill: '#f97316', fontSize: 11 }} />
                <Line type="monotone" dataKey="PSI" stroke="#1e3a8a" strokeWidth={2} dot={{ r: 4, fill: '#1e3a8a' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty description="데이터 없음" style={{ height: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
          )}
        </Card>
      </Col>

      {/* Row 3: 등급 이동률 + 점수 분포 비교 */}
      <Col span={12}>
        <Card title="등급 이동률" size="small">
          {migrationChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={migrationChartData} layout="vertical" margin={{ top: 8, right: 16, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend />
                <Bar dataKey="상승" stackId="mig" fill="#16a34a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="유지" stackId="mig" fill="#3b82f6" />
                <Bar dataKey="하락" stackId="mig" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty description="데이터 없음" style={{ height: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
          )}
        </Card>
      </Col>
      <Col span={12}>
        <Card title={`점수 분포 비교 (${fromMonthLabel} vs ${toMonthLabel})`} size="small">
          {scoreDistCompareData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreDistCompareData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
                <XAxis dataKey="bin" tick={{ fontSize: 10 }} interval={1} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmt(v, 0)} />
                <Legend />
                <Bar dataKey={fromMonthLabel} fill="#93c5fd" radius={[2, 2, 0, 0]} />
                <Bar dataKey={toMonthLabel} fill="#1e3a8a" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty description="데이터 없음" style={{ height: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
          )}
        </Card>
      </Col>
    </Row>
  );

  return (
    <div style={{ padding: 24 }}>
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <LineChartOutlined style={{ marginRight: 8 }} />
          시계열분석
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>모델 성능 추이와 PSI, 등급 이동 현황을 모니터링합니다.</Text>
      </div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="모델 선택"
              value={modelId || undefined}
              onChange={(value) => setModelId(value)}
              options={models.map((model) => ({
                label: `${model.modelNm} (${model.modelId})`,
                value: model.modelId,
              }))}
            />
          </Col>
          <Col span={8}>
            <RangePicker
              picker="month"
              value={range}
              onChange={(values) => {
                if (values && values[0] && values[1]) {
                  setRange([values[0], values[1]]);
                }
              }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="베이스 월"
              value={formatMonth(baseMonth)}
              onChange={(value) => setBaseMonth(dayjs(value, 'YYYY-MM'))}
              options={monthOptions}
            />
          </Col>
          <Col span={6} style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" onClick={fetchAll}>조회</Button>
            <Button onClick={handleRebuild}>리빌드</Button>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        <Tabs
          defaultActiveKey="dashboard"
          items={[
            {
              key: 'dashboard',
              label: '대시보드',
              children: dashboardTab,
            },
            {
              key: 'overview',
              label: 'Overview',
              children: (
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Card title="월별 요약">
                      <Table
                        rowKey="snapshotMonth"
                        columns={summaryColumns}
                        dataSource={summary}
                        pagination={false}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="점수 분포">
                      <Table
                        rowKey="binNo"
                        columns={scoreColumns}
                        dataSource={scoreDist}
                        pagination={false}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="등급 이동">
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        {migration ? JSON.stringify(migration, null, 2) : 'No data'}
                      </pre>
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'features',
              label: 'Features',
              children: (
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Card title="피처 선택">
                      <Select
                        style={{ width: '100%' }}
                        value={featureName || undefined}
                        onChange={(value) => setFeatureName(value)}
                        options={features.map((feature) => ({
                          label: feature,
                          value: feature,
                        }))}
                      />
                      <Button style={{ marginTop: 12 }} onClick={fetchAll}>
                        다시 조회
                      </Button>
                    </Card>
                  </Col>
                  <Col span={16}>
                    <Card title="피처 통계">
                      <Table
                        rowKey="snapshotMonth"
                        columns={featureColumns}
                        dataSource={featureStats}
                        pagination={false}
                      />
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'psi',
              label: 'PSI',
              children: (
                <Card title="PSI 추이">
                  <Table
                    rowKey="snapshotMonth"
                    columns={psiColumns}
                    dataSource={psi}
                    pagination={false}
                  />
                </Card>
              ),
            },
          ]}
        />
      </Spin>
    </div>
  );
};

export default TimeSeriesPage;
