import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, DatePicker, Row, Select, Tabs, Button, Spin, Table, message, Empty, Typography, Space } from 'antd';
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
const GRADE_CODE_MAP: Record<string, keyof typeof GRADE_COLORS> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
  '01': 'A',
  '1': 'A',
  '02': 'B',
  '2': 'B',
  '03': 'C',
  '3': 'C',
  '04': 'D',
  '4': 'D',
  '05': 'E',
  '5': 'E',
};

/** 숫자 소수점 정리: 정수면 그대로, 소수면 최대 digits자리 */
const fmt = (v: unknown, digits = 2): string => {
  if (v == null) return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(digits);
};
const fmtPsi = (v: unknown): string => {
  if (v == null) return '-';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (n === 0) return '0';
  const abs = Math.abs(n);
  // Feature PSI (e.g., BUDO) can be extremely small; show more precision so it doesn't look like 0.
  const digits = abs < 0.001 ? 10 : abs < 0.01 ? 8 : 4;
  return n.toFixed(digits);
};
const fmtRate = (v: unknown) => fmt(v, 4);

const normalizeModelId = (value?: string | null) => (value ?? '').replace(/[_-]/g, '').toUpperCase();
const pickDefaultModelId = (list: ModelListResponse[]) => {
  const preferred = list.find((m) => normalizeModelId(m.modelId) === 'MDL001')?.modelId;
  return preferred || list[0]?.modelId || '';
};

const toSafeCount = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
};

const normalizeGradeCounts = (raw?: string | null): Record<(typeof GRADE_KEYS)[number], number> => {
  const counts: Record<(typeof GRADE_KEYS)[number], number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  if (!raw) return counts;

  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return counts;
    }
  }

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const keyRaw = String(obj.grade ?? obj.GRADE_BUCKET ?? '').trim();
      const normalized = keyRaw.toUpperCase();
      const grade = (GRADE_CODE_MAP[normalized] ?? GRADE_CODE_MAP[keyRaw]) as
        | (typeof GRADE_KEYS)[number]
        | undefined;
      if (!grade) continue;
      counts[grade] += toSafeCount(obj.count ?? obj.cnt ?? obj.CNT ?? 0);
    }
    return counts;
  }

  if (parsed && typeof parsed === 'object') {
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const keyRaw = String(key).trim();
      const normalized = keyRaw.toUpperCase();
      const grade = (GRADE_CODE_MAP[normalized] ?? GRADE_CODE_MAP[keyRaw]) as
        | (typeof GRADE_KEYS)[number]
        | undefined;
      if (!grade) continue;
      counts[grade] += toSafeCount(value);
    }
  }

  return counts;
};

const TimeSeriesPage: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const companyId = user?.companyId || '';

  const [models, setModels] = useState<ModelListResponse[]>([]);
  const [modelId, setModelId] = useState<string>('');
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs('2025-07', 'YYYY-MM'),
    dayjs('2025-12', 'YYYY-MM'),
  ]);
  const [loading, setLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);

  const [summary, setSummary] = useState<TsSnapshotSummary[]>([]);
  const [scoreDist, setScoreDist] = useState<TsScoreBin[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [featureName, setFeatureName] = useState<string>('');
  const [featureStats, setFeatureStats] = useState<TsFeatureStats[]>([]);
  const [psi, setPsi] = useState<TsPsiPoint[]>([]);
  const [migration, setMigration] = useState<TsMigration | null>(null);

  // Dashboard 전용 state
  const [scorePsi, setScorePsi] = useState<TsPsiPoint[]>([]);
  const [compareMonthA, setCompareMonthA] = useState<string>('');
  const [compareMonthB, setCompareMonthB] = useState<string>('');
  const [compareDistA, setCompareDistA] = useState<TsScoreBin[]>([]);
  const [compareDistB, setCompareDistB] = useState<TsScoreBin[]>([]);

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
          const list = response.data.data.content;
          setModels(list);
          if (!modelId && list.length > 0) {
            setModelId(pickDefaultModelId(list));
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
    const opts = monthOptions.map((o) => o.value);
    if (!opts.length) return;

    setCompareMonthA((prev) => (prev && opts.includes(prev) ? prev : opts[0]));
    setCompareMonthB((prev) => (prev && opts.includes(prev) ? prev : opts[opts.length - 1]));
  }, [monthOptions]);

  const fetchCompareDist = async (monthA: string, monthB: string) => {
    if (!companyId || !modelId || !monthA || !monthB) return;
    setCompareLoading(true);
    try {
      const [aRes, bRes] = await Promise.all([
        timeseriesService.scoreDistribution({ companyId, modelId, month: monthA }),
        timeseriesService.scoreDistribution({ companyId, modelId, month: monthB }),
      ]);
      setCompareDistA(aRes.data || []);
      setCompareDistB(bRes.data || []);
    } catch {
      setCompareDistA([]);
      setCompareDistB([]);
    } finally {
      setCompareLoading(false);
    }
  };

  useEffect(() => {
    if (!compareMonthA || !compareMonthB) return;
    void fetchCompareDist(compareMonthA, compareMonthB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, modelId, compareMonthA, compareMonthB]);

  const fetchAll = async () => {
    if (!companyId || !modelId || !range) {
      message.warning('companyId/modelId/기간을 확인해주세요.');
      return;
    }

    const fromMonth = formatMonth(range[0]);
    const toMonth = formatMonth(range[1]);
    // Base month is always the range start month.
    const baseMonthValue = fromMonth;
    const selectedMonth = toMonth || fromMonth;

    setLoading(true);
    try {
      const [summaryRes, scoreRes, featureListRes, scorePsiRes, distARes, distBRes] = await Promise.all([
        timeseriesService.snapshotSummary({ companyId, modelId, fromMonth, toMonth }),
        selectedMonth
          ? timeseriesService.scoreDistribution({ companyId, modelId, month: selectedMonth })
          : Promise.resolve({ success: true, data: [] }),
        timeseriesService.featureList({ companyId, modelId }),
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
        // Dashboard: score distribution compare A/B
        compareMonthA ? timeseriesService.scoreDistribution({ companyId, modelId, month: compareMonthA }) : Promise.resolve({ success: true, data: [] }),
        compareMonthB ? timeseriesService.scoreDistribution({ companyId, modelId, month: compareMonthB }) : Promise.resolve({ success: true, data: [] }),
      ]);

      setSummary(summaryRes.data || []);
      setScoreDist(scoreRes.data || []);
      setScorePsi(scorePsiRes.data || []);
      setCompareDistA(distARes.data || []);
      setCompareDistB(distBRes.data || []);

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
      const grades = normalizeGradeCounts(row.gradeCntJson);
      return {
        month: row.snapshotMonth,
        A: grades.A,
        B: grades.B,
        C: grades.C,
        D: grades.D,
        E: grades.E,
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

  /** PSI 추이 (Feature 기반) */
  const featurePsiChartData = useMemo(() => {
    return psi.map((row) => ({
      month: row.snapshotMonth,
      PSI: row.psiValue ?? 0,
    }));
  }, [psi]);

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
    const monthA = compareMonthA || '';
    const monthB = compareMonthB || '';
    const a = compareDistA.length > 0 ? compareDistA : [];
    const b = compareDistB.length > 0 ? compareDistB : [];
    if (a.length === 0 && b.length === 0) return [];

    const maxBins = Math.max(a.length, b.length);
    const result: { bin: string; [key: string]: string | number }[] = [];
    for (let i = 0; i < maxBins; i++) {
      const binLabel = a[i]
        ? `${a[i].binMin ?? ''}-${a[i].binMax ?? ''}`
        : b[i]
        ? `${b[i].binMin ?? ''}-${b[i].binMax ?? ''}`
        : `Bin ${i + 1}`;
      result.push({
        bin: binLabel,
        [monthA]: a[i]?.binCnt ?? 0,
        [monthB]: b[i]?.binCnt ?? 0,
      });
    }
    return result;
  }, [compareDistA, compareDistB, compareMonthA, compareMonthB]);

  const monthALabel = compareMonthA || '';
  const monthBLabel = compareMonthB || '';

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

  const migrationOverviewColumns = [
    { title: '항목', dataIndex: 'label', key: 'label' },
    { title: '값', dataIndex: 'value', key: 'value' },
  ];

  const migrationOverviewData = useMemo(() => {
    if (!migration) return [];
    return [
      { key: 'upgrade', label: '상승 비율', value: `${((migration.upgradeRate ?? 0) * 100).toFixed(1)}%` },
      { key: 'stay', label: '유지 비율', value: `${((migration.stayRate ?? 0) * 100).toFixed(1)}%` },
      { key: 'downgrade', label: '하락 비율', value: `${((migration.downgradeRate ?? 0) * 100).toFixed(1)}%` },
    ];
  }, [migration]);

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
        <Card
          title={monthALabel && monthBLabel ? `점수 분포 비교 (${monthALabel} vs ${monthBLabel})` : '점수 분포 비교'}
          size="small"
          extra={
            <Space size={8}>
              <Select
                style={{ width: 120 }}
                value={compareMonthA || undefined}
                options={monthOptions}
                onChange={(v) => setCompareMonthA(v)}
              />
              <span style={{ color: '#64748b' }}>vs</span>
              <Select
                style={{ width: 120 }}
                value={compareMonthB || undefined}
                options={monthOptions}
                onChange={(v) => setCompareMonthB(v)}
              />
            </Space>
          }
        >
          <Spin spinning={compareLoading}>
            {scoreDistCompareData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={scoreDistCompareData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
                  <XAxis dataKey="bin" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => fmt(v, 0)} />
                  <Legend />
                  <Bar dataKey={monthALabel} fill="#93c5fd" radius={[2, 2, 0, 0]} />
                  <Bar dataKey={monthBLabel} fill="#1e3a8a" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="데이터 없음" style={{ height: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
            )}
          </Spin>
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
          <Col span={10}>
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
          <Col span={8} style={{ display: 'flex', gap: 8 }}>
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
                      <Table
                        rowKey="key"
                        columns={migrationOverviewColumns}
                        dataSource={migrationOverviewData}
                        pagination={false}
                        locale={{ emptyText: 'No data' }}
                      />
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
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Card title="PSI 추이 (점수 기반)">
                      {psiChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                          <LineChart data={psiChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis domain={[0, 'auto']} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(v: unknown) => fmtPsi(v)} />
                            <Legend />
                            <ReferenceLine
                              y={0.25}
                              stroke="#ef4444"
                              strokeDasharray="4 4"
                              label={{ value: '위험 0.25', position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }}
                            />
                            <ReferenceLine
                              y={0.1}
                              stroke="#f97316"
                              strokeDasharray="4 4"
                              label={{ value: '주의 0.10', position: 'insideTopRight', fill: '#f97316', fontSize: 11 }}
                            />
                            <Line type="monotone" dataKey="PSI" stroke="#1e3a8a" strokeWidth={2} dot={{ r: 4, fill: '#1e3a8a' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <Empty description="데이터 없음" style={{ height: 260, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
                      )}
                      <div style={{ marginTop: 12 }}>
                        <Table rowKey="snapshotMonth" columns={psiColumns} dataSource={scorePsi} pagination={false} />
                      </div>
                    </Card>
                  </Col>

                  <Col span={24}>
                    <Card title={`PSI 추이 (피처 기반)${featureName ? `: ${featureName}` : ''}`}>
                      {featurePsiChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                          <LineChart data={featurePsiChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis domain={[0, 'auto']} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(v: unknown) => fmtPsi(v)} />
                            <Legend />
                            <ReferenceLine
                              y={0.25}
                              stroke="#ef4444"
                              strokeDasharray="4 4"
                              label={{ value: '위험 0.25', position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }}
                            />
                            <ReferenceLine
                              y={0.1}
                              stroke="#f97316"
                              strokeDasharray="4 4"
                              label={{ value: '주의 0.10', position: 'insideTopRight', fill: '#f97316', fontSize: 11 }}
                            />
                            <Line type="monotone" dataKey="PSI" stroke="#0f766e" strokeWidth={2} dot={{ r: 4, fill: '#0f766e' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <Empty description="데이터 없음" style={{ height: 260, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
                      )}
                      <div style={{ marginTop: 12 }}>
                        <Table rowKey="snapshotMonth" columns={psiColumns} dataSource={psi} pagination={false} />
                      </div>
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Spin>
    </div>
  );
};

export default TimeSeriesPage;
