/**
 * 신용평가 실행 화면 (개인/그룹/전체 모드 지원)
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  message,
  Modal,
  Progress,
  Tag,
  Typography,
  Descriptions,
  Spin,
} from 'antd';
import {
  CalculatorOutlined,
  ThunderboltOutlined,
  UserOutlined,
  TeamOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import type {
  CreditPredictRequest,
  CreditPredictResult,
  CreditRunMode,
  CreditBatchRunResult,
  CreditBatchStatus,
} from '@/types';
import { creditService, personService } from '@/services';
import './CreditEvaluatePage.css';

const { Title, Text } = Typography;

const STORAGE_KEY = 'credit_batch_in_progress';

type LookupStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error';
type ItemScores = Record<string, number>;

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

const gradeColorMap: Record<string, string> = {
  A: '#1d4ed8',
  B: '#16a34a',
  C: '#facc15',
  D: '#f97316',
  E: '#ef4444',
};

const modeLabels: Record<CreditRunMode, { label: string; icon: React.ReactNode; desc: string }> = {
  single: { label: '개인 평가', icon: <UserOutlined />, desc: '특정 개인의 신용을 평가합니다.' },
  group: { label: '그룹 평가', icon: <TeamOutlined />, desc: '특정 사용자의 그룹에 속한 모든 개인을 평가합니다.' },
  all: { label: '전체 평가', icon: <DatabaseOutlined />, desc: '시스템의 모든 개인을 평가합니다.' },
};

const CreditEvaluatePage: React.FC = () => {
  const [form] = Form.useForm<CreditPredictRequest>();
  const [mode, setMode] = useState<CreditRunMode>('single');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreditPredictResult | null>(null);
  const [batchResult, setBatchResult] = useState<CreditBatchRunResult | null>(null);
  const [batchStatus, setBatchStatus] = useState<CreditBatchStatus | null>(null);
  const [statusPolling, setStatusPolling] = useState(false);
  const [evalTime, setEvalTime] = useState<string>('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMode, setPdfMode] = useState(false);
  const pdfRef = React.useRef<HTMLDivElement | null>(null);
  const personId = Form.useWatch('personId', form);
  const [personName, setPersonName] = useState('');
  const [personLookupStatus, setPersonLookupStatus] = useState<LookupStatus>('idle');
  const [batchProgressModal, setBatchProgressModal] = useState(false);
  const [batchSummaryModal, setBatchSummaryModal] = useState(false);
  const [batchStarting, setBatchStarting] = useState(false);

  const isBatchRunning = batchStarting || statusPolling || batchProgressModal;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || !saved.batchResult || !saved.mode) return;
      const { batchResult: savedBatch, mode: savedMode } = saved;
      if (!savedBatch.batchId || !savedBatch.runId) return;
      setMode(savedMode);
      setBatchResult(savedBatch);
      setStatusPolling(true);
      setBatchProgressModal(true);
    } catch {
      // ignore storage errors
    }
  }, []);

  // 배치 상태 폴링
  useEffect(() => {
    if (!batchResult || !statusPolling || mode === 'single') return;

    const fetchStatus = async () => {
      try {
        const response = await creditService.getBatchStatus(batchResult.batchId, batchResult.runId, {
          mode: batchResult.mode,
          userId: batchResult.userId,
        });
        if (response.success && response.data) {
          setBatchStatus(response.data);

          if (['SUCCESS', 'PARTIAL', 'FAILED'].includes(response.data.status)) {
            setStatusPolling(false);
            setBatchProgressModal(false);
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              // ignore storage errors
            }
            if (response.data.status === 'SUCCESS') {
              setBatchSummaryModal(true);
            } else if (response.data.status === 'PARTIAL') {
              message.warning('평가가 부분적으로 완료되었습니다.');
              setBatchSummaryModal(true);
            } else {
              message.error('평가가 실패했습니다.');
            }
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    };

    // ? ?? ? ?? ???? ??? ??? ??
    fetchStatus();
    const pollInterval = setInterval(fetchStatus, 1500);
    return () => clearInterval(pollInterval);
  }, [batchResult, statusPolling, mode]);

  // 개인 ID 조회
  useEffect(() => {
    const trimmed = (personId || '').trim();
    if (!trimmed) {
      setPersonName('');
      setPersonLookupStatus('idle');
      return;
    }

    setPersonLookupStatus('loading');
    const timer = setTimeout(async () => {
      try {
        const response = await personService.getName(trimmed);
        const resolvedName = response.data?.personNm;
        if (response.success && resolvedName) {
          setPersonName(resolvedName);
          setPersonLookupStatus('found');
        } else {
          setPersonName('');
          setPersonLookupStatus('not_found');
        }
      } catch (error) {
        setPersonName('');
        setPersonLookupStatus('error');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [personId]);

  const itemScoreRows = useMemo(() => {
    const itemScores = (result?.itemScores || {}) as ItemScores;
    return Object.entries(itemScores).map(([key, value]) => ({
      key,
      item: key,
      score: value,
    }));
  }, [result]);

  const formatItemLabel = (key: string) => {
    const labelMap: Record<string, string> = {
      'A: RES': '거주안정',
      'B: CARD_PROFILE': '카드한도',
      'C: LOAN_PROFILE': '대출분산',
      'D: CARD_CHANGE': '카드변화',
      'E: NEW_LOAN': '신규대출',
      'F: BURDEN': '부담규모',
    };
    return labelMap[key] ?? key;
  };

  const gradeInfo = useMemo(() => {
    const score = result?.creditScore ?? 0;
    if (score >= 850) return { grade: 'AAA', label: '최우수', color: '#4CAF50' };
    if (score >= 800) return { grade: 'AA', label: '우수', color: '#4CAF50' };
    if (score >= 750) return { grade: 'A', label: '양호', color: '#4CAF50' };
    if (score >= 700) return { grade: 'BBB', label: '보통', color: '#2196F3' };
    if (score >= 650) return { grade: 'BB', label: '주의', color: '#FF9800' };
    if (score >= 600) return { grade: 'B', label: '위험', color: '#FF5722' };
    if (score >= 550) return { grade: 'C', label: '매우위험', color: '#F44336' };
    return { grade: 'D', label: '부실', color: '#F44336' };
  }, [result]);

  const gradeDisplay = useMemo(() => {
    const rawGrade = result?.creditGrade || gradeInfo.grade;
    const letter = rawGrade?.trim().charAt(0);
    if (letter && gradeColorMap[letter]) {
      return { grade: rawGrade, color: gradeColorMap[letter] };
    }
    return { grade: rawGrade, color: gradeInfo.color };
  }, [gradeInfo.color, gradeInfo.grade, result?.creditGrade]);

  const displayPerson = useMemo(() => {
    const idText = personId ? `${personId} - ******` : '-';
    const nameText = personName || '미확인';
    return `${nameText} (${idText})`;
  }, [personId, personName]);

  const itemScoreChart = useMemo(() => {
    const labels = itemScoreRows.map((row) => formatItemLabel(row.item));
    const values = itemScoreRows.map((row) => Number(row.score) || 0);
    const colors = values.map((value) => {
      if (value >= 80) return '#22c55e';
      if (value >= 70) return '#3b82f6';
      if (value >= 60) return '#f59e0b';
      return '#ef4444';
    });

    const options: ChartOptions<'bar'> = {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.parsed.x}점` } },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          ticks: { color: '#475569' },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#334155', font: { weight: 600 } },
        },
      },
    };

    return {
      data: {
        labels,
        datasets: [
          {
            label: '점수',
            data: values,
            backgroundColor: colors,
            borderRadius: 8,
            barThickness: 18,
          },
        ],
      },
      options,
    };
  }, [itemScoreRows]);

  // 개인 ID 조회
  useEffect(() => {
    if (!batchResult || !statusPolling || mode === 'single') return;

    const fetchStatus = async () => {
      try {
        const response = await creditService.getBatchStatus(batchResult.batchId, batchResult.runId, {
          mode,
          userId: batchResult.userId,
        });
        if (response.success && response.data) {
          setBatchStatus(response.data);

          if (['SUCCESS', 'PARTIAL', 'FAILED'].includes(response.data.status)) {
            setStatusPolling(false);
            setBatchProgressModal(false);
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              // ignore storage errors
            }
            if (response.data.status === 'SUCCESS') {
              setBatchSummaryModal(true);
            } else if (response.data.status === 'PARTIAL') {
              message.warning('??? ????? ???????.');
              setBatchSummaryModal(true);
            } else {
              message.error('??? ??????.');
            }
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    };

    fetchStatus();
    const pollInterval = setInterval(fetchStatus, 3000);
    return () => clearInterval(pollInterval);
  }, [batchResult, statusPolling, mode]);

  // 평가 실행
  const handleSubmit = async () => {
    if (isBatchRunning) {
      if (!batchProgressModal) {
        setBatchProgressModal(true);
      }
      return;
    }

    try {
      const values = await form.validateFields();
      setLoading(true);
      setResult(null);
      setBatchResult(null);
      setBatchStatus(null);

      const payload: CreditPredictRequest = {
        ...values,
        mode,
      };

      if (mode === 'single') {
        const response = await creditService.predict(payload);
        if (response.success && response.data) {
          setResult(response.data);
          setEvalTime(new Date().toLocaleString('ko-KR'));
          message.success('평가가 완료되었습니다.');
        } else {
          message.error(response.message || '평가에 실패했습니다.');
        }
      } else {
        setBatchProgressModal(true);
        setBatchStarting(true);
        const response = await creditService.runBatch(payload);

        if (response.success && response.data) {
          setBatchResult(response.data);
          setStatusPolling(true);
          try {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({
                mode,
                batchResult: response.data,
              })
            );
          } catch {
            // ignore storage errors
          }
          message.success(`${modeLabels[mode].label}가 시작되었습니다.`);
        } else {
          setBatchProgressModal(false);
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // ignore storage errors
          }
          message.error(response.message || '평가 시작에 실패했습니다.');
        }
      }
    } catch (error: any) {
      if (error?.errorFields) {
        message.error('필수 값을 확인해주세요.');
      } else {
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          '평가 중 오류가 발생했습니다.';
        message.error(errorMessage);
      }
    } finally {
      setBatchStarting(false);
      setLoading(false);
    }
  };


  // 상태 수동 조회
  const handleRefreshStatus = useCallback(async () => {
    if (!batchResult) return;
    try {
      const response = await creditService.getBatchStatus(batchResult.batchId, batchResult.runId, {
        mode: batchResult.mode,
        userId: batchResult.userId,
      });
      if (response.success && response.data) {
        setBatchStatus(response.data);
      }
    } catch (error) {
      message.error('상태 조회에 실패했습니다.');
    }
  }, [batchResult, mode]);

  // PDF 저장
  const handleSavePdf = async () => {
    if (!pdfRef.current || pdfLoading) return;
    setPdfLoading(true);
    try {
      setPdfMode(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(pdfRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('portrait', 'pt', 'a4');
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
      const safePerson = (personId || 'credit').toString().replace(/[^\w-]+/g, '_');
      pdf.save(`credit-evaluation-${safePerson}.pdf`);
    } catch (error) {
      message.error('PDF 저장에 실패했습니다.');
    } finally {
      setPdfMode(false);
      setPdfLoading(false);
    }
  };

  // 상태 태그 렌더링
  const renderStatusTag = (status?: string) => {
    if (!status) return <Tag>대기중</Tag>;

    const statusConfig: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      PENDING: { color: 'default', icon: <ReloadOutlined spin />, text: '대기중' },
      RUNNING: { color: 'processing', icon: <ReloadOutlined spin />, text: '실행중' },
      SUCCESS: { color: 'success', icon: <CheckCircleOutlined />, text: '완료' },
      PARTIAL: { color: 'warning', icon: <ExclamationCircleOutlined />, text: '부분완료' },
      FAILED: { color: 'error', icon: <ExclamationCircleOutlined />, text: '실패' },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 진행률 계산
  const progressPercent = useMemo(() => {
    if (!batchStatus || batchStatus.totalCount === 0) return 0;
    return Math.round((batchStatus.processedCount / batchStatus.totalCount) * 100);
  }, [batchStatus]);

  return (
    <div className="credit-evaluate-page">
      <div className="page-header">
        <div className="page-title">
          <CalculatorOutlined style={{ marginRight: 8 }} />
          신용평가 실행
        </div>
        <div className="page-subtitle">
          개인, 그룹, 전체 모드를 선택하여 신용평가를 실행할 수 있습니다.
        </div>
      </div>

      <Card className="evaluate-card">
        <div className="evaluate-layout">
          {/* 왼쪽: 모드 선택 버튼 */}
          <div className="mode-buttons">
            <div className="mode-label">구분</div>
            <Button
              type={mode === 'single' ? 'primary' : 'default'}
              onClick={() => {
                setMode('single');
                setResult(null);
                setBatchResult(null);
                setBatchStatus(null);
                form.resetFields();
              }}
              block
            >
              개인
            </Button>
            <Button
              type={mode === 'group' ? 'primary' : 'default'}
              onClick={() => {
                setMode('group');
                setResult(null);
                setBatchResult(null);
                setBatchStatus(null);
                form.resetFields();
              }}
              block
            >
              그룹
            </Button>
            <Button
              type={mode === 'all' ? 'primary' : 'default'}
              onClick={() => {
                setMode('all');
                setResult(null);
                setBatchResult(null);
                setBatchStatus(null);
                form.resetFields();
              }}
              block
            >
              전체
            </Button>
          </div>

          {/* 오른쪽: 모드별 입력 폼 */}
          <div className="mode-form">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                personId: '1000001',
                modelId: 'MDL_001',
                batchDesc: 'UI 평가',
                chunkSize: 500,
              }}
            >
              {/* 개인 평가 */}
              {mode === 'single' && (
                <div className="form-row">
                  <Form.Item
                    label="고객 ID"
                    name="personId"
                    rules={[{ required: true, message: '고객 ID를 입력해주세요.' }]}
                  >
                    <Input placeholder="예: P0001" maxLength={20} />
                  </Form.Item>
                  <Form.Item
                    label="고객명"
                    validateStatus={
                      personLookupStatus === 'not_found' || personLookupStatus === 'error'
                        ? 'error'
                        : undefined
                    }
                    help={
                      personLookupStatus === 'loading'
                        ? '조회 중...'
                        : personLookupStatus === 'not_found'
                        ? '고객 정보를 찾을 수 없습니다.'
                        : personLookupStatus === 'error'
                        ? '고객명 조회에 실패했습니다.'
                        : undefined
                    }
                  >
                    <Input value={personName} placeholder="고객명 표시" disabled />
                  </Form.Item>
                  <Form.Item
                    label="모델 ID"
                    name="modelId"
                    rules={[{ required: true, message: '모델 ID를 입력해주세요.' }]}
                  >
                    <Input placeholder="예: M0001" maxLength={20} />
                  </Form.Item>
                  <Form.Item
                    label="평가 사유"
                    name="batchDesc"
                    rules={[{ required: true, message: '평가 사유를 입력해주세요.' }]}
                  >
                    <Input placeholder="예: UI 평가" maxLength={200} />
                  </Form.Item>
                </div>
              )}

              {/* 그룹 평가 */}
              {mode === 'group' && (
                <div className="form-row">
                  <Form.Item
                    label="사용자 ID"
                    name="userId"
                    rules={[{ required: true, message: '사용자 ID를 입력해주세요.' }]}
                  >
                    <Input placeholder="예: user01" maxLength={50} />
                  </Form.Item>
                  <Form.Item
                    label="모델 ID"
                    name="modelId"
                    rules={[{ required: true, message: '모델 ID를 입력해주세요.' }]}
                  >
                    <Input placeholder="예: M0001" maxLength={20} />
                  </Form.Item>
                  <Form.Item
                    label="평가 사유"
                    name="batchDesc"
                    rules={[{ required: true, message: '평가 사유를 입력해주세요.' }]}
                  >
                    <Input placeholder="예: UI 평가" maxLength={200} />
                  </Form.Item>
                </div>
              )}

              {/* 전체 평가 */}
              {mode === 'all' && (
                <div className="form-row">
                  <Form.Item
                    label="모델 ID"
                    name="modelId"
                    rules={[{ required: true, message: '모델 ID를 입력해주세요.' }]}
                  >
                    <Input placeholder="예: M0001" maxLength={20} />
                  </Form.Item>
                  <Form.Item
                    label="평가 사유"
                    name="batchDesc"
                    rules={[{ required: true, message: '평가 사유를 입력해주세요.' }]}
                  >
                    <Input placeholder="예: UI 평가" maxLength={200} />
                  </Form.Item>
                </div>
              )}

              <div className="form-actions">
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={handleSubmit}
                  loading={loading}
                >
                  {isBatchRunning ? '\uD3C9\uAC00 \uC911..' : '\uD3C9\uAC00 \uC2E4\uD589'}
                </Button>
                <Button
                  onClick={() => {
                    form.resetFields();
                    setResult(null);
                    setBatchResult(null);
                    setBatchStatus(null);
                  }}
                >
                  초기화
                </Button>
              </div>
            </Form>
          </div>
        </div>

        {/* 평가 실행 결과 및 상태 */}
        {batchResult && mode !== 'single' && (
          <Card
            title={
              <Space>
                <span>평가 실행 정보</span>
                {renderStatusTag(batchStatus?.status)}
                {statusPolling && <Spin size="small" />}
              </Space>
            }
            extra={
              <Button icon={<ReloadOutlined />} onClick={handleRefreshStatus} size="small">
                새로고침
              </Button>
            }
            style={{ marginTop: 24 }}
          >
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="실행 ID">{batchResult.batchId}</Descriptions.Item>
              <Descriptions.Item label="실행 모드">
                <Tag color="blue">{modeLabels[batchResult.mode].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Run ID">{batchResult.runId}</Descriptions.Item>
              <Descriptions.Item label="사용자 ID">{batchResult.userId}</Descriptions.Item>
              {batchResult.personGrp && (
                <Descriptions.Item label="그룹">{batchResult.personGrp}</Descriptions.Item>
              )}
              <Descriptions.Item label="시작 시간">
                {new Date(batchResult.runStart).toLocaleString('ko-KR')}
              </Descriptions.Item>
            </Descriptions>

            {batchResult.modelMetrics && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>모델 성능 지표</Title>
                <Descriptions bordered column={3} size="small">
                  <Descriptions.Item label="AUC">
                    {batchResult.modelMetrics.auc?.toFixed(4) ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="KS 통계량">
                    {batchResult.modelMetrics.ks_stat?.toFixed(4) ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="AR (Accuracy Ratio)">
                    {batchResult.modelMetrics.ar?.toFixed(4) ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
              </div>
            )}

            {batchStatus && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>진행 상황</Title>
                <Progress percent={progressPercent} status="active" />
                <Space size="large" style={{ marginTop: 8 }}>
                  <Text>전체: {batchStatus.totalCount.toLocaleString()}명</Text>
                  <Text type="success">완료: {batchStatus.successCount.toLocaleString()}명</Text>
                  <Text type="danger">실패: {batchStatus.failCount.toLocaleString()}명</Text>
                  <Text>처리: {batchStatus.processedCount.toLocaleString()}명</Text>
                </Space>
              </div>
            )}
          </Card>
        )}
      </Card>

      {/* 단일 평가 결과 모달 */}
      <Modal
        open={Boolean(result)}
        footer={null}
        closable={false}
        maskClosable={false}
        centered
        width={980}
        className="credit-result-modal"
      >
        <div className={`result-modal-capture${pdfMode ? ' pdf-mode' : ''}`} ref={pdfRef}>
          <div className="result-modal-header" style={{ backgroundColor: gradeInfo.color }}>
            <div className="result-modal-title">신용평가 완료</div>
            <button
              type="button"
              className="result-modal-close pdf-hide"
              onClick={() => setResult(null)}
              aria-label="close"
            >
              닫기
            </button>
          </div>
          <div className="result-modal-body">
            <div className="result-meta">
              <div>대상자: {displayPerson}</div>
              <div>평가일시: {evalTime || '-'}</div>
            </div>
            <div className="result-cards">
              <div className="result-card">
                <div className="result-card-title">신용점수</div>
                <div className="result-score">{result?.creditScore ?? '-'}</div>
                <div className="result-score-unit">점</div>
              </div>
              <div className="result-card">
                <div className="result-card-title">신용등급</div>
                <div className="result-grade" style={{ color: gradeDisplay.color }}>
                  {gradeDisplay.grade}
                </div>
                <div className="result-grade-desc">{gradeInfo.label}</div>
              </div>
            </div>

            <div className="result-section">
              <div className="result-section-title">항목별 점수</div>
              {itemScoreRows.length === 0 ? (
                <div className="result-empty">항목별 점수가 없습니다.</div>
              ) : (
                <div className="item-score-chart">
                  <Bar data={itemScoreChart.data} options={itemScoreChart.options} />
                </div>
              )}
            </div>

            <div className="result-actions pdf-hide">
              <Button onClick={handleSavePdf} loading={pdfLoading}>
                PDF 저장
              </Button>
              <Button type="primary" onClick={() => setResult(null)}>
                확인
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 배치 진행 모달 */}
      <Modal
        open={batchProgressModal}
        footer={null}
        closable={false}
        centered
        width={600}
        className="batch-progress-modal"
      >
        <div className="batch-progress-header">
          <div className="batch-progress-title">
            {modeLabels[mode].icon}
            <span style={{ marginLeft: 8 }}>{modeLabels[mode].label} 진행중</span>
          </div>
          <Button
            type="text"
            icon={<span style={{ fontSize: 18 }}>×</span>}
            onClick={() => setBatchProgressModal(false)}
            className="batch-progress-minimize"
            title="백그라운드로 전환"
          />
        </div>
        <div className="batch-progress-body">
          {batchResult && (
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="실행 ID">{batchResult.batchId}</Descriptions.Item>
              <Descriptions.Item label="실행 모드">
                <Tag color="blue">{modeLabels[batchResult.mode].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="시작 시간">
                {new Date(batchResult.runStart).toLocaleString('ko-KR')}
              </Descriptions.Item>
            </Descriptions>
          )}
          {batchStatus && (
            <>
              <div style={{ marginBottom: 8 }}>
                <Text strong>진행 상황</Text>
                <span style={{ marginLeft: 8 }}>{renderStatusTag(batchStatus.status)}</span>
              </div>
              <Progress percent={progressPercent} status="active" strokeColor="#1890ff" />
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                <Text>전체: {batchStatus.totalCount.toLocaleString()}명</Text>
                <Text type="success">완료: {batchStatus.successCount.toLocaleString()}명</Text>
                <Text type="danger">실패: {batchStatus.failCount.toLocaleString()}명</Text>
              </div>
            </>
          )}
          {!batchStatus && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin size="large" />
              <div style={{ marginTop: 12 }}>
                {batchStarting ? '평가 요청 전송중...' : '평가 준비 중...'}
              </div>
            </div>
          )}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Button
              danger
              icon={<StopOutlined />}
              onClick={() => {
                setStatusPolling(false);
                setBatchProgressModal(false);
                message.warning('평가가 중지되었습니다. 이미 처리된 건은 저장됩니다.');
              }}
            >
              중지
            </Button>
            <Button onClick={() => setBatchProgressModal(false)}>
              백그라운드로 전환
            </Button>
          </div>
        </div>
      </Modal>

      {/* 배치 완료 요약 모달 */}
      <Modal
        open={batchSummaryModal}
        footer={null}
        closable={false}
        centered
        width={700}
        className="batch-summary-modal"
      >
        <div className="batch-summary-header">
          <div className="batch-summary-title">
            <CheckCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            {modeLabels[mode].label} 완료
          </div>
          <Button
            type="text"
            icon={<span style={{ fontSize: 18 }}>×</span>}
            onClick={() => setBatchSummaryModal(false)}
            className="batch-summary-close"
          />
        </div>
        <div className="batch-summary-body">
          {batchStatus && (
            <>
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="summary-card-title">평균 신용점수</div>
                  <div className="summary-card-value">
                    {batchStatus.avgScore?.toFixed(1) ?? '-'}
                  </div>
                  <div className="summary-card-unit">점</div>
                </div>
                <div className="summary-card">
                  <div className="summary-card-title">평가 완료</div>
                  <div className="summary-card-value success">
                    {batchStatus.successCount.toLocaleString()}
                  </div>
                  <div className="summary-card-unit">명</div>
                </div>
                <div className="summary-card">
                  <div className="summary-card-title">평가 실패</div>
                  <div className="summary-card-value danger">
                    {batchStatus.failCount.toLocaleString()}
                  </div>
                  <div className="summary-card-unit">명</div>
                </div>
              </div>

              {batchStatus.gradeDistribution && (
                <div className="summary-distribution">
                  <Title level={5}>등급 분포</Title>
                  <div className="grade-bars">
                    {Object.entries(batchStatus.gradeDistribution).map(([grade, count]) => {
                      const total = batchStatus.successCount || 1;
                      const percent = ((count as number) / total) * 100;
                      const letter = grade.charAt(0);
                      return (
                        <div key={grade} className="grade-bar-item">
                          <div className="grade-bar-label">{grade}</div>
                          <div className="grade-bar-track">
                            <div
                              className="grade-bar-fill"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: gradeColorMap[letter] || '#888',
                              }}
                            />
                          </div>
                          <div className="grade-bar-count">
                            {(count as number).toLocaleString()}명 ({percent.toFixed(1)}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="summary-info">
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="실행 ID">{batchResult?.batchId}</Descriptions.Item>
                  <Descriptions.Item label="실행 모드">
                    <Tag color="blue">{modeLabels[mode].label}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="시작 시간">
                    {batchResult ? new Date(batchResult.runStart).toLocaleString('ko-KR') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="완료 시간">
                    {batchStatus.endedAt ? new Date(batchStatus.endedAt).toLocaleString('ko-KR') : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </div>
            </>
          )}

          <div className="summary-actions">
            <Button type="primary" onClick={() => setBatchSummaryModal(false)}>
              확인
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CreditEvaluatePage;
