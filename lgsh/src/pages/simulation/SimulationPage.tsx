/**
 * SIM001 시뮬레이션 실행 화면
 */
import React, { useMemo, useState } from 'react';
import { Card, Col, Form, Input, Row, Slider, InputNumber, Button, Space, Tag, message, Divider, Collapse } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { SimulationAdjustment, SimulationRequest, SimulationResult, SimulationSaveRequest } from '@/types';
import { simulationService } from '@/services';
import './SimulationPage.css';

type ScenarioItem = {
  key: string;
  label: string;
  desc: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  mode: 'percent' | 'count' | 'point';
  defaultValue: number;
};

const scenarioConfig: ScenarioItem[] = [
  {
    key: 'repay_increase',
    label: '대출상환 증가',
    desc: '최근 3~6개월 상환액 증가 (원금/이자 감소 반영)',
    unit: '%',
    min: -30,
    max: 50,
    step: 5,
    mode: 'percent',
    defaultValue: 0,
  },
  {
    key: 'loan_balance_increase',
    label: '대출잔액 증가',
    desc: '평균 잔액 증가 및 한도 일부 증가',
    unit: '%',
    min: -30,
    max: 50,
    step: 5,
    mode: 'percent',
    defaultValue: 0,
  },
  {
    key: 'loan_rate_change',
    label: '대출금리 변화',
    desc: '금리 포인트 변화 및 이자지급액 반영',
    unit: 'p',
    min: -3,
    max: 5,
    step: 0.5,
    mode: 'point',
    defaultValue: 0,
  },
  {
    key: 'new_loan_count',
    label: '신규 대출발생',
    desc: '최근 1~6개월 신규대출 건수',
    unit: '건',
    min: 0,
    max: 5,
    step: 1,
    mode: 'count',
    defaultValue: 0,
  },
  {
    key: 'card_usage_3m',
    label: '3개월 카드 사용 증가',
    desc: '일시불/할부/현금서비스 사용액 반영',
    unit: '%',
    min: -30,
    max: 50,
    step: 5,
    mode: 'percent',
    defaultValue: 0,
  },
  {
    key: 'card_usage_6m',
    label: '6개월 카드 사용 증가',
    desc: '장기 카드 사용액 반영',
    unit: '%',
    min: -30,
    max: 50,
    step: 5,
    mode: 'percent',
    defaultValue: 0,
  },
  {
    key: 'cash_advance_ratio',
    label: '현금서비스 비중 증가',
    desc: '현금서비스 비중 포인트 변화',
    unit: 'p',
    min: -10,
    max: 20,
    step: 1,
    mode: 'point',
    defaultValue: 0,
  },
  {
    key: 'new_card_issue',
    label: '신규 카드 발급',
    desc: '최근 신규 카드 발급 건수',
    unit: '건',
    min: 0,
    max: 5,
    step: 1,
    mode: 'count',
    defaultValue: 0,
  },
  {
    key: 'card_count_change',
    label: '보유 카드 수 변화',
    desc: '보유 카드 수 및 12개월 변화',
    unit: '건',
    min: -3,
    max: 5,
    step: 1,
    mode: 'count',
    defaultValue: 0,
  },
  {
    key: 'card_limit_change',
    label: '카드 한도 변화',
    desc: '카드 한도 증가/감소 및 사용률 반영',
    unit: '%',
    min: -30,
    max: 50,
    step: 5,
    mode: 'percent',
    defaultValue: 0,
  },
];

const gradeColorMap: Record<string, string> = {
  A: '#1d4ed8',
  B: '#16a34a',
  C: '#facc15',
  D: '#f97316',
  E: '#ef4444',
};

const SimulationPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [lastRequest, setLastRequest] = useState<SimulationRequest | null>(null);
  const [savedSimId, setSavedSimId] = useState<number | null>(null);

  const initialValues = useMemo(() => {
    const values: Record<string, any> = {};
    scenarioConfig.forEach((item) => {
      values[item.key] = item.defaultValue;
    });
    values.personId = '';
    return values;
  }, []);

  const handleReset = () => {
    form.setFieldsValue(initialValues);
    setResult(null);
    setLastRequest(null);
    setSavedSimId(null);
  };

  const handleRun = async () => {
    try {
      const values = await form.validateFields();
      const adjustments: SimulationAdjustment[] = scenarioConfig.map((item) => ({
        key: item.key,
        value: Number(values[item.key] || 0),
        mode: item.mode,
      }));

      const payload: SimulationRequest = {
        personId: values.personId,
        adjustments,
      };

      setLoading(true);
      const response = await simulationService.runSimulation(payload);
      if (!response.success) {
        message.error(response.message || '시뮬레이션 실행 실패');
        return;
      }
      setResult(response.data || null);
      setLastRequest(payload);
      setSavedSimId(null);
    } catch (error: any) {
      message.error(error?.message || '입력값을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || !lastRequest) {
      message.warning('먼저 시뮬레이션을 실행해주세요.');
      return;
    }
    const payload: SimulationSaveRequest = {
      personId: lastRequest.personId,
      scenarioType: 'WHAT_IF',
      beforeScore: result.beforeScore,
      afterScore: result.afterScore,
      scoreDiff: result.delta,
      adjustments: lastRequest.adjustments,
      appliedColumns: result.appliedColumns || [],
      breakdown: result.breakdown || [],
    };

    try {
      setSaving(true);
      const response = await simulationService.saveSimulation(payload);
      if (!response.success) {
        message.error(response.message || '시뮬레이션 저장 실패');
        return;
      }
      setSavedSimId(response.data?.simId ?? null);
      message.success('시뮬레이션 결과가 저장되었습니다.');
    } catch (error: any) {
      message.error(error?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="simulation-page">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="simulation-card" title="SIM001 시뮬레이션 실행">
            <Form form={form} layout="vertical" initialValues={initialValues}>
              <Form.Item
                label="대상자 ID"
                name="personId"
                rules={[{ required: true, message: '대상자 ID를 입력하세요.' }]}
              >
                <Input placeholder="PERSON_ID" />
              </Form.Item>

              <Divider className="simulation-divider">시나리오 변경</Divider>

              <Space className="simulation-actions">
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  초기화
                </Button>
                <Button type="primary" icon={<PlayCircleOutlined />} loading={loading} onClick={handleRun}>
                  시뮬레이션 실행
                </Button>
              </Space>

              <div className="scenario-list">
                {scenarioConfig.map((item) => (
                  <Card key={item.key} className="scenario-item" size="small">
                    <div className="scenario-header">
                      <div className="scenario-title">{item.label}</div>
                      <div className="scenario-desc">{item.desc}</div>
                    </div>
                    <Row gutter={[12, 12]} align="middle">
                      <Col xs={24} md={16}>
                        <Form.Item name={item.key} className="scenario-slider">
                          <Slider min={item.min} max={item.max} step={item.step} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name={item.key} className="scenario-input">
                          <InputNumber
                            min={item.min}
                            max={item.max}
                            step={item.step}
                            addonAfter={item.unit}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </div>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            className="simulation-result"
            title="결과 요약"
            extra={(
              <Button type="primary" onClick={handleSave} loading={saving} disabled={!result}>
                결과 저장
              </Button>
            )}
          >
            {!result && <div className="result-empty">시뮬레이션을 실행하면 결과가 표시됩니다.</div>}
            {result && (
              <>
                <div className="result-scores">
                  <div className="score-block">
                    <span className="score-label">현재 점수</span>
                    <strong>{result.beforeScore}</strong>
                    <Tag color={gradeColorMap[result.beforeGrade] || 'default'}>
                      {result.beforeGrade}
                    </Tag>
                  </div>
                  <div className="score-block">
                    <span className="score-label">변경 후 점수</span>
                    <strong>{result.afterScore}</strong>
                    <Tag color={gradeColorMap[result.afterGrade] || 'default'}>
                      {result.afterGrade}
                    </Tag>
                  </div>
                </div>

                <div className={`delta ${result.delta >= 0 ? 'positive' : 'negative'}`}>
                  변화량: {result.delta >= 0 ? '+' : ''}{result.delta} 점
                </div>

                <div className="score-breakdown">
                  <div className="section-title">세부 점수 변화</div>
                  {result.breakdown?.length ? (
                    <div className="breakdown-list">
                      {result.breakdown.map((item) => {
                        const config = scenarioConfig.find((c) => c.key === item.key);
                        const label = config?.label || item.key;
                        const delta = item.delta ?? 0;
                        const sign = delta >= 0 ? '+' : '';
                        return (
                          <div className="breakdown-item" key={item.key}>
                            <span className="breakdown-label">{label}</span>
                            <span className="breakdown-value">{sign}{delta}점</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="result-empty">변경된 항목이 없습니다.</div>
                  )}
                </div>

                <Divider />
                <div className="applied-columns">
                  <Collapse
                    ghost
                    items={[
                      {
                        key: 'applied',
                        label: '적용된 변수',
                        children: result.appliedColumns?.length ? (
                          <div className="column-tags">
                            {result.appliedColumns.map((col) => (
                              <Tag key={col} color="blue">{col}</Tag>
                            ))}
                          </div>
                        ) : (
                          <div className="result-empty">변경된 변수가 없습니다.</div>
                        ),
                      },
                    ]}
                  />
                </div>
                {savedSimId !== null && (
                  <div className="save-indicator">저장 완료 (ID: {savedSimId})</div>
                )}
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SimulationPage;
