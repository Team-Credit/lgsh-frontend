/**
 * 기초데이터조회 페이지
 * - 전체 컬럼 조회
 * - 컬럼 리사이즈, 숨기기/보이기
 * - 정렬, 필터
 * - 일괄 제외/복원 처리
 * - 5만건씩 엑셀 다운로드
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  DatePicker,
  Select,
  Form,
  Modal,
  Tag,
  message,
  Popover,
  Checkbox,
  Card,
  Statistic,
  Row,
  Col,
  Typography,
  List,
} from 'antd';
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import {
  SearchOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  DownloadOutlined,
  StopOutlined,
  DatabaseOutlined,
  UndoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Resizable } from 'react-resizable';
import dayjs from 'dayjs';
import { useAppSelector } from '@/store/hooks';
import { useExcelExport } from '@/contexts/ExcelExportContext';
import rawDataListService from '@/services/rawDataListService';
import type {
  RawDataListItem,
  RawDataListSearchParams,
  RawDataIdItem,
  RawDataStats,
  RawDataRowKey,
} from '@/types/rawDataList';
import { APPLY_FLAG, EXCLUDABLE_FLAGS, RESTORABLE_FLAGS } from '@/types/rawDataList';
import type { ExcelColumn } from '@/utils/excelExport';
import './RawDataListPage.css';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

// 컬럼 정의 (전체 컬럼)
const ALL_COLUMN_KEYS = [
  'rawDataId',
  'personId',
  'personNm',
  'companyId',
  'companyNm',
  'snapshotDate',
  'applyFlag',
  'dataCollectDt',
  'regDt',
  'livAdd',
  'resAdd',
  'livResMatchYn',
  'addYn',
  'homeIdRegisterDays',
  'cardIssueRecencyDays',
  'newCardIssueCnt6m',
  'newCardIssueCnt12m',
  'currentCardCnt',
  'cardCntChange12m',
  'mainCard6mAvgLimitUsageRatio',
  'cardLimitAmt',
  'loanLimitAmt',
  'loanIntRate',
  'lumpAmtChg1m',
  'lumpAmtChg3m',
  'lumpAmtChg6m',
  'instAmtChg1m',
  'instAmtChg3m',
  'instAmtChg6m',
  'cashAdvAmtChg1m',
  'cashAdvAmtChg3m',
  'cashAdvAmtChg6m',
  'recentDelqAmt',
  'maxDelqAmt',
  'sumDelqAmt',
  'meanDelqAmt',
  'maxDpdDays',
  'recentDpdDays',
  'dpdMean3m',
  'dpdMax3m',
  'dpdStd3m',
  'dpdMean6m',
  'dpdMax6m',
  'dpdStd6m',
  'dpdMean12m',
  'dpdMax12m',
  'dpdStd12m',
  'newLoanIssueCnt1m',
  'newLoanIssueCnt3m',
  'newLoanIssueCnt6m',
  'loanRecencyDays',
  'loanTenureDays',
  'lenderCntChange12m',
  'budo',
  'cardLumpSum3m',
  'cardLumpAvg3m',
  'cardLumpMax3m',
  'cardInstSum3m',
  'cardInstAvg3m',
  'cardInstMax3m',
  'cardCashAdvSum3m',
  'cardCashAdvAvg3m',
  'cardCashAdvMax3m',
  'cardLumpSum6m',
  'cardLumpAvg6m',
  'cardLumpMax6m',
  'cardInstSum6m',
  'cardInstAvg6m',
  'cardInstMax6m',
  'cardCashAdvSum6m',
  'cardCashAdvAvg6m',
  'cardCashAdvMax6m',
  'cardCashAdvRatio3m',
  'cardCashAdvRatio6m',
  'loanBalAvg3m',
  'loanBalAvg6m',
  'loanRepaySum3m',
  'loanRepaySum6m',
  'loanIntPaySum3m',
  'loanIntPaySum6m',
  'uploadId',
  'dataStatus',
  'validationMsg',
];

// 기본 표시 컬럼
const DEFAULT_VISIBLE_COLUMNS = [
  'rawDataId',
  'personId',
  'personNm',
  'snapshotDate',
  'applyFlag',
  'currentCardCnt',
  'cardLimitAmt',
  'loanLimitAmt',
  'recentDelqAmt',
  'maxDpdDays',
  'budo',
];

// 컬럼 정보 (제목, 너비)
const COLUMN_INFO: Record<string, { title: string; width: number; group?: string }> = {
  rawDataId: { title: '데이터ID', width: 180 },
  personId: { title: '대상자ID', width: 120 },
  personNm: { title: '대상자명', width: 100 },
  companyId: { title: '원청사ID', width: 100 },
  companyNm: { title: '원청사명', width: 120 },
  snapshotDate: { title: '스냅샷일', width: 100 },
  applyFlag: { title: '반영상태', width: 90 },
  dataCollectDt: { title: '수집일', width: 100 },
  regDt: { title: '등록일시', width: 150 },
  livAdd: { title: '거주지', width: 80, group: '주소' },
  resAdd: { title: '주민등록지', width: 80, group: '주소' },
  livResMatchYn: { title: '주소일치', width: 80, group: '주소' },
  addYn: { title: '주소유효', width: 80, group: '주소' },
  homeIdRegisterDays: { title: '주민등록일수', width: 100, group: '카드' },
  cardIssueRecencyDays: { title: '최근카드발급일수', width: 120, group: '카드' },
  newCardIssueCnt6m: { title: '6M신규카드', width: 90, group: '카드' },
  newCardIssueCnt12m: { title: '12M신규카드', width: 100, group: '카드' },
  currentCardCnt: { title: '현재카드수', width: 90, group: '카드' },
  cardCntChange12m: { title: '12M카드변화', width: 100, group: '카드' },
  mainCard6mAvgLimitUsageRatio: { title: '주카드한도사용률', width: 120, group: '한도' },
  cardLimitAmt: { title: '카드한도', width: 100, group: '한도' },
  loanLimitAmt: { title: '대출한도', width: 100, group: '한도' },
  loanIntRate: { title: '대출이자율', width: 90, group: '한도' },
  lumpAmtChg1m: { title: '1M일시불변화', width: 100, group: '카드사용' },
  lumpAmtChg3m: { title: '3M일시불변화', width: 100, group: '카드사용' },
  lumpAmtChg6m: { title: '6M일시불변화', width: 100, group: '카드사용' },
  instAmtChg1m: { title: '1M할부변화', width: 100, group: '카드사용' },
  instAmtChg3m: { title: '3M할부변화', width: 100, group: '카드사용' },
  instAmtChg6m: { title: '6M할부변화', width: 100, group: '카드사용' },
  cashAdvAmtChg1m: { title: '1M현금서비스변화', width: 120, group: '카드사용' },
  cashAdvAmtChg3m: { title: '3M현금서비스변화', width: 120, group: '카드사용' },
  cashAdvAmtChg6m: { title: '6M현금서비스변화', width: 120, group: '카드사용' },
  recentDelqAmt: { title: '최근연체금액', width: 100, group: '연체' },
  maxDelqAmt: { title: '최대연체금액', width: 100, group: '연체' },
  sumDelqAmt: { title: '총연체금액', width: 100, group: '연체' },
  meanDelqAmt: { title: '평균연체금액', width: 100, group: '연체' },
  maxDpdDays: { title: '최대연체일', width: 90, group: '연체' },
  recentDpdDays: { title: '최근연체일', width: 90, group: '연체' },
  dpdMean3m: { title: '3M평균DPD', width: 90, group: 'DPD' },
  dpdMax3m: { title: '3M최대DPD', width: 90, group: 'DPD' },
  dpdStd3m: { title: '3M표준DPD', width: 90, group: 'DPD' },
  dpdMean6m: { title: '6M평균DPD', width: 90, group: 'DPD' },
  dpdMax6m: { title: '6M최대DPD', width: 90, group: 'DPD' },
  dpdStd6m: { title: '6M표준DPD', width: 90, group: 'DPD' },
  dpdMean12m: { title: '12M평균DPD', width: 100, group: 'DPD' },
  dpdMax12m: { title: '12M최대DPD', width: 100, group: 'DPD' },
  dpdStd12m: { title: '12M표준DPD', width: 100, group: 'DPD' },
  newLoanIssueCnt1m: { title: '1M신규대출', width: 90, group: '대출' },
  newLoanIssueCnt3m: { title: '3M신규대출', width: 90, group: '대출' },
  newLoanIssueCnt6m: { title: '6M신규대출', width: 90, group: '대출' },
  loanRecencyDays: { title: '대출최신성', width: 90, group: '대출' },
  loanTenureDays: { title: '대출기간', width: 80, group: '대출' },
  lenderCntChange12m: { title: '12M대출기관변화', width: 120, group: '대출' },
  budo: { title: '부도', width: 80 },
  cardLumpSum3m: { title: '3M일시불합계', width: 100, group: '카드통계3M' },
  cardLumpAvg3m: { title: '3M일시불평균', width: 100, group: '카드통계3M' },
  cardLumpMax3m: { title: '3M일시불최대', width: 100, group: '카드통계3M' },
  cardInstSum3m: { title: '3M할부합계', width: 100, group: '카드통계3M' },
  cardInstAvg3m: { title: '3M할부평균', width: 100, group: '카드통계3M' },
  cardInstMax3m: { title: '3M할부최대', width: 100, group: '카드통계3M' },
  cardCashAdvSum3m: { title: '3M현금서비스합계', width: 120, group: '카드통계3M' },
  cardCashAdvAvg3m: { title: '3M현금서비스평균', width: 120, group: '카드통계3M' },
  cardCashAdvMax3m: { title: '3M현금서비스최대', width: 120, group: '카드통계3M' },
  cardLumpSum6m: { title: '6M일시불합계', width: 100, group: '카드통계6M' },
  cardLumpAvg6m: { title: '6M일시불평균', width: 100, group: '카드통계6M' },
  cardLumpMax6m: { title: '6M일시불최대', width: 100, group: '카드통계6M' },
  cardInstSum6m: { title: '6M할부합계', width: 100, group: '카드통계6M' },
  cardInstAvg6m: { title: '6M할부평균', width: 100, group: '카드통계6M' },
  cardInstMax6m: { title: '6M할부최대', width: 100, group: '카드통계6M' },
  cardCashAdvSum6m: { title: '6M현금서비스합계', width: 120, group: '카드통계6M' },
  cardCashAdvAvg6m: { title: '6M현금서비스평균', width: 120, group: '카드통계6M' },
  cardCashAdvMax6m: { title: '6M현금서비스최대', width: 120, group: '카드통계6M' },
  cardCashAdvRatio3m: { title: '3M현금서비스비율', width: 120, group: '비율' },
  cardCashAdvRatio6m: { title: '6M현금서비스비율', width: 120, group: '비율' },
  loanBalAvg3m: { title: '3M대출잔액평균', width: 110, group: '대출통계' },
  loanBalAvg6m: { title: '6M대출잔액평균', width: 110, group: '대출통계' },
  loanRepaySum3m: { title: '3M대출상환합계', width: 110, group: '대출통계' },
  loanRepaySum6m: { title: '6M대출상환합계', width: 110, group: '대출통계' },
  loanIntPaySum3m: { title: '3M이자지급합계', width: 110, group: '대출통계' },
  loanIntPaySum6m: { title: '6M이자지급합계', width: 110, group: '대출통계' },
  uploadId: { title: '업로드ID', width: 120 },
  dataStatus: { title: '데이터상태', width: 90 },
  validationMsg: { title: '검증메시지', width: 200 },
};

// localStorage 키
const STORAGE_KEY_WIDTHS = 'rawDataListColumnWidths';
const STORAGE_KEY_VISIBLE = 'rawDataListVisibleColumns';

// 저장된 컬럼 너비 로드
const getStoredColumnWidths = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_WIDTHS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  const defaults: Record<string, number> = {};
  Object.entries(COLUMN_INFO).forEach(([key, info]) => {
    defaults[key] = info.width;
  });
  return defaults;
};

// 저장된 표시 컬럼 로드
const getStoredVisibleColumns = (): Record<string, boolean> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VISIBLE);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  const defaults: Record<string, boolean> = {};
  ALL_COLUMN_KEYS.forEach((key) => {
    defaults[key] = DEFAULT_VISIBLE_COLUMNS.includes(key);
  });
  return defaults;
};

// 리사이즈 가능한 헤더 셀
const ResizableTitle = (
  props: React.HTMLAttributes<HTMLElement> & {
    onResize?: (e: React.SyntheticEvent, data: { size: { width: number } }) => void;
    width?: number;
  }
) => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 6,
            height: '100%',
            cursor: 'col-resize',
            zIndex: 1,
          }}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

const RawDataListPage: React.FC = () => {
  const [form] = Form.useForm();
  const user = useAppSelector((state) => state.auth.user);
  const { registerExportHandler, unregisterExportHandler } = useExcelExport();

  // 데이터 상태
  const [data, setData] = useState<RawDataListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dataVersion, setDataVersion] = useState(0); // 데이터 버전 (테이블 리렌더링용)

  // 선택 상태
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<RawDataListItem[]>([]);

  // 데이터에 고유 키 추가 (페이지 + 인덱스 기반)
  const dataWithKeys = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      _rowKey: `${page}_${index}_${item.rawDataId}_${item.personId}_${item.snapshotDate}`,
    }));
  }, [data, page]);

  // 컬럼 설정
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    getStoredColumnWidths()
  );
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    getStoredVisibleColumns()
  );
  const [columnSettingOpen, setColumnSettingOpen] = useState(false);

  // 검색 조건
  const [searchParams, setSearchParams] = useState<RawDataListSearchParams>({});

  // 데이터ID 팝업
  const [rawDataIdModalOpen, setRawDataIdModalOpen] = useState(false);
  const [rawDataIds, setRawDataIds] = useState<RawDataIdItem[]>([]);
  const [rawDataIdsLoading, setRawDataIdsLoading] = useState(false);

  // DB 기준 통계
  const [dbStats, setDbStats] = useState<Record<string, number>>({ Y: 0, N: 0, H: 0, X: 0, E: 0 });

  // 제외 가능한 선택 건수
  const excludableCount = useMemo(() => {
    return selectedRows.filter((row) => EXCLUDABLE_FLAGS.includes(row.applyFlag)).length;
  }, [selectedRows]);

  // 복원 가능한 선택 건수
  const restorableCount = useMemo(() => {
    return selectedRows.filter((row) => RESTORABLE_FLAGS.includes(row.applyFlag)).length;
  }, [selectedRows]);

  // DB 통계 조회 (검색 조건 포함)
  const fetchStats = useCallback(async () => {
    try {
      const params: RawDataListSearchParams = {
        ...searchParams,
        companyId: user?.companyId,
      };
      const response = await rawDataListService.getStats(params);
      if (response.success && response.data) {
        const statsMap: Record<string, number> = { Y: 0, N: 0, H: 0, X: 0, E: 0 };
        response.data.forEach((stat: RawDataStats) => {
          statsMap[stat.applyFlag] = stat.cnt;
        });
        setDbStats(statsMap);
      }
    } catch (error) {
      console.error('통계 조회 실패:', error);
    }
  }, [searchParams, user?.companyId]);

  // 데이터 조회
  const fetchData = useCallback(
    async (pageNum: number = 1) => {
      // 조회 전 기존 데이터 초기화
      setData([]);
      setLoading(true);
      try {
        const params: RawDataListSearchParams = {
          ...searchParams,
          companyId: user?.companyId,
          page: pageNum - 1,
          size: pageSize,
        };

        const response = await rawDataListService.getList(params);
        if (response.success && response.data) {
          setData(response.data.content || []);
          setTotal(response.data.totalCount || 0);
          setPage(pageNum);
          setDataVersion((v) => v + 1); // 테이블 리렌더링 강제
        } else {
          setData([]);
          setTotal(0);
          message.error(response.message || '조회에 실패했습니다.');
        }
      } catch (error) {
        console.error('데이터 조회 실패:', error);
        setData([]);
        setTotal(0);
        message.error('데이터 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [searchParams, pageSize, user?.companyId]
  );

  // 데이터ID 목록 조회
  const fetchRawDataIds = useCallback(async () => {
    setRawDataIdsLoading(true);
    try {
      const response = await rawDataListService.getRawDataIds(user?.companyId);
      if (response.success && response.data) {
        setRawDataIds(response.data);
      }
    } catch (error) {
      console.error('데이터ID 목록 조회 실패:', error);
    } finally {
      setRawDataIdsLoading(false);
    }
  }, [user?.companyId]);

  // searchParams 또는 companyId 변경 시 데이터 및 통계 조회
  useEffect(() => {
    fetchData(1);
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user?.companyId]);

  // 검색
  const handleSearch = useCallback(() => {
    const values = form.getFieldsValue();
    const params: RawDataListSearchParams = {};

    if (values.rawDataId) params.rawDataId = values.rawDataId;
    if (values.personId) params.personId = values.personId;
    if (values.applyFlag) params.applyFlag = values.applyFlag;
    if (values.snapshotDateRange && values.snapshotDateRange.length === 2) {
      params.snapshotDateFrom = values.snapshotDateRange[0].format('YYYY-MM-DD');
      params.snapshotDateTo = values.snapshotDateRange[1].format('YYYY-MM-DD');
    }

    setSearchParams(params);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  }, [form]);

  // 초기화
  const handleReset = useCallback(() => {
    form.resetFields();
    setSearchParams({});
    setSelectedRowKeys([]);
    setSelectedRows([]);
  }, [form]);

  // 데이터ID 팝업 열기
  const handleOpenRawDataIdModal = useCallback(() => {
    setRawDataIdModalOpen(true);
    fetchRawDataIds();
  }, [fetchRawDataIds]);

  // 데이터ID 선택
  const handleSelectRawDataId = useCallback((rawDataId: string) => {
    form.setFieldValue('rawDataId', rawDataId);
    setRawDataIdModalOpen(false);
  }, [form]);

  // 일괄 제외 처리 (선택된 행만 - 개별 행 단위)
  const handleExcludeBatch = useCallback(() => {
    console.log('[handleExcludeBatch] 호출됨 - 선택 제외 (개별 행 단위)');
    console.log('[handleExcludeBatch] selectedRows:', selectedRows.length);

    if (selectedRows.length === 0) {
      message.warning('제외할 데이터를 선택해주세요.');
      return;
    }

    const excludableRows = selectedRows.filter((row) =>
      EXCLUDABLE_FLAGS.includes(row.applyFlag)
    );

    if (excludableRows.length === 0) {
      message.warning('제외 가능한 상태(오류/진행중/미반영)의 데이터만 제외할 수 있습니다.');
      return;
    }

    const hasProgressingData = excludableRows.some((row) => row.applyFlag === 'H');

    // 복합키 목록 생성 (rawDataId + personId + companyId)
    const rowKeys: RawDataRowKey[] = excludableRows.map((row) => ({
      rawDataId: row.rawDataId,
      personId: row.personId,
      companyId: row.companyId,
    }));

    console.log('[handleExcludeBatch] rowKeys:', rowKeys.length);

    Modal.confirm({
      title: '선택 제외 처리',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>선택한 <strong>{excludableRows.length}건</strong>을 제외 처리하시겠습니까?</p>
          <p style={{ color: '#666', fontSize: 12 }}>
            (선택한 행만 개별적으로 제외됩니다)
          </p>
          {hasProgressingData && (
            <p style={{ color: '#ff4d4f', marginTop: 8 }}>
              <ExclamationCircleOutlined style={{ marginRight: 4 }} />
              주의: 진행중(H) 상태의 데이터가 포함되어 있습니다.
            </p>
          )}
        </div>
      ),
      okText: '선택 제외',
      cancelText: '취소',
      okButtonProps: { danger: true },
      onOk: async () => {
        console.log('[handleExcludeBatch] API 호출: /list/exclude-rows', rowKeys);
        try {
          const response = await rawDataListService.excludeRows({
            rows: rowKeys,
          });

          if (response.success) {
            message.success(
              response.data?.message || `${response.data?.updatedCount}건이 제외 처리되었습니다.`
            );
            setSelectedRowKeys([]);
            setSelectedRows([]);
            fetchData(page);
            fetchStats();
          } else {
            message.error(response.message || '제외 처리에 실패했습니다.');
          }
        } catch (error) {
          console.error('제외 처리 실패:', error);
          message.error('제외 처리에 실패했습니다.');
        }
      },
    });
  }, [selectedRows, fetchData, fetchStats, page]);

  // 일괄 복원 처리 (선택된 행만 - 개별 행 단위)
  const handleRestoreBatch = useCallback(() => {
    console.log('[handleRestoreBatch] 호출됨 - 선택 복원 (개별 행 단위)');
    console.log('[handleRestoreBatch] selectedRows:', selectedRows.length);

    if (selectedRows.length === 0) {
      message.warning('복원할 데이터를 선택해주세요.');
      return;
    }

    const restorableRows = selectedRows.filter((row) =>
      RESTORABLE_FLAGS.includes(row.applyFlag)
    );

    if (restorableRows.length === 0) {
      message.warning('복원 가능한 상태(제외)의 데이터만 복원할 수 있습니다.');
      return;
    }

    // 복합키 목록 생성 (rawDataId + personId + companyId)
    const rowKeys: RawDataRowKey[] = restorableRows.map((row) => ({
      rawDataId: row.rawDataId,
      personId: row.personId,
      companyId: row.companyId,
    }));

    console.log('[handleRestoreBatch] rowKeys:', rowKeys.length);

    Modal.confirm({
      title: '선택 복원 처리',
      icon: <UndoOutlined />,
      content: (
        <div>
          <p>선택한 <strong>{restorableRows.length}건</strong>을 미반영 상태로 복원하시겠습니까?</p>
          <p style={{ color: '#666', fontSize: 12 }}>
            (선택한 행만 개별적으로 복원됩니다)
          </p>
        </div>
      ),
      okText: '선택 복원',
      cancelText: '취소',
      onOk: async () => {
        console.log('[handleRestoreBatch] API 호출: /list/restore-rows', rowKeys);
        try {
          const response = await rawDataListService.restoreRows({
            rows: rowKeys,
          });

          if (response.success) {
            message.success(
              response.data?.message || `${response.data?.updatedCount}건이 복원 처리되었습니다.`
            );
            setSelectedRowKeys([]);
            setSelectedRows([]);
            fetchData(page);
            fetchStats();
          } else {
            message.error(response.message || '복원 처리에 실패했습니다.');
          }
        } catch (error) {
          console.error('복원 처리 실패:', error);
          message.error('복원 처리에 실패했습니다.');
        }
      },
    });
  }, [selectedRows, fetchData, fetchStats, page]);

  // 전체 제외 처리 (검색 조건 기반)
  const handleExcludeAll = useCallback(() => {
    console.log('[handleExcludeAll] 호출됨 - 조건 전체 제외');
    console.log('[handleExcludeAll] searchParams:', searchParams);

    const targetCount = dbStats['E'] + dbStats['H'] + dbStats['N'];
    if (targetCount === 0) {
      message.warning('제외 가능한 상태(오류/진행중/미반영)의 데이터가 없습니다.');
      return;
    }

    Modal.confirm({
      title: '조건 전체 제외 처리',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
            현재 검색 조건에 맞는 모든 데이터를 제외 처리합니다.
          </p>
          <p>제외 대상: 오류({dbStats['E']}건) + 진행중({dbStats['H']}건) + 미반영({dbStats['N']}건) = <strong>{targetCount.toLocaleString()}건</strong></p>
          <p style={{ color: '#666', fontSize: 12, marginTop: 8 }}>
            이 작업은 되돌릴 수 있습니다. (전체 복원 기능 사용)
          </p>
        </div>
      ),
      okText: '전체 제외',
      cancelText: '취소',
      okButtonProps: { danger: true },
      onOk: async () => {
        console.log('[handleExcludeAll] API 호출: /list/exclude-all');
        try {
          const params: RawDataListSearchParams = {
            ...searchParams,
            companyId: user?.companyId,
          };
          console.log('[handleExcludeAll] params:', params);
          const response = await rawDataListService.excludeAll(params);

          if (response.success) {
            message.success(
              response.data?.message || `${response.data?.updatedCount}건이 제외 처리되었습니다.`
            );
            setSelectedRowKeys([]);
            setSelectedRows([]);
            fetchData(page);
            fetchStats();
          } else {
            message.error(response.message || '제외 처리에 실패했습니다.');
          }
        } catch (error) {
          console.error('전체 제외 처리 실패:', error);
          message.error('전체 제외 처리에 실패했습니다.');
        }
      },
    });
  }, [searchParams, user?.companyId, dbStats, fetchData, fetchStats, page]);

  // 전체 복원 처리 (검색 조건 기반)
  const handleRestoreAll = useCallback(() => {
    console.log('[handleRestoreAll] 호출됨 - 조건 전체 복원');
    console.log('[handleRestoreAll] searchParams:', searchParams);

    const targetCount = dbStats['X'] || 0;
    if (targetCount === 0) {
      message.warning('복원 가능한 상태(제외)의 데이터가 없습니다.');
      return;
    }

    Modal.confirm({
      title: '조건 전체 복원 처리',
      icon: <UndoOutlined />,
      content: (
        <div>
          <p style={{ fontWeight: 'bold' }}>
            현재 검색 조건에 맞는 제외 상태의 모든 데이터를 복원합니다.
          </p>
          <p>복원 대상: 제외({dbStats['X']}건) = <strong>{targetCount.toLocaleString()}건</strong></p>
          <p style={{ color: '#666', fontSize: 12, marginTop: 8 }}>
            복원된 데이터는 미반영(N) 상태로 변경됩니다.
          </p>
        </div>
      ),
      okText: '전체 복원',
      cancelText: '취소',
      onOk: async () => {
        console.log('[handleRestoreAll] API 호출: /list/restore-all');
        try {
          const params: RawDataListSearchParams = {
            ...searchParams,
            companyId: user?.companyId,
          };
          console.log('[handleRestoreAll] params:', params);
          const response = await rawDataListService.restoreAll(params);

          if (response.success) {
            message.success(
              response.data?.message || `${response.data?.updatedCount}건이 복원 처리되었습니다.`
            );
            setSelectedRowKeys([]);
            setSelectedRows([]);
            fetchData(page);
            fetchStats();
          } else {
            message.error(response.message || '복원 처리에 실패했습니다.');
          }
        } catch (error) {
          console.error('전체 복원 처리 실패:', error);
          message.error('전체 복원 처리에 실패했습니다.');
        }
      },
    });
  }, [searchParams, user?.companyId, dbStats, fetchData, fetchStats, page]);

  // 컬럼 리사이즈
  const handleResize = useCallback(
    (key: string) =>
      (_: React.SyntheticEvent, { size }: { size: { width: number } }) => {
        const newWidths = { ...columnWidths, [key]: size.width };
        setColumnWidths(newWidths);
        localStorage.setItem(STORAGE_KEY_WIDTHS, JSON.stringify(newWidths));
      },
    [columnWidths]
  );

  // 컬럼 표시/숨김
  const handleColumnVisibilityChange = useCallback(
    (key: string, checked: boolean) => {
      const newVisible = { ...visibleColumns, [key]: checked };
      setVisibleColumns(newVisible);
      localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify(newVisible));
    },
    [visibleColumns]
  );

  // 컬럼 설정 초기화
  const handleResetColumnSettings = useCallback(() => {
    const defaultWidths: Record<string, number> = {};
    Object.entries(COLUMN_INFO).forEach(([key, info]) => {
      defaultWidths[key] = info.width;
    });
    setColumnWidths(defaultWidths);
    localStorage.setItem(STORAGE_KEY_WIDTHS, JSON.stringify(defaultWidths));

    const defaultVisible: Record<string, boolean> = {};
    ALL_COLUMN_KEYS.forEach((key) => {
      defaultVisible[key] = DEFAULT_VISIBLE_COLUMNS.includes(key);
    });
    setVisibleColumns(defaultVisible);
    localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify(defaultVisible));

    message.success('컬럼 설정이 초기화되었습니다.');
  }, []);

  // 테이블 컬럼 정의
  const columns: ColumnsType<RawDataListItem> = useMemo(() => {
    return ALL_COLUMN_KEYS.filter((key) => visibleColumns[key] !== false).map((key) => {
      const info = COLUMN_INFO[key];
      const baseColumn: any = {
        title: info?.title || key,
        dataIndex: key,
        key,
        width: columnWidths[key] || info?.width || 100,
        ellipsis: true,
        sorter: true,
        onHeaderCell: () => ({
          width: columnWidths[key] || info?.width || 100,
          onResize: handleResize(key),
        }),
      };

      if (key === 'applyFlag') {
        baseColumn.render = (value: string) => {
          const flagInfo = APPLY_FLAG[value as keyof typeof APPLY_FLAG];
          return flagInfo ? (
            <Tag color={flagInfo.color}>{flagInfo.name}</Tag>
          ) : (
            value
          );
        };
        baseColumn.filters = Object.entries(APPLY_FLAG).map(([code, info]) => ({
          text: info.name,
          value: code,
        }));
        baseColumn.onFilter = (value: React.Key | boolean, record: RawDataListItem) =>
          record.applyFlag === value;
      } else if (key === 'snapshotDate' || key === 'dataCollectDt') {
        baseColumn.render = (value: string) =>
          value ? dayjs(value).format('YYYY-MM-DD') : '-';
      } else if (key === 'regDt') {
        baseColumn.render = (value: string) =>
          value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-';
      } else if (key === 'budo') {
        baseColumn.render = (value: number) => (
          <Tag color={value === 1 ? '#ff4d4f' : '#52c41a'}>
            {value === 1 ? '부도' : '정상'}
          </Tag>
        );
      } else if (typeof data[0]?.[key as keyof RawDataListItem] === 'number') {
        baseColumn.render = (value: number) =>
          value != null ? value.toLocaleString() : '-';
        baseColumn.align = 'right';
      }

      return baseColumn;
    });
  }, [visibleColumns, columnWidths, handleResize, data]);

  // 엑셀 컬럼 정의
  const excelColumns: ExcelColumn[] = useMemo(() => {
    return ALL_COLUMN_KEYS.filter((key) => visibleColumns[key] !== false).map((key) => ({
      key,
      title: COLUMN_INFO[key]?.title || key,
      width: 15,
    }));
  }, [visibleColumns]);

  // 엑셀 다운로드용 전체 데이터 조회
  const fetchAllDataForExcel = useCallback(async (): Promise<RawDataListItem[]> => {
    const params: RawDataListSearchParams = {
      ...searchParams,
      companyId: user?.companyId,
      page: 0,
      size: 50000,
    };

    const response = await rawDataListService.getListForExport(params);
    return response.data || [];
  }, [searchParams, user?.companyId]);

  // 페이지별 데이터 조회 (엑셀 배치 다운로드용, 5만건 초과 시)
  const fetchDataByPage = useCallback(async (page: number, size: number): Promise<RawDataListItem[]> => {
    const params: RawDataListSearchParams = {
      ...searchParams,
      companyId: user?.companyId,
      page,
      size,
    };

    const response = await rawDataListService.getListForExport(params);
    return response.data || [];
  }, [searchParams, user?.companyId]);

  // 엑셀 내보내기 핸들러 등록
  useEffect(() => {
    registerExportHandler('rawDataList', {
      sheetName: '기초데이터목록',
      totalCount: total,
      fetchAllData: fetchAllDataForExcel,
      fetchDataByPage: fetchDataByPage,
      columns: excelColumns,
    });

    return () => {
      unregisterExportHandler('rawDataList');
    };
  }, [
    registerExportHandler,
    unregisterExportHandler,
    total,
    fetchAllDataForExcel,
    fetchDataByPage,
    excelColumns,
  ]);

  // 행 선택 (제외 또는 복원 가능한 상태만)
  // 참고: 전체 선택은 현재 페이지에만 적용됩니다
  const rowSelection: TableRowSelection<RawDataListItem> = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      // rows에서 _rowKey 제거하고 원본 타입으로 변환
      setSelectedRows(rows.map(({ _rowKey, ...rest }: any) => rest as RawDataListItem));
    },
    getCheckboxProps: (record) => ({
      disabled: !EXCLUDABLE_FLAGS.includes(record.applyFlag) && !RESTORABLE_FLAGS.includes(record.applyFlag),
    }),
  };

  // 컬럼 설정 팝오버 내용
  const columnSettingContent = (
    <div style={{ maxHeight: 400, overflow: 'auto', width: 250 }}>
      <div style={{ marginBottom: 8 }}>
        <Button size="small" onClick={handleResetColumnSettings}>
          기본 설정으로 초기화
        </Button>
      </div>
      {Object.entries(
        ALL_COLUMN_KEYS.reduce((acc, key) => {
          const group = COLUMN_INFO[key]?.group || '기본';
          if (!acc[group]) acc[group] = [];
          acc[group].push(key);
          return acc;
        }, {} as Record<string, string[]>)
      ).map(([group, keys]) => (
        <div key={group} style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{group}</div>
          {keys.map((key) => (
            <Checkbox
              key={key}
              checked={visibleColumns[key] !== false}
              onChange={(e) => handleColumnVisibilityChange(key, e.target.checked)}
              style={{ display: 'block', marginLeft: 0, marginBottom: 2 }}
            >
              {COLUMN_INFO[key]?.title || key}
            </Checkbox>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="rawdata-list-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <DatabaseOutlined style={{ marginRight: 8 }} />
          기초데이터조회
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          신용평가 기초 데이터를 조회하고 관리합니다.
        </Text>
      </div>

      {/* 통계 카드 (검색 조건 기준) */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {Object.entries(APPLY_FLAG).map(([code, info]) => (
          <Col key={code} span={4}>
            <Card size="small">
              <Statistic
                title={<Tag color={info.color}>{info.name}</Tag>}
                value={dbStats[code] || 0}
                suffix="건"
              />
            </Card>
          </Col>
        ))}
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="전체"
              value={Object.values(dbStats).reduce((a, b) => a + b, 0)}
              suffix="건"
            />
          </Card>
        </Col>
      </Row>

      {/* 검색 폼 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="rawDataId" label="데이터ID">
            <Input
              placeholder="정확히 입력"
              style={{ width: 150 }}
              allowClear
              suffix={
                <UnorderedListOutlined
                  style={{ cursor: 'pointer', color: '#1890ff' }}
                  onClick={handleOpenRawDataIdModal}
                />
              }
            />
          </Form.Item>
          <Form.Item name="personId" label="대상자ID">
            <Input placeholder="검색어 입력" style={{ width: 120 }} allowClear />
          </Form.Item>
          <Form.Item name="snapshotDateRange" label="스냅샷일">
            <RangePicker style={{ width: 240 }} />
          </Form.Item>
          <Form.Item name="applyFlag" label="반영상태">
            <Select
              placeholder="전체"
              style={{ width: 100 }}
              allowClear
              options={Object.entries(APPLY_FLAG).map(([code, info]) => ({
                value: code,
                label: info.name,
              }))}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                검색
              </Button>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>
                초기화
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 툴바 */}
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <Space size="middle">
          {/* 선택 항목 처리 */}
          <Space.Compact>
            <Button
              danger
              icon={<StopOutlined />}
              disabled={excludableCount === 0}
              onClick={handleExcludeBatch}
              title="현재 페이지에서 체크한 행만 제외"
            >
              선택 제외 ({excludableCount})
            </Button>
            <Button
              icon={<UndoOutlined />}
              disabled={restorableCount === 0}
              onClick={handleRestoreBatch}
              title="현재 페이지에서 체크한 행만 복원"
            >
              선택 복원 ({restorableCount})
            </Button>
          </Space.Compact>
          <span className="toolbar-separator">|</span>
          {/* 검색 조건 전체 처리 */}
          <Space.Compact>
            <Button
              danger
              type="primary"
              icon={<StopOutlined />}
              disabled={(dbStats['E'] + dbStats['H'] + dbStats['N']) === 0}
              onClick={handleExcludeAll}
              title="검색 조건에 맞는 모든 E/H/N 데이터 제외"
            >
              조건 전체 제외 ({(dbStats['E'] + dbStats['H'] + dbStats['N']).toLocaleString()})
            </Button>
            <Button
              type="primary"
              icon={<UndoOutlined />}
              disabled={(dbStats['X'] || 0) === 0}
              onClick={handleRestoreAll}
              title="검색 조건에 맞는 모든 X 데이터 복원"
            >
              조건 전체 복원 ({(dbStats['X'] || 0).toLocaleString()})
            </Button>
          </Space.Compact>
          <span className="toolbar-info">
            선택: {selectedRows.length}건
          </span>
        </Space>
        <Space>
          <Popover
            content={columnSettingContent}
            title="컬럼 표시 설정"
            trigger="click"
            open={columnSettingOpen}
            onOpenChange={setColumnSettingOpen}
            placement="bottomRight"
          >
            <Button icon={<SettingOutlined />}>컬럼 설정</Button>
          </Popover>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => message.info('상단 엑셀 내보내기 버튼을 사용해주세요.')}
          >
            엑셀 다운로드
          </Button>
        </Space>
      </div>

      {/* 테이블 */}
      <Table
        key={`table_${dataVersion}`}
        rowKey="_rowKey"
        columns={columns as any}
        dataSource={dataWithKeys}
        loading={loading}
        rowSelection={rowSelection as any}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => `총 ${t.toLocaleString()}건`,
          onChange: (p, ps) => {
            // 페이지 변경 시 선택 초기화
            setSelectedRowKeys([]);
            setSelectedRows([]);
            if (ps !== pageSize) {
              setPageSize(ps);
            }
            fetchData(p);
          },
        }}
        scroll={{ x: 'max-content' }}
        size="small"
        components={{
          header: {
            cell: ResizableTitle,
          },
        }}
      />

      {/* 데이터ID 선택 모달 */}
      <Modal
        title="데이터ID 선택"
        open={rawDataIdModalOpen}
        onCancel={() => setRawDataIdModalOpen(false)}
        footer={null}
        width={650}
      >
        <List
          loading={rawDataIdsLoading}
          dataSource={rawDataIds}
          pagination={{
            pageSize: 10,
            size: 'small',
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `총 ${total}개`,
          }}
          renderItem={(item) => (
            <List.Item
              style={{ cursor: 'pointer', padding: '8px 12px' }}
              onClick={() => handleSelectRawDataId(item.rawDataId)}
            >
              <List.Item.Meta
                title={<span style={{ fontWeight: 500 }}>{item.rawDataId}</span>}
                description={
                  <Space size="middle">
                    <span>스냅샷: {item.minSnapshotDate} ~ {item.maxSnapshotDate}</span>
                    <Tag color="blue">{item.dataCnt?.toLocaleString()}건</Tag>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default RawDataListPage;
