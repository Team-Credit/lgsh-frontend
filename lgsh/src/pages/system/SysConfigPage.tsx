/**
 * 환경설정 관리 페이지
 * CONFIG001 - 시스템 환경설정 관리
 * 좌측: 대분류/소분류 코드, 우측: 환경설정값
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
  Tooltip,
  Popover,
  Checkbox,
  Divider,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  LockOutlined,
  SettingOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table/interface';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { MajorCode, MinorCode } from '@/types';
import type { SysConfig, SysConfigRequest } from '@/types/sysConfig';
import { codeService } from '@/services/codeService';
import { sysConfigService } from '@/services/sysConfigService';
import { useExcelExport } from '@/contexts';
import type { ExcelColumn } from '@/utils/excelExport';
import './SysConfigPage.css';
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

const SysConfigPage: React.FC = () => {
  const [majorSearchForm] = Form.useForm();
  const [minorSearchForm] = Form.useForm();
  const [configForm] = Form.useForm();

  // 대분류 상태
  const [majorLoading, setMajorLoading] = useState(false);
  const [majorList, setMajorList] = useState<MajorCode[]>([]);
  const [majorTotal, setMajorTotal] = useState(0);
  const [selectedMajorCode, setSelectedMajorCode] = useState<string | null>(null);
  const [majorCurrentPage, setMajorCurrentPage] = useState(1);
  const [majorPageSize, setMajorPageSize] = useState(20);

  // 소분류 상태
  const [minorLoading, setMinorLoading] = useState(false);
  const [minorList, setMinorList] = useState<MinorCode[]>([]);
  const [minorTotal, setMinorTotal] = useState(0);
  const [selectedMinorCode, setSelectedMinorCode] = useState<string | null>(null);
  const [minorCurrentPage, setMinorCurrentPage] = useState(1);
  const [minorPageSize, setMinorPageSize] = useState(20);

  // 환경설정값이 있는 코드만 조회 옵션
  const [onlyMajorWithConfig, setOnlyMajorWithConfig] = useState(true);
  const [majorCodesWithConfig, setMajorCodesWithConfig] = useState<Set<string>>(new Set());
  const [onlyWithConfig, setOnlyWithConfig] = useState(true);
  const [minorCodesWithConfig, setMinorCodesWithConfig] = useState<Set<string>>(new Set());

  // 환경설정 상태
  const [configLoading, setConfigLoading] = useState(false);
  const [configList, setConfigList] = useState<SysConfig[]>([]);
  const [configTotal, setConfigTotal] = useState(0);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configModalMode, setConfigModalMode] = useState<'create' | 'edit'>('create');
  const [currentConfig, setCurrentConfig] = useState<SysConfig | null>(null);
  const [configCurrentPage, setConfigCurrentPage] = useState(1);
  const [configPageSize, setConfigPageSize] = useState(20);

  // 컬럼 너비 (대분류)
  const defaultMajorColumnWidths: Record<string, number> = {
    majorCode: 100,
    majorCodeNm: 180,
    useYn: 60,
    action: 50,
  };

  // 컬럼 너비 (소분류)
  const defaultMinorColumnWidths: Record<string, number> = {
    minorCode: 100,
    minorCodeNm: 180,
    configCnt: 60,
    useYn: 60,
    action: 50,
  };

  // 컬럼 너비 (환경설정)
  const defaultConfigColumnWidths: Record<string, number> = {
    configKey: 180,
    configValue: 150,
    configDesc: 200,
    dataType: 80,
    editableYn: 60,
    useYn: 60,
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
    getStoredColumnWidths('sysConfigMajorColumnWidths', defaultMajorColumnWidths)
  );
  const [minorColumnWidths, setMinorColumnWidths] = useState<Record<string, number>>(
    getStoredColumnWidths('sysConfigMinorColumnWidths', defaultMinorColumnWidths)
  );
  const [configColumnWidths, setConfigColumnWidths] = useState<Record<string, number>>(
    getStoredColumnWidths('sysConfigColumnWidths', defaultConfigColumnWidths)
  );

  // 컬럼 표시 설정 (환경설정)
  const defaultConfigVisibleColumns: Record<string, boolean> = {
    configKey: true,
    configValue: true,
    configDesc: true,
    dataType: true,
    editableYn: true,
    useYn: true,
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

  const [configVisibleColumns, setConfigVisibleColumns] = useState<Record<string, boolean>>(
    getStoredVisibleColumns('sysConfigVisibleColumns', defaultConfigVisibleColumns)
  );

  // 컬럼 레이블 (환경설정)
  const configColumnLabels: Record<string, string> = {
    configKey: '설정키',
    configValue: '설정값',
    configDesc: '설명',
    dataType: '타입',
    editableYn: '수정',
    useYn: 'USE',
    regDt: '등록일시',
  };

  // 컬럼 표시 토글 핸들러
  const handleConfigColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    setConfigVisibleColumns((prev) => {
      const newState = { ...prev, [columnKey]: visible };
      localStorage.setItem('sysConfigVisibleColumns', JSON.stringify(newState));
      return newState;
    });
  };

  // 환경설정값이 있는 메이저코드 목록 조회
  const fetchMajorCodesWithConfig = useCallback(async () => {
    try {
      const result = await sysConfigService.getMajorCodesWithConfig();
      const configSet = new Set(result.map((item) => item.majorCode));
      setMajorCodesWithConfig(configSet);
    } catch (error) {
      console.error('환경설정 메이저코드 조회 실패:', error);
    }
  }, []);

  // 환경설정값이 있는 마이너코드 목록 조회
  const fetchMinorCodesWithConfig = useCallback(async () => {
    try {
      const result = await sysConfigService.getMinorCodesWithConfig(selectedMajorCode || undefined);
      const configSet = new Set(result.map((item) => `${item.majorCode}:${item.minorCode}`));
      setMinorCodesWithConfig(configSet);
    } catch (error) {
      console.error('환경설정 마이너코드 조회 실패:', error);
    }
  }, [selectedMajorCode]);

  // 대분류 목록 조회
  const fetchMajorList = useCallback(async (page: number = majorCurrentPage, size: number = majorPageSize) => {
    setMajorLoading(true);
    try {
      const values = majorSearchForm.getFieldsValue();

      // 환경설정값이 있는 코드만 필터링 시 전체 조회 후 클라이언트 페이징
      const fetchPage = onlyMajorWithConfig ? 0 : page - 1;
      const fetchSize = onlyMajorWithConfig ? 10000 : size;

      const response = await codeService.getMajorCodeList({
        majorCode: values.majorCode,
        majorCodeNm: values.majorCodeNm,
        useYn: values.useYn,
        page: fetchPage,
        size: fetchSize,
      });

      let filteredContent = response.content;
      let totalCount = response.totalCount;

      // 환경설정값이 있는 메이저코드만 필터링
      if (onlyMajorWithConfig) {
        filteredContent = response.content.filter((item) =>
          majorCodesWithConfig.has(item.majorCode)
        );
        totalCount = filteredContent.length;

        // 클라이언트 사이드 페이징 적용
        const startIdx = (page - 1) * size;
        const endIdx = startIdx + size;
        filteredContent = filteredContent.slice(startIdx, endIdx);
      }

      setMajorList(filteredContent);
      setMajorTotal(totalCount);
    } catch (error) {
      message.error('대분류 코드 목록 조회에 실패했습니다.');
    } finally {
      setMajorLoading(false);
    }
  }, [majorSearchForm, majorCurrentPage, majorPageSize, onlyMajorWithConfig, majorCodesWithConfig]);

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

      // 환경설정값이 있는 코드만 필터링 시 전체 조회 후 클라이언트 페이징
      const fetchPage = onlyWithConfig ? 0 : page - 1;
      const fetchSize = onlyWithConfig ? 10000 : size;

      const response = await codeService.getMinorCodeList({
        majorCode: selectedMajorCode,
        minorCode: values.minorCode,
        minorCodeNm: values.minorCodeNm,
        useYn: values.useYn,
        page: fetchPage,
        size: fetchSize,
      });

      let filteredContent = response.content;
      let totalCount = response.totalCount;

      // 환경설정값이 있는 마이너코드만 필터링
      if (onlyWithConfig) {
        filteredContent = response.content.filter((item) =>
          minorCodesWithConfig.has(`${item.majorCode}:${item.minorCode}`)
        );
        totalCount = filteredContent.length;

        // 클라이언트 사이드 페이징 적용
        const startIdx = (page - 1) * size;
        const endIdx = startIdx + size;
        filteredContent = filteredContent.slice(startIdx, endIdx);
      }

      setMinorList(filteredContent);
      setMinorTotal(totalCount);
    } catch (error) {
      message.error('소분류 코드 목록 조회에 실패했습니다.');
    } finally {
      setMinorLoading(false);
    }
  }, [selectedMajorCode, minorSearchForm, minorCurrentPage, minorPageSize, onlyWithConfig, minorCodesWithConfig]);

  // 소분류 페이지 변경 핸들러
  const handleMinorPageChange = (page: number, size?: number) => {
    const newSize = size || minorPageSize;
    setMinorCurrentPage(page);
    setMinorPageSize(newSize);
    fetchMinorList(page, newSize);
  };

  // 환경설정 목록 조회
  const fetchConfigList = useCallback(async (page: number = configCurrentPage, size: number = configPageSize) => {
    if (!selectedMajorCode || !selectedMinorCode) {
      setConfigList([]);
      setConfigTotal(0);
      return;
    }
    setConfigLoading(true);
    try {
      const response = await sysConfigService.getByMinorCode(
        selectedMajorCode,
        selectedMinorCode,
        { page: page - 1, size: size }
      );
      setConfigList(response.content);
      setConfigTotal(response.totalCount);
    } catch (error) {
      message.error('환경설정 목록 조회에 실패했습니다.');
    } finally {
      setConfigLoading(false);
    }
  }, [selectedMajorCode, selectedMinorCode, configCurrentPage, configPageSize]);

  // 환경설정 페이지 변경 핸들러
  const handleConfigPageChange = (page: number, size?: number) => {
    const newSize = size || configPageSize;
    setConfigCurrentPage(page);
    setConfigPageSize(newSize);
    fetchConfigList(page, newSize);
  };

  // 초기 로딩
  useEffect(() => {
    fetchMajorCodesWithConfig();
    fetchMajorList();
    fetchMinorCodesWithConfig();
  }, []);

  // 대분류 선택 시 소분류 조회
  useEffect(() => {
    setSelectedMinorCode(null);
    setConfigList([]);
    setConfigTotal(0);
    minorSearchForm.resetFields();
    setMinorCurrentPage(1);
    fetchMinorCodesWithConfig();
    fetchMinorList(1, minorPageSize);
  }, [selectedMajorCode]);

  // 소분류 목록 로드 후 첫 행 자동 선택 (선택 없거나 목록에 없으면)
  useEffect(() => {
    if (minorList.length > 0) {
      const currentExists = selectedMinorCode && minorList.some((m) => m.minorCode === selectedMinorCode);
      if (!currentExists) {
        setSelectedMinorCode(minorList[0].minorCode);
      }
    } else if (minorList.length === 0 && selectedMinorCode) {
      setSelectedMinorCode(null);
    }
  }, [minorList]);

  // 소분류 선택 시 환경설정 조회
  useEffect(() => {
    setConfigCurrentPage(1);
    fetchConfigList(1, configPageSize);
  }, [selectedMinorCode]);

  // 환경설정값이 있는 메이저코드만 조회 옵션 변경 시
  useEffect(() => {
    fetchMajorList(1, majorPageSize);
  }, [onlyMajorWithConfig, majorCodesWithConfig]);

  // 환경설정값이 있는 마이너코드만 조회 옵션 변경 시
  useEffect(() => {
    fetchMinorList(1, minorPageSize);
  }, [onlyWithConfig, minorCodesWithConfig]);

  // 컬럼 너비 저장
  useEffect(() => {
    localStorage.setItem('sysConfigMajorColumnWidths', JSON.stringify(majorColumnWidths));
  }, [majorColumnWidths]);

  useEffect(() => {
    localStorage.setItem('sysConfigMinorColumnWidths', JSON.stringify(minorColumnWidths));
  }, [minorColumnWidths]);

  useEffect(() => {
    localStorage.setItem('sysConfigColumnWidths', JSON.stringify(configColumnWidths));
  }, [configColumnWidths]);

  // 엑셀 내보내기 핸들러 등록
  const { registerExportHandler, unregisterExportHandler } = useExcelExport();

  // 환경설정 엑셀 컬럼 정의
  const configExcelColumns: ExcelColumn[] = useMemo(() => [
    { key: 'majorCode', title: '대분류코드', width: 15 },
    { key: 'minorCode', title: '소분류코드', width: 15 },
    { key: 'configKey', title: '설정키', width: 25 },
    { key: 'configValue', title: '설정값', width: 25 },
    { key: 'configDesc', title: '설명', width: 40 },
    { key: 'dataType', title: '데이터타입', width: 12 },
    { key: 'editableYn', title: '수정가능', width: 10 },
    { key: 'useYn', title: '사용여부', width: 10 },
  ], []);

  // 환경설정 전체 데이터 조회 함수 (엑셀용)
  const fetchAllConfigDataForExcel = useCallback(async (): Promise<SysConfig[]> => {
    if (!selectedMajorCode || !selectedMinorCode) return [];
    const response = await sysConfigService.getByMinorCode(
      selectedMajorCode,
      selectedMinorCode,
      { page: 0, size: 50000 }
    );
    return response.content;
  }, [selectedMajorCode, selectedMinorCode]);

  // 핸들러 등록/해제
  useEffect(() => {
    if (selectedMajorCode && selectedMinorCode) {
      registerExportHandler('sysConfig', {
        sheetName: '환경설정',
        totalCount: configTotal,
        fetchAllData: fetchAllConfigDataForExcel,
        columns: configExcelColumns,
      });
    } else {
      unregisterExportHandler('sysConfig');
    }

    return () => {
      unregisterExportHandler('sysConfig');
    };
  }, [
    registerExportHandler,
    unregisterExportHandler,
    configTotal,
    selectedMajorCode,
    selectedMinorCode,
    fetchAllConfigDataForExcel,
    configExcelColumns,
  ]);

  // 대분류 행 클릭
  const handleMajorRowClick = (record: MajorCode) => {
    setSelectedMajorCode(record.majorCode);
  };

  // 소분류 행 클릭
  const handleMinorRowClick = (record: MinorCode) => {
    setSelectedMinorCode(record.minorCode);
  };

  // 환경설정 등록 모달 열기
  const handleOpenConfigCreate = () => {
    if (!selectedMajorCode || !selectedMinorCode) {
      message.warning('대분류와 소분류 코드를 먼저 선택하세요.');
      return;
    }
    setConfigModalMode('create');
    setCurrentConfig(null);
    configForm.resetFields();
    configForm.setFieldsValue({
      majorCode: selectedMajorCode,
      minorCode: selectedMinorCode,
      dataType: 'STRING',
      editableYn: 'Y',
      useYn: 'Y',
    });
    setConfigModalOpen(true);
  };

  // 환경설정 수정 모달 열기
  const handleOpenConfigEdit = (record: SysConfig) => {
    setConfigModalMode('edit');
    setCurrentConfig(record);
    configForm.setFieldsValue({
      majorCode: record.majorCode,
      minorCode: record.minorCode,
      configKey: record.configKey,
      configValue: record.configValue,
      configDesc: record.configDesc,
      dataType: record.dataType,
      minValue: record.minValue,
      maxValue: record.maxValue,
      validValues: record.validValues,
      defaultValue: record.defaultValue,
      editableYn: record.editableYn,
      useYn: record.useYn,
    });
    setConfigModalOpen(true);
  };

  // 환경설정 저장
  const handleSaveConfig = async () => {
    try {
      const values = await configForm.validateFields();
      const request: SysConfigRequest = {
        majorCode: values.majorCode,
        minorCode: values.minorCode,
        configKey: values.configKey,
        configValue: values.configValue,
        configDesc: values.configDesc,
        dataType: values.dataType,
        minValue: values.minValue,
        maxValue: values.maxValue,
        validValues: values.validValues,
        defaultValue: values.defaultValue,
        editableYn: values.editableYn,
        useYn: values.useYn,
      };

      if (configModalMode === 'create') {
        await sysConfigService.create(request);
        message.success('환경설정이 등록되었습니다.');
      } else {
        await sysConfigService.update(
          values.majorCode,
          values.minorCode,
          values.configKey,
          request
        );
        message.success('환경설정이 수정되었습니다.');
      }

      setConfigModalOpen(false);
      fetchConfigList();
      fetchMinorCodesWithConfig();
    } catch (error: any) {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (!error.errorFields) {
        message.error('환경설정 저장에 실패했습니다.');
      }
    }
  };

  // 환경설정 삭제
  const handleDeleteConfig = async (record: SysConfig) => {
    try {
      await sysConfigService.delete(record.majorCode, record.minorCode, record.configKey);
      message.success('환경설정이 삭제되었습니다.');
      setConfigList((prev) =>
        prev.filter(
          (item) =>
            !(
              item.majorCode === record.majorCode &&
              item.minorCode === record.minorCode &&
              item.configKey === record.configKey
            )
        )
      );
      setConfigTotal((prev) => prev - 1);
      fetchMinorCodesWithConfig();
    } catch (error: any) {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('환경설정 삭제에 실패했습니다.');
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

  const handleConfigResize =
    (key: string) =>
    (_: React.SyntheticEvent<Element>, { size }: ResizeCallbackData) => {
      setConfigColumnWidths((prev) => ({ ...prev, [key]: size.width }));
    };

  // 컬럼 설정 초기화
  const handleResetConfigColumns = () => {
    setConfigColumnWidths(defaultConfigColumnWidths);
    setConfigVisibleColumns(defaultConfigVisibleColumns);
    localStorage.removeItem('sysConfigColumnWidths');
    localStorage.removeItem('sysConfigVisibleColumns');
    message.success('컬럼 설정이 초기화되었습니다.');
  };

  // 환경설정 컬럼 설정 팝오버
  const configColumnSettingsContent = (
    <div style={{ width: 150 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>표시할 컬럼 선택</div>
      <Divider style={{ margin: '8px 0' }} />
      {Object.entries(configColumnLabels).map(([key, label]) => (
        <div key={key} style={{ marginBottom: 4 }}>
          <Checkbox
            checked={configVisibleColumns[key] !== false}
            onChange={(e) => handleConfigColumnVisibilityChange(key, e.target.checked)}
          >
            {label}
          </Checkbox>
        </div>
      ))}
      <Divider style={{ margin: '8px 0' }} />
      <Button size="small" onClick={() => setConfigVisibleColumns(defaultConfigVisibleColumns)} block>
        전체 표시
      </Button>
    </div>
  );

  // 대분류 테이블 컬럼
  const majorColumns: ColumnsType<MajorCode> = useMemo(
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
        render: (text: string, record: MajorCode) => {
          const hasConfig = majorCodesWithConfig.has(record.majorCode);
          return (
            <Space>
              <Text strong>{text}</Text>
              {hasConfig && <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>설정</Tag>}
            </Space>
          );
        },
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
        ellipsis: true,
      },
      {
        title: 'USE',
        dataIndex: 'useYn',
        key: 'useYn',
        width: majorColumnWidths.useYn,
        align: 'center',
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
    ],
    [majorColumnWidths, majorCodesWithConfig]
  );

  // 소분류 테이블 컬럼
  const minorColumns: ColumnsType<MinorCode> = useMemo(
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
        render: (text: string, record: MinorCode) => {
          const hasConfig = minorCodesWithConfig.has(`${record.majorCode}:${record.minorCode}`);
          return (
            <Space>
              <Text strong>{text}</Text>
              {hasConfig && <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>설정</Tag>}
            </Space>
          );
        },
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
        ellipsis: true,
      },
      {
        title: 'USE',
        dataIndex: 'useYn',
        key: 'useYn',
        width: minorColumnWidths.useYn,
        align: 'center',
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
    ],
    [minorColumnWidths, minorCodesWithConfig]
  );

  // 환경설정 테이블 컬럼 (전체)
  const allConfigColumns: ColumnsType<SysConfig> = useMemo(
    () => [
      {
        title: '설정키',
        dataIndex: 'configKey',
        key: 'configKey',
        width: configColumnWidths.configKey,
        sorter: (a, b) => (a.configKey || '').localeCompare(b.configKey || ''),
        onHeaderCell: () => ({
          width: configColumnWidths.configKey,
          onResize: handleConfigResize('configKey'),
        }),
        render: (text: string) => <Text strong code>{text}</Text>,
      },
      {
        title: '설정값',
        dataIndex: 'configValue',
        key: 'configValue',
        width: configColumnWidths.configValue,
        onHeaderCell: () => ({
          width: configColumnWidths.configValue,
          onResize: handleConfigResize('configValue'),
        }),
        render: (text: string, record: SysConfig) => {
          if (record.dataType === 'BOOLEAN') {
            return text === 'Y' || text === 'true' ? (
              <Tag color="green">Y</Tag>
            ) : (
              <Tag color="default">N</Tag>
            );
          }
          return <Text ellipsis={{ tooltip: text }}>{text}</Text>;
        },
      },
      {
        title: '설명',
        dataIndex: 'configDesc',
        key: 'configDesc',
        width: configColumnWidths.configDesc,
        onHeaderCell: () => ({
          width: configColumnWidths.configDesc,
          onResize: handleConfigResize('configDesc'),
        }),
        ellipsis: true,
      },
      {
        title: '타입',
        dataIndex: 'dataType',
        key: 'dataType',
        width: configColumnWidths.dataType,
        align: 'center',
        filters: [
          { text: 'STRING', value: 'STRING' },
          { text: 'NUMBER', value: 'NUMBER' },
          { text: 'DATE', value: 'DATE' },
          { text: 'BOOLEAN', value: 'BOOLEAN' },
        ],
        onFilter: (value, record) => record.dataType === value,
        onHeaderCell: () => ({
          width: configColumnWidths.dataType,
          onResize: handleConfigResize('dataType'),
        }),
        render: (val: string) => {
          const colorMap: Record<string, string> = {
            STRING: 'blue',
            NUMBER: 'orange',
            DATE: 'purple',
            BOOLEAN: 'cyan',
          };
          return <Tag color={colorMap[val] || 'default'}>{val}</Tag>;
        },
      },
      {
        title: '수정',
        dataIndex: 'editableYn',
        key: 'editableYn',
        width: configColumnWidths.editableYn,
        align: 'center',
        onHeaderCell: () => ({
          width: configColumnWidths.editableYn,
          onResize: handleConfigResize('editableYn'),
        }),
        render: (val: string) =>
          val === 'Y' ? (
            <Tag color="green">Y</Tag>
          ) : (
            <Tag color="red">N</Tag>
          ),
      },
      {
        title: 'USE',
        dataIndex: 'useYn',
        key: 'useYn',
        width: configColumnWidths.useYn,
        align: 'center',
        filters: [
          { text: 'Y', value: 'Y' },
          { text: 'N', value: 'N' },
        ],
        onFilter: (value, record) => record.useYn === value,
        onHeaderCell: () => ({
          width: configColumnWidths.useYn,
          onResize: handleConfigResize('useYn'),
        }),
        render: (val: string) =>
          val === 'Y' ? (
            <Tag color="green">Y</Tag>
          ) : (
            <Tag color="default">N</Tag>
          ),
      },
      {
        title: '등록일시',
        dataIndex: 'regDt',
        key: 'regDt',
        width: configColumnWidths.regDt,
        sorter: (a, b) => new Date(a.regDt || 0).getTime() - new Date(b.regDt || 0).getTime(),
        onHeaderCell: () => ({
          width: configColumnWidths.regDt,
          onResize: handleConfigResize('regDt'),
        }),
        render: (val: string) => val?.substring(0, 16).replace('T', ' '),
      },
      {
        title: '관리',
        key: 'action',
        width: configColumnWidths.action,
        fixed: 'right',
        onHeaderCell: () => ({
          width: configColumnWidths.action,
          onResize: handleConfigResize('action'),
        }),
        render: (_: any, record: SysConfig) => {
          const isNotEditable = record.editableYn === 'N';

          return (
            <Space size="small">
              <Tooltip title="수정">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenConfigEdit(record)}
                />
              </Tooltip>
              <Popconfirm
                title="삭제 확인"
                description={
                  isNotEditable
                    ? '수정 불가 설정은 삭제할 수 없습니다.'
                    : '정말 삭제하시겠습니까?'
                }
                onConfirm={() => !isNotEditable && handleDeleteConfig(record)}
                okButtonProps={{ disabled: isNotEditable }}
                okText="삭제"
                cancelText="취소"
              >
                <Tooltip title={isNotEditable ? '수정불가 설정' : '삭제'}>
                  <Button
                    type="text"
                    size="small"
                    danger
                    disabled={isNotEditable}
                    icon={isNotEditable ? <LockOutlined /> : <DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [configColumnWidths]
  );

  // 환경설정 테이블 컬럼 (표시 필터링)
  const configColumns = useMemo(() => {
    return allConfigColumns.filter((col) => {
      const key = col.key as string;
      if (key === 'action') return true;
      return configVisibleColumns[key] !== false;
    });
  }, [allConfigColumns, configVisibleColumns]);

  // 선택된 대분류 정보
  const selectedMajor = useMemo(
    () => majorList.find((m) => m.majorCode === selectedMajorCode),
    [majorList, selectedMajorCode]
  );

  // 선택된 소분류 정보
  const selectedMinor = useMemo(
    () => minorList.find((m) => m.minorCode === selectedMinorCode),
    [minorList, selectedMinorCode]
  );

  // 데이터 타입에 따른 입력 필드 렌더링
  const renderValueInput = () => {
    const dataType = Form.useWatch('dataType', configForm);

    switch (dataType) {
      case 'NUMBER':
        return (
          <InputNumber
            placeholder="숫자값 입력"
            style={{ width: '100%' }}
          />
        );
      case 'BOOLEAN':
        return (
          <Select placeholder="선택">
            <Option value="Y">Y (예)</Option>
            <Option value="N">N (아니오)</Option>
          </Select>
        );
      case 'DATE':
        return (
          <Input placeholder="YYYY-MM-DD 형식" />
        );
      default:
        return (
          <Input placeholder="값 입력" />
        );
    }
  };

  return (
    <div className="sys-config-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <ToolOutlined style={{ marginRight: 8 }} />
          환경설정 관리
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          시스템 환경설정 값을 관리합니다.
        </Text>
      </div>

      {/* 리사이저블 패널 그룹 */}
      <PanelGroup direction="horizontal" className="config-panel-group">
        {/* 좌측 패널 - 대분류/소분류 코드 */}
        <Panel defaultSize={35} minSize={25} className="config-panel">
          <div className="code-section">
            {/* 대분류 카드 */}
            <Card
              title={
                <Space>
                  <span>대분류 코드</span>
                  <Tag color="blue">{majorTotal}건</Tag>
                </Space>
              }
              size="small"
              extra={
                <Checkbox
                  checked={onlyMajorWithConfig}
                  onChange={(e) => setOnlyMajorWithConfig(e.target.checked)}
                >
                  설정값 있는 코드만
                </Checkbox>
              }
              className="code-card"
            >
              {/* 대분류 검색 */}
              <Form
                form={majorSearchForm}
                layout="inline"
                className="search-form"
                onFinish={() => {
                  setMajorCurrentPage(1);
                  fetchMajorList(1, majorPageSize);
                }}
              >
                <Form.Item name="majorCode" label="코드">
                  <Input placeholder="코드" allowClear style={{ width: 80 }} />
                </Form.Item>
                <Form.Item name="majorCodeNm" label="코드명">
                  <Input placeholder="코드명" allowClear style={{ width: 100 }} />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SearchOutlined />}
                    size="small"
                    loading={majorLoading}
                  >
                    조회
                  </Button>
                </Form.Item>
              </Form>

              {/* 대분류 테이블 */}
              <Table
                columns={majorColumns}
                dataSource={majorList}
                rowKey="majorCode"
                loading={majorLoading}
                size="small"
                scroll={{ y: 180 }}
                pagination={{
                  current: majorCurrentPage,
                  pageSize: majorPageSize,
                  total: majorTotal,
                  showSizeChanger: false,
                  showQuickJumper: false,
                  size: 'small',
                  showTotal: (total) => `${total}건`,
                  onChange: handleMajorPageChange,
                }}
                components={{
                  header: {
                    cell: ResizableTitle,
                  },
                }}
                onRow={(record) => ({
                  onClick: () => handleMajorRowClick(record),
                  className:
                    selectedMajorCode === record.majorCode ? 'ant-table-row-selected' : '',
                })}
              />
            </Card>

            {/* 소분류 카드 */}
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
                <Checkbox
                  checked={onlyWithConfig}
                  onChange={(e) => setOnlyWithConfig(e.target.checked)}
                >
                  설정값 있는 코드만
                </Checkbox>
              }
              className="code-card"
            >
              {/* 소분류 검색 */}
              <Form
                form={minorSearchForm}
                layout="inline"
                className="search-form"
                onFinish={() => {
                  setMinorCurrentPage(1);
                  fetchMinorList(1, minorPageSize);
                }}
              >
                <Form.Item name="minorCode" label="코드">
                  <Input placeholder="코드" allowClear style={{ width: 80 }} />
                </Form.Item>
                <Form.Item name="minorCodeNm" label="코드명">
                  <Input placeholder="코드명" allowClear style={{ width: 100 }} />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SearchOutlined />}
                    size="small"
                    loading={minorLoading}
                    disabled={!selectedMajorCode}
                  >
                    조회
                  </Button>
                </Form.Item>
              </Form>

              {/* 소분류 테이블 */}
              <Table
                columns={minorColumns}
                dataSource={minorList}
                rowKey={(record) => `${record.majorCode}-${record.minorCode}`}
                loading={minorLoading}
                size="small"
                scroll={{ y: 180 }}
                pagination={{
                  current: minorCurrentPage,
                  pageSize: minorPageSize,
                  total: minorTotal,
                  showSizeChanger: false,
                  showQuickJumper: false,
                  size: 'small',
                  showTotal: (total) => `${total}건`,
                  onChange: handleMinorPageChange,
                }}
                components={{
                  header: {
                    cell: ResizableTitle,
                  },
                }}
                onRow={(record) => ({
                  onClick: () => handleMinorRowClick(record),
                  className:
                    selectedMinorCode === record.minorCode ? 'ant-table-row-selected' : '',
                })}
                locale={{
                  emptyText: selectedMajorCode
                    ? '소분류 코드가 없습니다.'
                    : '대분류 코드를 선택하세요.',
                }}
              />
            </Card>
          </div>
        </Panel>

        {/* 리사이즈 핸들 */}
        <PanelResizeHandle className="resize-handle" />

        {/* 우측 패널 - 환경설정값 */}
        <Panel defaultSize={65} minSize={40} className="config-panel">
          <Card
            title={
              <Space>
                <span>환경설정</span>
                {selectedMajor && selectedMinor && (
                  <>
                    <Tag color="processing">{selectedMajor.majorCode}</Tag>
                    <Tag color="processing">{selectedMinor.minorCode}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {selectedMinor.minorCodeNm}
                    </Text>
                  </>
                )}
                <Tag color="blue">{configTotal}건</Tag>
              </Space>
            }
            size="small"
            extra={
              <Space>
                <Popover
                  content={configColumnSettingsContent}
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
                  onClick={handleResetConfigColumns}
                >
                  초기화
                </Button>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleOpenConfigCreate}
                  disabled={!selectedMajorCode || !selectedMinorCode}
                >
                  등록
                </Button>
              </Space>
            }
            className="config-card"
          >
            {/* 환경설정 테이블 */}
            <Table
              columns={configColumns}
              dataSource={configList}
              rowKey={(record) => `${record.majorCode}-${record.minorCode}-${record.configKey}`}
              loading={configLoading}
              size="small"
              scroll={{ x: 'max-content', y: 'calc(100vh - 320px)' }}
              pagination={{
                current: configCurrentPage,
                pageSize: configPageSize,
                total: configTotal,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) => `${range[0]}-${range[1]} / 총 ${total}건`,
                onChange: handleConfigPageChange,
                onShowSizeChange: handleConfigPageChange,
              }}
              components={{
                header: {
                  cell: ResizableTitle,
                },
              }}
              onRow={(record) => ({
                onDoubleClick: () => handleOpenConfigEdit(record),
              })}
              locale={{
                emptyText:
                  selectedMajorCode && selectedMinorCode
                    ? '환경설정이 없습니다.'
                    : '대분류/소분류 코드를 선택하세요.',
              }}
            />
          </Card>
        </Panel>
      </PanelGroup>

      {/* 환경설정 등록/수정 모달 */}
      <Modal
        title={configModalMode === 'create' ? '환경설정 등록' : '환경설정 수정'}
        open={configModalOpen}
        onOk={handleSaveConfig}
        onCancel={() => setConfigModalOpen(false)}
        width={700}
        okText="저장"
        cancelText="취소"
      >
        <Form form={configForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="majorCode" label="대분류 코드">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minorCode" label="소분류 코드">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="configKey"
                label="설정 키"
                rules={[{ required: true, message: '설정 키를 입력하세요' }]}
              >
                <Input
                  placeholder="설정 키 입력"
                  disabled={configModalMode === 'edit'}
                  style={{ textTransform: 'uppercase' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="dataType"
                label="데이터 타입"
                rules={[{ required: true, message: '데이터 타입을 선택하세요' }]}
              >
                <Select
                  placeholder="타입 선택"
                  disabled={configModalMode === 'edit' && currentConfig?.editableYn === 'N'}
                >
                  <Option value="STRING">STRING</Option>
                  <Option value="NUMBER">NUMBER</Option>
                  <Option value="DATE">DATE</Option>
                  <Option value="BOOLEAN">BOOLEAN</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="configValue"
                label="설정값"
                rules={[{ required: true, message: '설정값을 입력하세요' }]}
              >
                {renderValueInput()}
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="configDesc" label="설명">
            <TextArea rows={2} placeholder="설정 설명" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="defaultValue" label="기본값">
                <Input placeholder="기본값" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minValue" label="최소값">
                <Input placeholder="최소값" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxValue" label="최대값">
                <Input placeholder="최대값" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="validValues" label="유효값 목록">
                <Input placeholder="콤마(,)로 구분하여 입력" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="editableYn" label="수정 가능">
                <Select>
                  <Option value="Y">Y</Option>
                  <Option value="N">N</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="useYn" label="사용 여부">
                <Select>
                  <Option value="Y">Y</Option>
                  <Option value="N">N</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default SysConfigPage;
