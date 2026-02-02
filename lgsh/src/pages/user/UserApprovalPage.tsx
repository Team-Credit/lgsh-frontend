/**
 * 사용자 승인 페이지
 * USER002 - 미승인 사용자 관리 및 승인 처리
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
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import type { User, UserRequest, Role, Company } from '@/types';
import { userService } from '@/services/userService';
import { useExcelExport } from '@/contexts';
import type { ExcelColumn } from '@/utils/excelExport';
import { roleService } from '@/services/roleService';
import { companyService } from '@/services/companyService';
import { useAppSelector } from '@/store/hooks';
import './UserApprovalPage.css';
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

const UserApprovalPage: React.FC = () => {
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();

  // 로그인 사용자 정보
  const currentUser = useAppSelector((state) => state.auth.user);
  const userCompanyId = currentUser?.companyId || null;

  // 상태 관리
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<User[]>([]);

  // 역할, 원청사 목록
  const [roleList, setRoleList] = useState<Role[]>([]);
  const [companyList, setCompanyList] = useState<Company[]>([]);

  // 승인 모달 상태
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<User | null>(null);

  // 컬럼 너비 초기값
  const defaultColumnWidths = {
    userId: 130,
    userNm: 120,
    companyNm: 150,
    roleNm: 150,
    email: 180,
    telNo: 130,
    useYn: 100,
    regDt: 180,
    action: 180,
  };

  // localStorage에서 저장된 컬럼 너비 불러오기
  const getStoredColumnWidths = () => {
    try {
      const stored = localStorage.getItem('userApprovalColumnWidths');
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
    userId: true,
    userNm: true,
    companyNm: true,
    roleNm: true,
    email: true,
    telNo: true,
    useYn: true,
    regDt: true,
  };

  const getStoredVisibleColumns = () => {
    try {
      const stored = localStorage.getItem('userApprovalVisibleColumns');
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
        localStorage.setItem('userApprovalVisibleColumns', JSON.stringify(newState));
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
      localStorage.removeItem('userApprovalVisibleColumns');
    } catch (error) {
      console.error('컬럼 표시 설정 초기화 실패:', error);
    }
  };

  // 컬럼 레이블 정의
  const columnLabels: { [key: string]: string } = {
    userId: '사용자ID',
    userNm: '사용자명',
    companyNm: '원청사',
    roleNm: '역할',
    email: '이메일',
    telNo: '전화번호',
    useYn: '승인상태',
    regDt: '가입신청일',
  };

  // 역할 목록 조회
  const fetchRoleList = useCallback(async () => {
    try {
      const response = await roleService.list({ useYn: 'Y' });
      if (response.success && response.data) {
        setRoleList(response.data);
      }
    } catch (error) {
      console.error('역할 목록 조회 오류:', error);
    }
  }, []);

  // 원청사 목록 조회
  const fetchCompanyList = useCallback(async () => {
    try {
      const response = await companyService.combo('Y');
      if (response.success && response.data) {
        setCompanyList(response.data);
      }
    } catch (error) {
      console.error('원청사 목록 조회 오류:', error);
    }
  }, []);

  // 데이터 조회 (기본 useYn='N' 미승인 사용자 조회)
  const fetchData = useCallback(async (currentPage = page) => {
    setLoading(true);
    try {
      const searchValues = searchForm.getFieldsValue();
      // 기본으로 미승인(useYn='N') 사용자를 먼저 조회
      const useYnValue = searchValues.useYn !== undefined ? searchValues.useYn : 'N';

      const response = await userService.list({
        page: currentPage - 1,
        size: pageSize,
        ...searchValues,
        useYn: useYnValue,
        companyId: userCompanyId || searchValues.companyId,
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
  }, [page, pageSize, searchForm, userCompanyId]);

  // 초기 로드
  useEffect(() => {
    fetchRoleList();
    fetchCompanyList();
    // 초기에는 미승인 사용자만 조회
    searchForm.setFieldsValue({ useYn: 'N' });
    fetchData();
  }, []);

  // 엑셀 내보내기 핸들러 등록
  const { registerExportHandler, unregisterExportHandler } = useExcelExport();

  // 엑셀 컬럼 정의
  const excelColumns: ExcelColumn[] = useMemo(() => [
    { key: 'userId', title: '사용자ID', width: 15 },
    { key: 'userNm', title: '사용자명', width: 15 },
    { key: 'companyNm', title: '원청사', width: 20 },
    { key: 'roleNm', title: '역할', width: 15 },
    { key: 'email', title: '이메일', width: 25 },
    { key: 'telNo', title: '전화번호', width: 15 },
    { key: 'useYn', title: '승인상태', width: 10 },
    { key: 'regDt', title: '가입신청일', width: 20 },
  ], []);

  // 전체 데이터 조회 함수 (엑셀용)
  const fetchAllDataForExcel = useCallback(async (): Promise<User[]> => {
    const searchValues = searchForm.getFieldsValue();
    const useYnValue = searchValues.useYn !== undefined ? searchValues.useYn : 'N';
    const response = await userService.list({
      page: 0,
      size: 50000,
      ...searchValues,
      useYn: useYnValue,
      companyId: userCompanyId || searchValues.companyId,
    });
    if (response.success && response.data) {
      return response.data.content;
    }
    return [];
  }, [searchForm, userCompanyId]);

  // 핸들러 등록/해제
  useEffect(() => {
    registerExportHandler('userApproval', {
      sheetName: '사용자승인',
      totalCount: total,
      fetchAllData: fetchAllDataForExcel,
      columns: excelColumns,
    });

    return () => {
      unregisterExportHandler('userApproval');
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
    // 초기화 후에도 미승인 사용자 조회가 기본
    searchForm.setFieldsValue({ useYn: 'N' });
    setPage(1);
    fetchData(1);
  };

  // 승인 모달 열기
  const handleOpenApprovalModal = (record: User) => {
    setCurrentRecord(record);
    form.setFieldsValue({
      userId: record.userId,
      userNm: record.userNm,
      companyId: record.companyId,
      roleId: record.roleId,
      email: record.email,
      telNo: record.telNo,
      useYn: 'Y', // 승인 시 Y로 변경
    });
    setApprovalModalOpen(true);
  };

  // 승인 처리
  const handleApprove = async () => {
    if (!currentRecord) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      const requestData: UserRequest = {
        userId: currentRecord.userId,
        userNm: values.userNm,
        companyId: values.companyId,
        roleId: values.roleId,
        email: values.email,
        telNo: values.telNo,
        useYn: 'Y', // 승인
      };

      const response = await userService.update(currentRecord.userId, requestData);

      if (response?.success) {
        message.success(`${currentRecord.userNm}님의 가입이 승인되었습니다.`);
        setApprovalModalOpen(false);
        setCurrentRecord(null);
        form.resetFields();
        fetchData();
      } else {
        message.error(response?.message || '승인 처리에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('승인 처리 오류:', error);
      if (error instanceof Error && 'errorFields' in error) {
        message.error('입력값을 확인해주세요.');
      } else {
        const errorMessage = error?.response?.data?.message || error?.message || '승인 처리 중 오류가 발생했습니다.';
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // 반려 처리 (삭제)
  const handleReject = async (record: User) => {
    setLoading(true);
    try {
      const response = await userService.delete(record.userId);
      if (response.success) {
        message.success(`${record.userNm}님의 가입 신청이 반려되었습니다.`);
        fetchData();
      } else {
        message.error(response.message || '반려 처리에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('반려 처리 오류:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '반려 처리 중 오류가 발생했습니다.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 일괄 승인
  const handleBatchApprove = async () => {
    if (selectedRows.length === 0) {
      message.warning('승인할 항목을 선택해주세요.');
      return;
    }

    // 미승인 상태인 것만 필터링
    const pendingUsers = selectedRows.filter((row) => row.useYn === 'N');
    if (pendingUsers.length === 0) {
      message.warning('승인 대기 중인 사용자가 없습니다.');
      return;
    }

    setLoading(true);
    try {
      await Promise.all(
        pendingUsers.map((user) =>
          userService.update(user.userId, {
            userId: user.userId,
            userNm: user.userNm,
            companyId: user.companyId || '',
            roleId: user.roleId || '',
            email: user.email,
            telNo: user.telNo,
            useYn: 'Y',
          })
        )
      );
      message.success(`${pendingUsers.length}건이 승인되었습니다.`);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      fetchData();
    } catch (error: any) {
      console.error('일괄 승인 오류:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '승인 처리 중 오류가 발생했습니다.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 행 단위 역할 변경
  const handleRoleChange = async (record: User, newRoleId: string) => {
    setLoading(true);
    try {
      const requestData: UserRequest = {
        userId: record.userId,
        userNm: record.userNm,
        companyId: record.companyId || '',
        roleId: newRoleId,
        email: record.email,
        telNo: record.telNo,
        useYn: record.useYn || 'N',
      };

      const response = await userService.update(record.userId, requestData);

      if (response?.success) {
        message.success('역할이 변경되었습니다.');
        // 데이터소스 업데이트 (리로드 없이)
        setDataSource((prev) =>
          prev.map((item) =>
            item.userId === record.userId
              ? { ...item, roleId: newRoleId, roleNm: roleList.find((r) => r.roleId === newRoleId)?.roleNm }
              : item
          )
        );
      } else {
        message.error(response?.message || '역할 변경에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('역할 변경 오류:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '역할 변경 중 오류가 발생했습니다.';
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
        localStorage.setItem('userApprovalColumnWidths', JSON.stringify(newWidths));
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
      localStorage.removeItem('userApprovalColumnWidths');
      localStorage.removeItem('userApprovalVisibleColumns');
      message.success('컬럼 설정이 초기화되었습니다.');
    } catch (error) {
      console.error('컬럼 설정 초기화 실패:', error);
    }
  };

  // 테이블 컬럼 정의
  const allColumns: ColumnsType<User> = [
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
      title: '사용자명',
      dataIndex: 'userNm',
      key: 'userNm',
      width: columnWidths.userNm,
      sorter: (a, b) => (a.userNm || '').localeCompare(b.userNm || ''),
      onHeaderCell: () => ({
        width: columnWidths.userNm,
        onResize: handleResize('userNm'),
      }),
    },
    {
      title: '원청사',
      dataIndex: 'companyNm',
      key: 'companyNm',
      width: columnWidths.companyNm,
      sorter: (a, b) => (a.companyNm || '').localeCompare(b.companyNm || ''),
      onHeaderCell: () => ({
        width: columnWidths.companyNm,
        onResize: handleResize('companyNm'),
      }),
      render: (text, record) => text || record.companyId || '-',
    },
    {
      title: '역할',
      dataIndex: 'roleNm',
      key: 'roleNm',
      width: columnWidths.roleNm,
      sorter: (a, b) => (a.roleNm || '').localeCompare(b.roleNm || ''),
      onHeaderCell: () => ({
        width: columnWidths.roleNm,
        onResize: handleResize('roleNm'),
      }),
      render: (_, record) => (
        record.useYn === 'N' ? (
          <Select
            value={record.roleId}
            onChange={(value) => handleRoleChange(record, value)}
            style={{ width: '100%' }}
            size="small"
          >
            {roleList.map((role) => (
              <Option key={role.roleId} value={role.roleId}>
                {role.roleNm}
              </Option>
            ))}
          </Select>
        ) : (
          <span>{record.roleNm || record.roleId || '-'}</span>
        )
      ),
    },
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
      width: columnWidths.email,
      onHeaderCell: () => ({
        width: columnWidths.email,
        onResize: handleResize('email'),
      }),
      render: (text) => text || '-',
    },
    {
      title: '전화번호',
      dataIndex: 'telNo',
      key: 'telNo',
      width: columnWidths.telNo,
      onHeaderCell: () => ({
        width: columnWidths.telNo,
        onResize: handleResize('telNo'),
      }),
      render: (text) => text || '-',
    },
    {
      title: '승인상태',
      dataIndex: 'useYn',
      key: 'useYn',
      width: columnWidths.useYn,
      align: 'center',
      sorter: (a, b) => (a.useYn || '').localeCompare(b.useYn || ''),
      onHeaderCell: () => ({
        width: columnWidths.useYn,
        onResize: handleResize('useYn'),
      }),
      render: (useYn: string) => {
        const statusMap: { [key: string]: { color: string; label: string } } = {
          Y: { color: 'success', label: '승인완료' },
          N: { color: 'warning', label: '승인대기' },
          R: { color: 'error', label: '반려' },
        };
        const status = statusMap[useYn] || { color: 'default', label: useYn };
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: '가입신청일',
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
      width: columnWidths.action,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.useYn === 'N' ? (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleOpenApprovalModal(record)}
              >
                승인
              </Button>
              <Popconfirm
                title="반려 확인"
                description={`${record.userNm}님의 가입 신청을 반려하시겠습니까?`}
                onConfirm={() => handleReject(record)}
                okText="반려"
                cancelText="취소"
                okButtonProps={{ danger: true }}
              >
                <Button
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                >
                  반려
                </Button>
              </Popconfirm>
            </>
          ) : record.useYn === 'R' ? (
            <Tag color="error">반려됨</Tag>
          ) : (
            <Tag color="success">승인완료</Tag>
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
  const rowSelection: TableRowSelection<User> = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      setSelectedRows(rows);
    },
    getCheckboxProps: (record) => ({
      disabled: record.useYn === 'Y', // 이미 승인된 사용자는 선택 불가
    }),
  };

  // 미승인 사용자 수 계산
  const pendingCount = selectedRows.filter((row) => row.useYn === 'N').length;

  return (
    <div className="user-approval-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          사용자 승인
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>회원가입 신청을 승인하고 관리합니다.</Text>
      </div>

      {/* 검색 영역 */}
      <Card className="search-card" size="small">
        <Form form={searchForm} layout="inline">
          <Form.Item name="userId" label="사용자ID">
            <Input placeholder="사용자ID" style={{ width: 130 }} />
          </Form.Item>
          <Form.Item name="userNm" label="사용자명">
            <Input placeholder="사용자명" style={{ width: 130 }} />
          </Form.Item>
          {!userCompanyId && (
            <Form.Item name="companyId" label="원청사">
              <Select placeholder="전체" allowClear style={{ width: 150 }}>
                {companyList.map((company) => (
                  <Option key={company.companyId} value={company.companyId}>
                    {company.companyNm}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="roleId" label="희망역할">
            <Select placeholder="전체" allowClear style={{ width: 130 }}>
              {roleList.map((role) => (
                <Option key={role.roleId} value={role.roleId}>
                  {role.roleNm}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="useYn" label="승인상태" initialValue="N">
            <Select style={{ width: 120 }}>
              <Option value="N">승인대기</Option>
              <Option value="Y">승인완료</Option>
              <Option value="R">반려</Option>
              <Option value="">전체</Option>
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
            <Popconfirm
              title="일괄 승인 확인"
              description={`선택한 ${pendingCount}건을 승인하시겠습니까?`}
              onConfirm={handleBatchApprove}
              okText="승인"
              cancelText="취소"
              disabled={pendingCount === 0}
            >
              <Button type="primary" icon={<CheckOutlined />} disabled={pendingCount === 0}>
                선택 승인 ({pendingCount})
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
          rowKey="userId"
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
          scroll={{ x: 1200 }}
          size="middle"
          components={{
            header: {
              cell: ResizableTitle,
            },
          }}
          rowClassName={(record) => (record.useYn === 'N' ? 'pending-row' : '')}
        />
      </Card>

      {/* 승인 모달 */}
      <Modal
        title="사용자 승인"
        open={approvalModalOpen}
        onOk={handleApprove}
        onCancel={() => {
          setApprovalModalOpen(false);
          setCurrentRecord(null);
          form.resetFields();
        }}
        confirmLoading={loading}
        width={600}
        okText="승인"
        cancelText="취소"
      >
        <div style={{ marginBottom: 16, padding: 12, background: '#f0f5ff', borderRadius: 4 }}>
          <Text>
            <strong>{currentRecord?.userNm}</strong>님의 가입 신청을 승인합니다.
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              필요 시 역할을 변경하여 승인할 수 있습니다.
            </Text>
          </Text>
        </div>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="사용자ID"
                name="userId"
              >
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="사용자명"
                name="userNm"
                rules={[{ required: true, message: '사용자명을 입력하세요.' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="원청사"
                name="companyId"
                rules={[{ required: true, message: '원청사를 선택하세요.' }]}
              >
                <Select placeholder="원청사 선택">
                  {companyList.map((company) => (
                    <Option key={company.companyId} value={company.companyId}>
                      {company.companyNm}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="역할"
                name="roleId"
                rules={[{ required: true, message: '역할을 선택하세요.' }]}
                extra="신청자가 희망한 역할을 확인 후 변경 가능합니다."
              >
                <Select placeholder="역할 선택">
                  {roleList.map((role) => (
                    <Option key={role.roleId} value={role.roleId}>
                      {role.roleNm}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="이메일"
                name="email"
                rules={[{ type: 'email', message: '올바른 이메일 형식이 아닙니다.' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="전화번호"
                name="telNo"
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default UserApprovalPage;
