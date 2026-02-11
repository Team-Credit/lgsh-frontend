/**
 * 원청사 목록 페이지
 * COMPANY001 - 원청사 정보 관리
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Form,
  Input,
  Select,
  Modal,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Typography,
  Popover,
  Checkbox,
  Divider,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  BankOutlined,
  SettingOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import dayjs from 'dayjs';
import type { Company, CompanyRequest } from '@/types';
import { companyService } from '@/services/companyService';
import { useCommonCodes, useMenuPermission } from '@/hooks';
import { useExcelExport } from '@/contexts';
import type { ExcelColumn } from '@/utils/excelExport';
import './CompanyPage.css';
import 'react-resizable/css/styles.css';

const { Title, Text } = Typography;
const { Option } = Select;

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

const CompanyPage: React.FC = () => {
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();

  // 공통코드 조회
  const { codeMap, getLabel } = useCommonCodes(['COMPANY_TYPE', 'CONTRACT_STATUS']);

  // 메뉴 권한
  const { canWrite, canDelete, canExport } = useMenuPermission('M0601');

  // 상태 관리
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<Company[]>([]);

  // 컬럼 너비 초기값
  const defaultColumnWidths = {
    companyId: 120,
    companyNm: 180,
    businessNo: 130,
    ceoNm: 110,
    companyType: 110,
    contractStatus: 110,
    contractStartDt: 130,
    action: 120,
  };

  // localStorage에서 저장된 컬럼 너비 불러오기
  const getStoredColumnWidths = () => {
    try {
      const stored = localStorage.getItem('companyColumnWidths');
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

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentRecord, setCurrentRecord] = useState<Company | null>(null);

  // 컬럼 표시 설정
  const defaultVisibleColumns = {
    companyId: true,
    companyNm: true,
    businessNo: true,
    ceoNm: true,
    companyType: true,
    contractStatus: true,
    contractStartDt: true,
  };

  const getStoredVisibleColumns = () => {
    try {
      const stored = localStorage.getItem('companyVisibleColumns');
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
        localStorage.setItem('companyVisibleColumns', JSON.stringify(newState));
      } catch (error) {
        console.error('컬럼 표시 설정 저장 실패:', error);
      }
      return newState;
    });
  };

  // 컬럼 표시 설정 초기화
  const handleResetVisibleColumns = () => {
    setVisibleColumns(defaultVisibleColumns);
    try {
      localStorage.removeItem('companyVisibleColumns');
    } catch (error) {
      console.error('컬럼 표시 설정 초기화 실패:', error);
    }
  };

  // 컬럼 레이블 정의
  const columnLabels: { [key: string]: string } = {
    companyId: '원청사ID',
    companyNm: '원청사명',
    businessNo: '사업자번호',
    ceoNm: '대표자',
    companyType: '업종',
    contractStatus: '계약상태',
    contractStartDt: '계약시작',
  };

  // 데이터 조회
  const fetchData = useCallback(async (currentPage = page) => {
    setLoading(true);
    try {
      const searchValues = searchForm.getFieldsValue();
      const response = await companyService.list({
        page: currentPage - 1,
        size: pageSize,
        keyword: searchValues.keyword,
        companyType: searchValues.companyType,
        contractStatus: searchValues.contractStatus,
      });

      if (response.success && response.data) {
        setDataSource(response.data.content);
        setTotal(response.data.totalCount);

        if (response.data.content.length === 0) {
          message.info('조회된 데이터가 없습니다.');
        }
      } else {
        message.error(response.message || '데이터 조회에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('데이터 조회 오류:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '데이터 조회 중 오류가 발생했습니다.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchForm]);

  // 초기 로드
  useEffect(() => {
    fetchData();
  }, []);

  // 엑셀 내보내기 핸들러 등록
  const { registerExportHandler, unregisterExportHandler } = useExcelExport();

  // 엑셀 컬럼 정의
  const excelColumns: ExcelColumn[] = useMemo(() => [
    { key: 'companyId', title: '원청사ID', width: 15 },
    { key: 'companyNm', title: '원청사명', width: 25 },
    { key: 'businessNo', title: '사업자번호', width: 15 },
    { key: 'ceoNm', title: '대표자', width: 12 },
    { key: 'companyType', title: '업종', width: 12 },
    { key: 'contractStatus', title: '계약상태', width: 12 },
    { key: 'contractStartDt', title: '계약시작일', width: 12 },
    { key: 'contractEndDt', title: '계약종료일', width: 12 },
    { key: 'email', title: '이메일', width: 25 },
    { key: 'telNo', title: '전화번호', width: 15 },
  ], []);

  // 전체 데이터 조회 함수 (엑셀용)
  const fetchAllDataForExcel = useCallback(async (): Promise<Company[]> => {
    const searchValues = searchForm.getFieldsValue();
    const response = await companyService.list({
      page: 0,
      size: 50000,
      keyword: searchValues.keyword,
      companyType: searchValues.companyType,
      contractStatus: searchValues.contractStatus,
    });
    if (response.success && response.data) {
      return response.data.content;
    }
    return [];
  }, [searchForm]);

  // 핸들러 등록/해제
  useEffect(() => {
    registerExportHandler('company', {
      sheetName: '원청사목록',
      totalCount: total,
      fetchAllData: fetchAllDataForExcel,
      columns: excelColumns,
    });

    return () => {
      unregisterExportHandler('company');
    };
  }, [registerExportHandler, unregisterExportHandler, total, fetchAllDataForExcel, excelColumns]);

  // 검색
  const handleSearch = () => {
    setPage(1);
    fetchData(1);
  };

  // 초기화
  const handleReset = () => {
    searchForm.resetFields();
    setPage(1);
    fetchData(1);
  };

  // 등록 모달 열기
  const handleCreate = () => {
    setModalMode('create');
    setCurrentRecord(null);
    form.resetFields();
    form.setFieldsValue({ useYn: 'Y', companyType: 'PROD', contractStatus: 'ACTIVE' });
    setModalOpen(true);
  };

  // 수정 모달 열기
  const handleEdit = (record: Company) => {
    setModalMode('edit');
    setCurrentRecord(record);
    form.setFieldsValue({
      ...record,
      contractStartDt: record.contractStartDt ? dayjs(record.contractStartDt) : null,
      contractEndDt: record.contractEndDt ? dayjs(record.contractEndDt) : null,
    });
    setModalOpen(true);
  };

  // 저장
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const requestData: CompanyRequest = {
        ...values,
        contractStartDt: values.contractStartDt ? values.contractStartDt.format('YYYY-MM-DD') : null,
        contractEndDt: values.contractEndDt ? values.contractEndDt.format('YYYY-MM-DD') : null,
      };

      let response;
      if (modalMode === 'create') {
        response = await companyService.create(requestData);
      } else if (currentRecord) {
        response = await companyService.update(currentRecord.companyId, requestData);
      }

      if (response?.success) {
        message.success(
          modalMode === 'create' ? '등록되었습니다.' : '수정되었습니다.'
        );
        setModalOpen(false);
        fetchData();
      } else {
        message.error(response?.message || '저장에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('저장 오류:', error);
      if (error instanceof Error && 'errorFields' in error) {
        message.error('입력값을 확인해주세요.');
      } else {
        const errorMessage = error?.response?.data?.message || error?.message || '저장 중 오류가 발생했습니다.';
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // 단건 삭제
  const handleDelete = async (record: Company) => {
    setLoading(true);
    try {
      const response = await companyService.delete(record.companyId);
      if (response.success) {
        message.success('삭제되었습니다.');
        fetchData();
      } else {
        message.error(response.message || '삭제에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('삭제 오류:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '삭제 중 오류가 발생했습니다.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 일괄 삭제
  const handleBatchDelete = async () => {
    if (selectedRows.length === 0) {
      message.warning('삭제할 항목을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const companyIds = selectedRows.map((row) => row.companyId);
      await companyService.deleteBatch(companyIds);
      message.success(`${companyIds.length}건이 삭제되었습니다.`);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      fetchData();
    } catch (error: any) {
      console.error('일괄 삭제 오류:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '삭제 중 오류가 발생했습니다.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 컬럼 리사이즈 핸들러
  const handleResize = (key: string) => (_: React.SyntheticEvent, { size }: ResizeCallbackData) => {
    setColumnWidths((prevWidths) => {
      const newWidths = {
        ...prevWidths,
        [key]: size.width,
      };
      try {
        localStorage.setItem('companyColumnWidths', JSON.stringify(newWidths));
      } catch (error) {
        console.error('컬럼 너비 저장 실패:', error);
      }
      return newWidths;
    });
  };

  // 컬럼 설정 초기화 (너비 + 표시 설정)
  const handleResetColumnWidths = () => {
    setColumnWidths(defaultColumnWidths);
    setVisibleColumns(defaultVisibleColumns);
    try {
      localStorage.removeItem('companyColumnWidths');
      localStorage.removeItem('companyVisibleColumns');
      message.success('컬럼 설정이 초기화되었습니다.');
    } catch (error) {
      console.error('컬럼 설정 초기화 실패:', error);
    }
  };

  // 계약상태 색상 매핑
  const getContractStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'EXPIRED':
        return 'error';
      case 'WAITING':
        return 'warning';
      default:
        return 'default';
    }
  };

  // 사업자번호 포맷팅
  const formatBusinessNo = (bizNo: string | undefined) => {
    if (!bizNo) return '-';
    const cleaned = bizNo.replace(/[^0-9]/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
    }
    return bizNo;
  };

  // 테이블 컬럼 정의
  const allColumns: ColumnsType<Company> = [
    {
      title: '원청사ID',
      dataIndex: 'companyId',
      key: 'companyId',
      width: columnWidths.companyId,
      sorter: (a, b) => (a.companyId || '').localeCompare(b.companyId || ''),
      onHeaderCell: () => ({
        width: columnWidths.companyId,
        onResize: handleResize('companyId'),
      }),
    },
    {
      title: '원청사명',
      dataIndex: 'companyNm',
      key: 'companyNm',
      width: columnWidths.companyNm,
      sorter: (a, b) => (a.companyNm || '').localeCompare(b.companyNm || ''),
      onHeaderCell: () => ({
        width: columnWidths.companyNm,
        onResize: handleResize('companyNm'),
      }),
      render: (text: string, record) => (
        <a onClick={() => handleEdit(record)} style={{ color: '#1890ff' }}>
          {text}
        </a>
      ),
    },
    {
      title: '사업자번호',
      dataIndex: 'businessNo',
      key: 'businessNo',
      width: columnWidths.businessNo,
      sorter: (a, b) => (a.businessNo || '').localeCompare(b.businessNo || ''),
      onHeaderCell: () => ({
        width: columnWidths.businessNo,
        onResize: handleResize('businessNo'),
      }),
      render: (text) => formatBusinessNo(text),
    },
    {
      title: '대표자',
      dataIndex: 'ceoNm',
      key: 'ceoNm',
      width: columnWidths.ceoNm,
      sorter: (a, b) => (a.ceoNm || '').localeCompare(b.ceoNm || ''),
      onHeaderCell: () => ({
        width: columnWidths.ceoNm,
        onResize: handleResize('ceoNm'),
      }),
      render: (text) => text || '-',
    },
    {
      title: '업종',
      dataIndex: 'companyType',
      key: 'companyType',
      width: columnWidths.companyType,
      sorter: (a, b) => (a.companyType || '').localeCompare(b.companyType || ''),
      filters: codeMap['COMPANY_TYPE']?.map((item) => ({ text: item.label, value: item.value })) || [],
      onFilter: (value, record) => record.companyType === value,
      onHeaderCell: () => ({
        width: columnWidths.companyType,
        onResize: handleResize('companyType'),
      }),
      render: (type: string) => getLabel('COMPANY_TYPE', type),
    },
    {
      title: '계약상태',
      dataIndex: 'contractStatus',
      key: 'contractStatus',
      width: columnWidths.contractStatus,
      align: 'center',
      sorter: (a, b) => (a.contractStatus || '').localeCompare(b.contractStatus || ''),
      filters: codeMap['CONTRACT_STATUS']?.map((item) => ({ text: item.label, value: item.value })) || [],
      onFilter: (value, record) => record.contractStatus === value,
      onHeaderCell: () => ({
        width: columnWidths.contractStatus,
        onResize: handleResize('contractStatus'),
      }),
      render: (status: string) => (
        <Tag color={getContractStatusColor(status)}>
          {getLabel('CONTRACT_STATUS', status)}
        </Tag>
      ),
    },
    {
      title: '계약시작',
      dataIndex: 'contractStartDt',
      key: 'contractStartDt',
      width: columnWidths.contractStartDt,
      sorter: (a, b) => (a.contractStartDt || '').localeCompare(b.contractStartDt || ''),
      onHeaderCell: () => ({
        width: columnWidths.contractStartDt,
        onResize: handleResize('contractStartDt'),
      }),
      render: (text) => text || '-',
    },
    {
      title: '관리',
      key: 'action',
      width: columnWidths.action,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleEdit(record)}
            title="상세"
          />
          {canWrite && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              title="수정"
            />
          )}
          {canDelete && (
            <Popconfirm
              title="삭제 확인"
              description="정말 삭제하시겠습니까?"
              onConfirm={() => handleDelete(record)}
              okText="삭제"
              cancelText="취소"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                title="삭제"
              />
            </Popconfirm>
          )}
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
  }, [allColumns, visibleColumns, codeMap]);

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
      <Button size="small" onClick={handleResetVisibleColumns} block>
        전체 표시
      </Button>
    </div>
  );

  // 행 선택
  const rowSelection: TableRowSelection<Company> = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      setSelectedRows(rows);
    },
  };

  return (
    <div className="company-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <BankOutlined style={{ marginRight: 8 }} />
          원청사 목록
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>원청사(고객사) 정보를 등록하고 관리합니다.</Text>
      </div>

      {/* 검색 영역 */}
      <Card className="search-card" size="small">
        <Form form={searchForm} layout="inline">
          <Form.Item name="keyword" label="검색어">
            <Input placeholder="원청사명, 사업자번호" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="companyType" label="업종">
            <Select placeholder="전체" allowClear style={{ width: 130 }}>
              {codeMap['COMPANY_TYPE']?.map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="contractStatus" label="계약상태">
            <Select placeholder="전체" allowClear style={{ width: 130 }}>
              {codeMap['CONTRACT_STATUS']?.map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
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
        </Form>
      </Card>

      {/* 테이블 영역 */}
      <Card size="small">
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            {canWrite && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                원청사 등록
              </Button>
            )}
            {canDelete && (
              <Popconfirm
                title="일괄 삭제 확인"
                description={`선택한 ${selectedRowKeys.length}건을 삭제하시겠습니까?`}
                onConfirm={handleBatchDelete}
                okText="삭제"
                cancelText="취소"
                disabled={selectedRowKeys.length === 0}
              >
                <Button danger icon={<DeleteOutlined />} disabled={selectedRowKeys.length === 0}>
                  선택 삭제 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            )}
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
            <Button icon={<ReloadOutlined />} onClick={handleResetColumnWidths} title="컬럼 너비 초기화">
              컬럼 초기화
            </Button>
          </Space>
          <Text type="secondary">총 {total}개</Text>
        </div>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={dataSource}
          rowKey="companyId"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `전체 ${total}건`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
              fetchData(p);
            },
          }}
          bordered
          scroll={{ x: 1000 }}
          size="middle"
          components={{
            header: {
              cell: ResizableTitle,
            },
          }}
        />
      </Card>

      {/* 등록/수정 모달 */}
      <Modal
        title={modalMode === 'create' ? '원청사 등록' : '원청사 수정'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={loading}
        width={800}
        okText="저장"
        cancelText="취소"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="원청사 ID"
                name="companyId"
                rules={[
                  { required: true, message: '원청사 ID를 입력하세요.' },
                  { max: 20, message: '최대 20자까지 입력 가능합니다.' },
                  { pattern: /^[A-Z0-9_]+$/, message: '영문 대문자, 숫자, 언더스코어만 사용 가능합니다.' },
                ]}
              >
                <Input placeholder="CMP001" disabled={modalMode === 'edit'} maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="원청사명"
                name="companyNm"
                rules={[
                  { required: true, message: '원청사명을 입력하세요.' },
                  { max: 200, message: '최대 200자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="(주)금융테크" maxLength={200} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="업종"
                name="companyType"
                rules={[{ required: true, message: '업종을 선택하세요.' }]}
              >
                <Select placeholder="업종 선택">
                  {codeMap['COMPANY_TYPE']?.map((item) => (
                    <Option key={item.value} value={item.value}>
                      {item.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="사업자등록번호"
                name="businessNo"
                rules={[{ max: 20, message: '최대 20자까지 입력 가능합니다.' }]}
              >
                <Input placeholder="123-45-67890" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="대표자명"
                name="ceoNm"
                rules={[{ max: 100, message: '최대 100자까지 입력 가능합니다.' }]}
              >
                <Input placeholder="대표자명" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="전화번호"
                name="telNo"
                rules={[{ max: 20, message: '최대 20자까지 입력 가능합니다.' }]}
              >
                <Input placeholder="02-1234-5678" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="이메일"
                name="email"
                rules={[
                  { type: 'email', message: '올바른 이메일 형식이 아닙니다.' },
                  { max: 100, message: '최대 100자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="contact@company.com" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="사용여부" name="useYn" initialValue="Y">
                <Select>
                  <Option value="Y">사용</Option>
                  <Option value="N">미사용</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="주소"
                name="address"
                rules={[{ max: 500, message: '최대 500자까지 입력 가능합니다.' }]}
              >
                <Input placeholder="주소" maxLength={500} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="계약 시작일"
                name="contractStartDt"
                rules={[{ required: true, message: '계약 시작일을 선택하세요.' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="계약 시작일" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="계약 종료일"
                name="contractEndDt"
                dependencies={['contractStartDt']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const startDt = getFieldValue('contractStartDt');
                      if (!value || !startDt) {
                        return Promise.resolve();
                      }
                      if (value.isBefore(startDt)) {
                        return Promise.reject(new Error('종료일은 시작일 이후여야 합니다.'));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="계약 종료일" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="계약상태" name="contractStatus" initialValue="ACTIVE">
                <Select placeholder="계약상태 선택">
                  {codeMap['CONTRACT_STATUS']?.map((item) => (
                    <Option key={item.value} value={item.value}>
                      {item.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="서비스 URL"
                name="serviceUrl"
                rules={[{ max: 200, message: '최대 200자까지 입력 가능합니다.' }]}
              >
                <Input placeholder="https://service.company.com" maxLength={200} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default CompanyPage;
