import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  Tabs,
  Typography,
  Button,
  Table,
  Spin,
  message,
  Tag,
  Modal,
  Input,
  DatePicker,
  Select,
  InputNumber,
  Progress,
  Space,
} from 'antd';
import { PlusOutlined, HeatMapOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';
import { creditService } from '@/services';
import type {
  CreditBasicStatsResult,
  CreditCorrelationPair,
  CreditCorrelationResult,
  CreditMissingPatternItem,
  CreditOutlierItem,
  CreditOutlierResult,
} from '@/types';
import dayjs, { Dayjs } from 'dayjs';
import './EdaAnalysisPage.css';

const { Title, Text } = Typography;

const tabKeys = {
  summary: 'summary',
  tab2: 'tab2',
  correlation: 'correlation',
  tab3: 'tab3',
  tab4: 'tab4',
};

const VARIABLE_LABELS: Record<string, string> = {
  // 필요시 한글 매핑을 여기에 추가하세요.
  // 예: "RES_WOE": "거주안정(woe)"
};

const TOKEN_LABELS: Record<string, string> = {
  LOAN: '대출',
  CARD: '카드',
  LUMP: '일시불',
  INST: '할부',
  AMT: '금액',
  CHG: '증감',
  M: '개월',
  MAX: '최대',
  CNT: '건수',
  NEW: '신규',
  LIMIT: '한도',
  ISSUE: '발급',
  CASH: '현금',
  ADV: '서비스',
};

const applyTokenLabels = (value: string) => {
  const tokens = value.split(/[\s:_-]+/);
  let monthPrefix = '';
  const replaced = tokens.map((token) => {
    const upper = token.toUpperCase();
    const monthMatch = upper.match(/^(\d+)\s*M$/) || upper.match(/^(\d+)M$/);
    if (monthMatch) {
      monthPrefix = `${monthMatch[1]}개월`;
      return '';
    }
    return TOKEN_LABELS[upper] || token;
  });
  const body = replaced.filter(Boolean).join(' ').trim();
  return monthPrefix ? `${monthPrefix} ${body}`.trim() : body;
};

const getDisplayLabel = (name: string) => {
  if (VARIABLE_LABELS[name]) return VARIABLE_LABELS[name];
  const cleaned = name.replace(/_WOE$/i, '').replace(/_/g, ' ');
  return applyTokenLabels(cleaned);
};

const toPercent = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  const normalized = value > 1 ? value : value * 100;
  return Math.max(0, Math.min(100, Number(normalized)));
};

const getMissingStatus = (rate?: number | null) => {
  const percent = toPercent(rate);
  if (percent >= 20) return { label: '위험', color: 'red' };
  if (percent >= 10) return { label: '경고', color: 'orange' };
  if (percent >= 5) return { label: '주의', color: 'gold' };
  return { label: '정상', color: 'green' };
};

const getMissingColor = (rate?: number | null) => {
  const status = getMissingStatus(rate);
  switch (status.label) {
    case '위험':
      return '#e11d48';
    case '경고':
      return '#f97316';
    case '주의':
      return '#facc15';
    default:
      return '#22c55e';
  }
};

const EdaAnalysisPage: React.FC = () => {
  const [activeKey, setActiveKey] = useState(tabKeys.summary);
  const [loading, setLoading] = useState(false);
  const [correlation, setCorrelation] = useState<CreditCorrelationResult | null>(null);
  const [basicStats, setBasicStats] = useState<CreditBasicStatsResult | null>(null);
  const [basicStatsLoading, setBasicStatsLoading] = useState(false);
  const [statsPage, setStatsPage] = useState(1);
  const [statsSearch, setStatsSearch] = useState('');
  const [expandedHeatmap] = useState(false);
  const [heatmapModalOpen, setHeatmapModalOpen] = useState(false);
  const pdfRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [missingLoading, setMissingLoading] = useState(false);
  const [missingItems, setMissingItems] = useState<CreditMissingPatternItem[]>([]);
  const [missingStartDate, setMissingStartDate] = useState<Dayjs | null>(
    dayjs().subtract(1, 'month')
  );
  const [missingEndDate, setMissingEndDate] = useState<Dayjs | null>(dayjs());
  const [outlierLoading, setOutlierLoading] = useState(false);
  const [outlierItems, setOutlierItems] = useState<CreditOutlierItem[]>([]);
  const [outlierSummary, setOutlierSummary] = useState<CreditOutlierResult['summary']>(null);
  const [variableOptions, setVariableOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [variableLoading, setVariableLoading] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<string | undefined>(undefined);
  const [outlierMethod, setOutlierMethod] = useState('Z-Score');
  const [outlierThreshold, setOutlierThreshold] = useState<number>(3);

  const fetchCorrelation = async (selectedModelId?: string) => {
    setLoading(true);
    try {
      const response = await creditService.analysis(selectedModelId);
      if (response.success && response.data) {
        setCorrelation(response.data);
      } else {
        message.error(response.message || '상관관계 데이터 조회에 실패했습니다.');
      }
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          '상관관계 데이터를 불러오는 중 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((activeKey === tabKeys.summary || activeKey === tabKeys.correlation) && !correlation) {
      fetchCorrelation();
    }
  }, [activeKey, correlation]);

  const fetchBasicStats = async (page = statsPage, search = statsSearch) => {
    setBasicStatsLoading(true);
    try {
      const response = await creditService.basicStats({
        page,
        size: 10,
        search: search || undefined,
      });
      if (response.success && response.data) {
        setBasicStats(response.data);
      } else {
        message.error(response.message || '기초통계량 조회에 실패했습니다.');
      }
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          '기초통계량 조회 중 오류가 발생했습니다.'
      );
    } finally {
      setBasicStatsLoading(false);
    }
  };

  const fetchMissingPatterns = async () => {
    setMissingLoading(true);
    try {
      const response = await creditService.missingPatterns({
        startDate: missingStartDate ? missingStartDate.format('YYYY-MM-DD') : undefined,
        endDate: missingEndDate ? missingEndDate.format('YYYY-MM-DD') : undefined,
      });
      if (response.success && response.data) {
        const payload = Array.isArray(response.data) ? response.data : [response.data];
        const items =
          payload
            .flatMap((entry: any) => entry?.items || entry?.list || entry?.rows || entry || [])
            .filter(Boolean) || [];
        setMissingItems(items);
      } else {
        message.error(response.message || '결측치 패턴 조회에 실패했습니다.');
      }
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          '결측치 패턴을 불러오는 중 오류가 발생했습니다.'
      );
    } finally {
      setMissingLoading(false);
    }
  };

  const fetchVariableOptions = async () => {
    if (variableLoading) return;
    setVariableLoading(true);
    try {
      const response = await creditService.basicStats({ page: 1, size: 200 });
      if (response.success && response.data?.variables) {
        const options = response.data.variables.map((variable) => ({
          label: variable.displayName || getDisplayLabel(variable.name),
          value: variable.name,
        }));
        setVariableOptions(options);
        if (!selectedVariable && options.length > 0) {
          setSelectedVariable(options[0].value);
        }
      }
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          '변수 목록을 불러오는 중 오류가 발생했습니다.'
      );
    } finally {
      setVariableLoading(false);
    }
  };

  const fetchOutliers = async () => {
    if (!selectedVariable) {
      message.warning('변수를 선택해주세요.');
      return;
    }
    setOutlierLoading(true);
    try {
      const response = await creditService.outliers({
        variableSeq: selectedVariable,
        method: outlierMethod,
        threshold: outlierThreshold,
      });
      if (response.success && response.data) {
        const payload = Array.isArray(response.data) ? response.data : [response.data];
        const items =
          payload
            .flatMap((entry: any) => entry?.outliers || entry?.list || entry?.rows || entry || [])
            .filter(Boolean) || [];
        setOutlierItems(items);
        const summary = payload.find((entry: any) => entry?.summary)?.summary || null;
        setOutlierSummary(summary);
      } else {
        message.error(response.message || '이상치 목록 조회에 실패했습니다.');
      }
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          '이상치 목록을 불러오는 중 오류가 발생했습니다.'
      );
    } finally {
      setOutlierLoading(false);
    }
  };

  useEffect(() => {
    if (activeKey === tabKeys.summary || activeKey === tabKeys.tab2) {
      fetchBasicStats(statsPage, statsSearch);
    }
  }, [activeKey, statsPage, statsSearch]);

  useEffect(() => {
    if (activeKey === tabKeys.summary || activeKey === tabKeys.tab3) {
      if (missingItems.length === 0) {
        fetchMissingPatterns();
      }
    }
  }, [activeKey, missingStartDate, missingEndDate]);

  useEffect(() => {
    if ((activeKey === tabKeys.summary || activeKey === tabKeys.tab4) && variableOptions.length === 0) {
      fetchVariableOptions();
    }
  }, [activeKey, variableOptions.length]);

  useEffect(() => {
    if ((activeKey === tabKeys.summary || activeKey === tabKeys.tab4) && selectedVariable && outlierItems.length === 0) {
      fetchOutliers();
    }
  }, [activeKey, selectedVariable]);

  const summaryCards = [
    { key: tabKeys.tab2, title: '기초통계 요약', position: 'summary-card top-left' },
    { key: tabKeys.correlation, title: '상관관계 요약', position: 'summary-card top-right' },
    { key: tabKeys.tab3, title: '결측치 패턴 요약', position: 'summary-card bottom-left' },
    { key: tabKeys.tab4, title: '이상치 탐지 요약', position: 'summary-card bottom-right' },
  ];

  const heatmap = useMemo(() => {
    if (!correlation) {
      return null;
    }
    const variables = correlation.variables;
    const matrix = correlation.correlationMatrix;
    const topVariables = getTopVariablesFromPairs(
      correlation.pairs || [],
      expandedHeatmap ? 10 : 5
    );
    return (
      <div className="heatmap-wrapper">
        <div className="heatmap-toolbar">
          <Button type="link" size="small" onClick={() => setHeatmapModalOpen(true)}>
            확대 보기(10x10)
          </Button>
        </div>
        <table className={`heatmap-table ${expandedHeatmap ? 'heatmap-10' : 'heatmap-5'}`}>
          <thead>
            <tr>
              <th className="heatmap-corner" />
              {topVariables.map((label) => (
                <th key={`col-${label}`} className="heatmap-header">
                  <span>{getDisplayLabel(label)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topVariables.map((rowLabel) => {
              const rowIndex = variables.indexOf(rowLabel);
              return (
              <tr key={`row-${rowLabel}`}>
                <th className="heatmap-header">{getDisplayLabel(rowLabel)}</th>
                {topVariables.map((colLabel) => {
                  const colIndex = variables.indexOf(colLabel);
                  const value = matrix[rowIndex]?.[colIndex] ?? 0;
                  const bg = heatmapColor(value);
                  return (
                    <td
                      key={`cell-${rowLabel}-${colLabel}`}
                      className="heatmap-cell"
                      style={{ backgroundColor: bg }}
                      title={`${rowLabel} / ${colLabel}: ${value.toFixed(3)}`}
                    >
                      {value.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    );
  }, [correlation, expandedHeatmap]);

  const pairs = useMemo(() => {
    if (!correlation?.pairs) {
      return [];
    }
    return correlation.pairs
      .filter((pair) => pair.corrCoef !== null && Math.abs(pair.corrCoef) < 0.8)
      .filter((pair) => !isExcludedVariable(pair.var1) && !isExcludedVariable(pair.var2))
      .filter((pair) => !isPeriodPair(pair.var1, pair.var2))
      .slice(0, 10)
      .map((pair, index) => ({
        key: `${pair.var1}-${pair.var2}-${index}`,
        ...pair,
    }));
  }, [correlation]);

  const columns = [
    {
      title: '변수 1',
      dataIndex: 'var1',
      key: 'var1',
      width: 180,
      render: (value: string) => getDisplayLabel(value),
    },
    {
      title: '변수 2',
      dataIndex: 'var2',
      key: 'var2',
      width: 180,
      render: (value: string) => getDisplayLabel(value),
    },
    {
      title: '상관계수',
      dataIndex: 'corrCoef',
      key: 'corrCoef',
      width: 120,
      render: (value: number | null | undefined) =>
        value === null || value === undefined ? '-' : value.toFixed(4),
    },
    {
      title: '샘플수',
      dataIndex: 'sampleCount',
      key: 'sampleCount',
      width: 120,
    },
  ];

  const basicStatsColumns = [
    {
      title: '변수',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (_value: string, record: any) => (
        <div>
          <div>{record.displayName || getDisplayLabel(record.name)}</div>
          <Text type="secondary">{record.name}</Text>
        </div>
      ),
    },
    {
      title: '건수',
      dataIndex: 'count',
      key: 'count',
      width: 110,
    },
    {
      title: '평균',
      dataIndex: 'mean',
      key: 'mean',
      width: 110,
      render: (value: number | null | undefined) =>
        value === null || value === undefined ? '-' : value.toFixed(4),
    },
    {
      title: '중앙값',
      dataIndex: 'median',
      key: 'median',
      width: 110,
      render: (value: number | null | undefined) =>
        value === null || value === undefined ? '-' : value.toFixed(4),
    },
    {
      title: '최소',
      dataIndex: 'min',
      key: 'min',
      width: 110,
      render: (value: number | null | undefined) =>
        value === null || value === undefined ? '-' : value.toFixed(4),
    },
    {
      title: '최대',
      dataIndex: 'max',
      key: 'max',
      width: 110,
      render: (value: number | null | undefined) =>
        value === null || value === undefined ? '-' : value.toFixed(4),
    },
    {
      title: '표준편차',
      dataIndex: 'stddev',
      key: 'stddev',
      width: 110,
      render: (value: number | null | undefined) =>
        value === null || value === undefined ? '-' : value.toFixed(4),
    },
  ];

  const missingColumns = [
    {
      title: '번호',
      dataIndex: 'rownum',
      key: 'rownum',
      width: 90,
      render: (_value: number | string | undefined, _record: CreditMissingPatternItem, index: number) =>
        _value ?? index + 1,
    },
    {
      title: '변수명',
      dataIndex: 'variableName',
      key: 'variableName',
      width: 220,
      render: (_value: string | undefined, record: CreditMissingPatternItem) =>
        record.variableName || (record as any).variableNm || (record as any).variable_nm || '-',
    },
    {
      title: '전체 건수',
      dataIndex: 'totalCount',
      key: 'totalCount',
      width: 140,
      align: 'right' as const,
      render: (_value: number | undefined, record: CreditMissingPatternItem) =>
        record.totalCount ?? (record as any).total_count ?? '-',
    },
    {
      title: '결측 건수',
      dataIndex: 'missingCount',
      key: 'missingCount',
      width: 140,
      align: 'right' as const,
      render: (_value: number | undefined, record: CreditMissingPatternItem) =>
        record.missingCount ?? (record as any).missing_count ?? '-',
    },
    {
      title: '결측률',
      dataIndex: 'missingRate',
      key: 'missingRate',
      width: 140,
      render: (_value: number | undefined, record: CreditMissingPatternItem) => {
        const rate = record.missingRate ?? (record as any).missing_rate ?? 0;
        const percent = toPercent(rate);
        const status = getMissingStatus(rate);
        return (
          <Space>
            <Tag color={status.color}>{status.label}</Tag>
            <span>{percent.toFixed(2)}%</span>
          </Space>
        );
      },
    },
    {
      title: '상태',
      dataIndex: 'missingStatus',
      key: 'missingStatus',
      width: 120,
      render: (_value: string | null | undefined, record: CreditMissingPatternItem) => {
        const label =
          record.missingStatus || (record as any).missing_status || getMissingStatus(record.missingRate).label;
        const status = getMissingStatus(record.missingRate);
        return <Tag color={status.color}>{label}</Tag>;
      },
    },
    {
      title: '시각화',
      dataIndex: 'missingRate',
      key: 'missingVisual',
      width: 200,
      render: (_value: number | undefined, record: CreditMissingPatternItem) => {
        const rate = record.missingRate ?? (record as any).missing_rate ?? 0;
        const percent = toPercent(rate);
        return (
          <Progress
            percent={percent}
            size="small"
            showInfo={false}
            strokeColor={getMissingColor(rate)}
          />
        );
      },
    },
  ];

  const getOutlierStatus = (record: CreditOutlierItem) => {
    const isOutlier = record.isOutlier ?? (record as any).is_outlier ?? false;
    const zScore = Number(record.zScore ?? (record as any).z_score ?? 0);
    if (isOutlier) {
      return { label: '이상치', color: 'red', rowClass: 'outlier-row-outlier' };
    }
    if (zScore >= outlierThreshold * 0.9) {
      return { label: '경계값', color: 'orange', rowClass: 'outlier-row-boundary' };
    }
    return { label: '정상', color: 'green', rowClass: '' };
  };

  const outlierColumns = [
    {
      title: '번호',
      dataIndex: 'rownum',
      key: 'rownum',
      width: 90,
      render: (_value: number | string | undefined, _record: CreditOutlierItem, index: number) =>
        _value ?? index + 1,
    },
    {
      title: '대상자 ID',
      dataIndex: 'personId',
      key: 'personId',
      width: 160,
      render: (_value: string | undefined, record: CreditOutlierItem) =>
        record.personId || (record as any).person_id || '-',
    },
    {
      title: '대상자명',
      dataIndex: 'personName',
      key: 'personName',
      width: 160,
      render: (_value: string | undefined, record: CreditOutlierItem) =>
        record.personName || (record as any).person_nm || '-',
    },
    {
      title: '변수값',
      dataIndex: 'variableValue',
      key: 'variableValue',
      width: 140,
      align: 'right' as const,
      render: (_value: number | undefined, record: CreditOutlierItem) =>
        record.variableValue ?? (record as any).variable_value ?? '-',
    },
    {
      title: 'Z-Score',
      dataIndex: 'zScore',
      key: 'zScore',
      width: 120,
      align: 'right' as const,
      render: (_value: number | undefined, record: CreditOutlierItem) => {
        const value = record.zScore ?? (record as any).z_score ?? null;
        const display = value === null || value === undefined ? '-' : Number(value).toFixed(2);
        const status = getOutlierStatus(record);
        return <span className={status.rowClass ? 'outlier-score' : ''}>{display}</span>;
      },
    },
    {
      title: '이상치 여부',
      dataIndex: 'isOutlier',
      key: 'isOutlier',
      width: 120,
      render: (_value: boolean | undefined, record: CreditOutlierItem) => {
        const status = getOutlierStatus(record);
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: '조치',
      key: 'action',
      width: 120,
      render: (_value: unknown, record: CreditOutlierItem) => (
        <Button
          size="small"
          type="link"
          onClick={() => {
            const id = record.personId || (record as any).person_id || '';
            message.info(
              id
                ? `대상자 상세(${id})는 대상자 등록 화면에서 확인해주세요.`
                : '대상자 상세는 대상자 등록 화면에서 확인해주세요.'
            );
          }}
        >
          상세
        </Button>
      ),
    },
  ];



  const tabs: TabsProps['items'] = [
    {
      key: tabKeys.summary,
      label: '요약',
      children: (
        <div className="summary-grid">
          {summaryCards.map((card) => (
            <Card key={card.key} className={card.position}>
              <div className="summary-card-header">
                <div>
                  <Text strong>{card.title}</Text>
                  {card.key === tabKeys.correlation && (
                    <Tag color="geekblue" className="summary-tag">
                      EDA_002
                    </Tag>
                  )}
                  {card.key === tabKeys.tab2 && (
                    <Tag color="geekblue" className="summary-tag">
                      EDA_001
                    </Tag>
                  )}
                  {card.key === tabKeys.tab3 && (
                    <Tag color="geekblue" className="summary-tag">
                      EDA_003
                    </Tag>
                  )}
                  {card.key === tabKeys.tab4 && (
                    <Tag color="geekblue" className="summary-tag">
                      EDA_004
                    </Tag>
                  )}
                </div>
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={() => setActiveKey(card.key)}
                />
              </div>
              {card.key === tabKeys.correlation ? (
                <div className="summary-card-body">
                  <Text type="secondary">WOE 기반 Pearson 상관분석 요약</Text>
                  <div className="summary-metrics">
                    <div>
                      <span className="metric-label">샘플수</span>
                      <span className="metric-value">{correlation?.sampleCount ?? '-'}</span>
                    </div>
                    <div>
                      <span className="metric-label">변수수</span>
                      <span className="metric-value">{correlation?.variables?.length ?? '-'}</span>
                    </div>
                  </div>
                </div>
              
              ) : card.key === tabKeys.tab2 ? (
                <div className="summary-card-body">
                  <Text type="secondary">TB_CREDIT_RAW_DATA 기초통계 요약</Text>
                  <div className="summary-metrics">
                    <div>
                      <span className="metric-label">행 수</span>
                      <span className="metric-value">{basicStats?.totalRows ?? '-'}</span>
                    </div>
                    <div>
                      <span className="metric-label">변수수</span>
                      <span className="metric-value">{basicStats?.total ?? '-'}</span>
                    </div>
                  </div>
                </div>
              ) : card.key === tabKeys.tab3 ? (
                <div className="summary-card-body">
                  <Text type="secondary">결측치 패턴 현황 요약</Text>
                  <div className="summary-metrics">
                    <div>
                      <span className="metric-label">조회 건수</span>
                      <span className="metric-value">{missingItems.length || '-'}</span>
                    </div>
                    <div>
                      <span className="metric-label">기간</span>
                      <span className="metric-value">
                        {missingStartDate?.format('YY.MM.DD') || '-'} ~{' '}
                        {missingEndDate?.format('YY.MM.DD') || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : card.key === tabKeys.tab4 ? (
                <div className="summary-card-body">
                  <Text type="secondary">이상치 탐지 요약</Text>
                  <div className="summary-metrics">
                    <div>
                      <span className="metric-label">이상치 건수</span>
                      <span className="metric-value">{outlierSummary?.outlierCount ?? '-'}</span>
                    </div>
                    <div>
                      <span className="metric-label">기준</span>
                      <span className="metric-value">
                        {outlierSummary?.method || outlierMethod}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="summary-card-empty">
                  <Text type="secondary">준비 중</Text>
                </div>
              )}
            </Card>
          ))}
        </div>
      ),
    },
    {
      key: tabKeys.tab2,
      label: '기초통계',
      children: (
        <Spin spinning={basicStatsLoading}>
          <div className="correlation-tab">
            <div className="page-header">
              <Title level={3} className="page-title">
                TB_CREDIT_RAW_DATA 기초통계
              </Title>
              <Text type="secondary">
                기초 통계 지표 및 분포 정보를 확인할 수 있습니다.
              </Text>
            </div>

            <div className="correlation-meta">
              <Tag color="blue">EDA_001</Tag>
              <Tag color="default">기초통계</Tag>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Input.Search
                placeholder="변수 검색"
                allowClear
                onSearch={(value) => {
                  setStatsPage(1);
                  setStatsSearch(value);
                }}
              />
            </div>

            <Card className="pvalue-card" title="기초통계 표">
              <Table
                columns={basicStatsColumns}
                dataSource={basicStats?.variables || []}
                rowKey={(record) => record.name}
                pagination={{
                  current: basicStats?.page || statsPage,
                  pageSize: basicStats?.size || 10,
                  total: basicStats?.total || 0,
                  showSizeChanger: false,
                  onChange: (page) => setStatsPage(page),
                }}
                size="middle"
                scroll={{ x: 920 }}
              />
            </Card>
          </div>
        </Spin>
      ),
    },

    {
      key: tabKeys.correlation,
      label: '상관관계',
      children: (
        <Spin spinning={loading}>
          <div className="correlation-tab">
            <div className="page-header">
              <Title level={3} className="page-title">
                <HeatMapOutlined style={{ marginRight: 8 }} />
                상관계수 히트맵
              </Title>
              <Text type="secondary">
                WOE 변환 데이터 기준 Pearson 상관계수 표
              </Text>
            </div>

            <div className="correlation-meta">
              <Tag color="blue">Pearson</Tag>
              <Tag color="purple">WOE</Tag>
              <Tag color="default">BUDO != -1</Tag>
              <Tag color="geekblue">
                MODEL_ID: {correlation?.modelId ?? '-'}
              </Tag>
            </div>

            <div className="analysis-grid">
              <Card
                className="heatmap-card"
                title="상관계수 히트맵"
                extra={
                  <Button
                    size="small"
                    onClick={async () => {
                      if (!pdfRef.current || downloading) return;
                      setDownloading(true);
                      try {
                        const html2canvas = (await import('html2canvas')).default;
                        const { jsPDF } = await import('jspdf');
                        const canvas = await html2canvas(pdfRef.current, {
                          backgroundColor: '#ffffff',
                          scale: 2,
                          useCORS: true,
                        });
                        const imgData = canvas.toDataURL('image/png');
                        const pdf = new jsPDF('landscape', 'pt', 'a4');
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();
                        const margin = 24;
                        const maxWidth = pageWidth - margin * 2;
                        const maxHeight = pageHeight - margin * 2;
                        const widthRatio = maxWidth / canvas.width;
                        const heightRatio = maxHeight / canvas.height;
                        const scale = Math.min(widthRatio, heightRatio);
                        const imgWidth = canvas.width * scale;
                        const imgHeight = canvas.height * scale;
                        const x = (pageWidth - imgWidth) / 2;
                        const y = (pageHeight - imgHeight) / 2;
                        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
                        pdf.save('correlation-heatmap-10x10.pdf');
                      } catch (error) {
                        message.error('PDF 다운로드에 실패했습니다.');
                      } finally {
                        setDownloading(false);
                      }
                    }}
                    loading={downloading}
                  >
                    PDF 다운로드
                  </Button>
                }
              >
                {correlation ? heatmap : <Text type="secondary">데이터 없음</Text>}
              </Card>

              <Card className="pvalue-card" title="상관계수 표">
                <Table<CreditCorrelationPair>
                  columns={columns}
                  dataSource={pairs}
                  pagination={{ pageSize: 20, showSizeChanger: false }}
                  size="middle"
                  scroll={{ x: 760 }}
                />
              </Card>
            </div>

            <Modal
              open={heatmapModalOpen}
              onCancel={() => setHeatmapModalOpen(false)}
              footer={null}
              width={1280}
              className="heatmap-modal"
            >
              <div className="heatmap-modal-body">
                <div className="heatmap-modal-title">상관계수 히트맵 (10x10)</div>
                {correlation ? (
                  <div className="heatmap-wrapper">
                    <table className="heatmap-table heatmap-10">
                      <thead>
                        <tr>
                          <th className="heatmap-corner" />
                          {getTopVariablesFromPairs(correlation.pairs || [], 10).map((label) => (
                            <th key={`modal-col-${label}`} className="heatmap-header">
                              <span>{getDisplayLabel(label)}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {getTopVariablesFromPairs(correlation.pairs || [], 10).map((rowLabel) => {
                          const rowIndex = correlation.variables.indexOf(rowLabel);
                          return (
                            <tr key={`modal-row-${rowLabel}`}>
                              <th className="heatmap-header">{getDisplayLabel(rowLabel)}</th>
                              {getTopVariablesFromPairs(correlation.pairs || [], 10).map((colLabel) => {
                                const colIndex = correlation.variables.indexOf(colLabel);
                                const value =
                                  correlation.correlationMatrix[rowIndex]?.[colIndex] ?? 0;
                                const bg = heatmapColor(value);
                                return (
                                  <td
                                    key={`modal-cell-${rowLabel}-${colLabel}`}
                                    className="heatmap-cell"
                                    style={{ backgroundColor: bg }}
                                    title={`${rowLabel} / ${colLabel}: ${value.toFixed(3)}`}
                                  >
                                    {value.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Text type="secondary">데이터 없음</Text>
                )}
              </div>
            </Modal>

            {correlation && (
              <div className="heatmap-pdf-capture" ref={pdfRef}>
                <div className="heatmap-modal-title">상관계수 히트맵 (10x10)</div>
                <div className="heatmap-wrapper">
                  <table className="heatmap-table heatmap-10">
                    <thead>
                      <tr>
                        <th className="heatmap-corner" />
                        {getTopVariablesFromPairs(correlation.pairs || [], 10).map((label) => (
                          <th key={`pdf-col-${label}`} className="heatmap-header">
                            <span>{getDisplayLabel(label)}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getTopVariablesFromPairs(correlation.pairs || [], 10).map((rowLabel) => {
                        const rowIndex = correlation.variables.indexOf(rowLabel);
                        return (
                          <tr key={`pdf-row-${rowLabel}`}>
                            <th className="heatmap-header">{getDisplayLabel(rowLabel)}</th>
                            {getTopVariablesFromPairs(correlation.pairs || [], 10).map((colLabel) => {
                              const colIndex = correlation.variables.indexOf(colLabel);
                              const value =
                                correlation.correlationMatrix[rowIndex]?.[colIndex] ?? 0;
                              const bg = heatmapColor(value);
                              return (
                                <td
                                  key={`pdf-cell-${rowLabel}-${colLabel}`}
                                  className="heatmap-cell"
                                  style={{ backgroundColor: bg }}
                                  title={`${rowLabel} / ${colLabel}: ${value.toFixed(3)}`}
                                >
                                  {value.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Spin>
      ),
    },
    {
      key: tabKeys.tab3,
      label: '결측치 패턴',
      children: (
        <Spin spinning={missingLoading}>
          <div className="correlation-tab">
            <div className="page-header">
              <Title level={3} className="page-title">
                결측치 패턴
              </Title>
              <Text type="secondary">변수별 결측치 현황 및 패턴을 확인할 수 있습니다.</Text>
            </div>

            <div className="correlation-meta">
              <Tag color="blue">EDA_003</Tag>
              <Tag color="default">결측치 패턴</Tag>
            </div>

            <Card className="pvalue-card" title="조회 조건">
              <div className="filter-row">
                <div className="filter-item">
                  <Text type="secondary">시작일</Text>
                  <DatePicker
                    value={missingStartDate}
                    onChange={(value) => setMissingStartDate(value)}
                    placeholder="시작일"
                    className="filter-input"
                  />
                </div>
                <div className="filter-item">
                  <Text type="secondary">종료일</Text>
                  <DatePicker
                    value={missingEndDate}
                    onChange={(value) => setMissingEndDate(value)}
                    placeholder="종료일"
                    className="filter-input"
                  />
                </div>
                <div className="filter-actions">
                  <Button type="primary" onClick={fetchMissingPatterns}>
                    조회
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="pvalue-card" title="변수별 결측치 현황">
              <Table<CreditMissingPatternItem>
                columns={missingColumns}
                dataSource={missingItems}
                rowKey={(record) =>
                  String(record.variableName || (record as any).variableNm || (record as any).variable_nm || '')
                }
                pagination={{ pageSize: 20, showSizeChanger: false }}
                size="middle"
                scroll={{ x: 960 }}
                className="analysis-table"
              />
            </Card>
          </div>
        </Spin>
      ),
    },
    {
      key: tabKeys.tab4,
      label: '이상치 탐지',
      children: (
        <Spin spinning={outlierLoading}>
          <div className="correlation-tab">
            <div className="page-header">
              <Title level={3} className="page-title">
                이상치 탐지
              </Title>
              <Text type="secondary">선택한 변수의 이상치를 탐지하고 목록을 확인합니다.</Text>
            </div>

            <div className="correlation-meta">
              <Tag color="blue">EDA_004</Tag>
              <Tag color="default">이상치 목록</Tag>
            </div>

            <Card className="pvalue-card" title="이상치 탐지 조건">
              <div className="filter-row">
                <div className="filter-item wide">
                  <Text type="secondary">변수 선택</Text>
                  <Select
                    value={selectedVariable}
                    onChange={(value) => setSelectedVariable(value)}
                    options={variableOptions}
                    loading={variableLoading}
                    placeholder="변수를 선택하세요"
                    className="filter-input"
                  />
                </div>
                <div className="filter-item">
                  <Text type="secondary">탐지 방법</Text>
                  <Select
                    value={outlierMethod}
                    onChange={(value) => setOutlierMethod(value)}
                    options={[
                      { label: 'Z-Score', value: 'Z-Score' },
                      { label: 'IQR', value: 'IQR' },
                      { label: 'Winsorizing', value: 'Winsorizing' },
                    ]}
                    className="filter-input"
                  />
                </div>
                <div className="filter-item">
                  <Text type="secondary">임계값</Text>
                  <InputNumber
                    min={1}
                    max={5}
                    step={0.1}
                    value={outlierThreshold}
                    onChange={(value) => setOutlierThreshold(value === null ? 0 : Number(value))}
                    className="filter-input"
                  />
                </div>
                <div className="filter-actions">
                  <Button type="primary" onClick={fetchOutliers}>
                    탐지
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="pvalue-card" title="이상치 탐지 결과">
              <Table<CreditOutlierItem>
                columns={outlierColumns}
                dataSource={outlierItems}
                rowKey={(record) =>
                  String(record.personId || (record as any).person_id || '')
                }
                pagination={{ pageSize: 20, showSizeChanger: false }}
                size="middle"
                scroll={{ x: 960 }}
                className="analysis-table outlier-table"
                rowClassName={(record) => getOutlierStatus(record).rowClass}
              />
              <div className="outlier-footer">
                <div className="outlier-summary">
                  <div>
                    전체 데이터:{' '}
                    <strong>{outlierSummary?.totalCount ?? '-'}</strong>건 | 이상치:{' '}
                    <strong>{outlierSummary?.outlierCount ?? '-'}</strong>건
                  </div>
                  <div>
                    탐지 방법: <strong>{outlierSummary?.method || outlierMethod}</strong> | 임계값:{' '}
                    <strong>{outlierSummary?.threshold ?? outlierThreshold}</strong>
                  </div>
                </div>
                <Button type="primary" className="excel-button">
                  엑셀 다운로드
                </Button>
              </div>
            </Card>
          </div>
        </Spin>
      ),
    },
  ];

  return (
    <div className="eda-analysis-page fade-in">
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={tabs}
        className="eda-tabs"
      />
    </div>
  );
};


const heatmapColor = (value: number) => {
  const clamped = Math.max(-1, Math.min(1, value));
  const intensity = Math.abs(clamped);
  const lightness = 96 - intensity * 55;
  const saturation = 70 + intensity * 15;
  const hue = clamped >= 0 ? 5 : 220; // 높을수록 빨강, 낮을수록 파랑
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const getTopVariablesFromPairs = (pairs: CreditCorrelationPair[], count: number) => {
  const filteredPairs = pairs
    .filter((pair) => pair.corrCoef !== null && Math.abs(pair.corrCoef) < 0.8)
    .filter((pair) => !isExcludedVariable(pair.var1) && !isExcludedVariable(pair.var2))
    .filter((pair) => !isPeriodPair(pair.var1, pair.var2))
    .sort((a, b) => Math.abs(b.corrCoef ?? 0) - Math.abs(a.corrCoef ?? 0));

  const selected: string[] = [];
  for (const pair of filteredPairs) {
    if (selected.length >= count) break;
    if (!selected.includes(pair.var1)) selected.push(pair.var1);
    if (selected.length >= count) break;
    if (!selected.includes(pair.var2)) selected.push(pair.var2);
  }
  return selected;
};

const isExcludedVariable = (name: string) => {
  const upper = name.toUpperCase();
  return (
    upper.includes('SUM') ||
    upper.includes('AVG') ||
    upper.includes('MEAN') ||
    upper.includes('TOTAL') ||
    upper.includes('합') ||
    upper.includes('평균')
  );
};

const isPeriodVariable = (name: string) => {
  const upper = name.toUpperCase();
  return (
    upper.includes('3M') ||
    upper.includes('6M') ||
    upper.includes('12M') ||
    upper.includes('3MONTH') ||
    upper.includes('6MONTH') ||
    upper.includes('12MONTH')
  );
};

const isPeriodPair = (var1: string, var2: string) =>
  isPeriodVariable(var1) && isPeriodVariable(var2);

export default EdaAnalysisPage;
