/**
 * 데이터 업로드 그리드 컴포넌트
 * CSV 업로드 및 데이터 목록 관리
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Upload,
  Progress,
  Card,
  Statistic,
  Row,
  Col,
  Modal,
  message,
  Tag,
  Typography,
  Tabs,
  DatePicker,
  Select,
  Tooltip,
  Popconfirm,
  Input,
  Form,
  Popover,
  Checkbox,
} from 'antd';
import { SearchOutlined, ClearOutlined, SettingOutlined, UndoOutlined } from '@ant-design/icons';
import {
  UploadOutlined,
  InboxOutlined,
  ReloadOutlined,
  UserAddOutlined,
  HistoryOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  BugOutlined,
  CloudSyncOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import rawDataService from '@/services/rawDataService';
import type {
  UploadHistory,
  UploadProgress,
  RawData,
} from '@/types/rawData';
import { useExcelExport } from '@/contexts';
import type { ExcelColumn } from '@/utils/excelExport';

const { Dragger } = Upload;
const { Text } = Typography;
const { RangePicker } = DatePicker;

interface UploadGridProps {
  companyId: string;
  onUploadComplete?: (uploadId: string) => void;
}

const UploadGrid: React.FC<UploadGridProps> = ({
  companyId,
  onUploadComplete,
}) => {
  // 상태
  const [activeTab, setActiveTab] = useState('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // 업로드 이력
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<UploadHistory[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);

  // 데이터 목록
  const [dataLoading, setDataLoading] = useState(false);
  const [dataList, setDataList] = useState<RawData[]>([]);
  const [dataTotal, setDataTotal] = useState(0);
  const [dataPage, setDataPage] = useState(0);
  const [dataPageSize, setDataPageSize] = useState(20);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);

  // 데이터 필터
  const [filterPersonId, setFilterPersonId] = useState<string>('');
  const [filterDataStatus, setFilterDataStatus] = useState<string | undefined>(undefined);
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // 컬럼 설정
  const [columnSettingOpen, setColumnSettingOpen] = useState(false);
  const DATA_COLUMN_KEYS = ['rawDataId', 'personId', 'dataCollectDt', 'snapshotDate', 'dataStatus', 'validationMsg', 'regDt'];
  const DEFAULT_DATA_VISIBLE = ['rawDataId', 'personId', 'dataCollectDt', 'snapshotDate', 'dataStatus', 'validationMsg', 'regDt'];
  const [visibleDataColumns, setVisibleDataColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('uploadGridDataVisibleColumns');
      if (saved) return JSON.parse(saved);
    } catch {}
    const defaults: Record<string, boolean> = {};
    DATA_COLUMN_KEYS.forEach(k => { defaults[k] = DEFAULT_DATA_VISIBLE.includes(k); });
    return defaults;
  });

  // 엑셀 내보내기
  const { registerExportHandler, unregisterExportHandler } = useExcelExport();

  // 엑셀 컬럼 정의
  const excelColumns: ExcelColumn[] = useMemo(() => [
    { key: 'rawDataId', title: '데이터ID', width: 20 },
    { key: 'personId', title: '대상자ID', width: 15 },
    { key: 'companyId', title: '회사ID', width: 15 },
    { key: 'uploadId', title: '업로드ID', width: 20 },
    { key: 'dataCollectDt', title: '데이터수집일', width: 12 },
    { key: 'snapshotDate', title: '스냅샷일자', width: 12 },
    { key: 'dataStatus', title: '상태', width: 10, render: (v) => {
      const texts: Record<string, string> = { PENDING: '대기', VALIDATED: '검증완료', ERROR: '오류' };
      return texts[v] || v || '';
    }},
    { key: 'validationMsg', title: '검증메시지', width: 30 },
    { key: 'regDt', title: '등록일시', width: 18 },
  ], []);

  // 페이지별 데이터 조회 (엑셀 배치 다운로드용)
  const fetchDataByPage = useCallback(async (page: number, size: number): Promise<RawData[]> => {
    if (!companyId) return [];

    const result = await rawDataService.getRawDataList({
      companyId,
      uploadId: selectedUploadId || undefined,
      personId: filterPersonId || undefined,
      dataStatus: filterDataStatus || undefined,
      snapshotFrom: filterDateRange?.[0]?.format('YYYY-MM-DD'),
      snapshotTo: filterDateRange?.[1]?.format('YYYY-MM-DD'),
      page,
      size,
    });
    return result.content;
  }, [companyId, selectedUploadId, filterPersonId, filterDataStatus, filterDateRange]);

  // 전체 데이터 조회 (엑셀 다운로드용 - 소량일 때)
  const fetchAllDataForExcel = useCallback(async (): Promise<RawData[]> => {
    return fetchDataByPage(0, 50000);
  }, [fetchDataByPage]);

  // 엑셀 내보내기 핸들러 등록
  useEffect(() => {
    if (activeTab === 'data') {
      registerExportHandler('rawdata', {
        sheetName: '기초데이터목록',
        totalCount: dataTotal,
        fetchAllData: fetchAllDataForExcel,
        fetchDataByPage: fetchDataByPage,
        columns: excelColumns,
      });
    }

    return () => {
      unregisterExportHandler('rawdata');
    };
  }, [activeTab, registerExportHandler, unregisterExportHandler, dataTotal, fetchAllDataForExcel, fetchDataByPage, excelColumns]);

  // 업로드 이력 조회
  const fetchHistory = useCallback(async () => {
    if (!companyId) return;

    setHistoryLoading(true);
    try {
      const result = await rawDataService.getUploadHistoryList({
        companyId,
        page: historyPage,
        size: 20,
      });
      setHistory(result.content);
      setHistoryTotal(result.totalCount);
    } catch (error) {
      console.error('이력 조회 실패:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [companyId, historyPage]);

  // 데이터 목록 조회
  const fetchDataList = useCallback(async () => {
    if (!companyId) return;

    setDataLoading(true);
    try {
      const result = await rawDataService.getRawDataList({
        companyId,
        uploadId: selectedUploadId || undefined,
        personId: filterPersonId || undefined,
        dataStatus: filterDataStatus || undefined,
        snapshotFrom: filterDateRange?.[0]?.format('YYYY-MM-DD'),
        snapshotTo: filterDateRange?.[1]?.format('YYYY-MM-DD'),
        page: dataPage,
        size: dataPageSize,
      });
      setDataList(result.content);
      setDataTotal(result.totalCount);
    } catch (error) {
      console.error('데이터 조회 실패:', error);
    } finally {
      setDataLoading(false);
    }
  }, [companyId, selectedUploadId, filterPersonId, filterDataStatus, filterDateRange, dataPage, dataPageSize]);

  // 필터 검색
  const handleSearch = useCallback(() => {
    // 최소 하나의 검색 조건 필요
    if (!selectedUploadId && !filterPersonId) {
      message.warning('업로드ID 또는 대상자ID를 입력해주세요.');
      return;
    }
    setDataPage(0);
    fetchDataList();
  }, [fetchDataList, selectedUploadId, filterPersonId]);

  // 필터 초기화 (데이터 목록도 비움)
  const handleClearFilters = useCallback(() => {
    setSelectedUploadId(null);
    setFilterPersonId('');
    setFilterDataStatus(undefined);
    setFilterDateRange(null);
    setDataPage(0);
    setDataList([]);
    setDataTotal(0);
  }, []);

  // 탭 전환 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'data') {
      // 업로드 목록 조회 (필터 드롭다운용)
      if (history.length === 0) {
        fetchHistory();
      }
      // 업로드ID가 선택된 경우에만 자동 조회 (이력에서 "데이터 보기"로 이동한 경우)
      if (selectedUploadId) {
        fetchDataList();
      }
    }
  }, [activeTab, fetchHistory, history.length]);

  // 필터/페이지 변경 시 자동 조회 (업로드ID가 선택되었거나 필터가 설정된 경우)
  useEffect(() => {
    if (activeTab === 'data' && selectedUploadId) {
      fetchDataList();
    }
  }, [activeTab, selectedUploadId, filterDataStatus, filterDateRange, dataPage, dataPageSize]);

  // 파일 업로드
  const handleUpload = async (file: File) => {
    setUploading(true);
    setProgressModalVisible(true);

    try {
      // 업로드 시작
      const initialProgress = await rawDataService.uploadCsv(file, companyId);
      setUploadProgress(initialProgress);

      // 진행상황 폴링
      const cleanup = rawDataService.pollUploadProgress(
        initialProgress.uploadId,
        (progress) => {
          setUploadProgress(progress);
        },
        (progress) => {
          setUploading(false);
          setCancelling(false);
          if (progress.uploadStatus === 'COMPLETED') {
            message.success(
              `업로드 완료 (성공: ${progress.successRows}건, 오류: ${progress.errorRows}건)`
            );
            onUploadComplete?.(progress.uploadId);
          } else if (progress.uploadStatus === 'FAILED') {
            message.error(`업로드 실패: ${progress.errorMsg}`);
          } else if (progress.uploadStatus === 'CANCELLED') {
            message.warning(
              `업로드가 취소되었습니다 (처리됨: ${progress.processedRows}건, 성공: ${progress.successRows}건)`
            );
          }
        },
        (error) => {
          setUploading(false);
          message.error('업로드 상태 확인 실패');
          console.error(error);
        }
      );

      // 컴포넌트 언마운트 시 클린업
      return cleanup;
    } catch (error) {
      setUploading(false);
      message.error('업로드 시작 실패');
      console.error(error);
    }
  };

  // 업로드 취소
  const handleCancelUpload = async () => {
    if (!uploadProgress?.uploadId) return;
    setCancelling(true);
    try {
      await rawDataService.cancelUpload(uploadProgress.uploadId);
      message.info('업로드 취소 요청이 접수되었습니다. 잠시 후 취소됩니다.');
    } catch {
      message.error('취소 요청에 실패했습니다.');
      setCancelling(false);
    }
  };

  // 대상자 자동 등록
  const handleAutoRegister = async (uploadId: string) => {
    try {
      const result = await rawDataService.autoRegisterPersons(uploadId, companyId);
      message.success(
        `대상자 자동 등록 완료 (신규: ${result.registeredCount}명, 연결: ${result.linkedCount}명)`
      );
      fetchDataList();
    } catch (error) {
      message.error('대상자 자동 등록 실패');
      console.error(error);
    }
  };

  // 업로드 드래그 앤 드롭 설정
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv',
    showUploadList: false,
    beforeUpload: (file) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        message.error('CSV 파일만 업로드 가능합니다.');
        return false;
      }
      handleUpload(file);
      return false;
    },
  };

  // 상태 태그
  const renderStatusTag = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      PENDING: { color: 'default', icon: <SyncOutlined spin />, text: '대기' },
      PROCESSING: { color: 'processing', icon: <SyncOutlined spin />, text: '처리중' },
      COMPLETED: { color: 'success', icon: <CheckCircleOutlined />, text: '완료' },
      FAILED: { color: 'error', icon: <CloseCircleOutlined />, text: '실패' },
      CANCELLED: { color: 'warning', icon: <ExclamationCircleOutlined />, text: '취소됨' },
    };
    const cfg = config[status] || config.PENDING;
    return (
      <Tag color={cfg.color} icon={cfg.icon}>
        {cfg.text}
      </Tag>
    );
  };

  // 업로드 이력 컬럼
  const historyColumns: ColumnsType<UploadHistory> = [
    {
      title: '파일명',
      dataIndex: 'fileNm',
      key: 'fileNm',
      ellipsis: true,
    },
    {
      title: '상태',
      dataIndex: 'uploadStatus',
      key: 'uploadStatus',
      width: 100,
      render: renderStatusTag,
    },
    {
      title: '전체',
      dataIndex: 'totalRows',
      key: 'totalRows',
      width: 80,
      align: 'right',
      render: (v) => v?.toLocaleString() || '-',
    },
    {
      title: '성공',
      dataIndex: 'successRows',
      key: 'successRows',
      width: 80,
      align: 'right',
      render: (v) => <Text type="success">{v?.toLocaleString() || '-'}</Text>,
    },
    {
      title: '오류',
      dataIndex: 'errorRows',
      key: 'errorRows',
      width: 80,
      align: 'right',
      render: (v) => <Text type="danger">{v?.toLocaleString() || '-'}</Text>,
    },
    {
      title: '소요시간',
      dataIndex: 'durationFormatted',
      key: 'durationFormatted',
      width: 100,
    },
    {
      title: '업로드 일시',
      dataIndex: 'regDt',
      key: 'regDt',
      width: 160,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '작업',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="데이터 보기">
            <Button
              type="text"
              icon={<FileTextOutlined />}
              onClick={() => {
                setSelectedUploadId(record.uploadId);
                setActiveTab('data');
              }}
            />
          </Tooltip>
          <Tooltip title={record.errorRows ? `오류 보기 (${record.errorRows}건)` : '오류 보기'}>
            <Button
              type="text"
              icon={<BugOutlined />}
              danger={(record.errorRows && record.errorRows > 0) || record.uploadStatus === 'FAILED'}
              onClick={() => {
                onUploadComplete?.(record.uploadId);
              }}
            />
          </Tooltip>
          {record.uploadStatus === 'COMPLETED' && (
            <Tooltip title="대상자 자동 등록">
              <Button
                type="text"
                icon={<UserAddOutlined />}
                onClick={() => handleAutoRegister(record.uploadId)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // 컬럼 설정 초기화
  const handleResetDataColumnSettings = useCallback(() => {
    const defaults: Record<string, boolean> = {};
    DATA_COLUMN_KEYS.forEach(k => { defaults[k] = DEFAULT_DATA_VISIBLE.includes(k); });
    setVisibleDataColumns(defaults);
    localStorage.removeItem('uploadGridDataVisibleColumns');
    message.success('컬럼 설정이 초기화되었습니다.');
  }, [DATA_COLUMN_KEYS, DEFAULT_DATA_VISIBLE]);

  // 컬럼 가시성 변경
  const handleDataColumnVisibilityChange = useCallback((key: string, checked: boolean) => {
    setVisibleDataColumns(prev => {
      const newState = { ...prev, [key]: checked };
      localStorage.setItem('uploadGridDataVisibleColumns', JSON.stringify(newState));
      return newState;
    });
  }, []);

  // 데이터 컬럼 정보
  const DATA_COLUMN_INFO: Record<string, { title: string; width: number }> = {
    rawDataId: { title: '데이터ID', width: 180 },
    personId: { title: '대상자ID', width: 150 },
    dataCollectDt: { title: '데이터수집일', width: 120 },
    snapshotDate: { title: '스냅샷일자', width: 120 },
    dataStatus: { title: '상태', width: 100 },
    validationMsg: { title: '검증메시지', width: 200 },
    regDt: { title: '등록일시', width: 150 },
  };

  // 데이터 목록 컬럼
  const dataColumns: ColumnsType<RawData> = useMemo(() => {
    const allColumns: ColumnsType<RawData> = [
      {
        title: '데이터ID',
        dataIndex: 'rawDataId',
        key: 'rawDataId',
        width: 180,
        ellipsis: true,
      },
      {
        title: '대상자ID',
        dataIndex: 'personId',
        key: 'personId',
        width: 150,
        ellipsis: true,
        render: (v) => v || '-',
      },
      {
        title: '데이터수집일',
        dataIndex: 'dataCollectDt',
        key: 'dataCollectDt',
        width: 120,
        render: (v) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
      },
      {
        title: '스냅샷일자',
        dataIndex: 'snapshotDate',
        key: 'snapshotDate',
        width: 120,
        render: (v) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
      },
      {
        title: '상태',
        dataIndex: 'dataStatus',
        key: 'dataStatus',
        width: 100,
        render: (v) => {
          const colors: Record<string, string> = {
            PENDING: 'default',
            VALIDATED: 'success',
            ERROR: 'error',
          };
          const texts: Record<string, string> = {
            PENDING: '대기',
            VALIDATED: '검증완료',
            ERROR: '오류',
          };
          return <Tag color={colors[v] || 'default'}>{texts[v] || v || '-'}</Tag>;
        },
      },
      {
        title: '검증메시지',
        dataIndex: 'validationMsg',
        key: 'validationMsg',
        width: 200,
        ellipsis: true,
        render: (v) => v || '-',
      },
      {
        title: '등록일시',
        dataIndex: 'regDt',
        key: 'regDt',
        width: 150,
        render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
      },
    ];
    return allColumns.filter(col => visibleDataColumns[col.key as string] !== false);
  }, [visibleDataColumns]);

  // 컬럼 설정 팝오버 내용
  const dataColumnSettingContent = (
    <div style={{ width: 200 }}>
      <div style={{ marginBottom: 8 }}>
        <Button size="small" icon={<UndoOutlined />} onClick={handleResetDataColumnSettings} block>
          기본 설정으로 초기화
        </Button>
      </div>
      {DATA_COLUMN_KEYS.map((key) => (
        <Checkbox
          key={key}
          checked={visibleDataColumns[key] !== false}
          onChange={(e) => handleDataColumnVisibilityChange(key, e.target.checked)}
          style={{ display: 'block', marginLeft: 0, marginBottom: 4 }}
        >
          {DATA_COLUMN_INFO[key]?.title || key}
        </Checkbox>
      ))}
    </div>
  );

  // 탭 아이템
  const tabItems = [
    {
      key: 'upload',
      label: (
        <span>
          <UploadOutlined />
          CSV 업로드
        </span>
      ),
      children: (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <Dragger {...uploadProps} disabled={uploading}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              클릭하거나 파일을 드래그하여 업로드
            </p>
            <p className="ant-upload-hint">
              CSV 파일만 업로드 가능합니다. (최대 100MB)
            </p>
          </Dragger>
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          업로드 이력
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={fetchHistory}>
              새로고침
            </Button>
          </div>
          <Table
            columns={historyColumns}
            dataSource={history}
            rowKey="uploadId"
            loading={historyLoading}
            size="middle"
            pagination={{
              current: historyPage + 1,
              pageSize: 20,
              total: historyTotal,
              showTotal: (total) => `총 ${total}건`,
              onChange: (p) => setHistoryPage(p - 1),
            }}
          />
        </div>
      ),
    },
    {
      key: 'data',
      label: (
        <span>
          <FileTextOutlined />
          데이터 목록
        </span>
      ),
      children: (
        <div>
          {/* 검색 필터 */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Form layout="inline" style={{ flexWrap: 'wrap', gap: 8 }}>
              <Form.Item label="업로드ID" style={{ marginBottom: 8 }}>
                <Select
                  style={{ width: 200 }}
                  placeholder="업로드 선택"
                  allowClear
                  value={selectedUploadId}
                  onChange={(value) => setSelectedUploadId(value)}
                  options={history.map((h) => ({
                    value: h.uploadId,
                    label: `${h.fileNm} (${dayjs(h.regDt).format('MM-DD HH:mm')})`,
                  }))}
                />
              </Form.Item>
              <Form.Item label="대상자ID" style={{ marginBottom: 8 }}>
                <Input
                  style={{ width: 150 }}
                  placeholder="대상자ID 입력"
                  value={filterPersonId}
                  onChange={(e) => setFilterPersonId(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </Form.Item>
              <Form.Item label="상태" style={{ marginBottom: 8 }}>
                <Select
                  style={{ width: 120 }}
                  placeholder="상태 선택"
                  allowClear
                  value={filterDataStatus}
                  onChange={(value) => setFilterDataStatus(value)}
                  options={[
                    { value: 'PENDING', label: '대기' },
                    { value: 'VALIDATED', label: '검증완료' },
                    { value: 'ERROR', label: '오류' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="스냅샷일자" style={{ marginBottom: 8 }}>
                <RangePicker
                  style={{ width: 240 }}
                  value={filterDateRange}
                  onChange={(dates) => setFilterDateRange(dates)}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 8 }}>
                <Space>
                  <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                    검색
                  </Button>
                  <Button icon={<ClearOutlined />} onClick={handleClearFilters}>
                    초기화
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>

          {/* 데이터 그리드 */}
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">
              {selectedUploadId ? `업로드 ${selectedUploadId} 데이터` : '업로드를 선택하거나 검색 조건을 입력하세요'}
            </Text>
            <Space>
              <Popover
                content={dataColumnSettingContent}
                title="컬럼 표시 설정"
                trigger="click"
                open={columnSettingOpen}
                onOpenChange={setColumnSettingOpen}
                placement="bottomRight"
              >
                <Button icon={<SettingOutlined />}>컬럼 설정</Button>
              </Popover>
              <Button icon={<ReloadOutlined />} onClick={handleSearch} disabled={!selectedUploadId && !filterPersonId}>
                조회
              </Button>
            </Space>
          </div>
          <Table
            columns={dataColumns}
            dataSource={dataList}
            rowKey={(record) => `${record.rawDataId}_${record.personId}_${record.companyId}`}
            loading={dataLoading}
            size="middle"
            locale={{
              emptyText: selectedUploadId
                ? '데이터가 없습니다'
                : '업로드 이력에서 "데이터 보기"를 클릭하거나, 업로드ID를 선택 후 검색하세요',
            }}
            pagination={{
              current: dataPage + 1,
              pageSize: dataPageSize,
              total: dataTotal,
              showTotal: (total, range) => `${range[0]}-${range[1]} / 총 ${total}건`,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: (page, size) => {
                if (size !== dataPageSize) {
                  setDataPageSize(size);
                  setDataPage(0);  // 페이지 사이즈 변경 시 첫 페이지로
                } else {
                  setDataPage(page - 1);
                }
              },
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="upload-grid-container">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      {/* 진행상황 모달 */}
      <Modal
        title="업로드 진행상황"
        open={progressModalVisible}
        onCancel={() => !uploading && setProgressModalVisible(false)}
        footer={
          uploading ? (
            <Space>
              <Popconfirm
                title="업로드 취소"
                description="업로드를 취소하시겠습니까? 이미 처리된 데이터는 유지됩니다."
                onConfirm={handleCancelUpload}
                okText="취소하기"
                cancelText="계속 진행"
                okButtonProps={{ danger: true }}
                icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              >
                <Button
                  danger
                  icon={<StopOutlined />}
                  loading={cancelling}
                  disabled={cancelling}
                >
                  {cancelling ? '취소 요청 중...' : '업로드 취소'}
                </Button>
              </Popconfirm>
              <Button
                icon={<CloudSyncOutlined />}
                onClick={() => {
                  setProgressModalVisible(false);
                  message.info(
                    '백그라운드로 전환되었습니다. 업로드 완료 시 상단 알림(🔔)으로 확인하세요.',
                    5
                  );
                }}
              >
                백그라운드로 전환
              </Button>
            </Space>
          ) : (
            <Button type="primary" onClick={() => setProgressModalVisible(false)}>
              닫기
            </Button>
          )
        }
        closable={!uploading}
        maskClosable={!uploading}
        width={500}
      >
        {uploadProgress && (
          <div>
            <Progress
              percent={uploadProgress.progressPercent || 0}
              status={
                uploadProgress.uploadStatus === 'FAILED' || uploadProgress.uploadStatus === 'CANCELLED'
                  ? 'exception'
                  : uploadProgress.uploadStatus === 'COMPLETED'
                  ? 'success'
                  : 'active'
              }
              format={(percent) =>
                uploadProgress.uploadStatus === 'CANCELLED'
                  ? '취소됨'
                  : `${percent}%`
              }
              strokeWidth={20}
              style={{ marginBottom: 24 }}
            />

            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="전체"
                  value={uploadProgress.totalRows || 0}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="처리됨"
                  value={uploadProgress.processedRows || 0}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="성공"
                  value={uploadProgress.successRows || 0}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="오류"
                  value={uploadProgress.errorRows || 0}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
            </Row>

            {uploadProgress.errorMsg && (
              <div style={{ marginTop: 16 }}>
                <Text type="danger">{uploadProgress.errorMsg}</Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UploadGrid;
