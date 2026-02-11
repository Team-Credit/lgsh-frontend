/**
 * 공통코드관리 페이지
 * CODE001 - 대분류/소분류 코드 관리
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
  InputNumber,
  Tooltip,
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
  LockOutlined,
  SettingOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table/interface';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { MajorCode, MinorCode, MajorCodeRequest, MinorCodeRequest } from '@/types';
import { codeService } from '@/services/codeService';
import { useExcelExport } from '@/contexts';
import type { ExcelColumn } from '@/utils/excelExport';
import { useMenuPermission } from '@/hooks';
import './CommonCodePage.css';
import 'react-resizable/css/styles.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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

const CommonCodePage: React.FC = () => {
  const [majorForm] = Form.useForm();
  const [minorForm] = Form.useForm();
  const [majorSearchForm] = Form.useForm();
  const [minorSearchForm] = Form.useForm();

  // 메뉴 권한
  const { canWrite: permWrite, canDelete: permDelete, canExport: permExport } = useMenuPermission('M0801');

  // 대분류 상태
  const [majorLoading, setMajorLoading] = useState(false);
  const [majorList, setMajorList] = useState<MajorCode[]>([]);
  const [majorTotal, setMajorTotal] = useState(0);
  const [selectedMajorCode, setSelectedMajorCode] = useState<string | null>(null);
  const [majorModalOpen, setMajorModalOpen] = useState(false);
  const [majorModalMode, setMajorModalMode] = useState<'create' | 'edit'>('create');
  const [currentMajor, setCurrentMajor] = useState<MajorCode | null>(null);

  // 대분류 페이징 상태
  const [majorCurrentPage, setMajorCurrentPage] = useState(1);
  const [majorPageSize, setMajorPageSize] = useState(20);

  // 소분류 상태
  const [minorLoading, setMinorLoading] = useState(false);
  const [minorList, setMinorList] = useState<MinorCode[]>([]);
  const [minorTotal, setMinorTotal] = useState(0);
  const [minorModalOpen, setMinorModalOpen] = useState(false);
  const [minorModalMode, setMinorModalMode] = useState<'create' | 'edit'>('create');
  const [currentMinor, setCurrentMinor] = useState<MinorCode | null>(null);

  // 소분류 페이징 상태
  const [minorCurrentPage, setMinorCurrentPage] = useState(1);
  const [minorPageSize, setMinorPageSize] = useState(20);

  // 컬럼 너비 (대분류)
  const defaultMajorColumnWidths: Record<string, number> = {
    majorCode: 160,
    majorCodeNm: 200,
    sysYn: 90,
    useYn: 90,
    childCnt: 90,
    sortOrder: 90,
    regDt: 140,
    action: 100,
  };

  // 컬럼 너비 (소분류)
  const defaultMinorColumnWidths: Record<string, number> = {
    minorCode: 110,
    minorCodeNm: 180,
    codeValue: 110,
    sysYn: 90,
    useYn: 90,
    sortOrder: 90,
    attr1: 100,
    regDt: 140,
    action: 100,
  };

  const getStoredColumnWidths = (key: string, defaults: Record<string, number>) => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return { ...defaults, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('컬럼 너비 불러오기 실패:', error);
    }
    return defaults;
  };

  const [majorColumnWidths, setMajorColumnWidths] = useState<Record<string, number>>(
    getStoredColumnWidths('codePageMajorColumnWidths', defaultMajorColumnWidths)
  );
  const [minorColumnWidths, setMinorColumnWidths] = useState<Record<string, number>>(
    getStoredColumnWidths('codePageMinorColumnWidths', defaultMinorColumnWidths)
  );

  // 컬럼 표시 설정 (대분류)
  const defaultMajorVisibleColumns: Record<string, boolean> = {
    majorCode: true,
    majorCodeNm: true,
    sysYn: true,
    useYn: true,
    childCnt: true,
    sortOrder: true,
    regDt: true,
  };

  // 컬럼 표시 설정 (소분류)
  const defaultMinorVisibleColumns: Record<string, boolean> = {
    minorCode: true,
    minorCodeNm: true,
    codeValue: true,
    sysYn: true,
    useYn: true,
    sortOrder: true,
    attr1: true,
    regDt: true,
  };

  const getStoredVisibleColumns = (key: string, defaults: Record<string, boolean>) => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return { ...defaults, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('컬럼 표시 설정 불러오기 실패:', error);
    }
    return defaults;
  };

  const [majorVisibleColumns, setMajorVisibleColumns] = useState<Record<string, boolean>>(
    getStoredVisibleColumns('codePageMajorVisibleColumns', defaultMajorVisibleColumns)
  );
  const [minorVisibleColumns, setMinorVisibleColumns] = useState<Record<string, boolean>>(
    getStoredVisibleColumns('codePageMinorVisibleColumns', defaultMinorVisibleColumns)
  );

  // 컬럼 레이블 (대분류)
  const majorColumnLabels: Record<string, string> = {
    majorCode: '코드',
    majorCodeNm: '코드명',
    sysYn: 'SYS',
    useYn: 'USE',
    childCnt: '하위',
    sortOrder: '순서',
    regDt: '등록일시',
  };

  // 컬럼 레이블 (소분류)
  const minorColumnLabels: Record<string, string> = {
    minorCode: '코드',
    minorCodeNm: '코드명',
    codeValue: '코드값',
    sysYn: 'SYS',
    useYn: 'USE',
    sortOrder: '순서',
    attr1: 'ATTR1',
    regDt: '등록일시',
  };

  // 컬럼 표시 토글 핸들러
  const handleMajorColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    setMajorVisibleColumns((prev) => {
      const newState = { ...prev, [columnKey]: visible };
      localStorage.setItem('codePageMajorVisibleColumns', JSON.stringify(newState));
      return newState;
    });
  };

  const handleMinorColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    setMinorVisibleColumns((prev) => {
      const newState = { ...prev, [columnKey]: visible };
      localStorage.setItem('codePageMinorVisibleColumns', JSON.stringify(newState));
      return newState;
    });
  };

  // 대분류 목록 조회
  const fetchMajorList = useCallback(async (page: number = majorCurrentPage, size: number = majorPageSize) => {
    setMajorLoading(true);
    try {
      const values = majorSearchForm.getFieldsValue();
      const response = await codeService.getMajorCodeList({
        majorCode: values.majorCode,
        majorCodeNm: values.majorCodeNm,
        useYn: values.useYn,
        page: page - 1,  // API는 0-based
        size: size,
      });
      setMajorList(response.content);
      setMajorTotal(response.totalCount);
    } catch (error) {
      message.error('대분류 코드 목록 조회에 실패했습니다.');
    } finally {
      setMajorLoading(false);
    }
  }, [majorSearchForm, majorCurrentPage, majorPageSize]);

  // 대분류 페이지 변경 핸들러
  const handleMajorPageChange = (page: number, size?: number) => {
    const newSize = size || majorPageSize;
    setMajorCurrentPage(page);
    setMajorPageSize(newSize);
    fetchMajorList(page, newSize);
  };

  // 소분류 목록 조회
  const fetchMinorList = useCallback(async (page: number = minorCurrentPage, size: number = minorPageSize) => {
    if (!selectedMajorCode) {
      setMinorList([]);
      setMinorTotal(0);
      return;
    }
    setMinorLoading(true);
    try {
      const values = minorSearchForm.getFieldsValue();
      const response = await codeService.getMinorCodeList({
        majorCode: selectedMajorCode,
        minorCode: values.minorCode,
        minorCodeNm: values.minorCodeNm,
        useYn: values.useYn,
        page: page - 1,  // API는 0-based
        size: size,
      });
      setMinorList(response.content);
      setMinorTotal(response.totalCount);
    } catch (error) {
      message.error('소분류 코드 목록 조회에 실패했습니다.');
    } finally {
      setMinorLoading(false);
    }
  }, [selectedMajorCode, minorSearchForm, minorCurrentPage, minorPageSize]);

  // 소분류 페이지 변경 핸들러
  const handleMinorPageChange = (page: number, size?: number) => {
    const newSize = size || minorPageSize;
    setMinorCurrentPage(page);
    setMinorPageSize(newSize);
    fetchMinorList(page, newSize);
  };

  // 초기 로딩
  useEffect(() => {
    fetchMajorList();
  }, []);

  // 대분류 선택 시 소분류 조회
  useEffect(() => {
    fetchMinorList(1, minorPageSize);  // 페이지 1로 조회
  }, [selectedMajorCode]);

  // 대분류 컬럼 너비 저장
  useEffect(() => {
    localStorage.setItem('codePageMajorColumnWidths', JSON.stringify(majorColumnWidths));
  }, [majorColumnWidths]);

  // 소분류 컬럼 너비 저장
  useEffect(() => {
    localStorage.setItem('codePageMinorColumnWidths', JSON.stringify(minorColumnWidths));
  }, [minorColumnWidths]);

  // 엑셀 내보내기 핸들러 등록
  const { registerExportHandler, unregisterExportHandler } = useExcelExport();

  // 대분류 엑셀 컬럼 정의
  const majorExcelColumns: ExcelColumn[] = useMemo(() => [
    { key: 'majorCode', title: '대분류코드', width: 15 },
    { key: 'majorCodeNm', title: '대분류명', width: 25 },
    { key: 'sysYn', title: '시스템여부', width: 12 },
    { key: 'useYn', title: '사용여부', width: 12 },
    { key: 'sortOrder', title: '정렬순서', width: 10 },
    { key: 'codeDesc', title: '설명', width: 40 },
  ], []);

  // 소분류 엑셀 컬럼 정의
  const minorExcelColumns: ExcelColumn[] = useMemo(() => [
    { key: 'majorCode', title: '대분류코드', width: 15 },
    { key: 'minorCode', title: '소분류코드', width: 15 },
    { key: 'minorCodeNm', title: '소분류명', width: 25 },
    { key: 'sysYn', title: '시스템여부', width: 12 },
    { key: 'useYn', title: '사용여부', width: 12 },
    { key: 'sortOrder', title: '정렬순서', width: 10 },
    { key: 'codeDesc', title: '설명', width: 40 },
  ], []);

  // 대분류 전체 데이터 조회 함수 (엑셀용)
  const fetchAllMajorDataForExcel = useCallback(async (): Promise<MajorCode[]> => {
    const values = majorSearchForm.getFieldsValue();
    const response = await codeService.getMajorCodeList({
      majorCode: values.majorCode,
      majorCodeNm: values.majorCodeNm,
      useYn: values.useYn,
      page: 0,
      size: 50000,
    });
    return response.content;
  }, [majorSearchForm]);

  // 소분류 전체 데이터 조회 함수 (엑셀용)
  const fetchAllMinorDataForExcel = useCallback(async (): Promise<MinorCode[]> => {
    if (!selectedMajorCode) return [];
    const values = minorSearchForm.getFieldsValue();
    const response = await codeService.getMinorCodeList({
      majorCode: selectedMajorCode,
      minorCode: values.minorCode,
      minorCodeNm: values.minorCodeNm,
      useYn: values.useYn,
      page: 0,
      size: 50000,
    });
    return response.content;
  }, [selectedMajorCode, minorSearchForm]);

  // 핸들러 등록/해제
  useEffect(() => {
    registerExportHandler('majorCode', {
      sheetName: '대분류코드',
      totalCount: majorTotal,
      fetchAllData: fetchAllMajorDataForExcel,
      columns: majorExcelColumns,
    });

    if (selectedMajorCode) {
      registerExportHandler('minorCode', {
        sheetName: '소분류코드',
        totalCount: minorTotal,
        fetchAllData: fetchAllMinorDataForExcel,
        columns: minorExcelColumns,
      });
    } else {
      unregisterExportHandler('minorCode');
    }

    return () => {
      unregisterExportHandler('majorCode');
      unregisterExportHandler('minorCode');
    };
  }, [
    registerExportHandler,
    unregisterExportHandler,
    majorTotal,
    minorTotal,
    selectedMajorCode,
    fetchAllMajorDataForExcel,
    fetchAllMinorDataForExcel,
    majorExcelColumns,
    minorExcelColumns,
  ]);

  // 대분류 행 클릭
  const handleMajorRowClick = (record: MajorCode) => {
    setSelectedMajorCode(record.majorCode);
    minorSearchForm.resetFields();
    setMinorCurrentPage(1);  // 소분류 페이지 리셋
  };

  // 대분류 등록 모달 열기
  const handleOpenMajorCreate = () => {
    setMajorModalMode('create');
    setCurrentMajor(null);
    majorForm.resetFields();
    majorForm.setFieldsValue({
      sysYn: 'N',
      useYn: 'Y',
      sortOrder: 0,
    });
    setMajorModalOpen(true);
  };

  // 대분류 수정 모달 열기
  const handleOpenMajorEdit = (record: MajorCode) => {
    setMajorModalMode('edit');
    setCurrentMajor(record);
    majorForm.setFieldsValue({
      majorCode: record.majorCode,
      majorCodeNm: record.majorCodeNm,
      majorCodeDesc: record.majorCodeDesc,
      sysYn: record.sysYn,
      useYn: record.useYn,
      sortOrder: record.sortOrder,
    });
    setMajorModalOpen(true);
  };

  // 대분류 저장
  const handleSaveMajor = async () => {
    try {
      const values = await majorForm.validateFields();
      const request: MajorCodeRequest = {
        majorCode: values.majorCode,
        majorCodeNm: values.majorCodeNm,
        majorCodeDesc: values.majorCodeDesc,
        sysYn: values.sysYn,
        useYn: values.useYn,
        sortOrder: values.sortOrder,
      };

      if (majorModalMode === 'create') {
        await codeService.createMajorCode(request);
        message.success('대분류 코드가 등록되었습니다.');
      } else {
        await codeService.updateMajorCode(values.majorCode, request);
        message.success('대분류 코드가 수정되었습니다.');
      }

      setMajorModalOpen(false);
      fetchMajorList();
    } catch (error: any) {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (!error.errorFields) {
        message.error('대분류 코드 저장에 실패했습니다.');
      }
    }
  };

  // 대분류 삭제
  const handleDeleteMajor = async (record: MajorCode) => {
    try {
      await codeService.deleteMajorCode(record.majorCode);
      message.success('대분류 코드가 삭제되었습니다.');
      if (selectedMajorCode === record.majorCode) {
        setSelectedMajorCode(null);
        setMinorList([]);
        setMinorTotal(0);
      }
      // 삭제된 항목만 목록에서 제거 (API 재조회 없이)
      setMajorList((prev) => prev.filter((item) => item.majorCode !== record.majorCode));
      setMajorTotal((prev) => prev - 1);
    } catch (error: any) {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('대분류 코드 삭제에 실패했습니다.');
      }
    }
  };

  // 소분류 등록 모달 열기
  const handleOpenMinorCreate = () => {
    if (!selectedMajorCode) {
      message.warning('대분류 코드를 먼저 선택하세요.');
      return;
    }
    setMinorModalMode('create');
    setCurrentMinor(null);
    minorForm.resetFields();
    minorForm.setFieldsValue({
      majorCode: selectedMajorCode,
      sysYn: 'N',
      useYn: 'Y',
      sortOrder: 0,
    });
    setMinorModalOpen(true);
  };

  // 소분류 수정 모달 열기
  const handleOpenMinorEdit = (record: MinorCode) => {
    setMinorModalMode('edit');
    setCurrentMinor(record);
    minorForm.setFieldsValue({
      majorCode: record.majorCode,
      minorCode: record.minorCode,
      minorCodeNm: record.minorCodeNm,
      minorCodeDesc: record.minorCodeDesc,
      codeValue: record.codeValue,
      sysYn: record.sysYn,
      useYn: record.useYn,
      sortOrder: record.sortOrder,
      attr1: record.attr1,
      attr2: record.attr2,
      attr3: record.attr3,
    });
    setMinorModalOpen(true);
  };

  // 소분류 저장
  const handleSaveMinor = async () => {
    try {
      const values = await minorForm.validateFields();
      const request: MinorCodeRequest = {
        majorCode: values.majorCode,
        minorCode: values.minorCode,
        minorCodeNm: values.minorCodeNm,
        minorCodeDesc: values.minorCodeDesc,
        codeValue: values.codeValue,
        sysYn: values.sysYn,
        useYn: values.useYn,
        sortOrder: values.sortOrder,
        attr1: values.attr1,
        attr2: values.attr2,
        attr3: values.attr3,
      };

      if (minorModalMode === 'create') {
        await codeService.createMinorCode(request);
        message.success('소분류 코드가 등록되었습니다.');
      } else {
        await codeService.updateMinorCode(values.majorCode, values.minorCode, request);
        message.success('소분류 코드가 수정되었습니다.');
      }

      setMinorModalOpen(false);
      fetchMinorList();
      fetchMajorList(); // childCnt 갱신
    } catch (error: any) {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (!error.errorFields) {
        message.error('소분류 코드 저장에 실패했습니다.');
      }
    }
  };

  // 소분류 삭제
  const handleDeleteMinor = async (record: MinorCode) => {
    try {
      await codeService.deleteMinorCode(record.majorCode, record.minorCode);
      message.success('소분류 코드가 삭제되었습니다.');
      // 삭제된 항목만 목록에서 제거 (API 재조회 없이)
      setMinorList((prev) =>
        prev.filter(
          (item) => !(item.majorCode === record.majorCode && item.minorCode === record.minorCode)
        )
      );
      setMinorTotal((prev) => prev - 1);
      // 대분류 childCnt만 갱신
      setMajorList((prev) =>
        prev.map((item) =>
          item.majorCode === record.majorCode
            ? { ...item, childCnt: (item.childCnt ?? 1) - 1 }
            : item
        )
      );
    } catch (error: any) {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('소분류 코드 삭제에 실패했습니다.');
      }
    }
  };

  // 컬럼 너비 리사이즈 핸들러
  const handleMajorResize =
    (key: string) =>
    (_: React.SyntheticEvent<Element>, { size }: ResizeCallbackData) => {
      setMajorColumnWidths((prev) => ({ ...prev, [key]: size.width }));
    };

  const handleMinorResize =
    (key: string) =>
    (_: React.SyntheticEvent<Element>, { size }: ResizeCallbackData) => {
      setMinorColumnWidths((prev) => ({ ...prev, [key]: size.width }));
    };

  // 컬럼 설정 초기화 (너비 + 표시)
  const handleResetMajorColumns = () => {
    setMajorColumnWidths(defaultMajorColumnWidths);
    setMajorVisibleColumns(defaultMajorVisibleColumns);
    localStorage.removeItem('codePageMajorColumnWidths');
    localStorage.removeItem('codePageMajorVisibleColumns');
    message.success('대분류 컬럼 설정이 초기화되었습니다.');
  };

  const handleResetMinorColumns = () => {
    setMinorColumnWidths(defaultMinorColumnWidths);
    setMinorVisibleColumns(defaultMinorVisibleColumns);
    localStorage.removeItem('codePageMinorColumnWidths');
    localStorage.removeItem('codePageMinorVisibleColumns');
    message.success('소분류 컬럼 설정이 초기화되었습니다.');
  };

  // 대분류 컬럼 설정 팝오버
  const majorColumnSettingsContent = (
    <div style={{ width: 150 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>표시할 컬럼 선택</div>
      <Divider style={{ margin: '8px 0' }} />
      {Object.entries(majorColumnLabels).map(([key, label]) => (
        <div key={key} style={{ marginBottom: 4 }}>
          <Checkbox
            checked={majorVisibleColumns[key] !== false}
            onChange={(e) => handleMajorColumnVisibilityChange(key, e.target.checked)}
          >
            {label}
          </Checkbox>
        </div>
      ))}
      <Divider style={{ margin: '8px 0' }} />
      <Button size="small" onClick={() => setMajorVisibleColumns(defaultMajorVisibleColumns)} block>
        전체 표시
      </Button>
    </div>
  );

  // 소분류 컬럼 설정 팝오버
  const minorColumnSettingsContent = (
    <div style={{ width: 150 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>표시할 컬럼 선택</div>
      <Divider style={{ margin: '8px 0' }} />
      {Object.entries(minorColumnLabels).map(([key, label]) => (
        <div key={key} style={{ marginBottom: 4 }}>
          <Checkbox
            checked={minorVisibleColumns[key] !== false}
            onChange={(e) => handleMinorColumnVisibilityChange(key, e.target.checked)}
          >
            {label}
          </Checkbox>
        </div>
      ))}
      <Divider style={{ margin: '8px 0' }} />
      <Button size="small" onClick={() => setMinorVisibleColumns(defaultMinorVisibleColumns)} block>
        전체 표시
      </Button>
    </div>
  );

  // 대분류 테이블 컬럼 (전체)
  const allMajorColumns: ColumnsType<MajorCode> = useMemo(
    () => [
      {
        title: '코드',
        dataIndex: 'majorCode',
        key: 'majorCode',
        width: majorColumnWidths.majorCode,
        sorter: (a, b) => (a.majorCode || '').localeCompare(b.majorCode || ''),
        onHeaderCell: () => ({
          width: majorColumnWidths.majorCode,
          onResize: handleMajorResize('majorCode'),
        }),
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: '코드명',
        dataIndex: 'majorCodeNm',
        key: 'majorCodeNm',
        width: majorColumnWidths.majorCodeNm,
        sorter: (a, b) => (a.majorCodeNm || '').localeCompare(b.majorCodeNm || ''),
        onHeaderCell: () => ({
          width: majorColumnWidths.majorCodeNm,
          onResize: handleMajorResize('majorCodeNm'),
        }),
        render: (text: string, record: MajorCode) => (
          <Tooltip title={record.majorCodeDesc}>
            <span>{text}</span>
          </Tooltip>
        ),
      },
      {
        title: 'SYS',
        dataIndex: 'sysYn',
        key: 'sysYn',
        width: majorColumnWidths.sysYn,
        align: 'center',
        filters: [
          { text: 'Y', value: 'Y' },
          { text: 'N', value: 'N' },
        ],
        onFilter: (value, record) => record.sysYn === value,
        onHeaderCell: () => ({
          width: majorColumnWidths.sysYn,
          onResize: handleMajorResize('sysYn'),
        }),
        render: (val: string) =>
          val === 'Y' ? (
            <Tag color="red">Y</Tag>
          ) : (
            <Tag color="default">N</Tag>
          ),
      },
      {
        title: 'USE',
        dataIndex: 'useYn',
        key: 'useYn',
        width: majorColumnWidths.useYn,
        align: 'center',
        filters: [
          { text: 'Y', value: 'Y' },
          { text: 'N', value: 'N' },
        ],
        onFilter: (value, record) => record.useYn === value,
        onHeaderCell: () => ({
          width: majorColumnWidths.useYn,
          onResize: handleMajorResize('useYn'),
        }),
        render: (val: string) =>
          val === 'Y' ? (
            <Tag color="green">Y</Tag>
          ) : (
            <Tag color="default">N</Tag>
          ),
      },
      {
        title: '하위',
        dataIndex: 'childCnt',
        key: 'childCnt',
        width: majorColumnWidths.childCnt,
        align: 'center',
        sorter: (a, b) => (a.childCnt ?? 0) - (b.childCnt ?? 0),
        onHeaderCell: () => ({
          width: majorColumnWidths.childCnt,
          onResize: handleMajorResize('childCnt'),
        }),
        render: (val: number) => <Tag color="blue">{val ?? 0}</Tag>,
      },
      {
        title: '순서',
        dataIndex: 'sortOrder',
        key: 'sortOrder',
        width: majorColumnWidths.sortOrder,
        align: 'center',
        sorter: (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        onHeaderCell: () => ({
          width: majorColumnWidths.sortOrder,
          onResize: handleMajorResize('sortOrder'),
        }),
      },
      {
        title: '등록일시',
        dataIndex: 'regDt',
        key: 'regDt',
        width: majorColumnWidths.regDt,
        sorter: (a, b) => new Date(a.regDt || 0).getTime() - new Date(b.regDt || 0).getTime(),
        onHeaderCell: () => ({
          width: majorColumnWidths.regDt,
          onResize: handleMajorResize('regDt'),
        }),
        render: (val: string) => val?.substring(0, 16).replace('T', ' '),
      },
      {
        title: '관리',
        key: 'action',
        width: majorColumnWidths.action,
        fixed: 'right',
        onHeaderCell: () => ({
          width: majorColumnWidths.action,
          onResize: handleMajorResize('action'),
        }),
        render: (_: any, record: MajorCode) => {
          const isSys = record.sysYn === 'Y';
          const hasChildren = (record.childCnt ?? 0) > 0;
          const canDelete = !isSys && !hasChildren;

          return (
            <Space size="small">
              {permWrite && (
                <Tooltip title="수정">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenMajorEdit(record);
                    }}
                  />
                </Tooltip>
              )}
              {permDelete && (
                <Popconfirm
                  title="삭제 확인"
                  description={
                    isSys
                      ? '시스템 코드는 삭제할 수 없습니다.'
                      : hasChildren
                      ? '하위 코드가 존재하여 삭제할 수 없습니다.'
                      : '정말 삭제하시겠습니까?'
                  }
                  onConfirm={() => canDelete && handleDeleteMajor(record)}
                  okButtonProps={{ disabled: !canDelete }}
                  okText="삭제"
                  cancelText="취소"
                >
                  <Tooltip title={isSys ? '시스템코드 삭제불가' : hasChildren ? '하위코드 존재' : '삭제'}>
                    <Button
                      type="text"
                      size="small"
                      danger
                      disabled={!canDelete}
                      icon={isSys ? <LockOutlined /> : <DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Tooltip>
                </Popconfirm>
              )}
            </Space>
          );
        },
      },
    ],
    [majorColumnWidths]
  );

  // 대분류 테이블 컬럼 (표시 필터링)
  const majorColumns = useMemo(() => {
    return allMajorColumns.filter((col) => {
      const key = col.key as string;
      if (key === 'action') return true;
      return majorVisibleColumns[key] !== false;
    });
  }, [allMajorColumns, majorVisibleColumns]);

  // 소분류 테이블 컬럼 (전체)
  const allMinorColumns: ColumnsType<MinorCode> = useMemo(
    () => [
      {
        title: '코드',
        dataIndex: 'minorCode',
        key: 'minorCode',
        width: minorColumnWidths.minorCode,
        sorter: (a, b) => (a.minorCode || '').localeCompare(b.minorCode || ''),
        onHeaderCell: () => ({
          width: minorColumnWidths.minorCode,
          onResize: handleMinorResize('minorCode'),
        }),
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: '코드명',
        dataIndex: 'minorCodeNm',
        key: 'minorCodeNm',
        width: minorColumnWidths.minorCodeNm,
        sorter: (a, b) => (a.minorCodeNm || '').localeCompare(b.minorCodeNm || ''),
        onHeaderCell: () => ({
          width: minorColumnWidths.minorCodeNm,
          onResize: handleMinorResize('minorCodeNm'),
        }),
        render: (text: string, record: MinorCode) => (
          <Tooltip title={record.minorCodeDesc}>
            <span>{text}</span>
          </Tooltip>
        ),
      },
      {
        title: '코드값',
        dataIndex: 'codeValue',
        key: 'codeValue',
        width: minorColumnWidths.codeValue,
        sorter: (a, b) => (a.codeValue || '').localeCompare(b.codeValue || ''),
        onHeaderCell: () => ({
          width: minorColumnWidths.codeValue,
          onResize: handleMinorResize('codeValue'),
        }),
      },
      {
        title: 'SYS',
        dataIndex: 'sysYn',
        key: 'sysYn',
        width: minorColumnWidths.sysYn,
        align: 'center',
        filters: [
          { text: 'Y', value: 'Y' },
          { text: 'N', value: 'N' },
        ],
        onFilter: (value, record) => record.sysYn === value,
        onHeaderCell: () => ({
          width: minorColumnWidths.sysYn,
          onResize: handleMinorResize('sysYn'),
        }),
        render: (val: string) =>
          val === 'Y' ? (
            <Tag color="red">Y</Tag>
          ) : (
            <Tag color="default">N</Tag>
          ),
      },
      {
        title: 'USE',
        dataIndex: 'useYn',
        key: 'useYn',
        width: minorColumnWidths.useYn,
        align: 'center',
        filters: [
          { text: 'Y', value: 'Y' },
          { text: 'N', value: 'N' },
        ],
        onFilter: (value, record) => record.useYn === value,
        onHeaderCell: () => ({
          width: minorColumnWidths.useYn,
          onResize: handleMinorResize('useYn'),
        }),
        render: (val: string) =>
          val === 'Y' ? (
            <Tag color="green">Y</Tag>
          ) : (
            <Tag color="default">N</Tag>
          ),
      },
      {
        title: '순서',
        dataIndex: 'sortOrder',
        key: 'sortOrder',
        width: minorColumnWidths.sortOrder,
        align: 'center',
        sorter: (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        onHeaderCell: () => ({
          width: minorColumnWidths.sortOrder,
          onResize: handleMinorResize('sortOrder'),
        }),
      },
      {
        title: 'ATTR1',
        dataIndex: 'attr1',
        key: 'attr1',
        width: minorColumnWidths.attr1,
        sorter: (a, b) => (a.attr1 || '').localeCompare(b.attr1 || ''),
        onHeaderCell: () => ({
          width: minorColumnWidths.attr1,
          onResize: handleMinorResize('attr1'),
        }),
        ellipsis: true,
      },
      {
        title: '등록일시',
        dataIndex: 'regDt',
        key: 'regDt',
        width: minorColumnWidths.regDt,
        sorter: (a, b) => new Date(a.regDt || 0).getTime() - new Date(b.regDt || 0).getTime(),
        onHeaderCell: () => ({
          width: minorColumnWidths.regDt,
          onResize: handleMinorResize('regDt'),
        }),
        render: (val: string) => val?.substring(0, 16).replace('T', ' '),
      },
      {
        title: '관리',
        key: 'action',
        width: minorColumnWidths.action,
        fixed: 'right',
        onHeaderCell: () => ({
          width: minorColumnWidths.action,
          onResize: handleMinorResize('action'),
        }),
        render: (_: any, record: MinorCode) => {
          const isSys = record.sysYn === 'Y';

          return (
            <Space size="small">
              {permWrite && (
                <Tooltip title="수정">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleOpenMinorEdit(record)}
                  />
                </Tooltip>
              )}
              {permDelete && (
                <Popconfirm
                  title="삭제 확인"
                  description={
                    isSys
                      ? '시스템 코드는 삭제할 수 없습니다.'
                      : '정말 삭제하시겠습니까?'
                  }
                  onConfirm={() => !isSys && handleDeleteMinor(record)}
                  okButtonProps={{ disabled: isSys }}
                  okText="삭제"
                  cancelText="취소"
                >
                  <Tooltip title={isSys ? '시스템코드 삭제불가' : '삭제'}>
                    <Button
                      type="text"
                      size="small"
                      danger
                      disabled={isSys}
                      icon={isSys ? <LockOutlined /> : <DeleteOutlined />}
                    />
                  </Tooltip>
                </Popconfirm>
              )}
            </Space>
          );
        },
      },
    ],
    [minorColumnWidths]
  );

  // 소분류 테이블 컬럼 (표시 필터링)
  const minorColumns = useMemo(() => {
    return allMinorColumns.filter((col) => {
      const key = col.key as string;
      if (key === 'action') return true;
      return minorVisibleColumns[key] !== false;
    });
  }, [allMinorColumns, minorVisibleColumns]);

  // 선택된 대분류 정보
  const selectedMajor = useMemo(
    () => majorList.find((m) => m.majorCode === selectedMajorCode),
    [majorList, selectedMajorCode]
  );

  return (
    <div className="common-code-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <TagsOutlined style={{ marginRight: 8 }} />
          공통코드관리
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>대분류 / 소분류 코드를 관리합니다.</Text>
      </div>

      {/* 리사이저블 패널 그룹 */}
      <PanelGroup direction="horizontal" className="code-panel-group">
        {/* 대분류 패널 */}
        <Panel defaultSize={50} minSize={30} className="code-panel">
          <Card
            title={
              <Space>
                <span>대분류 코드</span>
                <Tag color="blue">{majorTotal}건</Tag>
              </Space>
            }
            size="small"
            extra={
              <Space>
                <Popover
                  content={majorColumnSettingsContent}
                  title={null}
                  trigger="click"
                  placement="bottomRight"
                >
                  <Button size="small" icon={<SettingOutlined />}>
                    컬럼 설정
                  </Button>
                </Popover>
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={handleResetMajorColumns}
                >
                  초기화
                </Button>
                {permWrite && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleOpenMajorCreate}
                  >
                    등록
                  </Button>
                )}
              </Space>
            }
            className="code-card"
          >
            {/* 대분류 검색 */}
            <Form
              form={majorSearchForm}
              layout="inline"
              className="search-form"
              onFinish={() => { setMajorCurrentPage(1); fetchMajorList(1, majorPageSize); }}
            >
              <Form.Item name="majorCode" label="코드">
                <Input placeholder="코드" allowClear style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="majorCodeNm" label="코드명">
                <Input placeholder="코드명" allowClear style={{ width: 120 }} />
              </Form.Item>
              <Form.Item name="useYn" label="사용">
                <Select placeholder="전체" allowClear style={{ width: 80 }}>
                  <Option value="Y">Y</Option>
                  <Option value="N">N</Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SearchOutlined />}
                    loading={majorLoading}
                  >
                    조회
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      majorSearchForm.resetFields();
                      setMajorCurrentPage(1);
                      fetchMajorList(1, majorPageSize);
                    }}
                  >
                    초기화
                  </Button>
                </Space>
              </Form.Item>
            </Form>

            {/* 대분류 테이블 */}
            <Table
              columns={majorColumns}
              dataSource={majorList}
              rowKey="majorCode"
              loading={majorLoading}
              size="small"
              scroll={{ x: 'max-content', y: 'calc(100vh - 400px)' }}
              pagination={{
                current: majorCurrentPage,
                pageSize: majorPageSize,
                total: majorTotal,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) => `${range[0]}-${range[1]} / 총 ${total}건`,
                onChange: handleMajorPageChange,
                onShowSizeChange: handleMajorPageChange,
              }}
              components={{
                header: {
                  cell: ResizableTitle,
                },
              }}
              onRow={(record) => ({
                onClick: () => handleMajorRowClick(record),
                onDoubleClick: () => handleOpenMajorEdit(record),
                className:
                  selectedMajorCode === record.majorCode ? 'ant-table-row-selected' : '',
              })}
            />
          </Card>
        </Panel>

        {/* 리사이즈 핸들 */}
        <PanelResizeHandle className="resize-handle" />

        {/* 소분류 패널 */}
        <Panel defaultSize={50} minSize={30} className="code-panel">
          <Card
            title={
              <Space>
                <span>소분류 코드</span>
                {selectedMajor && (
                  <Tag color="processing">{selectedMajor.majorCode}</Tag>
                )}
                <Tag color="blue">{minorTotal}건</Tag>
              </Space>
            }
            size="small"
            extra={
              <Space>
                <Popover
                  content={minorColumnSettingsContent}
                  title={null}
                  trigger="click"
                  placement="bottomRight"
                >
                  <Button size="small" icon={<SettingOutlined />}>
                    컬럼 설정
                  </Button>
                </Popover>
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={handleResetMinorColumns}
                >
                  초기화
                </Button>
                {permWrite && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleOpenMinorCreate}
                    disabled={!selectedMajorCode}
                  >
                    등록
                  </Button>
                )}
              </Space>
            }
            className="code-card"
          >
            {/* 소분류 검색 */}
            <Form
              form={minorSearchForm}
              layout="inline"
              className="search-form"
              onFinish={() => { setMinorCurrentPage(1); fetchMinorList(1, minorPageSize); }}
            >
              <Form.Item name="minorCode" label="코드">
                <Input placeholder="코드" allowClear style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="minorCodeNm" label="코드명">
                <Input placeholder="코드명" allowClear style={{ width: 120 }} />
              </Form.Item>
              <Form.Item name="useYn" label="사용">
                <Select placeholder="전체" allowClear style={{ width: 80 }}>
                  <Option value="Y">Y</Option>
                  <Option value="N">N</Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SearchOutlined />}
                    loading={minorLoading}
                    disabled={!selectedMajorCode}
                  >
                    조회
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      minorSearchForm.resetFields();
                      setMinorCurrentPage(1);
                      fetchMinorList(1, minorPageSize);
                    }}
                    disabled={!selectedMajorCode}
                  >
                    초기화
                  </Button>
                </Space>
              </Form.Item>
            </Form>

            {/* 소분류 테이블 */}
            <Table
              columns={minorColumns}
              dataSource={minorList}
              rowKey={(record) => `${record.majorCode}-${record.minorCode}`}
              loading={minorLoading}
              size="small"
              scroll={{ x: 'max-content', y: 'calc(100vh - 400px)' }}
              pagination={{
                current: minorCurrentPage,
                pageSize: minorPageSize,
                total: minorTotal,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) => `${range[0]}-${range[1]} / 총 ${total}건`,
                onChange: handleMinorPageChange,
                onShowSizeChange: handleMinorPageChange,
              }}
              components={{
                header: {
                  cell: ResizableTitle,
                },
              }}
              onRow={(record) => ({
                onDoubleClick: () => handleOpenMinorEdit(record),
              })}
              locale={{
                emptyText: selectedMajorCode
                  ? '소분류 코드가 없습니다.'
                  : '대분류 코드를 선택하세요.',
              }}
            />
          </Card>
        </Panel>
      </PanelGroup>

      {/* 대분류 등록/수정 모달 */}
      <Modal
        title={majorModalMode === 'create' ? '대분류 코드 등록' : '대분류 코드 수정'}
        open={majorModalOpen}
        onOk={handleSaveMajor}
        onCancel={() => setMajorModalOpen(false)}
        width={500}
        okText="저장"
        cancelText="취소"
      >
        <Form form={majorForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="majorCode"
                label="대분류 코드"
                rules={[{ required: true, message: '대분류 코드를 입력하세요' }]}
              >
                <Input
                  placeholder="코드 입력"
                  disabled={majorModalMode === 'edit'}
                  style={{ textTransform: 'uppercase' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="majorCodeNm"
                label="대분류 코드명"
                rules={[{ required: true, message: '대분류 코드명을 입력하세요' }]}
              >
                <Input placeholder="코드명 입력" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="majorCodeDesc" label="설명">
            <TextArea rows={2} placeholder="코드 설명" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="sysYn" label="시스템코드">
                <Select
                  disabled={
                    majorModalMode === 'edit' && currentMajor?.sysYn === 'Y'
                  }
                >
                  <Option value="N">N</Option>
                  <Option value="Y">Y</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="useYn" label="사용여부">
                <Select
                  disabled={
                    majorModalMode === 'edit' && currentMajor?.sysYn === 'Y'
                  }
                >
                  <Option value="Y">Y</Option>
                  <Option value="N">N</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sortOrder" label="정렬순서">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 소분류 등록/수정 모달 */}
      <Modal
        title={minorModalMode === 'create' ? '소분류 코드 등록' : '소분류 코드 수정'}
        open={minorModalOpen}
        onOk={handleSaveMinor}
        onCancel={() => setMinorModalOpen(false)}
        width={600}
        okText="저장"
        cancelText="취소"
      >
        <Form form={minorForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="majorCode"
                label="대분류 코드"
                rules={[{ required: true }]}
              >
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="minorCode"
                label="소분류 코드"
                rules={[{ required: true, message: '소분류 코드를 입력하세요' }]}
              >
                <Input
                  placeholder="코드 입력"
                  disabled={minorModalMode === 'edit'}
                  style={{ textTransform: 'uppercase' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="minorCodeNm"
                label="소분류 코드명"
                rules={[{ required: true, message: '소분류 코드명을 입력하세요' }]}
              >
                <Input placeholder="코드명 입력" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="minorCodeDesc" label="설명">
            <TextArea rows={2} placeholder="코드 설명" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="codeValue" label="코드값">
                <Input placeholder="시스템 사용 코드값" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sysYn" label="시스템코드">
                <Select
                  disabled={
                    minorModalMode === 'edit' && currentMinor?.sysYn === 'Y'
                  }
                >
                  <Option value="N">N</Option>
                  <Option value="Y">Y</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="useYn" label="사용여부">
                <Select
                  disabled={
                    minorModalMode === 'edit' && currentMinor?.sysYn === 'Y'
                  }
                >
                  <Option value="Y">Y</Option>
                  <Option value="N">N</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="sortOrder" label="정렬순서">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="attr1" label="확장속성1">
                <Input placeholder="확장속성1" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="attr2" label="확장속성2">
                <Input placeholder="확장속성2" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="attr3" label="확장속성3">
                <Input placeholder="확장속성3" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default CommonCodePage;
