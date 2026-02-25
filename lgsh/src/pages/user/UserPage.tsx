/**
 * 사용자목록 페이지
 * USER001 - 사용자 정보 관리
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  UserOutlined,
  SettingOutlined,
  LockOutlined,
  UnlockOutlined,
  KeyOutlined,
  EyeOutlined,
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
import { useMenuPermission } from '@/hooks';
import './UserPage.css';
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

const UserPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();

  // 로그인 사용자 정보
  const currentUser = useAppSelector((state) => state.auth.user);
  const userCompanyId = currentUser?.companyId || null;

  // 메뉴 권한
  const { canWrite, canDelete, canExport } = useMenuPermission('M0501');

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

  // 컬럼 너비 초기값
  const defaultColumnWidths = {
    userId: 130,
    userNm: 120,
    companyNm: 150,
    roleNm: 120,
    email: 180,
    telNo: 130,
    useYn: 100,
    accountLockYn: 100,
    lastLoginDt: 180,
    regDt: 180,
    action: 180,
  };

  // localStorage에서 저장된 컬럼 너비 불러오기
  const getStoredColumnWidths = () => {
    try {
      const stored = localStorage.getItem('userColumnWidths');
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
  const [currentRecord, setCurrentRecord] = useState<User | null>(null);
  const [changePwdChecked, setChangePwdChecked] = useState(false);

  // 컬럼 표시 설정
  const defaultVisibleColumns = {
    userId: true,
    userNm: true,
    companyNm: true,
    roleNm: true,
    email: true,
    telNo: true,
    useYn: true,
    accountLockYn: true,
    lastLoginDt: true,
    regDt: false, // 첫 화면에서 숨김
  };

  const getStoredVisibleColumns = () => {
    try {
      const stored = localStorage.getItem('userVisibleColumns');
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
        localStorage.setItem('userVisibleColumns', JSON.stringify(newState));
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
      localStorage.removeItem('userVisibleColumns');
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
    useYn: '사용여부',
    accountLockYn: '잠금',
    lastLoginDt: '최종로그인',
    regDt: '등록일시',
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

  // 데이터 조회
  const fetchData = useCallback(async (currentPage = page) => {
    setLoading(true);
    try {
      const searchValues = searchForm.getFieldsValue();
      const response = await userService.list({
        page: currentPage - 1,
        size: pageSize,
        ...searchValues,
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
    { key: 'useYn', title: '사용여부', width: 10 },
    { key: 'accountLockYn', title: '계정잠금', width: 10 },
    { key: 'lastLoginDt', title: '최종로그인', width: 20 },
  ], []);

  // 전체 데이터 조회 함수 (엑셀용)
  const fetchAllDataForExcel = useCallback(async (): Promise<User[]> => {
    const searchValues = searchForm.getFieldsValue();
    const response = await userService.list({
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
    registerExportHandler('user', {
      sheetName: '사용자목록',
      totalCount: total,
      fetchAllData: fetchAllDataForExcel,
      columns: excelColumns,
    });

    return () => {
      unregisterExportHandler('user');
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
    setChangePwdChecked(false);
    form.resetFields();
    form.setFieldsValue({ useYn: 'Y' });
    if (userCompanyId) {
      form.setFieldsValue({ companyId: userCompanyId });
    }
    setModalOpen(true);
  };

  // 수정 모달 열기
  const handleEdit = (record: User) => {
    setModalMode('edit');
    setCurrentRecord(record);
    setChangePwdChecked(false);
    form.setFieldsValue({
      ...record,
    });
    setModalOpen(true);
  };

  // 저장
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 비밀번호 관련 필드 제거 (별도 API 호출)
      const { userPwd, userPwdConfirm, newPassword, newPasswordConfirm, ...restValues } = values;

      const requestData: UserRequest = {
        ...restValues,
        ...(modalMode === 'create' ? { userPwd } : {}),
      };

      let response;
      if (modalMode === 'create') {
        response = await userService.create(requestData);
      } else if (currentRecord) {
        response = await userService.update(currentRecord.userId, requestData);

        // 수정 모드에서 비밀번호 변경 체크된 경우
        if (response?.success && changePwdChecked && newPassword) {
          const pwdResponse = await userService.changePassword(currentRecord.userId, newPassword);
          if (!pwdResponse?.success) {
            message.warning('정보는 수정되었으나 비밀번호 변경에 실패했습니다.');
          } else {
            message.success('비밀번호가 변경되었습니다.');
          }
        }
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
  const handleDelete = async (record: User) => {
    setLoading(true);
    try {
      const response = await userService.delete(record.userId);
      if (response.success) {
        message.success(response.message || '삭제되었습니다.');
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
      const userIds = selectedRows.map((row) => row.userId);
      const response = await userService.deleteBatch(userIds);
      message.success(response.message || `${userIds.length}건이 삭제되었습니다.`);
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

  // 비밀번호 초기화
  const handleResetPassword = async (record: User) => {
    setLoading(true);
    try {
      const response = await userService.resetPassword(record.userId);
      if (response.success) {
        message.success('비밀번호가 초기화되었습니다.');
      } else {
        message.error(response.message || '비밀번호 초기화에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('비밀번호 초기화 오류:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '비밀번호 초기화 중 오류가 발생했습니다.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 계정 잠금 해제
  const handleUnlockAccount = async (record: User) => {
    setLoading(true);
    try {
      const response = await userService.unlockAccount(record.userId);
      if (response.success) {
        message.success('계정 잠금이 해제되었습니다.');
        fetchData();
      } else {
        message.error(response.message || '계정 잠금 해제에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('계정 잠금 해제 오류:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '계정 잠금 해제 중 오류가 발생했습니다.';
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
        localStorage.setItem('userColumnWidths', JSON.stringify(newWidths));
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
      localStorage.removeItem('userColumnWidths');
      localStorage.removeItem('userVisibleColumns');
      message.success('컬럼 설정이 초기화되었습니다.');
    } catch (error) {
      console.error('컬럼 설정 초기화 실패:', error);
    }
  };

  // 필터 옵션들
  const useYnFilters = [
    { text: '사용', value: 'Y' },
    { text: '미사용', value: 'N' },
  ];

  const lockYnFilters = [
    { text: '정상', value: 'N' },
    { text: '잠금', value: 'Y' },
  ];

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
      render: (text: string) => (
        <a onClick={() => navigate(`/users/detail/${text}`)} style={{ color: '#1890ff' }}>
          {text}
        </a>
      ),
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
      render: (text, record) => text || record.roleId || '-',
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
      title: '잠금',
      dataIndex: 'accountLockYn',
      key: 'accountLockYn',
      width: columnWidths.accountLockYn,
      align: 'center',
      sorter: (a, b) => (a.accountLockYn || '').localeCompare(b.accountLockYn || ''),
      filters: lockYnFilters,
      onFilter: (value, record) => record.accountLockYn === value,
      onHeaderCell: () => ({
        width: columnWidths.accountLockYn,
        onResize: handleResize('accountLockYn'),
      }),
      render: (lockYn: string) => (
        <Tag color={lockYn === 'Y' ? 'error' : 'success'} icon={lockYn === 'Y' ? <LockOutlined /> : <UnlockOutlined />}>
          {lockYn === 'Y' ? '잠금' : '정상'}
        </Tag>
      ),
    },
    {
      title: '최종로그인',
      dataIndex: 'lastLoginDt',
      key: 'lastLoginDt',
      width: columnWidths.lastLoginDt,
      sorter: (a, b) => new Date(a.lastLoginDt || 0).getTime() - new Date(b.lastLoginDt || 0).getTime(),
      onHeaderCell: () => ({
        width: columnWidths.lastLoginDt,
        onResize: handleResize('lastLoginDt'),
      }),
      render: (text) => (text ? new Date(text).toLocaleString('ko-KR') : '-'),
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
      width: columnWidths.action,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/users/detail/${record.userId}`)}
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
          {canWrite && (
            <Popconfirm
              title="비밀번호 초기화"
              description="비밀번호를 초기화하시겠습니까?"
              onConfirm={() => handleResetPassword(record)}
              okText="확인"
              cancelText="취소"
            >
              <Button
                type="link"
                size="small"
                icon={<KeyOutlined />}
                title="비밀번호 초기화"
              />
            </Popconfirm>
          )}
          {canWrite && record.accountLockYn === 'Y' && (
            <Popconfirm
              title="계정 잠금 해제"
              description="계정 잠금을 해제하시겠습니까?"
              onConfirm={() => handleUnlockAccount(record)}
              okText="확인"
              cancelText="취소"
            >
              <Button
                type="link"
                size="small"
                icon={<UnlockOutlined />}
                title="잠금 해제"
              />
            </Popconfirm>
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
  };

  return (
    <div className="user-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          사용자목록
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>시스템 사용자를 등록하고 관리합니다.</Text>
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
          <Form.Item name="roleId" label="역할">
            <Select placeholder="전체" allowClear style={{ width: 130 }}>
              {roleList.map((role) => (
                <Option key={role.roleId} value={role.roleId}>
                  {role.roleNm}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="useYn" label="사용여부">
            <Select placeholder="전체" allowClear style={{ width: 100 }}>
              <Option value="Y">사용</Option>
              <Option value="N">미사용</Option>
            </Select>
          </Form.Item>
          <Form.Item name="accountLockYn" label="잠금">
            <Select placeholder="전체" allowClear style={{ width: 100 }}>
              <Option value="N">정상</Option>
              <Option value="Y">잠금</Option>
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
            {canWrite && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                등록
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
          scroll={{ x: 1400 }}
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
        title={modalMode === 'create' ? '사용자 등록' : '사용자 수정'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={loading}
        width={700}
        okText="저장"
        cancelText="취소"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="사용자ID"
                name="userId"
                rules={[
                  { required: true, message: '사용자ID를 입력하세요.' },
                  { max: 50, message: '최대 50자까지 입력 가능합니다.' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '영문, 숫자, 언더스코어만 사용 가능합니다.' },
                ]}
              >
                <Input placeholder="사용자ID" disabled={modalMode === 'edit'} maxLength={50} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="사용자명"
                name="userNm"
                rules={[
                  { required: true, message: '사용자명을 입력하세요.' },
                  { max: 100, message: '최대 100자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="사용자명" maxLength={100} />
              </Form.Item>
            </Col>
          </Row>
          {modalMode === 'create' && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="비밀번호"
                  name="userPwd"
                  rules={[
                    { required: true, message: '비밀번호를 입력하세요.' },
                    { min: 8, max: 20, message: '8~20자 사이로 입력하세요.' },
                    {
                      pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/,
                      message: '영문, 숫자, 특수문자(@$!%*#?&)를 각각 1개 이상 포함해야 합니다.',
                    },
                  ]}
                  extra="영문, 숫자, 특수문자(@$!%*#?&) 각 1개 이상 포함, 8~20자"
                >
                  <Input.Password placeholder="비밀번호" maxLength={20} autoComplete="new-password" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="비밀번호 확인"
                  name="userPwdConfirm"
                  dependencies={['userPwd']}
                  rules={[
                    { required: true, message: '비밀번호 확인을 입력하세요.' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('userPwd') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('비밀번호가 일치하지 않습니다.'));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="비밀번호 확인" maxLength={20} autoComplete="new-password" />
                </Form.Item>
              </Col>
            </Row>
          )}
          {modalMode === 'edit' && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Checkbox
                checked={changePwdChecked}
                onChange={(e) => {
                  setChangePwdChecked(e.target.checked);
                  if (!e.target.checked) {
                    form.setFieldsValue({ newPassword: undefined, newPasswordConfirm: undefined });
                  }
                }}
              >
                비밀번호 변경
              </Checkbox>
              {changePwdChecked && (
                <Row gutter={16} style={{ marginTop: 12 }}>
                  <Col span={12}>
                    <Form.Item
                      label="새 비밀번호"
                      name="newPassword"
                      rules={[
                        { required: changePwdChecked, message: '새 비밀번호를 입력하세요.' },
                        { min: 8, max: 20, message: '8~20자 사이로 입력하세요.' },
                        {
                          pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/,
                          message: '영문, 숫자, 특수문자(@$!%*#?&)를 각각 1개 이상 포함해야 합니다.',
                        },
                      ]}
                      extra="영문, 숫자, 특수문자(@$!%*#?&) 각 1개 이상 포함, 8~20자"
                    >
                      <Input.Password placeholder="새 비밀번호" maxLength={20} autoComplete="new-password" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="새 비밀번호 확인"
                      name="newPasswordConfirm"
                      dependencies={['newPassword']}
                      rules={[
                        { required: changePwdChecked, message: '비밀번호 확인을 입력하세요.' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('newPassword') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('비밀번호가 일치하지 않습니다.'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password placeholder="새 비밀번호 확인" maxLength={20} autoComplete="new-password" />
                    </Form.Item>
                  </Col>
                </Row>
              )}
              <Divider style={{ margin: '12px 0' }} />
            </>
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="원청사"
                name="companyId"
                rules={[{ required: true, message: '원청사를 선택하세요.' }]}
              >
                <Select placeholder="원청사 선택" disabled={!!userCompanyId}>
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
                rules={[
                  { type: 'email', message: '올바른 이메일 형식이 아닙니다.' },
                  { max: 100, message: '최대 100자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="email@example.com" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="전화번호"
                name="telNo"
                rules={[{ max: 20, message: '최대 20자까지 입력 가능합니다.' }]}
              >
                <Input placeholder="010-0000-0000" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="사용여부" name="useYn" initialValue="Y">
                <Select>
                  <Option value="Y">사용</Option>
                  <Option value="N">미사용</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default UserPage;
