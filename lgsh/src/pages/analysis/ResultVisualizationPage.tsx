import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Select,
  Space,
  Button,
  Table,
  Tag,
  message,
  Empty,
  Spin,
} from 'antd';
import {
  ReloadOutlined,
  FilePdfOutlined,
  DotChartOutlined,
  PieChartOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  Legend,
} from 'recharts';
import { useAppSelector } from '@/store/hooks';
import modelService from '@/services/modelService';
import resultVisualizationService from '@/services/resultVisualizationService';
import type { ModelListResponse, ResultVisualizationRow } from '@/types';
import './ResultVisualizationPage.css';

const { Title, Text } = Typography;

type ColumnType = 'numeric' | 'category' | 'id';

type ColumnDef = {
  key: keyof ResultVisualizationRow;
  label: string;
  type: ColumnType;
};

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'personId', label: '개인 ID', type: 'id' },
  { key: 'creditScore', label: '신용평점', type: 'numeric' },
  { key: 'creditGrade', label: '신용등급', type: 'category' },
  { key: 'marriageYn', label: '결혼 여부', type: 'category' },
  { key: 'childrenCnt', label: '자녀 수', type: 'numeric' },
  { key: 'educationCode', label: '학력 코드', type: 'category' },
  { key: 'homeTypeCode', label: '주거 형태 코드', type: 'category' },
  { key: 'carYn', label: '차량 보유 여부', type: 'category' },
  { key: 'assetAmt', label: '자산 금액', type: 'numeric' },
  { key: 'debtAmt', label: '부채 금액', type: 'numeric' },
  { key: 'creditCardCnt', label: '신용카드 수', type: 'numeric' },
  { key: 'annualIncome', label: '연소득', type: 'numeric' },
  { key: 'notes', label: '비고', type: 'category' },
];

const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];
const CREDIT_GRADE_LABEL_MAP: Record<string, string> = {
  A: 'A등급 (900~)',
  B: 'B등급 (800~899)',
  C: 'C등급 (700~799)',
  D: 'D등급 (600~699)',
  E: 'E등급 (~599)',
};
const EDUCATION_LABEL_MAP: Record<string, string> = {
  '1': '고졸',
  '2': '전문학사',
  '3': '학사',
  '4': '석사',
  '5': '박사',
};
const HOME_TYPE_LABEL_MAP: Record<string, string> = {
  '1': '자가',
  '2': '전세',
  '3': '월세',
  '4': '기타',
};

type NumericStats = {
  columnKey: keyof ResultVisualizationRow;
  columnLabel: string;
  count: number;
  mean: number;
  stddev: number;
  min: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  max: number;
  bottom5Count: number;
  top5Count: number;
  bottom5Rate: number;
  top5Rate: number;
};

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const percentile = (sorted: number[], p: number): number => {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return sorted[low];
  const ratio = idx - low;
  return sorted[low] * (1 - ratio) + sorted[high] * ratio;
};

const round2 = (value: number): number => Number(value.toFixed(2));
const round0 = (value: number): number => Math.round(value);
const formatNumber = (value: number): string => value.toLocaleString('ko-KR');

const formatCategoryValue = (columnKey: keyof ResultVisualizationRow, raw: unknown): string => {
  if (raw === null || raw === undefined || raw === '') return '미입력';
  const value = String(raw).trim();
  const upper = value.toUpperCase();

  if (columnKey === 'creditGrade') {
    const gradeKey = upper.charAt(0);
    return CREDIT_GRADE_LABEL_MAP[gradeKey] || `${value}등급`;
  }
  if (columnKey === 'marriageYn') {
    if (upper === 'Y' || value === '1') return '기혼';
    if (upper === 'N' || value === '0') return '미혼';
    return value;
  }
  if (columnKey === 'carYn') {
    if (upper === 'Y' || value === '1') return '보유';
    if (upper === 'N' || value === '0') return '미보유';
    return value;
  }
  if (columnKey === 'educationCode') {
    return EDUCATION_LABEL_MAP[value] || (value.match(/^\d+$/) ? `학력코드 ${value}` : value);
  }
  if (columnKey === 'homeTypeCode') {
    return HOME_TYPE_LABEL_MAP[value] || (value.match(/^\d+$/) ? `주거코드 ${value}` : value);
  }
  if (columnKey === 'notes') {
    return value.length > 20 ? `${value.slice(0, 20)}...` : value;
  }

  return value;
};

const buildNumericStats = (values: number[], key: keyof ResultVisualizationRow, label: string): NumericStats => {
  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, cur) => acc + cur, 0);
  const mean = count ? sum / count : 0;
  const variance = count ? sorted.reduce((acc, cur) => acc + (cur - mean) ** 2, 0) / count : 0;
  const stddev = Math.sqrt(variance);
  const p5 = percentile(sorted, 0.05);
  const p25 = percentile(sorted, 0.25);
  const p50 = percentile(sorted, 0.5);
  const p75 = percentile(sorted, 0.75);
  const p95 = percentile(sorted, 0.95);
  const bottom5Count = sorted.filter((v) => v <= p5).length;
  const top5Count = sorted.filter((v) => v >= p95).length;

  return {
    columnKey: key,
    columnLabel: label,
    count,
    mean: round2(mean),
    stddev: round2(stddev),
    min: round2(sorted[0] ?? 0),
    p5: round2(p5),
    p25: round2(p25),
    p50: round2(p50),
    p75: round2(p75),
    p95: round2(p95),
    max: round2(sorted[sorted.length - 1] ?? 0),
    bottom5Count,
    top5Count,
    bottom5Rate: count ? round2((bottom5Count / count) * 100) : 0,
    top5Rate: count ? round2((top5Count / count) * 100) : 0,
  };
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR');
};

const ResultVisualizationPage: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const reportRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [deployedModels, setDeployedModels] = useState<ModelListResponse[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();
  const [activeModelNm, setActiveModelNm] = useState<string | null>(null);
  const [activeDeployedDt, setActiveDeployedDt] = useState<string | null>(null);

  const [rows, setRows] = useState<ResultVisualizationRow[]>([]);

  const [selectedColumns, setSelectedColumns] = useState<(keyof ResultVisualizationRow)[]>([
    'creditScore',
    'creditGrade',
    'annualIncome',
    'assetAmt',
    'debtAmt',
    'creditCardCnt',
    'marriageYn',
  ]);

  const [histogramColumn, setHistogramColumn] = useState<keyof ResultVisualizationRow>('creditScore');
  const [categoryColumn, setCategoryColumn] = useState<keyof ResultVisualizationRow>('creditGrade');
  const [scatterX, setScatterX] = useState<keyof ResultVisualizationRow>('annualIncome');
  const [scatterY, setScatterY] = useState<keyof ResultVisualizationRow>('creditScore');

  const numericDefs = useMemo(
    () => COLUMN_DEFS.filter((c) => c.type === 'numeric' && selectedColumns.includes(c.key)),
    [selectedColumns]
  );
  const categoryDefs = useMemo(
    () => COLUMN_DEFS.filter((c) => c.type === 'category' && selectedColumns.includes(c.key)),
    [selectedColumns]
  );

  const labelMap = useMemo(() => {
    const map: Record<string, string> = {};
    COLUMN_DEFS.forEach((def) => {
      map[String(def.key)] = def.label;
    });
    return map;
  }, []);

  const histogramLabel = labelMap[String(histogramColumn)] || String(histogramColumn);
  const categoryLabel = labelMap[String(categoryColumn)] || String(categoryColumn);
  const scatterXLabel = labelMap[String(scatterX)] || String(scatterX);
  const scatterYLabel = labelMap[String(scatterY)] || String(scatterY);

  useEffect(() => {
    if (numericDefs.length) {
      if (!numericDefs.some((def) => def.key === histogramColumn)) {
        setHistogramColumn(numericDefs[0].key);
      }
      if (!numericDefs.some((def) => def.key === scatterX)) {
        setScatterX(numericDefs[0].key);
      }
      if (!numericDefs.some((def) => def.key === scatterY)) {
        setScatterY((numericDefs[1] || numericDefs[0]).key);
      }
    }
  }, [numericDefs, histogramColumn, scatterX, scatterY]);

  useEffect(() => {
    if (categoryDefs.length && !categoryDefs.some((def) => def.key === categoryColumn)) {
      setCategoryColumn(categoryDefs[0].key);
    }
  }, [categoryDefs, categoryColumn]);

  const loadDeployedModels = async (): Promise<string | undefined> => {
    setModelLoading(true);
    try {
      const response = await modelService.list({ page: 0, size: 200 });
      if (!response.data?.success || !response.data?.data?.content) {
        message.warning('모델 목록을 불러오지 못했습니다.');
        return undefined;
      }

      const allModels = response.data.data.content;
      const deployed = allModels.filter((m) => m.approvalStatus === 'DEPLOYED');
      setDeployedModels(deployed);

      if (!deployed.length) {
        setSelectedModelId(undefined);
        setActiveModelNm(null);
        setActiveDeployedDt(null);
        message.warning('배포중인 모델이 없어 결과 시각화를 조회할 수 없습니다.');
        return undefined;
      }

      const nextModelId =
        selectedModelId && deployed.some((m) => m.modelId === selectedModelId)
          ? selectedModelId
          : deployed[0].modelId;

      setSelectedModelId(nextModelId);
      return nextModelId;
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || '배포 모델 목록 조회에 실패했습니다.');
      return undefined;
    } finally {
      setModelLoading(false);
    }
  };

  const loadData = async (targetModelId?: string) => {
    const modelIdToLoad = targetModelId || selectedModelId;
    if (!modelIdToLoad) {
      message.warning('조회할 배포 모델을 먼저 선택해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await resultVisualizationService.getData({
        modelId: modelIdToLoad,
        maxRows: 50000,
      });

      if (!res.success || !res.data) {
        message.error(res.message || '결과 시각화 데이터 조회에 실패했습니다.');
        return;
      }

      setRows(res.data.rows || []);
      setActiveModelNm(res.data.modelNm);
      setActiveDeployedDt(res.data.deployedDt);
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || '데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const modelId = await loadDeployedModels();
      if (modelId) {
        await loadData(modelId);
      }
    };
    void initialize();
  }, []);

  const numericStats = useMemo(() => {
    return numericDefs.map((def) => {
      const values = rows
        .map((row) => asNumber(row[def.key]))
        .filter((v): v is number => v !== null);
      return buildNumericStats(values, def.key, def.label);
    });
  }, [numericDefs, rows]);

  const histogramEligibleDefs = useMemo(() => {
    return numericDefs.filter((def) => {
      const values = rows
        .map((row) => asNumber(row[def.key]))
        .filter((v): v is number => v !== null);
      if (values.length < 5) return false;
      const uniqueCount = new Set(values.map((v) => round2(v))).size;
      return uniqueCount >= 2;
    });
  }, [numericDefs, rows]);

  const pieEligibleDefs = useMemo(() => {
    return categoryDefs.filter((def) => {
      const values = rows
        .map((row) => formatCategoryValue(def.key, row[def.key]))
        .filter((v) => v !== '미입력');
      if (values.length < 3) return false;
      const uniqueCount = new Set(values).size;
      return uniqueCount >= 2;
    });
  }, [categoryDefs, rows]);

  useEffect(() => {
    if (!histogramEligibleDefs.length) return;
    if (!histogramEligibleDefs.some((def) => def.key === histogramColumn)) {
      setHistogramColumn(histogramEligibleDefs[0].key);
    }
  }, [histogramEligibleDefs, histogramColumn]);

  useEffect(() => {
    if (!pieEligibleDefs.length) return;
    if (!pieEligibleDefs.some((def) => def.key === categoryColumn)) {
      setCategoryColumn(pieEligibleDefs[0].key);
    }
  }, [pieEligibleDefs, categoryColumn]);

  const histogramData = useMemo(() => {
    const values = rows
      .map((row) => asNumber(row[histogramColumn]))
      .filter((v): v is number => v !== null);
    if (!values.length) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      return [{ bucket: '구간 1', rangeLabel: `${formatNumber(round0(min))}`, count: values.length }];
    }

    const bins = 10;
    const width = (max - min) / bins;
    const counts = new Array<number>(bins).fill(0);
    values.forEach((v) => {
      const idx = Math.min(Math.floor((v - min) / width), bins - 1);
      counts[idx] += 1;
    });

    return counts.map((count, i) => {
      const start = min + i * width;
      const end = start + width;
      return {
        bucket: `구간 ${i + 1}`,
        rangeLabel: `${formatNumber(round0(start))}~${formatNumber(round0(end))}`,
        count,
      };
    });
  }, [histogramColumn, rows]);

  const categoryData = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const raw = row[categoryColumn];
      const key = formatCategoryValue(categoryColumn, raw);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [categoryColumn, rows]);

  const scatterEligibleDefs = useMemo(() => {
    return numericDefs.filter((def) => {
      const values = rows
        .map((row) => asNumber(row[def.key]))
        .filter((v): v is number => v !== null);
      if (values.length < 10) return false;
      const uniqueCount = new Set(values.map((v) => round2(v))).size;
      return uniqueCount >= 5;
    });
  }, [numericDefs, rows]);

  useEffect(() => {
    if (!scatterEligibleDefs.length) return;
    if (!scatterEligibleDefs.some((def) => def.key === scatterX)) {
      setScatterX(scatterEligibleDefs[0].key);
    }
    if (!scatterEligibleDefs.some((def) => def.key === scatterY)) {
      setScatterY((scatterEligibleDefs[1] || scatterEligibleDefs[0]).key);
    }
  }, [scatterEligibleDefs, scatterX, scatterY]);

  const scatterData = useMemo(() => {
    return rows
      .map((row) => {
        const x = asNumber(row[scatterX]);
        const y = asNumber(row[scatterY]);
        return x !== null && y !== null ? { x, y } : null;
      })
      .filter((v): v is { x: number; y: number } => v !== null)
      .slice(0, 3000);
  }, [rows, scatterX, scatterY]);

  const exportPdf = async () => {
    if (!reportRef.current) return;
    setPdfLoading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(reportRef.current, {
        scale: 1.4,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const image = canvas.toDataURL('image/png');
      const pdf = new jsPDF('portrait', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const width = canvas.width * ratio;
      const height = canvas.height * ratio;
      const x = (pageWidth - width) / 2;
      const y = 24;
      pdf.addImage(image, 'PNG', x, y, width, height);
      pdf.save(`result-visualization-${selectedModelId || 'model'}.pdf`);
    } catch {
      message.error('PDF 다운로드에 실패했습니다.');
    } finally {
      setPdfLoading(false);
    }
  };

  const statsColumns = [
    { title: '컬럼', dataIndex: 'columnLabel', key: 'columnLabel', fixed: 'left' as const, width: 180 },
    { title: '건수', dataIndex: 'count', key: 'count', width: 90 },
    { title: '평균', dataIndex: 'mean', key: 'mean', width: 90 },
    { title: '표준편차', dataIndex: 'stddev', key: 'stddev', width: 100 },
    { title: '최소', dataIndex: 'min', key: 'min', width: 90 },
    { title: 'P5', dataIndex: 'p5', key: 'p5', width: 90 },
    { title: 'P25', dataIndex: 'p25', key: 'p25', width: 90 },
    { title: 'P50(중앙값)', dataIndex: 'p50', key: 'p50', width: 110 },
    { title: 'P75', dataIndex: 'p75', key: 'p75', width: 90 },
    { title: 'P95', dataIndex: 'p95', key: 'p95', width: 90 },
    { title: '최대', dataIndex: 'max', key: 'max', width: 90 },
    {
      title: '하위 5% (건수/비율)',
      key: 'bottom5',
      width: 170,
      render: (_: unknown, row: NumericStats) => `${row.bottom5Count} / ${row.bottom5Rate}%`,
    },
    {
      title: '상위 5% (건수/비율)',
      key: 'top5',
      width: 170,
      render: (_: unknown, row: NumericStats) => `${row.top5Count} / ${row.top5Rate}%`,
    },
  ];

  return (
    <div className="result-visualization-page fade-in">
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <DotChartOutlined style={{ marginRight: 8 }} />
          결과 시각화
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          배포중 모델의 신용평가 결과를 기준으로 통계/그래프를 생성하고 PDF 보고서로 다운로드합니다.
        </Text>
      </div>

      <Card className="filter-card" title="분석 설정">
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={14}>
              <Text className="filter-label">배포중 모델 선택</Text>
              <Select
                style={{ width: '100%' }}
                value={selectedModelId}
                loading={modelLoading}
                placeholder="배포중 모델을 선택하세요"
                options={deployedModels.map((m) => ({
                  value: m.modelId,
                  label: `${m.modelNm} (${m.modelId})`,
                }))}
                onChange={(value) => setSelectedModelId(value)}
              />
            </Col>
            <Col xs={24} md={10}>
              <Text className="filter-label">조회 범위</Text>
              <div className="company-tag-wrap">
                <Tag color="blue">{user?.companyId || 'N/A'}</Tag>
                <Tag>{user?.roleId || 'ROLE_UNKNOWN'}</Tag>
                {activeDeployedDt ? <Tag color="cyan">배포일: {formatDateTime(activeDeployedDt)}</Tag> : null}
              </div>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Text className="filter-label">분석 컬럼 선택</Text>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                value={selectedColumns}
                options={COLUMN_DEFS.map((c) => ({ value: c.key, label: c.label }))}
                onChange={(values) => setSelectedColumns(values as (keyof ResultVisualizationRow)[])}
                placeholder="분석할 컬럼을 선택하세요"
              />
            </Col>
            <Col xs={24} md={3}>
              <Text className="filter-label">히스토그램 컬럼</Text>
              <Select
                style={{ width: '100%' }}
                value={histogramColumn}
                options={histogramEligibleDefs.map((c) => ({ value: c.key, label: c.label }))}
                disabled={!histogramEligibleDefs.length}
                onChange={(v) => setHistogramColumn(v)}
              />
            </Col>
            <Col xs={24} md={3}>
              <Text className="filter-label">파이 차트 컬럼</Text>
              <Select
                style={{ width: '100%' }}
                value={categoryColumn}
                options={pieEligibleDefs.map((c) => ({ value: c.key, label: c.label }))}
                disabled={!pieEligibleDefs.length}
                onChange={(v) => setCategoryColumn(v)}
              />
            </Col>
            <Col xs={24} md={3}>
              <Text className="filter-label">산점도 X</Text>
              <Select
                style={{ width: '100%' }}
                value={scatterX}
                options={scatterEligibleDefs.map((c) => ({ value: c.key, label: c.label }))}
                disabled={!scatterEligibleDefs.length}
                onChange={(v) => setScatterX(v)}
              />
            </Col>
            <Col xs={24} md={3}>
              <Text className="filter-label">산점도 Y</Text>
              <Select
                style={{ width: '100%' }}
                value={scatterY}
                options={scatterEligibleDefs.map((c) => ({ value: c.key, label: c.label }))}
                disabled={!scatterEligibleDefs.length}
                onChange={(v) => setScatterY(v)}
              />
            </Col>
          </Row>

          <div>
            <Text type="secondary" className="chart-rule-hint">
              차트 선택 기준: 히스토그램(수치형, 데이터 5건 이상, 고유값 2개 이상) / 파이·도넛(범주형, 유효 데이터 3건 이상, 고유값 2개 이상) / 산점도(수치형, 데이터 10건 이상, 고유값 5개 이상)
            </Text>
          </div>

          <div className="action-row">
            <Button icon={<ReloadOutlined />} onClick={() => void loadDeployedModels()} loading={modelLoading}>
              배포 모델 새로고침
            </Button>
            <Button icon={<ReloadOutlined />} type="primary" onClick={() => void loadData()} loading={loading}>
              결과 조회/분석
            </Button>
            <Button icon={<FilePdfOutlined />} onClick={exportPdf} loading={pdfLoading} disabled={!rows.length}>
              PDF 다운로드
            </Button>
          </div>
        </Space>
      </Card>

      <Spin spinning={loading}>
        {!rows.length ? (
          <Card>
            <Empty description="조회된 결과가 없습니다. 배포중 모델을 선택하고 조회를 실행해 주세요." />
          </Card>
        ) : (
          <div ref={reportRef} className="report-area">
            <Row gutter={[12, 12]} className="summary-cards">
              <Col xs={24} md={6}>
                <Card className="summary-card">
                  <Text type="secondary">조회 건수</Text>
                  <div className="summary-value">{rows.length.toLocaleString()}</div>
                </Card>
              </Col>
              <Col xs={24} md={6}>
                <Card className="summary-card">
                  <Text type="secondary">분석 모델</Text>
                  <div className="summary-value summary-model">{activeModelNm || '-'}</div>
                </Card>
              </Col>
              <Col xs={24} md={6}>
                <Card className="summary-card">
                  <Text type="secondary">수치형 컬럼</Text>
                  <div className="summary-value">{numericDefs.length}</div>
                </Card>
              </Col>
              <Col xs={24} md={6}>
                <Card className="summary-card">
                  <Text type="secondary">범주형 컬럼</Text>
                  <div className="summary-value">{categoryDefs.length}</div>
                </Card>
              </Col>
            </Row>

            <Card title="수치형 통계 요약" className="chart-card">
              <Table
                rowKey="columnKey"
                size="small"
                columns={statsColumns}
                dataSource={numericStats}
                pagination={false}
                scroll={{ x: 1500 }}
              />
            </Card>

            <Row gutter={[12, 12]}>
              <Col xs={24} lg={12}>
                <Card title={<span><BarChartOutlined /> 히스토그램 - {histogramLabel}</span>} className="chart-card">
                  {histogramData.length && histogramEligibleDefs.length ? (
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={histogramData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} interval={0} />
                          <YAxis />
                          <Tooltip
                            formatter={(value: unknown, name: string) => {
                              if (name === 'count') return [formatNumber(Number(value || 0)), '건수'];
                              return [value, name];
                            }}
                            labelFormatter={(_: unknown, payload: any) => {
                              const item = payload?.[0]?.payload;
                              return item?.rangeLabel ? `범위: ${item.rangeLabel}` : '범위';
                            }}
                          />
                          <Bar dataKey="count" fill="#2563eb" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Empty description="히스토그램으로 표현 가능한 컬럼이 없습니다." />
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title={<span><PieChartOutlined /> 파이/도넛 분포 - {categoryLabel}</span>} className="chart-card">
                  {categoryData.length && pieEligibleDefs.length ? (
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={110} label>
                            {categoryData.map((_, idx) => (
                              <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: unknown) => [formatNumber(Number(value || 0)), '건수']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Empty description="파이/도넛으로 표현 가능한 컬럼이 없습니다." />
                  )}
                </Card>
              </Col>
            </Row>

            <Card title={<span><DotChartOutlined /> 산점도 - X:{scatterXLabel}, Y:{scatterYLabel}</span>} className="chart-card">
              {scatterData.length ? (
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={340}>
                    <ScatterChart>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="x" name="x" />
                      <YAxis type="number" dataKey="y" name="y" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="samples" data={scatterData} fill="#0ea5e9" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty description="산점도로 표현 가능한 수치형 항목이 부족합니다. (데이터 10건 이상, 값 종류 5개 이상)" />
              )}
            </Card>
          </div>
        )}
      </Spin>
    </div>
  );
};

export default ResultVisualizationPage;
