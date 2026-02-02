import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Form, Row, Col, Select, Table, Tag, Modal, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { SimulationHistoryItem, SimulationHistoryResponse } from '@/types';
import { simulationService } from '@/services';
import './SimulationHistoryPage.css';

const { RangePicker } = DatePicker;

type SearchFormValues = {
  scenarioType?: string;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  size?: number;
};

const scenarioOptions = [
  { label: '전체', value: '' },
  { label: 'What-If', value: 'WHAT_IF' },
  { label: '스트레스', value: 'STRESS' },
  { label: '민감도', value: 'SENSITIVITY' },
];

const SimulationHistoryPage: React.FC = () => {
  const [form] = Form.useForm<SearchFormValues>();
  const [loading, setLoading] = useState(false);
  const [detailItem, setDetailItem] = useState<SimulationHistoryItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const detailScenario = useMemo(() => {
    if (!detailItem?.simScenario) return null;
    try {
      return JSON.parse(detailItem.simScenario);
    } catch {
      return null;
    }
  }, [detailItem]);
  const [data, setData] = useState<SimulationHistoryResponse>({
    items: [],
    page: 1,
    size: 10,
    total: 0,
  });

  const defaultRange = useMemo<[dayjs.Dayjs, dayjs.Dayjs]>(() => {
    const end = dayjs();
    const start = end.subtract(1, 'month');
    return [start, end];
  }, []);


  const openDetail = (item: SimulationHistoryItem) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const fetchHistory = async (page = 1, size = data.size) => {
    const values = form.getFieldsValue();
    const range = values.dateRange || defaultRange;
    const startDate = range?.[0]?.format('YYYY-MM-DD');
    const endDate = range?.[1]?.format('YYYY-MM-DD');
    const scenarioType = values.scenarioType || '';
    const pageSize = values.size || size;

    try {
      setLoading(true);
      const response = await simulationService.fetchHistory({
        scenarioType: scenarioType || undefined,
        startDate,
        endDate,
        page,
        size: pageSize,
      });
      if (!response.success) {
        return;
      }
      setData(response.data || { items: [], page, size: pageSize, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    form.setFieldsValue({
      scenarioType: '',
      dateRange: defaultRange,
      size: 10,
    });
    fetchHistory(1, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: ColumnsType<SimulationHistoryItem> = [
    {
      title: '번호',
      dataIndex: 'rownum',
      render: (_, __, index) => data.total - ((data.page - 1) * data.size + index),
      width: 80,
    },
    {
      title: '대상자명',
      dataIndex: 'personName',
      width: 140,
      render: (value, record) => value || record.personId || '-',
    },
    {
      title: '시나리오',
      dataIndex: 'scenarioType',
      width: 120,
      render: (value) => {
        const label = scenarioOptions.find((opt) => opt.value === value)?.label || value || '-';
        return <Tag>{label}</Tag>;
      },
    },
    {
      title: '변경 전 점수',
      dataIndex: 'beforeScore',
      width: 120,
    },
    {
      title: '변경 후 점수',
      dataIndex: 'afterScore',
      width: 120,
    },
    {
      title: '점수 차이',
      dataIndex: 'scoreDiff',
      width: 120,
      render: (value) => {
        if (value === null || value === undefined) return '-';
        const color = value >= 0 ? 'blue' : 'red';
        const text = value >= 0 ? `+${value}` : `${value}`;
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '실행일시',
      dataIndex: 'simDt',
      width: 180,
      render: (value) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '상세',
      dataIndex: 'detail',
      width: 100,
      render: (_, record) => <Button type="link" onClick={() => openDetail(record)}>보기</Button>,
    },
  ];

  return (
    <div className="simulation-history-page">
      <Card className="simulation-history-card" title="시뮬레이션 이력 조회">
        <Form form={form} layout="inline" className="history-filter">
          <Form.Item name="scenarioType" label="시나리오 유형">
            <Select options={scenarioOptions} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="dateRange" label="기간">
            <RangePicker />
          </Form.Item>
          <Form.Item name="size" label="페이지당">
            <Select
              options={[
                { label: '10', value: 10 },
                { label: '20', value: 20 },
                { label: '50', value: 50 },
                { label: '100', value: 100 },
              ]}
              style={{ width: 100 }}
            />
          </Form.Item>
          <Form.Item>
            <Row gutter={8}>
              <Col>
                <Button type="primary" onClick={() => fetchHistory(1, form.getFieldValue('size'))}>
                  조회
                </Button>
              </Col>
            </Row>
          </Form.Item>
        </Form>

        <Table
          rowKey={(record, index) => `${record.simId ?? 'sim'}-${index}`}
          columns={columns}
          dataSource={data.items}
          loading={loading}
          pagination={{
            current: data.page,
            pageSize: data.size,
            total: data.total,
            showSizeChanger: false,
            onChange: (page, pageSize) => fetchHistory(page, pageSize),
          }}
        />
      </Card>

      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        title="시뮬레이션 상세"
        className="simulation-detail-modal"
      >
        {detailItem && (
          <>
            <div className="detail-summary">
              <div className="detail-row">
                <span className="detail-label">대상자</span>
                <span>{detailItem.personName || detailItem.personId || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">시나리오</span>
                <span>{detailItem.scenarioType || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">변경 전 점수</span>
                <span>{detailItem.beforeScore ?? '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">변경 후 점수</span>
                <span>{detailItem.afterScore ?? '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">점수 차이</span>
                <span>{detailItem.scoreDiff ?? '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">실행일시</span>
                <span>{detailItem.simDt ? dayjs(detailItem.simDt).format('YYYY-MM-DD HH:mm') : '-'}</span>
              </div>
            </div>
            <Divider />
            <div className="detail-section">
              <div className="detail-title">세부 점수 변화</div>
              {detailScenario?.breakdown?.length ? (
                <div className="detail-breakdown">
                  {detailScenario.breakdown.map((item: any) => {
                    const label = item.key || '항목';
                    const delta = item.delta ?? 0;
                    const sign = delta >= 0 ? '+' : '';
                    return (
                      <div className="detail-breakdown-row" key={item.key}>
                        <span className="detail-label">{label}</span>
                        <span>{sign}{delta}점</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="detail-empty">세부 점수 정보가 없습니다.</div>
              )}
            </div>
            <Divider />
            <div className="detail-section">
              <div className="detail-title">적용된 변수</div>
              {detailScenario?.appliedColumns?.length ? (
                <div className="column-tags">
                  {detailScenario.appliedColumns.map((col: string) => (
                    <Tag key={col} color="blue">{col}</Tag>
                  ))}
                </div>
              ) : (
                <div className="detail-empty">적용된 변수가 없습니다.</div>
              )}
            </div>
            <Divider />
            <div className="detail-section">
              <div className="detail-title">시뮬레이션 시나리오</div>
              <pre className="detail-json">
                {detailItem.simScenario ? detailItem.simScenario : '시나리오 정보 없음'}
              </pre>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default SimulationHistoryPage;
