/**
 * 월간레포트 - 이력 조회
 * 생성된 레포트 이력 관리
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Form,
  Select,
  Tag,
  message,
  Popconfirm,
  Typography,
  Tooltip,
  Row,
  Col,
  Statistic,
  Popover,
  Checkbox,
  Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table/interface';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilePdfOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import reportService from '@/services/reportService';
import type { ReportHistory, ReportHistorySearchParams } from '@/types/report';
import { useAppSelector } from '@/store/hooks';
import 'react-resizable/css/styles.css';
import './ReportHistoryPage.css';

const { Title, Text } = Typography;

// 상태 태그 컬러
const STATUS_COLORS: Record<string, { color: string; icon: React.ReactNode }> = {
  PENDING: { color: 'default', icon: <ClockCircleOutlined /> },
  GENERATING: { color: 'processing', icon: <SyncOutlined spin /> },
  COMPLETED: { color: 'success', icon: <CheckCircleOutlined /> },
  FAILED: { color: 'error', icon: <CloseCircleOutlined /> },
};

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

const ReportHistoryPage: React.FC = () => {
  const [searchForm] = Form.useForm();

  // 로그인 사용자 정보
  const currentUser = useAppSelector((state) => state.auth.user);
  const userCompanyId = currentUser?.companyId || '';

  // 상태
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<ReportHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 통계
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
  });

  // 컬럼 너비
  const defaultColumnWidths = {
    reportSeq: 80,
    year: 80,
    month: 60,
    title: 200,
    genStatus: 100,
    fileNm: 180,
    fileSize: 100,
    pageCnt: 80,
    createdBy: 100,
    createdDt: 160,
    action: 150,
  };

  const getStoredColumnWidths = () => {
    try {
      const stored = localStorage.getItem('reportHistoryColumnWidths');
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
  const defaultVisibleColumns = {
    reportSeq: true,
    year: true,
    month: true,
    title: true,
    genStatus: true,
    fileNm: true,
    fileSize: true,
    pageCnt: true,
    createdBy: true,
    createdDt: true,
  };

  const getStoredVisibleColumns = () => {
    try {
      const stored = localStorage.getItem('reportHistoryVisibleColumns');
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

  // 데이터 로드
  const loadData = useCallback(async () => {
    if (!userCompanyId) return;

    setLoading(true);
    try {
      const values = searchForm.getFieldsValue();
      const params: ReportHistorySearchParams = {
        companyId: userCompanyId,
        year: values.year,
        month: values.month,
        page,
        pageSize,
      };

      const response = await reportService.getHistory(params);
      if (response.success && response.data) {
        setDataSource(response.data.content);
        setTotal(response.data.totalCount);

        // 통계 계산
        const completed = response.data.content.filter(
          (r) => r.genStatus === 'COMPLETED'
        ).length;
        const pending = response.data.content.filter(
          (r) => r.genStatus === 'PENDING' || r.genStatus === 'GENERATING'
        ).length;
        const failed = response.data.content.filter(
          (r) => r.genStatus === 'FAILED'
        ).length;

        setStats({
          total: response.data.totalCount,
          completed,
          pending,
          failed,
        });
      } else {
        message.error(response.message || '데이터를 불러오지 못했습니다.');
      }
    } catch (error) {
      message.error('데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [userCompanyId, page, pageSize, searchForm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 검색
  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  // 초기화
  const handleReset = () => {
    searchForm.resetFields();
    setPage(1);
    loadData();
  };

  // 다운로드
  const handleDownload = async (record: ReportHistory) => {
    if (record.genStatus !== 'COMPLETED' || !record.fileNm) {
      message.warning('다운로드할 수 있는 파일이 없습니다.');
      return;
    }

    try {
      const blob = await reportService.download(record.reportSeq);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = record.fileNm;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('다운로드가 시작되었습니다.');
    } catch (error) {
      message.error('다운로드에 실패했습니다.');
    }
  };

  // 삭제
  const handleDelete = async (reportSeq: number) => {
    try {
      const response = await reportService.deleteHistory(reportSeq);
      if (response.success) {
        message.success('삭제되었습니다.');
        loadData();
      } else {
        message.error(response.message || '삭제에 실패했습니다.');
      }
    } catch (error) {
      message.error('삭제 중 오류가 발생했습니다.');
    }
  };

  // 컬럼 리사이즈 핸들러
  const handleResize =
    (key: string) =>
    (_: any, { size }: ResizeCallbackData) => {
      const newWidths = { ...columnWidths, [key]: size.width };
      setColumnWidths(newWidths);
      localStorage.setItem('reportHistoryColumnWidths', JSON.stringify(newWidths));
    };

  // 컬럼 표시 변경
  const handleColumnVisibilityChange = (key: string, checked: boolean) => {
    const newVisible = { ...visibleColumns, [key]: checked };
    setVisibleColumns(newVisible);
    localStorage.setItem('reportHistoryVisibleColumns', JSON.stringify(newVisible));
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 컬럼 정의
  const baseColumns: ColumnsType<ReportHistory> = [
    {
      title: '번호',
      dataIndex: 'reportSeq',
      key: 'reportSeq',
      width: columnWidths.reportSeq,
      align: 'center',
      sorter: (a, b) => a.reportSeq - b.reportSeq,
    },
    {
      title: '년도',
      dataIndex: 'year',
      key: 'year',
      width: columnWidths.year,
      align: 'center',
      sorter: (a, b) => a.year - b.year,
    },
    {
      title: '월',
      dataIndex: 'month',
      key: 'month',
      width: columnWidths.month,
      align: 'center',
      sorter: (a, b) => a.month - b.month,
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      width: columnWidths.title,
      ellipsis: true,
    },
    {
      title: '상태',
      dataIndex: 'genStatus',
      key: 'genStatus',
      width: columnWidths.genStatus,
      align: 'center',
      render: (status: string, record: ReportHistory) => {
        const config = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
        return (
          <Tag color={config.color} icon={config.icon}>
            {record.genStatusNm || status}
          </Tag>
        );
      },
      filters: [
        { text: '대기중', value: 'PENDING' },
        { text: '생성중', value: 'GENERATING' },
        { text: '완료', value: 'COMPLETED' },
        { text: '실패', value: 'FAILED' },
      ],
      onFilter: (value, record) => record.genStatus === value,
    },
    {
      title: '파일명',
      dataIndex: 'fileNm',
      key: 'fileNm',
      width: columnWidths.fileNm,
      ellipsis: true,
      render: (fileNm: string | null) => fileNm || '-',
    },
    {
      title: '파일크기',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: columnWidths.fileSize,
      align: 'right',
      render: formatFileSize,
    },
    {
      title: '페이지',
      dataIndex: 'pageCnt',
      key: 'pageCnt',
      width: columnWidths.pageCnt,
      align: 'center',
      render: (cnt: number | null) => (cnt ? `${cnt}p` : '-'),
    },
    {
      title: '생성자',
      dataIndex: 'createdByNm',
      key: 'createdBy',
      width: columnWidths.createdBy,
      align: 'center',
      render: (nm: string, record: ReportHistory) => nm || record.createdBy,
    },
    {
      title: '생성일시',
      dataIndex: 'createdDt',
      key: 'createdDt',
      width: columnWidths.createdDt,
      align: 'center',
      render: (dt: string) => (dt ? dayjs(dt).format('YYYY-MM-DD HH:mm') : '-'),
      sorter: (a, b) =>
        dayjs(a.createdDt).valueOf() - dayjs(b.createdDt).valueOf(),
    },
  ];

  // 액션 컬럼
  const actionColumn: ColumnsType<ReportHistory>[0] = {
    title: '작업',
    key: 'action',
    width: columnWidths.action,
    fixed: 'right',
    align: 'center',
    render: (_: any, record: ReportHistory) => (
      <Space>
        <Tooltip title="다운로드">
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
            disabled={record.genStatus !== 'COMPLETED'}
          />
        </Tooltip>
        <Popconfirm
          title="삭제하시겠습니까?"
          onConfirm={() => handleDelete(record.reportSeq)}
          okText="삭제"
          cancelText="취소"
        >
          <Tooltip title="삭제">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      </Space>
    ),
  };

  // 표시할 컬럼
  const columns = useMemo(() => {
    const visibleCols = baseColumns
      .filter((col) => visibleColumns[col.key as string])
      .map((col) => ({
        ...col,
        onHeaderCell: () => ({
          width: columnWidths[col.key as string],
          onResize: handleResize(col.key as string),
        }),
      }));
    return [...visibleCols, actionColumn];
  }, [visibleColumns, columnWidths, baseColumns]);

  // 컬럼 설정 팝오버 내용
  const columnSettingContent = (
    <div style={{ width: 200 }}>
      <div style={{ marginBottom: 8 }}>
        <Text strong>컬럼 표시 설정</Text>
      </div>
      <Divider style={{ margin: '8px 0' }} />
      {Object.entries(defaultVisibleColumns).map(([key, _]) => {
        const col = baseColumns.find((c) => c.key === key);
        return (
          <div key={key} style={{ marginBottom: 4 }}>
            <Checkbox
              checked={visibleColumns[key]}
              onChange={(e) => handleColumnVisibilityChange(key, e.target.checked)}
            >
              {col?.title as string}
            </Checkbox>
          </div>
        );
      })}
    </div>
  );

  // 연도 옵션
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = dayjs().year() - 2 + i;
    return { value: y, label: `${y}년` };
  });

  // 월 옵션
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}월`,
  }));

  return (
    <div className="report-history-page">
      <Card
        title={
          <Space>
            <FilePdfOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>
              레포트 이력
            </Title>
          </Space>
        }
      >
        {/* 통계 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="전체"
                value={stats.total}
                prefix={<FilePdfOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="완료"
                value={stats.completed}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="대기/생성중"
                value={stats.pending}
                valueStyle={{ color: '#1890ff' }}
                prefix={<SyncOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="실패"
                value={stats.failed}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 검색 */}
        <Form form={searchForm} layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item name="year" label="년도">
            <Select
              allowClear
              placeholder="전체"
              options={yearOptions}
              style={{ width: 100 }}
            />
          </Form.Item>
          <Form.Item name="month" label="월">
            <Select
              allowClear
              placeholder="전체"
              options={monthOptions}
              style={{ width: 80 }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                검색
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                초기화
              </Button>
            </Space>
          </Form.Item>
          <div style={{ flex: 1 }} />
          <Popover
            content={columnSettingContent}
            trigger="click"
            placement="bottomRight"
          >
            <Button icon={<SettingOutlined />}>컬럼 설정</Button>
          </Popover>
        </Form>

        {/* 테이블 */}
        <Table
          columns={columns as any}
          dataSource={dataSource}
          rowKey="reportSeq"
          loading={loading}
          size="middle"
          scroll={{ x: 1200 }}
          components={{
            header: {
              cell: ResizableTitle,
            },
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `총 ${t}건`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
        />
      </Card>
    </div>
  );
};

export default ReportHistoryPage;
