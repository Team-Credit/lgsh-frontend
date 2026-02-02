/**
 * 신용평가 실행 화면
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Form, Input, Button, Space, message, Modal, Radio, Progress, Spin } from 'antd';
import { CalculatorOutlined, ThunderboltOutlined, UserOutlined, TeamOutlined, GlobalOutlined, CheckCircleOutlined } from '@ant-design/icons';
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
import type { CreditPredictRequest, CreditPredictResult, CreditBatchStatus } from '@/types';
import { creditService, personService } from '@/services';
import './CreditEvaluatePage.css';

type LookupStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

type ItemScores = Record<string, number>;

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const gradeColorMap: Record<string, string> = {
  A: '#1d4ed8',
  B: '#16a34a',
  C: '#facc15',
  D: '#f97316',
  E: '#ef4444',
};

const CreditEvaluatePage: React.FC = () => {
  const [form] = Form.useForm<CreditPredictRequest>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreditPredictResult | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<CreditBatchStatus | null>(null);
  const [evalTime, setEvalTime] = useState<string>('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMode, setPdfMode] = useState(false);
  const pdfRef = React.useRef<HTMLDivElement | null>(null);
  const personId = Form.useWatch('personId', form);
  const mode = Form.useWatch('mode', form);
  const [personName, setPersonName] = useState('');
  const [personLookupStatus, setPersonLookupStatus] = useState<LookupStatus>('idle');

  // ... (previous logic for itemScoreRows, formatItemLabel, gradeInfo, gradeDisplay, displayPerson, itemScoreChart) ...

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
    if (mode === 'group') return '그룹 평가';
    if (mode === 'all') return '전체 평가';
    const idText = personId ? `${personId} - ******` : '-';
    const nameText = personName || '미확인';
    return `${nameText} (${idText})`;
  }, [personId, personName, mode]);

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

  useEffect(() => {
    if (mode !== 'single') {
      setPersonName('');
      setPersonLookupStatus('idle');
      return;
    }

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
  }, [personId, mode]);

  useEffect(() => {
    if (!batchId) {
      setBatchStatus(null);
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await creditService.status(batchId);
        if (response.success && response.data) {
          setBatchStatus(response.data);
          if (['COMPLETED', 'FAILED', 'PARTIAL_SUCCESS'].includes(response.data.status)) {
            return true; // Stop polling
          }
        }
      } catch (error) {
        console.error('Batch status check failed', error);
      }
      return false; // Continue polling
    };

    fetchStatus(); // Initial fetch

    const intervalId = setInterval(async () => {
      const stop = await fetchStatus();
      if (stop) {
        clearInterval(intervalId);
      }
    }, 1000); // Poll every 1 second

    return () => clearInterval(intervalId);
  }, [batchId]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setResult(null);

      const response = await creditService.predict(values as CreditPredictRequest);

      if (response.success && response.data) {
        if (values.mode === 'single') {
          setResult(response.data);
          setEvalTime(new Date().toLocaleString('ko-KR'));
          message.success('평가가 완료되었습니다.');
        } else {
          setBatchId(response.data.batchId || null);
        }
      } else {
        message.error(response.message || '평가에 실패했습니다.');
      }
    } catch (error: any) {
      if (error?.errorFields) {
        message.error('필수 값을 확인해주세요.');
      } else {
        const errorMessage =
          error?.response?.data?.message || error?.message || '평가 중 오류가 발생했습니다.';
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="credit-evaluate-page">
      <div className="page-header">
        <div className="page-title">
          <CalculatorOutlined style={{ marginRight: 8 }} />
          신용평가 실행
        </div>
        <div className="page-subtitle">
          Mock/Real 실행 모드를 전환하고 평가 API 호출을 수행합니다.
        </div>
      </div>


      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            mode: 'single',
            personId: '1000001',
            modelId: 'MDL_001',
            batchDesc: 'UI 평가',
          }}
        >
          <div className="form-grid">
            <Form.Item
              label="실행 모드"
              name="mode"
              rules={[{ required: true, message: '실행 모드를 선택해주세요.' }]}
              className="full-width"
            >
              <Radio.Group buttonStyle="solid">
                <Radio.Button value="single">
                  <UserOutlined style={{ marginRight: 6 }} /> 개인
                </Radio.Button>
                <Radio.Button value="group">
                  <TeamOutlined style={{ marginRight: 6 }} /> 그룹
                </Radio.Button>
                <Radio.Button value="all">
                  <GlobalOutlined style={{ marginRight: 6 }} /> 전체
                </Radio.Button>
              </Radio.Group>
            </Form.Item>

            {mode === 'single' && (
              <>
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
                    personLookupStatus === 'not_found' || personLookupStatus === 'error' ? 'error' : undefined
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
              </>
            )}

            {mode === 'group' && (
              <Form.Item
                label="관리자 ID (그룹 기준)"
                name="userId"
                rules={[{ required: true, message: '관리자 ID를 입력해주세요.' }]}
                tooltip="입력한 사용자 ID가 관리하는 그룹 전체를 대상으로 평가합니다."
              >
                <Input placeholder="예: user01" maxLength={20} />
              </Form.Item>
            )}

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

          <Space>
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleSubmit} loading={loading}>
              평가 실행
            </Button>
            <Button
              onClick={() => {
                form.resetFields();
                setResult(null);
                setPersonName('');
              }}
            >
              초기화
            </Button>
          </Space>
        </Form>
      </Card>

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
              <Button type="primary" onClick={() => setResult(null)}>확인</Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        title="배치 평가 진행 중"
        open={!!batchId}
        footer={null}
        closable={false}
        centered
        maskClosable={false}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {batchStatus?.status === 'COMPLETED' || batchStatus?.status === 'PARTIAL_SUCCESS' ? (
            <div style={{ marginBottom: 20 }}>
              <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
              <h3>평가가 완료되었습니다.</h3>
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>평가 데이터를 처리하고 있습니다...</div>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <Progress
              percent={
                batchStatus?.totalCount
                  ? Math.floor(((batchStatus.processedCount || 0) / batchStatus.totalCount) * 100)
                  : 0
              }
              status={
                batchStatus?.status === 'FAILED' ? 'exception' :
                  (batchStatus?.status === 'COMPLETED' ? 'success' : 'active')
              }
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: '#666' }}>
              <span>전체: {batchStatus?.totalCount || 0}건</span>
              <span>성공: {batchStatus?.successCount || 0}건</span>
            </div>
          </div>

          {(batchStatus?.status === 'COMPLETED' || batchStatus?.status === 'PARTIAL_SUCCESS') && (
            <Button type="primary" onClick={() => setBatchId(null)} block size="large">
              확인
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CreditEvaluatePage;
