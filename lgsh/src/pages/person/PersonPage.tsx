/**
 * 대상자등록 페이지
 * PSN002 - 대상자 기본정보 및 상세정보 관리
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
  InputNumber,
  DatePicker,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  SettingOutlined,
  EyeOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import dayjs from 'dayjs';
import type { PersonFull, PersonRequest, PersonGroup, PersonGroupTreeNode, PersonSearchParams } from '@/types';
import { personService } from '@/services/personService';
import { useAppSelector } from '@/store/hooks';
import { useCommonCodes, useMenuPermission } from '@/hooks';
import { useExcelExport } from '@/contexts';
import type { ExcelColumn } from '@/utils/excelExport';
import PersonGroupSelectModal from '@/components/PersonGroupSelectModal';
import PersonDetailData from './PersonDetailData';
import './PersonPage.css';
import 'react-resizable/css/styles.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 공통코드 대분류 코드 상수
const CODE_KEYS = {
  GENDER: 'GENDER',       // 성별
  JOB: 'HAC',             // 직업
  EDUCATION: 'EDUCATION', // 학력
  HOME_TYPE: 'HOME_TYPE', // 주거형태
};

// 예/아니오 옵션 (하드코딩 유지 - 단순 Y/N)
const YES_NO_OPTIONS = [
  { value: 'Y', label: '예' },
  { value: 'N', label: '아니오' },
];

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

const PersonPage: React.FC = () => {
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();

  // 로그인 사용자 정보
  const currentUser = useAppSelector((state) => state.auth.user);
  const userCompanyId = currentUser?.companyId || null;

  // 메뉴 권한
  const { canWrite, canDelete, canExport } = useMenuPermission('M0201');

  // 공통코드 조회
  const { codeMap, getLabel: getCodeLabel } = useCommonCodes([
    CODE_KEYS.GENDER,
    CODE_KEYS.JOB,
    CODE_KEYS.EDUCATION,
    CODE_KEYS.HOME_TYPE,
  ]);

  // 공통코드 옵션 (조회 완료 후 사용)
  const genderOptions = codeMap[CODE_KEYS.GENDER] || [];
  const jobOptions = codeMap[CODE_KEYS.JOB] || [];
  const educationOptions = codeMap[CODE_KEYS.EDUCATION] || [];
  const homeTypeOptions = codeMap[CODE_KEYS.HOME_TYPE] || [];

  // 상태 관리
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<PersonFull[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<PersonFull[]>([]);

  // 컬럼 너비 초기값
  const defaultColumnWidths = {
    personId: 120,
    personNo: 130,
    personNm: 120,
    gender: 80,
    birthDt: 110,
    mobileNo: 130,
    jobNm: 110,
    personGrpNm: 130,
    companyNm: 130,
    useYn: 105,
    regDt: 160,
    action: 110,
  };

  // localStorage에서 저장된 컬럼 너비 불러오기
  const getStoredColumnWidths = () => {
    try {
      const stored = localStorage.getItem('personColumnWidths');
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
  const [currentRecord, setCurrentRecord] = useState<PersonFull | null>(null);

  // 관리그룹 선택 모달
  const [personGroupModalOpen, setPersonGroupModalOpen] = useState(false);

  // 관리그룹 일괄지정 모달
  const [batchGrpModalOpen, setBatchGrpModalOpen] = useState(false);

  // 관리그룹 조회지정 모달
  const [batchGrpByCriteriaModalOpen, setBatchGrpByCriteriaModalOpen] = useState(false);

  // 대상자 상세 모달 상태
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailPersonId, setDetailPersonId] = useState('');

  // 컬럼 표시 설정
  const defaultVisibleColumns = {
    personId: true,
    personNo: true,
    personNm: true,
    gender: true,
    birthDt: true,
    mobileNo: true,
    jobNm: true,
    personGrpNm: true,
    companyNm: true,
    useYn: true,
    regDt: true,
  };

  const getStoredVisibleColumns = () => {
    try {
      const stored = localStorage.getItem('personVisibleColumns');
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
        localStorage.setItem('personVisibleColumns', JSON.stringify(newState));
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
      localStorage.removeItem('personVisibleColumns');
    } catch (error) {
      console.error('컬럼 표시 설정 초기화 실패:', error);
    }
  };

  // 컬럼 레이블 정의
  const columnLabels: { [key: string]: string } = {
    personId: '대상자ID',
    personNo: '대상자번호',
    personNm: '대상자명',
    gender: '성별',
    birthDt: '생년월일',
    mobileNo: '휴대폰',
    jobNm: '직업',
    personGrpNm: '관리그룹',
    companyNm: '원청사',
    useYn: '사용여부',
    regDt: '등록일시',
  };

  // 데이터 조회
  const fetchData = async (currentPage = page) => {
    setLoading(true);
    try {
      const searchValues = searchForm.getFieldsValue();
      const response = await personService.list({
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
  };

  // 초기 로드
  useEffect(() => {
    fetchData();
  }, []);

  // 엑셀 내보내기 핸들러 등록
  const { registerExportHandler, unregisterExportHandler } = useExcelExport();

  // 엑셀 컬럼 정의
  const excelColumns: ExcelColumn[] = useMemo(() => [
    { key: 'personId', title: '대상자ID', width: 15 },
    { key: 'personNo', title: '대상자번호', width: 15 },
    { key: 'personNm', title: '대상자명', width: 15 },
    { key: 'gender', title: '성별', width: 8 },
    { key: 'birthDt', title: '생년월일', width: 12 },
    { key: 'mobileNo', title: '휴대폰', width: 15 },
    { key: 'jobNm', title: '직업', width: 12 },
    { key: 'personGrpNm', title: '관리그룹', width: 15 },
    { key: 'companyNm', title: '원청사', width: 15 },
    { key: 'useYn', title: '사용여부', width: 10 },
  ], []);

  // 전체 데이터 조회 함수 (엑셀용)
  const fetchAllDataForExcel = useCallback(async (): Promise<PersonFull[]> => {
    const searchValues = searchForm.getFieldsValue();
    const response = await personService.list({
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
    registerExportHandler('person', {
      sheetName: '대상자목록',
      totalCount: total,
      fetchAllData: fetchAllDataForExcel,
      columns: excelColumns,
    });

    return () => {
      unregisterExportHandler('person');
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
    if (userCompanyId) {
      form.setFieldsValue({ companyId: userCompanyId });
    }
    setModalOpen(true);
  };

  // 수정 모달 열기
  const handleEdit = (record: PersonFull) => {
    setModalMode('edit');
    setCurrentRecord(record);
    form.setFieldsValue({
      ...record,
      birthDt: record.birthDt ? dayjs(record.birthDt) : null,
    });
    setModalOpen(true);
  };

  // 관리그룹 선택 핸들러
  const handlePersonGroupSelect = (group: PersonGroup) => {
    form.setFieldsValue({
      personGrp: group.personGrp,
    });
    setPersonGroupModalOpen(false);
  };

  // 저장
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const requestData: PersonRequest = {
        ...values,
        birthDt: values.birthDt ? dayjs(values.birthDt).format('YYYYMMDD') : null,
      };

      let response;
      if (modalMode === 'create') {
        response = await personService.create(requestData);
      } else if (currentRecord) {
        response = await personService.update(currentRecord.personId, requestData);
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
  const handleDelete = async (record: PersonFull) => {
    setLoading(true);
    try {
      const response = await personService.delete(record.personId);
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
      const personIds = selectedRows.map((row) => row.personId);
      await personService.deleteBatch(personIds);
      message.success(`${personIds.length}건이 삭제되었습니다.`);
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

  // 관리그룹 일괄 지정 핸들러
  const handleBatchUpdateGrp = async (group: PersonGroupTreeNode) => {
    if (selectedRows.length === 0) {
      message.warning('대상자를 선택해주세요.');
      return;
    }

    setBatchGrpModalOpen(false);
    setLoading(true);
    try {
      const personIds = selectedRows.map((row) => row.personId);
      const response = await personService.batchUpdateGrp(personIds, group.personGrp);

      if (response.success) {
        const result = response.data;
        message.success(
          `${result?.successCount || 0}건의 관리그룹이 [${group.personGrpNm}](으)로 변경되었습니다.`
        );
        setSelectedRowKeys([]);
        setSelectedRows([]);
        fetchData();
      } else {
        message.error(response.message || '관리그룹 일괄 지정에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('관리그룹 일괄 지정 오류:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '관리그룹 일괄 지정 중 오류가 발생했습니다.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 관리그룹 조회지정 핸들러 (검색 조건 기반 일괄 지정)
  const handleBatchUpdateGrpByCriteria = (group: PersonGroupTreeNode) => {
    setBatchGrpByCriteriaModalOpen(false);

    const searchValues = searchForm.getFieldsValue();
    const searchParams: PersonSearchParams = {
      ...searchValues,
      companyId: userCompanyId || searchValues.companyId,
    };

    Modal.confirm({
      title: '관리그룹 조회지정',
      icon: <TeamOutlined />,
      content: (
        <div>
          <p>현재 검색 조건에 맞는 <strong>전체 대상자</strong>의 관리그룹을</p>
          <p><strong>[{group.personGrpNm}]</strong>(으)로 변경하시겠습니까?</p>
          <p style={{ color: '#666', fontSize: 12, marginTop: 8 }}>
            현재 조회된 전체 {total}건이 대상입니다.
          </p>
        </div>
      ),
      okText: '일괄 변경',
      cancelText: '취소',
      onOk: async () => {
        try {
          const response = await personService.batchUpdateGrpByCriteria(searchParams, group.personGrp);

          if (response.success) {
            const result = response.data;
            message.success(
              result?.message || `${result?.successCount || 0}건의 관리그룹이 [${group.personGrpNm}](으)로 변경되었습니다.`
            );
            setSelectedRowKeys([]);
            setSelectedRows([]);
            fetchData();
          } else {
            message.error(response.message || '관리그룹 조회지정에 실패했습니다.');
          }
        } catch (error: any) {
          console.error('관리그룹 조회지정 오류:', error);
          const errorMessage = error?.response?.data?.message || error?.message || '관리그룹 조회지정 중 오류가 발생했습니다.';
          message.error(errorMessage);
        }
      },
    });
  };

  // 상세 보기 모달 열기
  const handleDetailView = (record: PersonFull) => {
    setDetailPersonId(record.personId);
    setDetailModalOpen(true);
  };

  // 컬럼 리사이즈 핸들러
  const handleResize = (key: string) => (_: React.SyntheticEvent, { size }: ResizeCallbackData) => {
    setColumnWidths((prevWidths) => {
      const newWidths = {
        ...prevWidths,
        [key]: size.width,
      };
      try {
        localStorage.setItem('personColumnWidths', JSON.stringify(newWidths));
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
      localStorage.removeItem('personColumnWidths');
      localStorage.removeItem('personVisibleColumns');
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

  const genderFilters = [
    { text: '남성', value: 'M' },
    { text: '여성', value: 'F' },
  ];

  // 성별 표시
  const getGenderLabel = (gender?: string) => {
    return getCodeLabel(CODE_KEYS.GENDER, gender);
  };

  // 직업 표시
  const getJobLabel = (jobCode?: string) => {
    return getCodeLabel(CODE_KEYS.JOB, jobCode);
  };

  // 테이블 컬럼 정의
  const allColumns: ColumnsType<PersonFull> = [
    {
      title: '대상자ID',
      dataIndex: 'personId',
      key: 'personId',
      width: columnWidths.personId,
      sorter: (a, b) => (a.personId || '').localeCompare(b.personId || ''),
      onHeaderCell: () => ({
        width: columnWidths.personId,
        onResize: handleResize('personId'),
      }),
    },
    {
      title: '대상자번호',
      dataIndex: 'personNo',
      key: 'personNo',
      width: columnWidths.personNo,
      sorter: (a, b) => (a.personNo || '').localeCompare(b.personNo || ''),
      onHeaderCell: () => ({
        width: columnWidths.personNo,
        onResize: handleResize('personNo'),
      }),
    },
    {
      title: '대상자명',
      dataIndex: 'personNm',
      key: 'personNm',
      width: columnWidths.personNm,
      sorter: (a, b) => (a.personNm || '').localeCompare(b.personNm || ''),
      onHeaderCell: () => ({
        width: columnWidths.personNm,
        onResize: handleResize('personNm'),
      }),
    },
    {
      title: '성별',
      dataIndex: 'gender',
      key: 'gender',
      width: columnWidths.gender,
      align: 'center',
      sorter: (a, b) => (a.gender || '').localeCompare(b.gender || ''),
      filters: genderFilters,
      onFilter: (value, record) => record.gender === value,
      onHeaderCell: () => ({
        width: columnWidths.gender,
        onResize: handleResize('gender'),
      }),
      render: (gender) => getGenderLabel(gender),
    },
    {
      title: '생년월일',
      dataIndex: 'birthDt',
      key: 'birthDt',
      width: columnWidths.birthDt,
      sorter: (a, b) => (a.birthDt || '').localeCompare(b.birthDt || ''),
      onHeaderCell: () => ({
        width: columnWidths.birthDt,
        onResize: handleResize('birthDt'),
      }),
      render: (text) => (text ? dayjs(text).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '휴대폰',
      dataIndex: 'mobileNo',
      key: 'mobileNo',
      width: columnWidths.mobileNo,
      onHeaderCell: () => ({
        width: columnWidths.mobileNo,
        onResize: handleResize('mobileNo'),
      }),
      render: (text) => text || '-',
    },
    {
      title: '직업',
      dataIndex: 'jobCode',
      key: 'jobNm',
      width: columnWidths.jobNm,
      onHeaderCell: () => ({
        width: columnWidths.jobNm,
        onResize: handleResize('jobNm'),
      }),
      render: (_, record) => record.jobNm || getJobLabel(record.jobCode),
    },
    {
      title: '관리그룹',
      dataIndex: 'personGrpNm',
      key: 'personGrpNm',
      width: columnWidths.personGrpNm,
      sorter: (a, b) => (a.personGrpNm || '').localeCompare(b.personGrpNm || ''),
      onHeaderCell: () => ({
        width: columnWidths.personGrpNm,
        onResize: handleResize('personGrpNm'),
      }),
      render: (text, record) => text || record.personGrp || '-',
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
            icon={<EyeOutlined />}
            onClick={() => handleDetailView(record)}
            title="상세보기"
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
  const rowSelection: TableRowSelection<PersonFull> = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      setSelectedRows(rows);
    },
  };

  // 모달 탭 아이템
  const modalTabItems = [
    {
      key: 'basic',
      label: '기본정보',
      children: (
        <>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="원청사ID"
                name="companyId"
                rules={[{ required: true, message: '원청사ID를 입력하세요.' }]}
              >
                <Input placeholder="원청사ID" disabled={!!userCompanyId} maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="대상자번호"
                name="personNo"
                rules={[
                  { required: true, message: '대상자번호를 입력하세요.' },
                  { max: 50, message: '최대 50자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="원청사별 대상자번호" maxLength={50} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="대상자명"
                name="personNm"
                rules={[
                  { required: true, message: '대상자명을 입력하세요.' },
                  { max: 100, message: '최대 100자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="대상자명" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="영문명"
                name="personNmEng"
                rules={[{ max: 200, message: '최대 200자까지 입력 가능합니다.' }]}
              >
                <Input placeholder="영문명 (선택)" maxLength={200} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="성별" name="gender">
                <Select placeholder="성별 선택" allowClear>
                  {genderOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="생년월일" name="birthDt">
                <DatePicker placeholder="생년월일" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="직업" name="jobCode">
                <Select placeholder="직업 선택" allowClear>
                  {jobOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="휴대폰번호"
                name="mobileNo"
                rules={[{ max: 20, message: '최대 20자까지 입력 가능합니다.' }]}
              >
                <Input placeholder="010-0000-0000" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="전화번호"
                name="telNo"
                rules={[{ max: 20, message: '최대 20자까지 입력 가능합니다.' }]}
              >
                <Input placeholder="02-000-0000" maxLength={20} />
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
              <Form.Item label="연봉" name="annualIncome">
                <InputNumber
                  placeholder="연봉 (원)"
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/,/g, ''))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="주소"
            name="address"
            rules={[{ max: 500, message: '최대 500자까지 입력 가능합니다.' }]}
          >
            <Input placeholder="주소" maxLength={500} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="관리그룹" name="personGrp">
                <Input placeholder="관리그룹 선택" readOnly />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label=" ">
                <Button onClick={() => setPersonGroupModalOpen(true)} block>
                  선택
                </Button>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="사용여부" name="useYn" initialValue="Y">
                <Select>
                  <Option value="Y">사용</Option>
                  <Option value="N">미사용</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'detail',
      label: '상세정보',
      children: (
        <>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="결혼여부" name="marriageYn">
                <Select placeholder="결혼여부" allowClear>
                  {YES_NO_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="자녀수" name="childrenCnt">
                <InputNumber placeholder="자녀수" style={{ width: '100%' }} min={0} max={99} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="학력" name="educationCode">
                <Select placeholder="학력 선택" allowClear>
                  {educationOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="주거형태" name="homeTypeCode">
                <Select placeholder="주거형태" allowClear>
                  {homeTypeOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="자동차보유" name="carYn">
                <Select placeholder="자동차보유" allowClear>
                  {YES_NO_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="신용카드 보유수" name="creditCardCnt">
                <InputNumber placeholder="신용카드수" style={{ width: '100%' }} min={0} max={999} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="자산금액" name="assetAmt">
                <InputNumber
                  placeholder="자산금액 (원)"
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/,/g, ''))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="부채금액" name="debtAmt">
                <InputNumber
                  placeholder="부채금액 (원)"
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/,/g, ''))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="비고"
            name="notes"
            rules={[{ max: 2000, message: '최대 2000자까지 입력 가능합니다.' }]}
          >
            <TextArea rows={4} placeholder="비고 (선택)" maxLength={2000} showCount />
          </Form.Item>
        </>
      ),
    },
  ];

  return (
    <div className="person-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          대상자등록
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>신용평가 대상자를 등록하고 관리합니다.</Text>
      </div>

      {/* 검색 영역 */}
      <Card className="search-card" size="small">
        <Form form={searchForm} layout="inline">
          <Form.Item label="대상자ID">
            <Space.Compact>
              <Form.Item name="personIdFrom" noStyle>
                <Input placeholder="FROM" style={{ width: 110 }} />
              </Form.Item>
              <Input
                style={{ width: 30, borderLeft: 0, borderRight: 0, pointerEvents: 'none', textAlign: 'center' }}
                placeholder="~"
                disabled
              />
              <Form.Item name="personIdTo" noStyle>
                <Input placeholder="TO" style={{ width: 110 }} />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
          <Form.Item name="personNm" label="대상자명">
            <Input placeholder="대상자명" style={{ width: 150 }} />
          </Form.Item>
          {!userCompanyId && (
            <Form.Item name="companyId" label="원청사">
              <Input placeholder="원청사ID" style={{ width: 130 }} />
            </Form.Item>
          )}
          <Form.Item name="personGrp" label="관리그룹">
            <Input placeholder="관리그룹" style={{ width: 130 }} />
          </Form.Item>
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
            {canWrite && (
              <Button
                icon={<TeamOutlined />}
                disabled={selectedRowKeys.length === 0}
                onClick={() => setBatchGrpModalOpen(true)}
              >
                관리그룹선택 지정 ({selectedRowKeys.length})
              </Button>
            )}
            {canWrite && (
              <Button
                type="primary"
                icon={<TeamOutlined />}
                disabled={total === 0}
                onClick={() => setBatchGrpByCriteriaModalOpen(true)}
              >
                관리그룹조회 지정 ({total})
              </Button>
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
          rowKey="personId"
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
        title={modalMode === 'create' ? '대상자 등록' : '대상자 수정'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={loading}
        width={900}
        okText="저장"
        cancelText="취소"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Tabs items={modalTabItems} defaultActiveKey="basic" />
        </Form>
      </Modal>

      {/* 관리그룹 선택 모달 */}
      <PersonGroupSelectModal
        open={personGroupModalOpen}
        onCancel={() => setPersonGroupModalOpen(false)}
        onSelect={handlePersonGroupSelect}
        companyId={userCompanyId || form.getFieldValue('companyId')}
      />

      {/* 관리그룹 일괄지정 모달 */}
      <PersonGroupSelectModal
        open={batchGrpModalOpen}
        onCancel={() => setBatchGrpModalOpen(false)}
        onSelect={handleBatchUpdateGrp}
        companyId={userCompanyId || undefined}
      />

      {/* 관리그룹 조회지정 모달 */}
      <PersonGroupSelectModal
        open={batchGrpByCriteriaModalOpen}
        onCancel={() => setBatchGrpByCriteriaModalOpen(false)}
        onSelect={handleBatchUpdateGrpByCriteria}
        companyId={userCompanyId || undefined}
      />

      {/* 상세 보기 모달 */}
      <Modal
        title={null}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={900}
        destroyOnClose
        centered
        style={{ top: 20 }}
      >
        <div style={{ padding: '0px' }}>
          <PersonDetailData personId={detailPersonId} />
        </div>
      </Modal>
    </div>
  );
};

export default PersonPage;
