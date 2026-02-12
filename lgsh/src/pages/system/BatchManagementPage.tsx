/**
 * 배치관리 페이지
 * BATCH-001 - 배치 실행 이력 조회 및 수동 실행
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Form,
  Select,
  DatePicker,
  Modal,
  message,
  Tag,
  Typography,
  Tooltip,
  Popover,
  Checkbox,
  Divider,
  Descriptions,
  Tabs,
  Alert,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table/interface';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import type { BatchHistory, BatchTriggerRequest, BatchStatus } from '@/types/batch';
import { BATCH_STATUS_COLOR, BATCH_STATUS_LABEL } from '@/types/batch';
import { batchService } from '@/services/batchService';
import { useCommonCode } from '@/hooks';
import { useExcelExport } from '@/contexts';
import type { ExcelColumn } from '@/utils/excelExport';
import dayjs from 'dayjs';
import BatchScheduleTab from './components/BatchScheduleTab';
import './BatchManagementPage.css';
import 'react-resizable/css/styles.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Resizable 컬럼 헤더 컴포넌트
const ResizableTitle = (
  props: React.HTMLAttributes<any> & {
    onResize: (e: React.SyntheticEvent<Element>, data: ResizeCallbackData) => void;
    width: number;
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
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

// 컬럼 레이블 정의
const columnLabels: { [key: string]: string } = {
  batchId: '배치ID',
  batchType: '배치유형',
  status: '상태',
  startDt: '시작일시',
  endDt: '종료일시',
  totalCnt: '총건수',
  successCnt: '성공',
  failCnt: '실패',
  execUserId: '실행자',
};

const BatchManagementPage: React.FC = () => {
  const [searchForm] = Form.useForm();

  // 공통코드에서 배치유형, 배치상태 조회
  const { options: batchTypes } = useCommonCode('BATCH_TYPE');
  const { options: batchStatuses } = useCommonCode('BATCH_STATUS');

  // 상태
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<BatchHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BatchHistory | null>(null);
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [triggerBatchType, setTriggerBatchType] = useState<string | null>(null);

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 컬럼 너비 초기값
  const defaultColumnWidths: { [key: string]: number } = {
    batchId: 180,
    batchType: 120,
    status: 110,
    startDt: 160,
    endDt: 160,
    totalCnt: 90,
    successCnt: 90,
    failCnt: 90,
    execUserId: 110,
    action: 120,
  };

  // localStorage에서 저장된 컬럼 너비 불러오기
  const getStoredColumnWidths = () => {
    try {
      const stored = localStorage.getItem('batchColumnWidths');
      if (stored) {
        return { ...defaultColumnWidths, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('컬럼 너비 불러오기 실패:', error);
    }
    return defaultColumnWidths;
  };

  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(
    getStoredColumnWidths()
  );

  // 컬럼 표시 설정
  const defaultVisibleColumns: { [key: string]: boolean } = {
    batchId: true,
    batchType: true,
    status: true,
    startDt: true,
    endDt: true,
    totalCnt: true,
    successCnt: true,
    failCnt: true,
    execUserId: true,
  };

  const getStoredVisibleColumns = () => {
    try {
      const stored = localStorage.getItem('batchVisibleColumns');
      if (stored) {
        return { ...defaultVisibleColumns, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('컬럼 표시 설정 불러오기 실패:', error);
    }
    return defaultVisibleColumns;
  };

  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>(
    getStoredVisibleColumns()
  );

  // 컬럼 표시 토글
  const handleColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    setVisibleColumns((prev) => {
      const newState = { ...prev, [columnKey]: visible };
      try {
        localStorage.setItem('batchVisibleColumns', JSON.stringify(newState));
      } catch (error) {
        console.error('컬럼 표시 설정 저장 실패:', error);
      }
      return newState;
    });
  };

  // 컬럼 리사이즈 핸들러
  const handleResize = (key: string) => (_: React.SyntheticEvent, { size }: ResizeCallbackData) => {
    setColumnWidths((prevWidths) => {
      const newWidths = {
        ...prevWidths,
        [key]: size.width,
      };
      try {
        localStorage.setItem('batchColumnWidths', JSON.stringify(newWidths));
      } catch (error) {
        console.error('컬럼 너비 저장 실패:', error);
      }
      return newWidths;
    });
  };

  // 컬럼 설정 초기화
  const handleResetColumnSettings = () => {
    setColumnWidths(defaultColumnWidths);
    setVisibleColumns(defaultVisibleColumns);
    try {
      localStorage.removeItem('batchColumnWidths');
      localStorage.removeItem('batchVisibleColumns');
      message.success('컬럼 설정이 초기화되었습니다.');
    } catch (error) {
      console.error('컬럼 설정 초기화 실패:', error);
    }
  };

  // 배치유형명 조회
  const getBatchTypeName = useCallback((batchType: string): string => {
    const found = batchTypes.find((t) => t.value === batchType);
    return found ? found.label : batchType;
  }, [batchTypes]);

  // 배치상태명 조회
  const getBatchStatusName = useCallback((status: string): string => {
    const found = batchStatuses.find((s) => s.value === status);
    return found ? found.label : BATCH_STATUS_LABEL[status as BatchStatus] || status;
  }, [batchStatuses]);

  // 목록 조회
  const fetchList = useCallback(async (page: number = currentPage, size: number = pageSize) => {
    setLoading(true);
    try {
      const values = searchForm.getFieldsValue();
      const dateRange = values.dateRange;

      const response = await batchService.getBatchHistory({
        batchType: values.batchType,
        status: values.status,
        startDtFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
        startDtTo: dateRange?.[1]?.format('YYYY-MM-DD'),
        page: page - 1,
        size: size,
      });
      setDataList(response.content);
      setTotal(response.totalCount);
    } catch (error) {
      message.error('배치 이력 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [searchForm, currentPage, pageSize]);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number, size?: number) => {
    const newSize = size || pageSize;
    setCurrentPage(page);
    setPageSize(newSize);
    fetchList(page, newSize);
  };

  // 초기 로딩 - 기본 날짜 범위 설정 (최근 7일)
  useEffect(() => {
    const today = dayjs();
    const weekAgo = dayjs().subtract(7, 'day');
    searchForm.setFieldsValue({
      dateRange: [weekAgo, today],
    });
    fetchList();
  }, []);

  // 엑셀 내보내기 핸들러 등록
  const { registerExportHandler, unregisterExportHandler } = useExcelExport();

  // 엑셀 컬럼 정의
  const excelColumns: ExcelColumn[] = useMemo(() => [
    { key: 'batchId', title: '배치ID', width: 25 },
    { key: 'batchType', title: '배치유형', width: 15 },
    { key: 'status', title: '상태', width: 12 },
    { key: 'startDt', title: '시작일시', width: 20 },
    { key: 'endDt', title: '종료일시', width: 20 },
    { key: 'totalCnt', title: '총건수', width: 10 },
    { key: 'successCnt', title: '성공건수', width: 10 },
    { key: 'failCnt', title: '실패건수', width: 10 },
    { key: 'execUserId', title: '실행자', width: 15 },
    { key: 'errorMessage', title: '에러메시지', width: 50 },
  ], []);

  // 전체 데이터 조회 함수 (엑셀용)
  const fetchAllDataForExcel = useCallback(async (): Promise<BatchHistory[]> => {
    const values = searchForm.getFieldsValue();
    const dateRange = values.dateRange;
    const response = await batchService.getBatchHistory({
      batchType: values.batchType,
      status: values.status,
      startDtFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
      startDtTo: dateRange?.[1]?.format('YYYY-MM-DD'),
      page: 0,
      size: 50000,
    });
    return response.content;
  }, [searchForm]);

  // 핸들러 등록/해제
  useEffect(() => {
    registerExportHandler('batch', {
      sheetName: '배치이력',
      totalCount: total,
      fetchAllData: fetchAllDataForExcel,
      columns: excelColumns,
    });

    return () => {
      unregisterExportHandler('batch');
    };
  }, [registerExportHandler, unregisterExportHandler, total, fetchAllDataForExcel, excelColumns]);

  // 상세 조회 모달 열기
  const handleOpenDetail = (record: BatchHistory) => {
    setSelectedRecord(record);
    setDetailModalOpen(true);
  };

  // 수동 실행 확인 모달 열기
  const handleOpenTriggerModal = (batchType: string) => {
    setTriggerBatchType(batchType);
    setTriggerModalOpen(true);
  };

  // 수동 실행
  const handleTriggerBatch = async () => {
    if (!triggerBatchType) return;

    setTriggerLoading(true);
    try {
      const request: BatchTriggerRequest = {
        batchType: triggerBatchType,
      };
      const response = await batchService.triggerBatch(request);
      message.success(response.message || '배치 실행 요청이 등록되었습니다.');
      setTriggerModalOpen(false);
      setTriggerBatchType(null);
      fetchList();
    } catch (error: any) {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('배치 실행 요청에 실패했습니다.');
      }
    } finally {
      setTriggerLoading(false);
    }
  };

  // 테이블 컬럼 정의
  const allColumns: ColumnsType<BatchHistory> = [
    {
      title: '배치ID',
      dataIndex: 'batchId',
      key: 'batchId',
      width: columnWidths.batchId,
      sorter: (a, b) => (a.batchId || '').localeCompare(b.batchId || ''),
      onHeaderCell: () => ({
        width: columnWidths.batchId,
        onResize: handleResize('batchId'),
      }),
      render: (text: string) => <Text strong style={{ fontSize: 12 }}>{text}</Text>,
    },
    {
      title: '배치유형',
      dataIndex: 'batchType',
      key: 'batchType',
      width: columnWidths.batchType,
      filters: batchTypes.map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.batchType === value,
      onHeaderCell: () => ({
        width: columnWidths.batchType,
        onResize: handleResize('batchType'),
      }),
      render: (val: string) => <Tag color="blue">{getBatchTypeName(val)}</Tag>,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: columnWidths.status,
      align: 'center',
      filters: batchStatuses.map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.status === value,
      onHeaderCell: () => ({
        width: columnWidths.status,
        onResize: handleResize('status'),
      }),
      render: (val: BatchStatus) => (
        <Tag color={BATCH_STATUS_COLOR[val] || 'default'}>{getBatchStatusName(val)}</Tag>
      ),
    },
    {
      title: '시작일시',
      dataIndex: 'startDt',
      key: 'startDt',
      width: columnWidths.startDt,
      sorter: (a, b) => (a.startDt || '').localeCompare(b.startDt || ''),
      onHeaderCell: () => ({
        width: columnWidths.startDt,
        onResize: handleResize('startDt'),
      }),
    },
    {
      title: '종료일시',
      dataIndex: 'endDt',
      key: 'endDt',
      width: columnWidths.endDt,
      onHeaderCell: () => ({
        width: columnWidths.endDt,
        onResize: handleResize('endDt'),
      }),
      render: (val: string) => val || '-',
    },
    {
      title: '총건수',
      dataIndex: 'totalCnt',
      key: 'totalCnt',
      width: columnWidths.totalCnt,
      align: 'right',
      sorter: (a, b) => (a.totalCnt || 0) - (b.totalCnt || 0),
      onHeaderCell: () => ({
        width: columnWidths.totalCnt,
        onResize: handleResize('totalCnt'),
      }),
      render: (val: number) => val?.toLocaleString() || '0',
    },
    {
      title: '성공',
      dataIndex: 'successCnt',
      key: 'successCnt',
      width: columnWidths.successCnt,
      align: 'right',
      onHeaderCell: () => ({
        width: columnWidths.successCnt,
        onResize: handleResize('successCnt'),
      }),
      render: (val: number) => (
        <Text type="success">{val?.toLocaleString() || '0'}</Text>
      ),
    },
    {
      title: '실패',
      dataIndex: 'failCnt',
      key: 'failCnt',
      width: columnWidths.failCnt,
      align: 'right',
      onHeaderCell: () => ({
        width: columnWidths.failCnt,
        onResize: handleResize('failCnt'),
      }),
      render: (val: number) => (
        val > 0 ? <Text type="danger">{val.toLocaleString()}</Text> : <Text>0</Text>
      ),
    },
    {
      title: '실행자',
      dataIndex: 'execUserId',
      key: 'execUserId',
      width: columnWidths.execUserId,
      ellipsis: true,
      onHeaderCell: () => ({
        width: columnWidths.execUserId,
        onResize: handleResize('execUserId'),
      }),
    },
    {
      title: '관리',
      key: 'action',
      width: columnWidths.action,
      fixed: 'right',
      render: (_: any, record: BatchHistory) => (
        <Space size="small">
          <Tooltip title="상세보기">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenDetail(record)}
            />
          </Tooltip>
          <Tooltip title="수동실행">
            <Button
              type="text"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleOpenTriggerModal(record.batchType)}
              disabled={record.status === 'RUNNING' || record.status === 'QUEUED'}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 표시할 컬럼 필터링
  const columns = useMemo(() => {
    return allColumns.filter((col) => {
      const key = col.key as string;
      if (key === 'action') return true;
      return visibleColumns[key] !== false;
    });
  }, [allColumns, visibleColumns]);

  // 컬럼 설정 팝오버 내용
  const columnSettingsContent = (
    <div style={{ width: 180 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>표시할 컬럼 선택</div>
      <Divider style={{ margin: '8px 0' }} />
      {Object.entries(columnLabels).map(([key, label]) => (
        <div key={key} style={{ marginBottom: 4 }}>
          <Checkbox
            checked={visibleColumns[key] !== false}
            onChange={(e) => handleColumnVisibilityChange(key, e.target.checked)}
          >
            {label}
          </Checkbox>
        </div>
      ))}
      <Divider style={{ margin: '8px 0' }} />
      <Button
        size="small"
        onClick={() => {
          setVisibleColumns(defaultVisibleColumns);
          localStorage.removeItem('batchVisibleColumns');
        }}
        block
      >
        전체 표시
      </Button>
    </div>
  );

  return (
    <div className="batch-management-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <ThunderboltOutlined style={{ marginRight: 8 }} />
          배치관리
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          배치 실행 이력을 조회하고, 스케줄을 설정하여 자동 실행합니다.
        </Text>
      </div>

      {/* 메인 카드 */}
      <Card size="small" className="batch-card">
        <Tabs
          defaultActiveKey="history"
          items={[
            {
              key: 'history',
              label: (
                <span>
                  <HistoryOutlined />
                  실행이력
                </span>
              ),
              children: (
                <>
        {/* 검색 폼 */}
        <Form
          form={searchForm}
          layout="inline"
          className="search-form"
          onFinish={() => {
            setCurrentPage(1);
            fetchList(1, pageSize);
          }}
        >
          <Form.Item name="batchType" label="배치유형">
            <Select placeholder="전체" allowClear style={{ width: 140 }}>
              {batchTypes.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="상태">
            <Select placeholder="전체" allowClear style={{ width: 120 }}>
              {batchStatuses.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  <Tag color={BATCH_STATUS_COLOR[opt.value as BatchStatus] || 'default'} style={{ marginRight: 0 }}>
                    {opt.label}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="기간">
            <RangePicker style={{ width: 260 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                조회
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  const today = dayjs();
                  const weekAgo = dayjs().subtract(7, 'day');
                  searchForm.resetFields();
                  searchForm.setFieldsValue({ dateRange: [weekAgo, today] });
                  setCurrentPage(1);
                  fetchList(1, pageSize);
                }}
              >
                초기화
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 툴바 */}
        <div style={{ marginBottom: 12 }}>
          <Space>
            <Popover
              content={
                <div style={{ width: 200 }}>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>실행할 배치 선택</div>
                  <Divider style={{ margin: '8px 0' }} />
                  {batchTypes.map((opt) => (
                    <Button
                      key={opt.value}
                      block
                      style={{ marginBottom: 4, textAlign: 'left' }}
                      onClick={() => handleOpenTriggerModal(opt.value)}
                    >
                      <PlayCircleOutlined /> {opt.label}
                    </Button>
                  ))}
                </div>
              }
              title={null}
              trigger="click"
              placement="bottomLeft"
            >
              <Button type="primary" icon={<ThunderboltOutlined />}>
                배치 수동실행
              </Button>
            </Popover>
            <Popover
              content={columnSettingsContent}
              title={null}
              trigger="click"
              placement="bottomLeft"
            >
              <Button icon={<SettingOutlined />} title="컬럼 설정">
                컬럼 설정
              </Button>
            </Popover>
            <Button icon={<ReloadOutlined />} onClick={handleResetColumnSettings} title="컬럼 초기화">
              컬럼 초기화
            </Button>
          </Space>
        </div>

        {/* 테이블 */}
        <Table
          columns={columns}
          dataSource={dataList}
          rowKey="batchSeq"
          loading={loading}
          size="small"
          scroll={{ x: 'max-content', y: 'calc(100vh - 420px)' }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} / 총 ${total}건`,
            onChange: handlePageChange,
            onShowSizeChange: handlePageChange,
          }}
          bordered
          components={{
            header: {
              cell: ResizableTitle,
            },
          }}
          expandable={{
            expandedRowRender: (record) => (
              <Alert
                type={record.status === 'FAILED' ? 'error' : 'warning'}
                showIcon
                icon={<WarningOutlined />}
                message={
                  <Text strong style={{ fontSize: 12 }}>
                    {record.status === 'FAILED' ? '실패 로그' : '부분 실패 로그'}
                  </Text>
                }
                description={
                  <Text
                    type="danger"
                    style={{ whiteSpace: 'pre-wrap', fontSize: 12, display: 'block', maxHeight: 200, overflow: 'auto' }}
                  >
                    {record.errorMessage || '에러 메시지가 기록되지 않았습니다.'}
                  </Text>
                }
                style={{ margin: 0 }}
              />
            ),
            rowExpandable: (record) =>
              (record.status === 'FAILED' || record.status === 'PARTIAL') && !!record.errorMessage,
          }}
          onRow={(record) => ({
            onDoubleClick: () => handleOpenDetail(record),
          })}
        />
                </>
              ),
            },
            {
              key: 'schedule',
              label: (
                <span>
                  <ClockCircleOutlined />
                  스케줄 관리
                </span>
              ),
              children: <BatchScheduleTab batchTypes={batchTypes} />,
            },
          ]}
        />
      </Card>

      {/* 상세 조회 모달 */}
      <Modal
        title="배치 실행 상세"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            닫기
          </Button>,
        ]}
        width={700}
      >
        {selectedRecord && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="배치 ID" span={2}>
              <Text strong>{selectedRecord.batchId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="배치 유형">
              <Tag color="blue">{getBatchTypeName(selectedRecord.batchType)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="상태">
              <Tag color={BATCH_STATUS_COLOR[selectedRecord.status] || 'default'}>
                {getBatchStatusName(selectedRecord.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="시작일시">{selectedRecord.startDt || '-'}</Descriptions.Item>
            <Descriptions.Item label="종료일시">{selectedRecord.endDt || '-'}</Descriptions.Item>
            <Descriptions.Item label="총건수">{selectedRecord.totalCnt?.toLocaleString() || '0'}</Descriptions.Item>
            <Descriptions.Item label="성공건수">
              <Text type="success">{selectedRecord.successCnt?.toLocaleString() || '0'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="실패건수">
              {selectedRecord.failCnt > 0 ? (
                <Text type="danger">{selectedRecord.failCnt.toLocaleString()}</Text>
              ) : (
                '0'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="실행자">{selectedRecord.execUserId}</Descriptions.Item>
            {selectedRecord.dataClass && (
              <Descriptions.Item label="데이터분류" span={2}>
                {selectedRecord.dataClass}
              </Descriptions.Item>
            )}
            {selectedRecord.errorMessage && (
              <Descriptions.Item label="에러메시지" span={2}>
                <Text type="danger" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedRecord.errorMessage}
                </Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="등록자">{selectedRecord.regUserId}</Descriptions.Item>
            <Descriptions.Item label="등록일시">{selectedRecord.regDt}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 수동 실행 확인 모달 */}
      <Modal
        title="배치 수동 실행 확인"
        open={triggerModalOpen}
        onOk={handleTriggerBatch}
        onCancel={() => {
          setTriggerModalOpen(false);
          setTriggerBatchType(null);
        }}
        okText="실행"
        cancelText="취소"
        confirmLoading={triggerLoading}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <ThunderboltOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <div style={{ fontSize: 16 }}>
            <Text strong>{triggerBatchType && getBatchTypeName(triggerBatchType)}</Text> 배치를 수동 실행하시겠습니까?
          </div>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">실행 요청이 등록되며, 배치 프로그램에서 처리됩니다.</Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BatchManagementPage;
