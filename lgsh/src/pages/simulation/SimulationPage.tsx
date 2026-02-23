/**
 * SIM001 시뮬레이션 실행 화면
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, Form, Input, Row, Slider, InputNumber, Button, Space, Tag, message, Divider, Collapse, Typography } from 'antd';
import { PlayCircleOutlined, ReloadOutlined, ExperimentOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
import type { SimulationAdjustment, SimulationRequest, SimulationResult, SimulationSaveRequest } from '@/types';
import { simulationService } from '@/services';
import { getSimulationScenarioLabel, SIMULATION_SCENARIO_CONFIG } from './scenarioConfig';
import './SimulationPage.css';

const CREDIT_BATCH_STORAGE_KEY = 'credit_batch_in_progress';

const isCreditBatchRunning = (): boolean => {
  try {
    const raw = localStorage.getItem(CREDIT_BATCH_STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    const batch = saved?.monthlyBatches?.[0]?.batchResult ?? saved?.batchResult;
    return !!(batch && batch.batchId && batch.runId);
  } catch {
    return false;
  }
};

const gradeColorMap: Record<string, string> = {
  A: '#1d4ed8',
  B: '#16a34a',
  C: '#facc15',
  D: '#f97316',
  E: '#ef4444',
};

interface SimulationPageProps {
  personId?: string;
  embedded?: boolean;
}

const SimulationPage: React.FC<SimulationPageProps> = ({
  personId: externalPersonId,
  embedded = false,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [lastRequest, setLastRequest] = useState<SimulationRequest | null>(null);
  const [savedSimId, setSavedSimId] = useState<number | null>(null);

  const initialValues = useMemo(() => {
    const values: Record<string, any> = {};
    SIMULATION_SCENARIO_CONFIG.forEach((item) => {
      values[item.key] = item.defaultValue;
    });
    values.personId = '';
    return values;
  }, []);

  useEffect(() => {
    if (externalPersonId) {
      form.setFieldsValue({ personId: externalPersonId });
    }
  }, [externalPersonId, form]);

  const handleReset = () => {
    form.setFieldsValue(initialValues);
    setResult(null);
    setLastRequest(null);
    setSavedSimId(null);
  };

  const handleRun = async () => {
    if (isCreditBatchRunning()) {
      message.warning('평가 실행이 진행 중입니다. 완료 또는 중지 후 시뮬레이션을 실행해 주세요.');
      return;
    }

    try {
      const values = await form.validateFields();
      const adjustments: SimulationAdjustment[] = SIMULATION_SCENARIO_CONFIG.map((item) => ({
        key: item.key,
        value: Number(values[item.key] || 0),
        mode: item.mode,
      }));

      const payload: SimulationRequest = {
        personId: values.personId,
        modelId: values.modelId,
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
      modelId: lastRequest.modelId,
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
      {!embedded && (
        <div className="page-header">
          <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
            <ExperimentOutlined style={{ marginRight: 8 }} />
            시뮬레이션 실행
          </Title>
          <Text type="secondary">시나리오별 조건을 조정하여 신용점수 변동을 시뮬레이션합니다.</Text>
        </div>
      )}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="simulation-card" title={embedded ? '시뮬레이션 실행' : undefined}>
            <Form form={form} layout="vertical" initialValues={initialValues}>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="대상자 ID"
                    name="personId"
                    rules={[{ required: true, message: '대상자 ID를 입력하세요.' }]}
                  >
                    <Input placeholder="PERSON_ID" disabled={!!externalPersonId} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="모델 ID"
                    name="modelId"
                    rules={[{ required: true, message: '모델 ID를 입력하세요.' }]}
                  >
                    <Input placeholder="MDL_001" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider className="simulation-divider">시나리오 변경</Divider>

              <Space className="simulation-actions">
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  초기화
                </Button>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  loading={loading}
                  onClick={handleRun}
                  disabled={isCreditBatchRunning()}
                >
                  시뮬레이션 실행
                </Button>
              </Space>

              <div className="scenario-list">
                {SIMULATION_SCENARIO_CONFIG.map((item) => (
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
                {result.referenceScoreDt && (
                  <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 12 }}>
                    이 데이터는 {result.referenceScoreDt} 기준(score_dt)으로 실행되었습니다.
                  </div>
                )}

                <div className="score-breakdown">
                  <div className="section-title">세부 점수 변화</div>
                  {result.breakdown?.length ? (
                    <div className="breakdown-list">
                      {result.breakdown.map((item) => {
                        const label = getSimulationScenarioLabel(item.key);
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
