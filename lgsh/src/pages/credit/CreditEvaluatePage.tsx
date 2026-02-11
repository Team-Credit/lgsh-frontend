/**
 * 신용평가 실행 화면 (개인/그룹/전체 모드 지원)
 * - 기간 선택 시 월별로 분리하여 진행률/완료 표시
 */
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Modal,
  notification,
  Progress,
  Tag,
  Typography,
  Descriptions,
  Spin,
  Alert,
  DatePicker,
} from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
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
import { modelService } from '@/services/modelService';
import type { ModelListResponse } from '@/types';
import './CreditEvaluatePage.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const STORAGE_KEY = 'credit_batch_in_progress';

type LookupStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error';
type ItemScores = Record<string, number>;

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

const formatRunStart = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('ko-KR');
};

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

/** 월별 배치 추적 */
interface MonthlyBatch {
  month: string;
  batchResult: CreditBatchRunResult | null;
  batchStatus: CreditBatchStatus | null;
}

/** 두 Dayjs 사이의 월 목록 생성 */
const generateMonths = (from: Dayjs, to: Dayjs): string[] => {
  const months: string[] = [];
  let cursor = from.startOf('month');
  const end = to.startOf('month');
  while (cursor.isBefore(end) || cursor.isSame(end, 'month')) {
    months.push(cursor.format('YYYY-MM'));
    cursor = cursor.add(1, 'month');
  }
  return months;
};

const normalizeModelId = (value?: string | null) => (value ?? '').replace(/[_-]/g, '').toUpperCase();
const pickDefaultModelId = (list: ModelListResponse[]) => {
  const preferred = list.find((m) => normalizeModelId(m.modelId) === 'MDL001')?.modelId;
  return preferred || list[0]?.modelId || undefined;
};

const CreditEvaluatePage: React.FC = () => {
  const [form] = Form.useForm<CreditPredictRequest & { evalRange?: [Dayjs, Dayjs] }>();
  const [mode, setMode] = useState<CreditRunMode>('single');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreditPredictResult | null>(null);
  const [models, setModels] = useState<ModelListResponse[]>([]);

  // 월별 배치 추적 (단일 월이면 length=1, 복수 월이면 length=N)
  const [monthlyBatches, setMonthlyBatches] = useState<MonthlyBatch[]>([]);
  const [statusPolling, setStatusPolling] = useState(false);
  const [evalTime, setEvalTime] = useState<string>('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMode, setPdfMode] = useState(false);
  const pdfRef = React.useRef<HTMLDivElement | null>(null);
  const [batchPdfLoading, setBatchPdfLoading] = useState(false);
  const [batchPdfMode, setBatchPdfMode] = useState(false);
  const batchPdfRef = React.useRef<HTMLDivElement | null>(null);
  const personId = Form.useWatch('personId', form);
  const [personName, setPersonName] = useState('');
  const [personLookupStatus, setPersonLookupStatus] = useState<LookupStatus>('idle');
  const [batchProgressModal, setBatchProgressModal] = useState(false);
  const [batchSummaryModal, setBatchSummaryModal] = useState(false);
  const [batchStarting, setBatchStarting] = useState(false);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleElapsed, setSingleElapsed] = useState(0);
  const singleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [celeryRunning, setCeleryRunning] = useState<boolean | null>(null);
  const [celeryWarned, setCeleryWarned] = useState(false);
  const [latestRawDataId, setLatestRawDataId] = useState<string | null>(null);
  const monthlyBatchesRef = useRef<MonthlyBatch[]>([]);
  const batchProgressModalRef = useRef(false);

  // Derived
  const firstBatchResult = monthlyBatches[0]?.batchResult ?? null;
  const isMultiMonth = monthlyBatches.length > 1;
  const isBatchRunning = batchStarting || statusPolling || batchProgressModal;

  // 개인 평가 타이머 정리
  useEffect(() => {
    return () => {
      if (singleTimerRef.current) clearInterval(singleTimerRef.current);
    };
  }, []);

  // ref 동기화 (폴링 클로저용)
  useEffect(() => {
    batchProgressModalRef.current = batchProgressModal;
  }, [batchProgressModal]);
  useEffect(() => {
    monthlyBatchesRef.current = monthlyBatches;
  }, [monthlyBatches]);

  // 모델 목록 로드
  useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await modelService.list({ page: 0, size: 200 });
        if (res.data?.success && res.data?.data?.content) {
          const list = res.data.data.content;
          setModels(list);
          if (list.length > 0 && !form.getFieldValue('modelId')) {
            form.setFieldsValue({ modelId: pickDefaultModelId(list) });
          }
        }
      } catch {
        // 모델 목록 로드 실패 시 수동 입력 가능
      }
    };
    loadModels();
  }, []);

  // localStorage 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || !saved.mode) return;

      if (saved.monthlyBatches && Array.isArray(saved.monthlyBatches) && saved.monthlyBatches.length > 0) {
        const restored: MonthlyBatch[] = saved.monthlyBatches
          .filter((mb: any) => mb.batchResult?.batchId && mb.batchResult?.runId)
          .map((mb: any) => ({
            month: mb.month || '',
            batchResult: mb.batchResult,
            batchStatus: null,
          }));
        if (restored.length > 0) {
          setMode(saved.mode);
          setMonthlyBatches(restored);
          setStatusPolling(true);
          setBatchProgressModal(true);
        }
      } else if (saved.batchResult?.batchId && saved.batchResult?.runId) {
        // 이전 형식 호환
        setMode(saved.mode);
        setMonthlyBatches([{
          month: saved.batchFilters?.fromMonth || '',
          batchResult: saved.batchResult,
          batchStatus: null,
        }]);
        setStatusPolling(true);
        setBatchProgressModal(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Celery 상태 확인
  useEffect(() => {
    let isMounted = true;

    const fetchCeleryStatus = async () => {
      try {
        const response = await creditService.getCeleryStatus();
        const running = !!(response.success && response.data?.running);
        if (!isMounted) return;
        setCeleryRunning(running);
        if (!running && !celeryWarned) {
          message.warning('Celery 미실행 상태입니다. 그룹/전체 평가는 실행할 수 없습니다.');
          setCeleryWarned(true);
        }
      } catch (error) {
        if (!isMounted) return;
        setCeleryRunning(false);
        if (!celeryWarned) {
          message.warning('Celery 미실행 상태입니다. 그룹/전체 평가는 실행할 수 없습니다.');
          setCeleryWarned(true);
        }
      }
    };

    fetchCeleryStatus();
    return () => {
      isMounted = false;
    };
  }, [celeryWarned]);

  // 최신 RAW_DATA_ID 조회 (기간이 단일 월일 때만)
  const evalRangeWatch = Form.useWatch('evalRange', form) as [Dayjs, Dayjs] | undefined;
  const rawDataIdWatch = Form.useWatch('rawDataId', form) as string | undefined;

  useEffect(() => {
    let cancelled = false;

    const fetchLatest = async (month: string) => {
      try {
        const res = await creditService.getLatestRawDataId(month);
        if (cancelled) return;
        if (res.success) {
          setLatestRawDataId(res.data?.rawDataId ?? null);
        } else {
          setLatestRawDataId(null);
        }
      } catch {
        if (!cancelled) setLatestRawDataId(null);
      }
    };

    if (mode !== 'group' && mode !== 'all') {
      setLatestRawDataId(null);
      return () => {
        cancelled = true;
      };
    }

    if (!evalRangeWatch || !evalRangeWatch[0] || !evalRangeWatch[1]) {
      setLatestRawDataId(null);
      return () => {
        cancelled = true;
      };
    }

    const m1 = evalRangeWatch[0].format('YYYY-MM');
    const m2 = evalRangeWatch[1].format('YYYY-MM');
    if (m1 !== m2) {
      setLatestRawDataId(null);
      return () => {
        cancelled = true;
      };
    }

    fetchLatest(m1);

    return () => {
      cancelled = true;
    };
  }, [mode, evalRangeWatch?.[0]?.valueOf(), evalRangeWatch?.[1]?.valueOf()]);

  // 배치 상태 폴링 (월별)
  useEffect(() => {
    if (!statusPolling || mode === 'single') return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchStatuses = async () => {
      if (cancelled) return;
      const current = [...monthlyBatchesRef.current];
      if (current.length === 0) {
        if (!cancelled) timer = setTimeout(fetchStatuses, 1500);
        return;
      }

      let allFinished = true;

      for (let i = 0; i < current.length; i++) {
        if (cancelled) return;
        const mb = current[i];
        if (!mb.batchResult) continue;
        if (mb.batchStatus && ['SUCCESS', 'PARTIAL', 'FAILED'].includes(mb.batchStatus.status)) {
          continue;
        }

        try {
          const response = await creditService.getBatchStatus(
            mb.batchResult.batchId,
            mb.batchResult.runId,
            {
              mode: mb.batchResult.mode,
              userId: mb.batchResult.userId,
              fromMonth: mb.month && mb.month !== '전체' ? mb.month : undefined,
              toMonth: mb.month && mb.month !== '전체' ? mb.month : undefined,
            }
          );
          if (response.success && response.data) {
            current[i] = { ...mb, batchStatus: response.data };
            if (!['SUCCESS', 'PARTIAL', 'FAILED'].includes(response.data.status)) {
              allFinished = false;
            }
          } else {
            allFinished = false;
            if (!mb.batchStatus) {
              current[i] = {
                ...mb,
                batchStatus: {
                  batchId: mb.batchResult.batchId,
                  status: 'RUNNING',
                  totalCount: 0,
                  processedCount: 0,
                  successCount: 0,
                  failCount: 0,
                },
              };
            }
          }
        } catch (error) {
          allFinished = false;
          console.error(`Status polling error for ${mb.month}:`, error);
        }
      }

      if (!cancelled) {
        setMonthlyBatches([...current]);

        if (allFinished && current.some((mb) => mb.batchResult)) {
          setStatusPolling(false);
          const wasBackground = !batchProgressModalRef.current;
          setBatchProgressModal(false);
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}

          const hasFailure = current.some((mb) => mb.batchStatus?.status === 'FAILED');
          const hasPartial = current.some((mb) => mb.batchStatus?.status === 'PARTIAL');
          const allSuccess = current.every((mb) => mb.batchStatus?.status === 'SUCCESS');

          if (allSuccess) {
            setBatchSummaryModal(true);
            if (wasBackground) {
              notification.success({
                message: '평가 완료',
                description: '신용평가가 정상적으로 완료되었습니다. 결과를 확인하세요.',
                duration: 5,
              });
            }
          } else if (hasFailure && !current.some((mb) => mb.batchStatus?.status === 'SUCCESS')) {
            message.error('평가가 실패했습니다.');
            if (wasBackground) {
              notification.error({
                message: '평가 실패',
                description: '신용평가 실행 중 오류가 발생했습니다.',
                duration: 5,
              });
            }
          } else if (hasPartial || hasFailure) {
            message.warning('평가가 부분적으로 완료되었습니다.');
            setBatchSummaryModal(true);
            if (wasBackground) {
              notification.warning({
                message: '평가 부분 완료',
                description: '신용평가가 부분적으로 완료되었습니다. 결과를 확인하세요.',
                duration: 5,
              });
            }
          }
        }
      }

      if (!cancelled && !allFinished) {
        timer = setTimeout(fetchStatuses, 1500);
      }
    };

    fetchStatuses();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [statusPolling, mode]);

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
    if (score >= 900) return { grade: 'A', label: '최우수', color: '#4CAF50' };
    if (score >= 800) return { grade: 'B', label: '우수', color: '#2196F3' };
    if (score >= 700) return { grade: 'C', label: '양호', color: '#FF9800' };
    if (score >= 600) return { grade: 'D', label: '보통', color: '#FF5722' };
    return { grade: 'E', label: '주의', color: '#F44336' };
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

  // 평가 실행
  const handleSubmit = async () => {
    if (isBatchRunning) {
      if (!batchProgressModal) {
        setBatchProgressModal(true);
      }
      return;
    }
    if (mode !== 'single' && celeryRunning === false) {
      message.warning('Celery 미실행 상태입니다. 그룹/전체 평가는 실행할 수 없습니다.');
      return;
    }

    try {
      const values = await form.validateFields();
      setLoading(true);
      setResult(null);
      setMonthlyBatches([]);

      const payload: CreditPredictRequest = {
        ...values,
        mode,
      };
      const evalRange = values.evalRange as [Dayjs, Dayjs] | undefined;
      // Do not send evalRange to backend
      delete (payload as any).evalRange;

      const rawDataId = (values as any).rawDataId ? String((values as any).rawDataId).trim() : '';
      const hasRawDataId = rawDataId.length > 0;
      if (hasRawDataId) {
        payload.rawDataId = rawDataId;
        delete (payload as any).snapshotMonth;
        delete (payload as any).fromMonth;
        delete (payload as any).toMonth;
      }

      if (mode === 'single') {
        if (!hasRawDataId && evalRange && evalRange[0] && evalRange[1]) {
          payload.fromMonth = evalRange[0].format('YYYY-MM');
          payload.toMonth = evalRange[1].format('YYYY-MM');
        }

        setSingleLoading(true);
        setSingleElapsed(0);
        singleTimerRef.current = setInterval(() => {
          setSingleElapsed((prev) => prev + 1);
        }, 1000);

        try {
          const response = await creditService.predict(payload);
          if (response.success && response.data) {
            setResult(response.data);
            setEvalTime(new Date().toLocaleString('ko-KR'));
            message.success('평가가 완료되었습니다.');
          } else {
            message.error(response.message || '평가에 실패했습니다.');
          }
        } finally {
          if (singleTimerRef.current) {
            clearInterval(singleTimerRef.current);
            singleTimerRef.current = null;
          }
          setSingleLoading(false);
        }
      } else {
        // 배치 모드: 월별 분리 실행
        let months: string[] = [];
        if (!hasRawDataId && evalRange && evalRange[0] && evalRange[1]) {
          months = generateMonths(evalRange[0], evalRange[1]);
        }
        if (months.length === 0) {
          // 기간 미지정 시 단일 배치
          months = [''];
        }

        setBatchProgressModal(true);
        setBatchStarting(true);

        const batches: MonthlyBatch[] = [];

        for (const month of months) {
          const monthPayload: CreditPredictRequest = { ...payload };
          if (!hasRawDataId && month) {
            monthPayload.fromMonth = month;
            monthPayload.toMonth = month;
          }

          try {
            const response = await creditService.runBatch(monthPayload);
            if (response.success && response.data) {
              batches.push({
                month: month || (hasRawDataId ? 'RAW_DATA_ID' : '전체'),
                batchResult: response.data,
                batchStatus: {
                  batchId: response.data.batchId,
                  status: 'RUNNING',
                  totalCount: 0,
                  processedCount: 0,
                  successCount: 0,
                  failCount: 0,
                  startedAt: response.data.runStart,
                },
              });
            } else {
              message.error(`${month || '전체'} 평가 시작 실패: ${response.message || ''}`);
            }
          } catch (err) {
            message.error(`${month || '전체'} 평가 시작 실패`);
          }
        }

        if (batches.length > 0) {
          setMonthlyBatches(batches);
          setStatusPolling(true);
          try {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({
                mode,
                monthlyBatches: batches.map((mb) => ({
                  month: mb.month,
                  batchResult: mb.batchResult,
                })),
              })
            );
          } catch {}
          const monthLabel = batches.length > 1 ? ` (${batches.length}개월)` : '';
          message.success(`${modeLabels[mode].label}가 시작되었습니다.${monthLabel}`);
        } else {
          setBatchProgressModal(false);
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
          message.error('평가 시작에 실패했습니다.');
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
    const current = monthlyBatchesRef.current;
    if (current.length === 0) return;
    try {
      const updated = await Promise.all(
        current.map(async (mb) => {
          if (!mb.batchResult) return mb;
          try {
            const response = await creditService.getBatchStatus(
              mb.batchResult.batchId,
              mb.batchResult.runId,
              {
                mode: mb.batchResult.mode,
                userId: mb.batchResult.userId,
                fromMonth: mb.month && mb.month !== '전체' ? mb.month : undefined,
                toMonth: mb.month && mb.month !== '전체' ? mb.month : undefined,
              }
            );
            if (response.success && response.data) {
              return { ...mb, batchStatus: response.data };
            }
          } catch {
            // keep existing status
          }
          return mb;
        })
      );
      setMonthlyBatches(updated);
    } catch (error) {
      message.error('상태 조회에 실패했습니다.');
    }
  }, []);

  const handleStopBatch = useCallback(async () => {
    const current = monthlyBatchesRef.current;
    if (current.length === 0) return;
    try {
      await Promise.all(
        current
          .filter(
            (mb) =>
              mb.batchResult &&
              (!mb.batchStatus || ['PENDING', 'RUNNING'].includes(mb.batchStatus.status))
          )
          .map((mb) =>
            creditService.stopBatch({
              batchId: mb.batchResult!.batchId,
              runId: mb.batchResult!.runId,
              mode: mb.batchResult!.mode,
              userId: mb.batchResult!.userId,
            })
          )
      );
      setStatusPolling(false);
      setBatchProgressModal(false);
      setMonthlyBatches([]);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      message.warning('평가가 중지되었습니다. 이미 처리된 건은 저장됩니다.');
    } catch (error) {
      message.error('평가 중지에 실패했습니다.');
    }
  }, []);

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

  // Batch summary PDF save (group/all, single/multi-month).
  const handleSaveBatchPdf = async () => {
    if (!batchPdfRef.current || batchPdfLoading) return;
    setBatchPdfLoading(true);
    try {
      setBatchPdfMode(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(batchPdfRef.current, {
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

      const safeModel = (form.getFieldValue('modelId') || 'model').toString().replace(/[^\w-]+/g, '_');
      const label = isMultiMonth
        ? `${monthlyBatches[0]?.month || 'from'}-${monthlyBatches[monthlyBatches.length - 1]?.month || 'to'}`
        : (monthlyBatches[0]?.month || 'batch');
      const safeLabel = label.toString().replace(/[^\w-]+/g, '_');
      const safeRunId = (monthlyBatches[0]?.batchResult?.runId || 'run').toString().replace(/[^\w-]+/g, '_');
      pdf.save(`credit-evaluation-batch-${safeModel}-${safeLabel}-${safeRunId}.pdf`);
    } catch (error) {
      message.error('PDF 저장에 실패했습니다.');
    } finally {
      setBatchPdfMode(false);
      setBatchPdfLoading(false);
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

  // 모드 초기화 핸들러
  const handleModeChange = (newMode: CreditRunMode) => {
    setMode(newMode);
    setResult(null);
    setMonthlyBatches([]);
    form.resetFields();
  };

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
        {celeryRunning === false && (
          <Alert
            type="warning"
            showIcon
            message="Celery 미실행"
            description="그룹/전체 평가는 실행되지 않습니다. start_celery.cmd로 워커를 먼저 실행하세요."
            style={{ marginBottom: 16 }}
          />
        )}
        <div className="evaluate-layout">
          {/* 왼쪽: 모드 선택 버튼 */}
          <div className="mode-buttons">
            <div className="mode-label">구분</div>
            <Button
              type={mode === 'single' ? 'primary' : 'default'}
              onClick={() => handleModeChange('single')}
              block
            >
              개인
            </Button>
            <Button
              type={mode === 'group' ? 'primary' : 'default'}
              onClick={() => handleModeChange('group')}
              block
            >
              그룹
            </Button>
            <Button
              type={mode === 'all' ? 'primary' : 'default'}
              onClick={() => handleModeChange('all')}
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
                evalRange: [dayjs('2025-07', 'YYYY-MM'), dayjs('2025-12', 'YYYY-MM')],
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
                    label="모델"
                    name="modelId"
                    rules={[{ required: true, message: '모델을 선택해주세요.' }]}
                  >
                    <Select
                      placeholder="모델 선택"
                      showSearch
                      optionFilterProp="label"
                      options={models.map((m) => ({
                        label: `${m.modelNm} (${m.modelId})`,
                        value: m.modelId,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    label="평가 사유"
                    name="batchDesc"
                    rules={[{ required: true, message: '평가 사유를 입력해주세요.' }]}
                  >
                    <Input placeholder="예: UI 평가" maxLength={200} />
                  </Form.Item>
                  <Form.Item label="평가 기간" name="evalRange">
                    <RangePicker
                      picker="month"
                      style={{ width: '100%' }}
                      disabled={Boolean(rawDataIdWatch && rawDataIdWatch.trim())}
                      defaultPickerValue={[dayjs('2025-01', 'YYYY-MM'), dayjs('2026-01', 'YYYY-MM')]}
                    />
                  </Form.Item>
                  <Form.Item label="RAW_DATA_ID" name="rawDataId">
                    <Input placeholder={latestRawDataId ? `예: ${latestRawDataId}` : '예: RAW_250731'} maxLength={50} />
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
                    label="모델"
                    name="modelId"
                    rules={[{ required: true, message: '모델을 선택해주세요.' }]}
                  >
                    <Select
                      placeholder="모델 선택"
                      showSearch
                      optionFilterProp="label"
                      options={models.map((m) => ({
                        label: `${m.modelNm} (${m.modelId})`,
                        value: m.modelId,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    label="평가 사유"
                    name="batchDesc"
                    rules={[{ required: true, message: '평가 사유를 입력해주세요.' }]}
                  >
                    <Input placeholder="예: UI 평가" maxLength={200} />
                  </Form.Item>
                  <Form.Item label="평가 기간" name="evalRange">
                    <RangePicker
                      picker="month"
                      style={{ width: '100%' }}
                      disabled={Boolean(rawDataIdWatch && rawDataIdWatch.trim())}
                      defaultPickerValue={[dayjs('2025-01', 'YYYY-MM'), dayjs('2026-01', 'YYYY-MM')]}
                    />
                  </Form.Item>
                  <Form.Item label="RAW_DATA_ID" name="rawDataId">
                    <Input placeholder={latestRawDataId ? `예: ${latestRawDataId}` : '예: RAW_250731'} maxLength={50} />
                  </Form.Item>
                </div>
              )}

              {/* 전체 평가 */}
              {mode === 'all' && (
                <div className="form-row">
                  <Form.Item
                    label="모델"
                    name="modelId"
                    rules={[{ required: true, message: '모델을 선택해주세요.' }]}
                  >
                    <Select
                      placeholder="모델 선택"
                      showSearch
                      optionFilterProp="label"
                      options={models.map((m) => ({
                        label: `${m.modelNm} (${m.modelId})`,
                        value: m.modelId,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    label="평가 사유"
                    name="batchDesc"
                    rules={[{ required: true, message: '평가 사유를 입력해주세요.' }]}
                  >
                    <Input placeholder="예: UI 평가" maxLength={200} />
                  </Form.Item>
                  <Form.Item label="평가 기간" name="evalRange">
                    <RangePicker
                      picker="month"
                      style={{ width: '100%' }}
                      disabled={Boolean(rawDataIdWatch && rawDataIdWatch.trim())}
                      defaultPickerValue={[dayjs('2025-01', 'YYYY-MM'), dayjs('2026-01', 'YYYY-MM')]}
                    />
                  </Form.Item>
                  <Form.Item label="RAW_DATA_ID" name="rawDataId">
                    <Input placeholder={latestRawDataId ? `예: ${latestRawDataId}` : '예: RAW_250731'} maxLength={50} />
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
                  {isBatchRunning ? '평가 중..' : '평가 실행'}
                </Button>
                <Button
                  onClick={() => {
                    form.resetFields();
                    setResult(null);
                    setMonthlyBatches([]);
                  }}
                >
                  초기화
                </Button>
              </div>
            </Form>
          </div>
        </div>

        {/* 평가 실행 결과 및 상태 */}
        {monthlyBatches.length > 0 && mode !== 'single' && (
          <Card
            title={
              <Space>
                <span>평가 실행 정보</span>
                {!isMultiMonth && renderStatusTag(monthlyBatches[0]?.batchStatus?.status)}
                {isMultiMonth && <Tag color="blue">{monthlyBatches.length}개월</Tag>}
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
            {/* 단일 월: 기존 레이아웃 */}
            {!isMultiMonth && firstBatchResult && (
              <>
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="실행 ID">{firstBatchResult.batchId}</Descriptions.Item>
                  <Descriptions.Item label="실행 모드">
                    <Tag color="blue">{modeLabels[firstBatchResult.mode].label}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Run ID">{firstBatchResult.runId}</Descriptions.Item>
                  {firstBatchResult.rawDataId && (
                    <Descriptions.Item label="RAW_DATA_ID">{firstBatchResult.rawDataId}</Descriptions.Item>
                  )}
                  <Descriptions.Item label="사용자 ID">{firstBatchResult.userId}</Descriptions.Item>
                  {firstBatchResult.personGrp && (
                    <Descriptions.Item label="그룹">{firstBatchResult.personGrp}</Descriptions.Item>
                  )}
                  <Descriptions.Item label="시작 시간">
                    {formatRunStart(firstBatchResult.runStart)}
                  </Descriptions.Item>
                </Descriptions>

                {firstBatchResult.modelMetrics && (
                  <div style={{ marginTop: 16 }}>
                    <Title level={5}>모델 성능 지표</Title>
                    <Descriptions bordered column={3} size="small">
                      <Descriptions.Item label="AUC">
                        {firstBatchResult.modelMetrics.auc?.toFixed(4) ?? '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="KS 통계량">
                        {firstBatchResult.modelMetrics.ks_stat?.toFixed(4) ?? '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="AR (Accuracy Ratio)">
                        {firstBatchResult.modelMetrics.ar?.toFixed(4) ?? '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                )}

                {monthlyBatches[0]?.batchStatus && (
                  <div style={{ marginTop: 16 }}>
                    <Title level={5}>진행 상황</Title>
                    <Progress
                      percent={
                        monthlyBatches[0].batchStatus.totalCount > 0
                          ? Math.round(
                              (Math.min(
                                monthlyBatches[0].batchStatus.processedCount,
                                monthlyBatches[0].batchStatus.totalCount
                              ) /
                                monthlyBatches[0].batchStatus.totalCount) *
                                100
                            )
                          : 0
                      }
                      status="active"
                    />
                    <Space size="large" style={{ marginTop: 8 }}>
                      <Text>전체: {monthlyBatches[0].batchStatus.totalCount.toLocaleString()}명</Text>
                      <Text type="success">
                        완료:{' '}
                        {Math.min(
                          monthlyBatches[0].batchStatus.successCount,
                          monthlyBatches[0].batchStatus.totalCount
                        ).toLocaleString()}
                        명
                      </Text>
                      <Text type="danger">
                        실패: {monthlyBatches[0].batchStatus.failCount.toLocaleString()}명
                      </Text>
                      <Text>
                        처리:{' '}
                        {Math.min(
                          monthlyBatches[0].batchStatus.processedCount,
                          monthlyBatches[0].batchStatus.totalCount
                        ).toLocaleString()}
                        명
                      </Text>
                    </Space>
                  </div>
                )}
              </>
            )}

            {/* 복수 월: 월별 진행 현황 */}
            {isMultiMonth && (
              <div>
                <Text strong>월별 진행 현황</Text>
                <div style={{ marginTop: 12 }}>
                  {monthlyBatches.map((mb) => {
                    const st = mb.batchStatus;
                    const percent =
                      st && st.totalCount > 0
                        ? Math.round((Math.min(st.processedCount, st.totalCount) / st.totalCount) * 100)
                        : 0;
                    return (
                      <div
                        key={mb.month}
                        style={{
                          marginBottom: 12,
                          padding: '8px 12px',
                          border: '1px solid #f0f0f0',
                          borderRadius: 6,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <Text strong>{mb.month}</Text>
                          <Space>
                            {renderStatusTag(st?.status)}
                            <Text type="secondary">
                              {(st?.totalCount || 0).toLocaleString()}명
                            </Text>
                         </Space>
                        </div>
                        {mb.batchResult?.runId && (
                          <div style={{ marginBottom: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Run ID: {mb.batchResult.runId}
                              {mb.batchResult.rawDataId ? ` / RAW_DATA_ID: ${mb.batchResult.rawDataId}` : ''}
                            </Text>
                          </div>
                        )}
                        <Progress percent={percent} size="small" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}
      </Card>

      {/* 개인 평가 로딩 모달 */}
      <Modal
        open={singleLoading}
        footer={null}
        closable={false}
        maskClosable={false}
        centered
        width={400}
        className="single-loading-modal"
      >
        <div className="single-loading-header">
          <CalculatorOutlined style={{ marginRight: 8 }} />
          개인 평가 진행중
        </div>
        <div className="single-loading-body">
          <Spin size="large" />
          <div className="single-loading-text">
            신용평가 모델을 실행하고 있습니다...
          </div>
          <div className="single-loading-elapsed">
            경과 시간: {singleElapsed}초
          </div>
          {singleElapsed >= 10 && (
            <Alert
              type="info"
              showIcon
              message="모델 캐시가 없는 경우 초기 로딩에 시간이 걸릴 수 있습니다."
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      </Modal>

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
        width={isMultiMonth ? 700 : 600}
        className="batch-progress-modal"
      >
        <div className="batch-progress-header">
          <div className="batch-progress-title">
            {modeLabels[mode].icon}
            <span style={{ marginLeft: 8 }}>{modeLabels[mode].label} 진행중</span>
            {isMultiMonth && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {monthlyBatches.length}개월
              </Tag>
            )}
          </div>
          <Button
            type="text"
            icon={<span style={{ fontSize: 18 }}>×</span>}
            onClick={() => {
              setBatchProgressModal(false);
              message.info('실행 완료 후 알림으로 알려드리겠습니다.');
            }}
            className="batch-progress-minimize"
            title="백그라운드로 전환"
          />
        </div>
        <div className="batch-progress-body">
          {/* 단일 월: 기존 모달 레이아웃 */}
          {!isMultiMonth && firstBatchResult && (
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="실행 ID">{firstBatchResult.batchId}</Descriptions.Item>
              <Descriptions.Item label="실행 모드">
                <Tag color="blue">{modeLabels[firstBatchResult.mode].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Run ID">{firstBatchResult.runId}</Descriptions.Item>
              {firstBatchResult.rawDataId && (
                <Descriptions.Item label="RAW_DATA_ID">{firstBatchResult.rawDataId}</Descriptions.Item>
              )}
              <Descriptions.Item label="시작 시간">
                {formatRunStart(firstBatchResult.runStart)}
              </Descriptions.Item>
            </Descriptions>
          )}

          {monthlyBatches.length > 0 && (
            <>
              {isMultiMonth ? (
                /* 복수 월: 월별 프로그레스 바 */
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {monthlyBatches.map((mb) => {
                    const st = mb.batchStatus;
                    const percent =
                      st && st.totalCount > 0
                        ? Math.round((Math.min(st.processedCount, st.totalCount) / st.totalCount) * 100)
                        : 0;
                    const isFinished =
                      st && ['SUCCESS', 'PARTIAL', 'FAILED'].includes(st.status);

                    return (
                      <div
                        key={mb.month}
                        style={{
                          marginBottom: 16,
                          padding: '8px 12px',
                          border: '1px solid #f0f0f0',
                          borderRadius: 6,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <Text strong>{mb.month}</Text>
                          {renderStatusTag(st?.status)}
                        </div>
                        {mb.batchResult?.runId && (
                          <div style={{ marginBottom: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Run ID: {mb.batchResult.runId}
                              {mb.batchResult.rawDataId ? ` / RAW_DATA_ID: ${mb.batchResult.rawDataId}` : ''}
                            </Text>
                          </div>
                        )}
                        <Progress
                          percent={percent}
                          status={
                            isFinished
                              ? st?.status === 'SUCCESS'
                                ? 'success'
                                : 'exception'
                              : 'active'
                          }
                          size="small"
                        />
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: 4,
                            fontSize: 12,
                          }}
                        >
                          <Text type="secondary">
                            전체: {(st?.totalCount || 0).toLocaleString()}명
                          </Text>
                          <Text type="success">
                            완료:{' '}
                            {Math.min(st?.successCount || 0, st?.totalCount || 0).toLocaleString()}명
                          </Text>
                          <Text type="danger">
                            실패: {(st?.failCount || 0).toLocaleString()}명
                          </Text>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 단일 월: 기존 프로그레스 */
                <>
                  {monthlyBatches[0]?.batchStatus && (
                    <>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>진행 상황</Text>
                        <span style={{ marginLeft: 8 }}>
                          {renderStatusTag(monthlyBatches[0].batchStatus.status)}
                        </span>
                      </div>
                      <Progress
                        percent={
                          monthlyBatches[0].batchStatus.totalCount > 0
                            ? Math.round(
                                (monthlyBatches[0].batchStatus.processedCount /
                                  monthlyBatches[0].batchStatus.totalCount) *
                                  100
                              )
                            : 0
                        }
                        status="active"
                        strokeColor="#1890ff"
                      />
                      <div
                        style={{
                          marginTop: 12,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text>
                          전체: {monthlyBatches[0].batchStatus.totalCount.toLocaleString()}명
                        </Text>
                        <Text type="success">
                          완료: {monthlyBatches[0].batchStatus.successCount.toLocaleString()}명
                        </Text>
                        <Text type="danger">
                          실패: {monthlyBatches[0].batchStatus.failCount.toLocaleString()}명
                        </Text>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {monthlyBatches.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin size="large" />
              <div style={{ marginTop: 12 }}>
                {batchStarting ? '평가 요청 전송중...' : '평가 준비 중...'}
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Button danger icon={<StopOutlined />} onClick={handleStopBatch}>
              중지
            </Button>
            <Button onClick={() => {
              setBatchProgressModal(false);
              message.info('실행 완료 후 알림으로 알려드리겠습니다.');
            }}>백그라운드로 전환</Button>
          </div>
        </div>
      </Modal>

      {/* 배치 완료 요약 모달 */}
      <Modal
        open={batchSummaryModal}
        footer={null}
        closable={false}
        centered
        width={isMultiMonth ? 800 : 700}
        className="batch-summary-modal"
      >
        <div className={`batch-summary-capture${batchPdfMode ? ' pdf-mode' : ''}`} ref={batchPdfRef}>
        <div className="batch-summary-header">
          <div className="batch-summary-title">
            <CheckCircleOutlined style={{ marginRight: 8, color: '#16A34A' }} />
            {modeLabels[mode].label} 완료
          </div>
          <Button
            type="text"
            icon={<span style={{ fontSize: 18 }}>×</span>}
            onClick={() => setBatchSummaryModal(false)}
            className="batch-summary-close pdf-hide"
          />
        </div>
        <div className="batch-summary-body">
          {isMultiMonth ? (
            /* 복수 월: 월별 요약 */
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {/* 전체 합산 요약 */}
              <div className="summary-cards" style={{ marginBottom: 16 }}>
                <div className="summary-card">
                  <div className="summary-card-title">전체 평균 점수</div>
                  <div className="summary-card-value">
                    {(() => {
                      const scores = monthlyBatches
                        .map((mb) => mb.batchStatus?.avgScore)
                        .filter((s): s is number => s != null);
                      return scores.length > 0
                        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
                        : '-';
                    })()}
                  </div>
                  <div className="summary-card-unit">점</div>
                </div>
                <div className="summary-card">
                  <div className="summary-card-title">전체 완료</div>
                  <div className="summary-card-value success">
                    {monthlyBatches
                      .reduce((sum, mb) => sum + (mb.batchStatus?.successCount || 0), 0)
                      .toLocaleString()}
                  </div>
                  <div className="summary-card-unit">명</div>
                </div>
                <div className="summary-card">
                  <div className="summary-card-title">전체 실패</div>
                  <div className="summary-card-value danger">
                    {monthlyBatches
                      .reduce((sum, mb) => sum + (mb.batchStatus?.failCount || 0), 0)
                      .toLocaleString()}
                  </div>
                  <div className="summary-card-unit">명</div>
                </div>
              </div>

              {/* 월별 상세 */}
              {monthlyBatches.map((mb) => (
                <Card
                  key={mb.month}
                  size="small"
                  title={
                    <span>
                      {mb.month} {renderStatusTag(mb.batchStatus?.status)}
                    </span>
                  }
                  style={{ marginBottom: 12 }}
                >
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <div>
                      <Text type="secondary">평균 점수: </Text>
                      <Text strong>{mb.batchStatus?.avgScore?.toFixed(1) ?? '-'}점</Text>
                    </div>
                    <div>
                      <Text type="secondary">완료: </Text>
                      <Text type="success" strong>
                        {(mb.batchStatus?.successCount || 0).toLocaleString()}명
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">실패: </Text>
                      <Text type="danger" strong>
                        {(mb.batchStatus?.failCount || 0).toLocaleString()}명
                      </Text>
                    </div>
                  </div>
                  {mb.batchStatus?.gradeDistribution &&
                    Object.keys(mb.batchStatus.gradeDistribution).length > 0 && (
                      <div className="grade-bars" style={{ marginTop: 8 }}>
                        {Object.entries(mb.batchStatus.gradeDistribution).map(
                          ([grade, count]) => {
                            const total = mb.batchStatus!.successCount || 1;
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
                          }
                        )}
                      </div>
                    )}
                </Card>
              ))}
            </div>
          ) : (
            /* 단일 월: 기존 요약 */
            <>
              {monthlyBatches[0]?.batchStatus && (
                <>
                  <div className="summary-cards">
                    <div className="summary-card">
                      <div className="summary-card-title">평균 신용점수</div>
                      <div className="summary-card-value">
                        {monthlyBatches[0].batchStatus.avgScore?.toFixed(1) ?? '-'}
                      </div>
                      <div className="summary-card-unit">점</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-card-title">평가 완료</div>
                      <div className="summary-card-value success">
                        {monthlyBatches[0].batchStatus.successCount.toLocaleString()}
                      </div>
                      <div className="summary-card-unit">명</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-card-title">평가 실패</div>
                      <div className="summary-card-value danger">
                        {monthlyBatches[0].batchStatus.failCount.toLocaleString()}
                      </div>
                      <div className="summary-card-unit">명</div>
                    </div>
                  </div>

                  {monthlyBatches[0].batchStatus.gradeDistribution && (
                    <div className="summary-distribution">
                      <Title level={5}>등급 분포</Title>
                      <div className="grade-bars">
                        {Object.entries(monthlyBatches[0].batchStatus.gradeDistribution).map(
                          ([grade, count]) => {
                            const total = monthlyBatches[0].batchStatus!.successCount || 1;
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
                          }
                        )}
                      </div>
                    </div>
                  )}

                  <div className="summary-info">
                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="실행 ID">
                        {monthlyBatches[0].batchResult?.batchId}
                      </Descriptions.Item>
                      <Descriptions.Item label="실행 모드">
                        <Tag color="blue">{modeLabels[mode].label}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="시작 시간">
                        {formatRunStart(monthlyBatches[0].batchResult?.runStart)}
                      </Descriptions.Item>
                      <Descriptions.Item label="완료 시간">
                        {monthlyBatches[0].batchStatus.endedAt
                          ? new Date(monthlyBatches[0].batchStatus.endedAt).toLocaleString('ko-KR')
                          : '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                </>
              )}
            </>
          )}

          <div className="summary-actions">
            <Button onClick={handleSaveBatchPdf} loading={batchPdfLoading} className="pdf-hide">
              PDF 저장
            </Button>
            <Button type="primary" onClick={() => setBatchSummaryModal(false)} className="pdf-hide">
              확인
            </Button>
          </div>
        </div>
        </div>
      </Modal>
    </div>
  );
};

export default CreditEvaluatePage;
