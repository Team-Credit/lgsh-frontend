/**
 * 관리그룹 관리 페이지
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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  TeamOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import type { PersonGroup, PersonGroupRequest, User } from '@/types';
import { personGroupService } from '@/services/personGroupService';
import { useExcelExport } from '@/contexts';
import type { ExcelColumn } from '@/utils/excelExport';
import UserSelectModal from '@/components/UserSelectModal';
import PersonGroupSelectModal from '@/components/PersonGroupSelectModal';
import { useAppSelector } from '@/store/hooks';
import './PersonGroupPage.css';
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

const PersonGroupPage: React.FC = () => {
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();

  // 로그인 사용자 정보 (원청사 필터링용)
  const currentUser = useAppSelector((state) => state.auth.user);
  const userCompanyId = currentUser?.companyId || null;

  // 상태 관리
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<PersonGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<PersonGroup[]>([]);

  // 컬럼 너비 초기값
  const defaultColumnWidths = {
    personGrp: 150,
    userId: 150,
    personGrpNm: 200,
    personNmEng: 200,
    companyNm: 150,
    useYn: 100,
    regDt: 180,
    action: 100,
  };

  // localStorage에서 저장된 컬럼 너비 불러오기
  const getStoredColumnWidths = () => {
    try {
      const stored = localStorage.getItem('personGroupColumnWidths');
      if (stored) {
        return { ...defaultColumnWidths, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('컬럼 너비 불러오기 실패:', error);
    }
    return defaultColumnWidths;
  };

  // 컬럼 너비 상태 관리 (localStorage에서 초기값 로드)
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(
    getStoredColumnWidths()
  );

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentRecord, setCurrentRecord] = useState<PersonGroup | null>(null);

  // 팝업 상태
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [personGroupModalOpen, setPersonGroupModalOpen] = useState(false);
  const [isNewPersonGrp, setIsNewPersonGrp] = useState(true); // 신규 관리그룹코드 여부

  // 컬럼 표시 설정
  const defaultVisibleColumns = {
    personGrp: true,
    userId: true,
    personGrpNm: true,
    personNmEng: true,
    companyNm: true,
    useYn: true,
    regDt: true,
  };

  const getStoredVisibleColumns = () => {
    try {
      const stored = localStorage.getItem('personGroupVisibleColumns');
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
        localStorage.setItem('personGroupVisibleColumns', JSON.stringify(newState));
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
      localStorage.removeItem('personGroupVisibleColumns');
    } catch (error) {
      console.error('컬럼 표시 설정 초기화 실패:', error);
    }
  };

  // 컬럼 레이블 정의
  const columnLabels: { [key: string]: string } = {
    personGrp: '관리그룹코드',
    userId: '사용자ID',
    personGrpNm: '관리그룹명',
    personNmEng: '관리그룹 영문명',
    companyNm: '소속 원청사',
    useYn: '사용여부',
    regDt: '등록일시',
  };

  // 데이터 조회
  const fetchData = async (currentPage = page) => {
    setLoading(true);
    try {
      const searchValues = searchForm.getFieldsValue();
      // 로그인 사용자 원청사가 있으면 해당 원청사만 조회
      const response = await personGroupService.list({
        page: currentPage - 1, // Backend는 0-based
        size: pageSize,
        ...searchValues,
        companyId: userCompanyId || searchValues.companyId, // 사용자 원청사 우선 적용
      });

      if (response.success && response.data) {
        setDataSource(response.data.content);
        setTotal(response.data.totalCount);

        // 데이터가 없는 경우 정보 메시지 표시
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
  };

  // 초기 로드
  useEffect(() => {
    fetchData();
  }, []);

  // 엑셀 내보내기 핸들러 등록
  const { registerExportHandler, unregisterExportHandler } = useExcelExport();

  // 엑셀 컬럼 정의
  const excelColumns: ExcelColumn[] = useMemo(() => [
    { key: 'personGrp', title: '관리그룹코드', width: 15 },
    { key: 'userId', title: '사용자ID', width: 15 },
    { key: 'personGrpNm', title: '관리그룹명', width: 25 },
    { key: 'personNmEng', title: '관리그룹 영문명', width: 25 },
    { key: 'companyNm', title: '소속 원청사', width: 20 },
    { key: 'useYn', title: '사용여부', width: 10 },
  ], []);

  // 전체 데이터 조회 함수 (엑셀용)
  const fetchAllDataForExcel = useCallback(async (): Promise<PersonGroup[]> => {
    const searchValues = searchForm.getFieldsValue();
    const response = await personGroupService.list({
      page: 0,
      size: 50000,
      ...searchValues,
      companyId: userCompanyId || searchValues.companyId,
    });
    if (response.success && response.data) {
      return response.data.content;
    }
    return [];
  }, [searchForm, userCompanyId]);

  // 핸들러 등록/해제
  useEffect(() => {
    registerExportHandler('personGroup', {
      sheetName: '관리그룹',
      totalCount: total,
      fetchAllData: fetchAllDataForExcel,
      columns: excelColumns,
    });

    return () => {
      unregisterExportHandler('personGroup');
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
    // 로그인 사용자 원청사가 있으면 자동 설정
    if (userCompanyId) {
      form.setFieldsValue({ companyId: userCompanyId });
    }
    setIsNewPersonGrp(true);
    setModalOpen(true);
  };

  // 사용자 선택 핸들러
  const handleUserSelect = (user: User) => {
    form.setFieldsValue({
      userId: user.userId,
      companyId: user.companyId, // 사용자 선택 시 원청사ID 자동 입력
    });
    setUserModalOpen(false);
  };

  // 관리그룹 선택 핸들러
  const handlePersonGroupSelect = (group: PersonGroup) => {
    form.setFieldsValue({
      personGrp: group.personGrp,
      personGrpNm: group.personGrpNm,
      companyId: group.companyId,
    });
    setIsNewPersonGrp(false); // 기존 그룹 선택 시 관리그룹명 입력 불가
    setPersonGroupModalOpen(false);
  };

  // 관리그룹코드 직접 입력 모드로 전환
  const handleNewPersonGrp = () => {
    form.setFieldsValue({
      personGrp: '',
      personGrpNm: '',
    });
    setIsNewPersonGrp(true);
  };

  // 수정 모달 열기
  const handleEdit = (record: PersonGroup) => {
    setModalMode('edit');
    setCurrentRecord(record);
    form.setFieldsValue({
      personGrp: record.personGrp,
      userId: record.userId,
      companyId: record.companyId,
      personGrpNm: record.personGrpNm,
      personNmEng: record.personNmEng || '',
      useYn: record.useYn,
    });
    setModalOpen(true);
  };

  // 저장
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const requestData: PersonGroupRequest = {
        ...values,
        personNmEng: values.personNmEng || null,
      };

      let response;
      if (modalMode === 'create') {
        response = await personGroupService.create(requestData);
      } else if (currentRecord) {
        response = await personGroupService.update(
          currentRecord.personGrp,
          currentRecord.userId,
          requestData
        );
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
  const handleDelete = async (record: PersonGroup) => {
    setLoading(true);
    try {
      const response = await personGroupService.delete(record.personGrp, record.userId);
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
      const items = selectedRows.map((row) => ({
        personGrp: row.personGrp,
        userId: row.userId,
      }));

      await personGroupService.deleteBatch(items);
      message.success(`${items.length}건이 삭제되었습니다.`);
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
      // localStorage에 저장
      try {
        localStorage.setItem('personGroupColumnWidths', JSON.stringify(newWidths));
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
      localStorage.removeItem('personGroupColumnWidths');
      localStorage.removeItem('personGroupVisibleColumns');
      message.success('컬럼 설정이 초기화되었습니다.');
    } catch (error) {
      console.error('컬럼 설정 초기화 실패:', error);
    }
  };

  // 사용여부 필터 옵션
  const useYnFilters = [
    { text: '사용', value: 'Y' },
    { text: '미사용', value: 'N' },
  ];

  // 원청사 필터 옵션 (데이터에서 동적 생성)
  const companyFilters = useMemo(() => {
    const companies = new Map<string, string>();
    dataSource.forEach((item) => {
      if (item.companyNm || item.companyId) {
        companies.set(item.companyId, item.companyNm || item.companyId);
      }
    });
    return Array.from(companies.entries()).map(([id, name]) => ({
      text: name,
      value: id,
    }));
  }, [dataSource]);

  // 테이블 컬럼 정의 (정렬, 필터링 포함)
  const allColumns: ColumnsType<PersonGroup> = [
    {
      title: '관리그룹코드',
      dataIndex: 'personGrp',
      key: 'personGrp',
      width: columnWidths.personGrp,
      sorter: (a, b) => (a.personGrp || '').localeCompare(b.personGrp || ''),
      onHeaderCell: () => ({
        width: columnWidths.personGrp,
        onResize: handleResize('personGrp'),
      }),
    },
    {
      title: '사용자ID',
      dataIndex: 'userId',
      key: 'userId',
      width: columnWidths.userId,
      sorter: (a, b) => (a.userId || '').localeCompare(b.userId || ''),
      onHeaderCell: () => ({
        width: columnWidths.userId,
        onResize: handleResize('userId'),
      }),
    },
    {
      title: '관리그룹명',
      dataIndex: 'personGrpNm',
      key: 'personGrpNm',
      width: columnWidths.personGrpNm,
      sorter: (a, b) => (a.personGrpNm || '').localeCompare(b.personGrpNm || ''),
      onHeaderCell: () => ({
        width: columnWidths.personGrpNm,
        onResize: handleResize('personGrpNm'),
      }),
    },
    {
      title: '관리그룹 영문명',
      dataIndex: 'personNmEng',
      key: 'personNmEng',
      width: columnWidths.personNmEng,
      sorter: (a, b) => (a.personNmEng || '').localeCompare(b.personNmEng || ''),
      onHeaderCell: () => ({
        width: columnWidths.personNmEng,
        onResize: handleResize('personNmEng'),
      }),
      render: (text) => text || '-',
    },
    {
      title: '소속 원청사',
      dataIndex: 'companyNm',
      key: 'companyNm',
      width: columnWidths.companyNm,
      sorter: (a, b) => (a.companyNm || a.companyId || '').localeCompare(b.companyNm || b.companyId || ''),
      filters: companyFilters,
      onFilter: (value, record) => record.companyId === value,
      onHeaderCell: () => ({
        width: columnWidths.companyNm,
        onResize: handleResize('companyNm'),
      }),
      render: (text, record) => text || record.companyId,
    },
    {
      title: '사용여부',
      dataIndex: 'useYn',
      key: 'useYn',
      width: columnWidths.useYn,
      align: 'center',
      sorter: (a, b) => (a.useYn || '').localeCompare(b.useYn || ''),
      filters: useYnFilters,
      onFilter: (value, record) => record.useYn === value,
      onHeaderCell: () => ({
        width: columnWidths.useYn,
        onResize: handleResize('useYn'),
      }),
      render: (useYn: string) => (
        <Tag color={useYn === 'Y' ? 'success' : 'default'}>
          {useYn === 'Y' ? '사용' : '미사용'}
        </Tag>
      ),
    },
    {
      title: '등록일시',
      dataIndex: 'regDt',
      key: 'regDt',
      width: columnWidths.regDt,
      sorter: (a, b) => new Date(a.regDt || 0).getTime() - new Date(b.regDt || 0).getTime(),
      onHeaderCell: () => ({
        width: columnWidths.regDt,
        onResize: handleResize('regDt'),
      }),
      render: (text) => (text ? new Date(text).toLocaleString('ko-KR') : '-'),
    },
    {
      title: '액션',
      key: 'action',
      width: 100,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="수정"
          />
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
        </Space>
      ),
    },
  ];

  // 표시할 컬럼 필터링
  const columns = useMemo(() => {
    return allColumns.filter((col) => {
      const key = col.key as string;
      // action 컬럼은 항상 표시
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
      <Button size="small" onClick={handleResetVisibleColumns} block>
        전체 표시
      </Button>
    </div>
  );

  // 행 선택
  const rowSelection: TableRowSelection<PersonGroup> = {
    selectedRowKeys,
    onChange: (selectedRowKeys, selectedRows) => {
      setSelectedRowKeys(selectedRowKeys);
      setSelectedRows(selectedRows);
    },
  };

  return (
    <div className="person-group-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <TeamOutlined style={{ marginRight: 8 }} />
          관리그룹 관리
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>신용평가 대상자 그룹을 관리합니다.</Text>
      </div>

      {/* 검색 영역 */}
      <Card className="search-card" size="small">
        <Form form={searchForm} layout="inline">
          <Form.Item name="personGrp" label="관리그룹코드">
            <Input placeholder="관리그룹코드" style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="personGrpNm" label="관리그룹명">
            <Input placeholder="관리그룹명" style={{ width: 200 }} />
          </Form.Item>
          {/* 로그인 사용자 원청사가 없을 때만 원청사 검색 조건 표시 */}
          {!userCompanyId && (
            <Form.Item name="companyId" label="원청사">
              <Input placeholder="원청사ID" style={{ width: 150 }} />
            </Form.Item>
          )}
          <Form.Item name="useYn" label="사용여부">
            <Select placeholder="전체" allowClear style={{ width: 100 }}>
              <Option value="Y">사용</Option>
              <Option value="N">미사용</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                조회
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
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              등록
            </Button>
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
          <Text type="secondary">전체 {total}건</Text>
        </div>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={dataSource}
          rowKey={(record) => `${record.personGrp}_${record.userId}`}
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `전체 ${total}건`,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
              fetchData(page);
            },
          }}
          bordered
          scroll={{ x: 1100 }}
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
        title={modalMode === 'create' ? '관리그룹 등록' : '관리그룹 수정'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={loading}
        width={800}
        okText="저장"
        cancelText="취소"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          {/* 관리그룹코드 */}
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                label="관리그룹코드"
                name="personGrp"
                rules={[
                  { required: true, message: '관리그룹코드를 입력하세요.' },
                  { max: 20, message: '최대 20자까지 입력 가능합니다.' },
                ]}
              >
                <Input
                  placeholder="관리그룹코드 입력 또는 선택"
                  disabled={modalMode === 'edit'}
                  maxLength={20}
                />
              </Form.Item>
            </Col>
            {modalMode === 'create' && (
              <Col span={10}>
                <Form.Item label=" ">
                  <Space>
                    <Button onClick={() => setPersonGroupModalOpen(true)} size="middle">
                      기존 선택
                    </Button>
                    <Button onClick={handleNewPersonGrp} size="middle">
                      신규 입력
                    </Button>
                  </Space>
                </Form.Item>
              </Col>
            )}
          </Row>

          {/* 사용자ID */}
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                label="사용자ID"
                name="userId"
                rules={[
                  { required: true, message: '사용자ID를 입력하세요.' },
                  { max: 50, message: '최대 50자까지 입력 가능합니다.' },
                ]}
              >
                <Input
                  placeholder="사용자ID 입력 또는 선택"
                  disabled={modalMode === 'edit'}
                  maxLength={50}
                />
              </Form.Item>
            </Col>
            {modalMode === 'create' && (
              <Col span={10}>
                <Form.Item label=" ">
                  <Button onClick={() => setUserModalOpen(true)} block size="middle">
                    사용자 선택
                  </Button>
                </Form.Item>
              </Col>
            )}
          </Row>

          {/* 원청사ID - 사용자 선택 시 자동 입력, 입력 불가 */}
          <Form.Item
            label="원청사ID"
            name="companyId"
            rules={[
              { required: true, message: '원청사ID를 입력하세요.' },
              { max: 20, message: '최대 20자까지 입력 가능합니다.' },
            ]}
            tooltip="사용자 선택 시 자동으로 입력됩니다"
          >
            <Input placeholder="사용자 선택 시 자동 입력" disabled maxLength={20} />
          </Form.Item>

          {/* 관리그룹명 - 기존 그룹 선택 시 입력 불가 */}
          <Form.Item
            label="관리그룹명"
            name="personGrpNm"
            rules={[
              { required: true, message: '관리그룹명을 입력하세요.' },
              { max: 100, message: '최대 100자까지 입력 가능합니다.' },
            ]}
            tooltip={!isNewPersonGrp ? '기존 관리그룹 선택 시 입력 불가' : undefined}
          >
            <Input
              placeholder="관리그룹명"
              disabled={!isNewPersonGrp && modalMode === 'create'}
              maxLength={100}
            />
          </Form.Item>

          {/* 관리그룹 영문명 */}
          <Form.Item
            label="관리그룹 영문명"
            name="personNmEng"
            rules={[{ max: 200, message: '최대 200자까지 입력 가능합니다.' }]}
          >
            <Input placeholder="관리그룹 영문명 (선택)" maxLength={200} />
          </Form.Item>

          {/* 사용여부 */}
          <Form.Item
            label="사용여부"
            name="useYn"
            rules={[{ required: true, message: '사용여부를 선택하세요.' }]}
            initialValue="Y"
          >
            <Select>
              <Option value="Y">사용</Option>
              <Option value="N">미사용</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 사용자 선택 모달 - 로그인 사용자 원청사로 필터링 */}
      <UserSelectModal
        open={userModalOpen}
        onCancel={() => setUserModalOpen(false)}
        onSelect={handleUserSelect}
        companyId={userCompanyId || undefined}
      />

      {/* 관리그룹 선택 모달 - 로그인 사용자 원청사로 필터링 */}
      <PersonGroupSelectModal
        open={personGroupModalOpen}
        onCancel={() => setPersonGroupModalOpen(false)}
        onSelect={handlePersonGroupSelect}
        companyId={userCompanyId || form.getFieldValue('companyId')}
      />
    </div>
  );
};

export default PersonGroupPage;
