/**
 * 모델관리 페이지
 * M0401 - 신용평가 모델 목록 조회 및 관리
 */
import React, { useState, useEffect, useMemo } from 'react';
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
  Tag,
  Row,
  Col,
  Typography,
  Popover,
  Checkbox,
  Divider,
  Tabs,
  Progress,
  Statistic,
  Descriptions,
  Timeline,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  RocketOutlined,
  EyeOutlined,
  EditOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table/interface';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import dayjs from 'dayjs';
import type {
  ModelListResponse,
  ModelDetailResponse,
  ModelSearchParams,
  ModelCreateRequest,
  ModelUpdateRequest,
  ModelTrainRequest,
  ModelTrainStatusResponse,
  ApprovalStatus,
} from '@/types';
import { modelService } from '@/services/modelService';
import { useCommonCodes } from '@/hooks';
import './ModelListPage.css';
import 'react-resizable/css/styles.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 공통코드 키
const CODE_KEYS = {
  ALGORITHM_TYPE: 'ALGORITHM_TYPE',
  MODEL_TYPE: 'MODEL_TYPE',
  APPROVAL_STATUS: 'APPROVAL_STATUS',
};

// 상태별 색상
const STATUS_COLORS: Record<ApprovalStatus, string> = {
  DRAFT: 'default',
  APPROVED: 'warning',
  TRAINING: 'processing',
  READY: 'warning',
  DEPLOYED: 'success',
  ARCHIVED: 'default',
  FAILED: 'error',
};

// 상태별 아이콘
const STATUS_ICONS: Record<ApprovalStatus, React.ReactNode> = {
  DRAFT: <ClockCircleOutlined />,
  APPROVED: <CheckCircleOutlined />,
  TRAINING: <SyncOutlined spin />,
  READY: <CheckCircleOutlined />,
  DEPLOYED: <RocketOutlined />,
  ARCHIVED: <ClockCircleOutlined />,
  FAILED: <CloseCircleOutlined />,
};

// Resizable 컬럼 헤더
const ResizableTitle = (
  props: React.HTMLAttributes<HTMLElement> & {
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

const ModelListPage: React.FC = () => {
  const [searchForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 공통코드 조회
  const { codeMap, getLabel: _getCodeLabel } = useCommonCodes([
    CODE_KEYS.ALGORITHM_TYPE,
    CODE_KEYS.MODEL_TYPE,
    CODE_KEYS.APPROVAL_STATUS,
  ]);

  const algorithmOptions = codeMap[CODE_KEYS.ALGORITHM_TYPE] || [];
  const modelTypeOptions = codeMap[CODE_KEYS.MODEL_TYPE] || [];
  const statusOptions = codeMap[CODE_KEYS.APPROVAL_STATUS] || [];

  // 상태 관리
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<ModelListResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 모달 상태
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [trainModalOpen, setTrainModalOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelDetailResponse | null>(null);
  const [editModel, setEditModel] = useState<ModelListResponse | null>(null);
  const [trainStatus, setTrainStatus] = useState<ModelTrainStatusResponse | null>(null);
  const [trainPolling, setTrainPolling] = useState<NodeJS.Timeout | null>(null);

  // 컬럼 너비
  const defaultColumnWidths: Record<string, number> = {
    modelNm: 180,
    algorithmType: 120,
    modelType: 100,
    modelVersion: 90,
    aucScore: 80,
    ksStat: 80,
    ar: 80,
    approvalStatus: 100,
    regDt: 150,
    action: 150,
  };

  const getStoredColumnWidths = () => {
    try {
      const stored = localStorage.getItem('modelColumnWidths');
      if (stored) {
        return { ...defaultColumnWidths, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('컬럼 너비 불러오기 실패:', error);
    }
    return defaultColumnWidths;
  };

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(getStoredColumnWidths());

  // 컬럼 표시 설정
  const defaultVisibleColumns: Record<string, boolean> = {
    modelNm: true,
    algorithmType: true,
    modelType: true,
    modelVersion: true,
    aucScore: true,
    ksStat: true,
    ar: true,
    approvalStatus: true,
    regDt: true,
  };

  const getStoredVisibleColumns = () => {
    try {
      const stored = localStorage.getItem('modelVisibleColumns');
      if (stored) {
        return { ...defaultVisibleColumns, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('컬럼 표시 설정 불러오기 실패:', error);
    }
    return defaultVisibleColumns;
  };

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(getStoredVisibleColumns());

  // 컬럼 레이블
  const columnLabels: Record<string, string> = {
    modelNm: '모델명',
    algorithmType: '알고리즘',
    modelType: '모델유형',
    modelVersion: '버전',
    aucScore: 'AUC',
    ksStat: 'KS',
    ar: 'AR',
    approvalStatus: '상태',
    regDt: '등록일시',
  };

  // 데이터 조회
  const fetchData = async (currentPage = page) => {
    setLoading(true);
    try {
      const searchValues = searchForm.getFieldsValue();
      const params: ModelSearchParams = {
        page: currentPage - 1,
        size: pageSize,
        ...searchValues,
      };

      const response = await modelService.list(params);

      if (response.data.success && response.data.data) {
        setDataSource(response.data.data.content);
        setTotal(response.data.data.totalCount);

        if (response.data.data.content.length === 0) {
          message.info('조회된 데이터가 없습니다.');
        }
      } else {
        message.error(response.data.message || '데이터 조회에 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('데이터 조회 오류:', error);
      message.error('데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    fetchData();
  }, []);

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
    createForm.resetFields();
    setCreateModalOpen(true);
  };

  // 등록 저장
  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      setLoading(true);

      const requestData: ModelCreateRequest = {
        modelNm: values.modelNm,
        modelType: values.modelType,
        algorithmType: values.algorithmType,
        hyperParameters: {},
      };

      const response = await modelService.create(requestData);

      if (response.data.success) {
        message.success('모델이 등록되었습니다.');
        setCreateModalOpen(false);
        fetchData();
      } else {
        message.error(response.data.message || '등록에 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('등록 오류:', error);
      // API 에러 응답에서 메시지 추출
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        message.error(axiosError.response?.data?.message || '등록에 실패했습니다.');
      } else {
        message.error('등록 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 수정 모달 열기
  const handleEdit = (record: ModelListResponse) => {
    setEditModel(record);
    editForm.setFieldsValue({
      modelNm: record.modelNm,
      modelType: record.modelType,
      algorithmType: record.algorithmType,
    });
    setEditModalOpen(true);
  };

  // 수정 저장
  const handleEditSubmit = async () => {
    if (!editModel) return;

    try {
      const values = await editForm.validateFields();
      setLoading(true);

      const requestData: ModelUpdateRequest = {
        modelNm: values.modelNm,
        modelType: values.modelType,
        algorithmType: values.algorithmType,
      };

      const response = await modelService.update(editModel.modelId, requestData);

      if (response.data.success) {
        message.success('모델이 수정되었습니다.');
        setEditModalOpen(false);
        setEditModel(null);
        fetchData();
      } else {
        message.error(response.data.message || '수정에 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('수정 오류:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        message.error(axiosError.response?.data?.message || '수정에 실패했습니다.');
      } else {
        message.error('수정 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 상세 조회
  const handleViewDetail = async (record: ModelListResponse) => {
    setLoading(true);
    try {
      const response = await modelService.detail(record.modelId);
      if (response.data.success && response.data.data) {
        setCurrentModel(response.data.data);
        setDetailModalOpen(true);
      } else {
        message.error(response.data.message || '상세 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('상세 조회 오류:', error);
      message.error('상세 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 학습 시작
  const handleTrain = async (record: ModelListResponse) => {
    setLoading(true);
    try {
      const request: ModelTrainRequest = {
        modelId: record.modelId,
        trainingConfig: {
          testSize: 0.2,
          randomState: 42,
          crossValidation: 5,
        },
      };

      const response = await modelService.train(request);
      if (response.data.success && response.data.data) {
        setTrainStatus(response.data.data);
        setTrainModalOpen(true);
        startTrainPolling(record.modelId);
        message.success('모델 학습이 시작되었습니다.');
      } else {
        message.error(response.data.message || '학습 시작에 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('학습 시작 오류:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        message.error(axiosError.response?.data?.message || '학습 시작에 실패했습니다.');
      } else {
        message.error('학습 시작 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 학습 상태 폴링
  const startTrainPolling = (modelId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await modelService.getTrainStatus(modelId);
        if (response.data.success && response.data.data) {
          const status = response.data.data;
          setTrainStatus(status);
          if (status.approvalStatus !== 'TRAINING') {
            clearInterval(interval);
            setTrainPolling(null);
            fetchData();

            // 완료/실패 메시지 표시
            if (status.approvalStatus === 'FAILED') {
              message.error('모델 학습이 실패했습니다.');
            } else {
              message.success('모델 학습이 완료되었습니다.');
              // 성공 시 2초 후 자동 닫기
              setTimeout(() => {
                setTrainModalOpen(false);
                setTrainStatus(null);
              }, 2000);
            }
          }
        }
      } catch (error) {
        console.error('학습 상태 조회 오류:', error);
      }
    }, 5000);

    setTrainPolling(interval);
  };

  // 폴링 정리
  useEffect(() => {
    return () => {
      if (trainPolling) {
        clearInterval(trainPolling);
      }
    };
  }, [trainPolling]);

  // 배포
  const handleDeploy = async () => {
    if (!currentModel) return;

    Modal.confirm({
      title: '모델 배포',
      content: '이 모델을 운영 환경에 배포하시겠습니까? 기존 운영 모델은 보관 처리됩니다.',
      okText: '배포',
      cancelText: '취소',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await modelService.deploy(currentModel.modelId, {
            deployReason: '운영 배포',
          });
          if (response.data.success) {
            message.success('모델이 운영 환경에 배포되었습니다.');
            setDetailModalOpen(false);
            fetchData();
          } else {
            message.error(response.data.message || '배포에 실패했습니다.');
          }
        } catch (error: unknown) {
          console.error('배포 오류:', error);
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            message.error(axiosError.response?.data?.message || '배포에 실패했습니다.');
          } else {
            message.error('배포 중 오류가 발생했습니다.');
          }
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 컬럼 리사이즈 핸들러
  const handleResize = (key: string) => (_: React.SyntheticEvent, { size }: ResizeCallbackData) => {
    setColumnWidths((prevWidths) => {
      const newWidths = { ...prevWidths, [key]: size.width };
      try {
        localStorage.setItem('modelColumnWidths', JSON.stringify(newWidths));
      } catch (error) {
        console.error('컬럼 너비 저장 실패:', error);
      }
      return newWidths;
    });
  };

  // 컬럼 표시 토글
  const handleColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    setVisibleColumns((prev) => {
      const newState = { ...prev, [columnKey]: visible };
      try {
        localStorage.setItem('modelVisibleColumns', JSON.stringify(newState));
      } catch (error) {
        console.error('컬럼 표시 설정 저장 실패:', error);
      }
      return newState;
    });
  };

  // 컬럼 설정 초기화
  const handleResetColumnSettings = () => {
    setColumnWidths(defaultColumnWidths);
    setVisibleColumns(defaultVisibleColumns);
    try {
      localStorage.removeItem('modelColumnWidths');
      localStorage.removeItem('modelVisibleColumns');
      message.success('컬럼 설정이 초기화되었습니다.');
    } catch (error) {
      console.error('컬럼 설정 초기화 실패:', error);
    }
  };

  // 테이블 컬럼 정의
  const allColumns: ColumnsType<ModelListResponse> = [
    {
      title: '모델명',
      dataIndex: 'modelNm',
      key: 'modelNm',
      width: columnWidths.modelNm,
      sorter: (a, b) => (a.modelNm || '').localeCompare(b.modelNm || ''),
      onHeaderCell: () => ({
        width: columnWidths.modelNm,
        onResize: handleResize('modelNm'),
      }),
      render: (text, record) => (
        <Button type="link" onClick={() => handleViewDetail(record)} style={{ padding: 0 }}>
          {text}
        </Button>
      ),
    },
    {
      title: '알고리즘',
      dataIndex: 'algorithmTypeNm',
      key: 'algorithmType',
      width: columnWidths.algorithmType,
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths.algorithmType,
        onResize: handleResize('algorithmType'),
      }),
      render: (text, record) => text || record.algorithmType,
    },
    {
      title: '모델유형',
      dataIndex: 'modelTypeNm',
      key: 'modelType',
      width: columnWidths.modelType,
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths.modelType,
        onResize: handleResize('modelType'),
      }),
      render: (text, record) => text || record.modelType,
    },
    {
      title: '버전',
      dataIndex: 'modelVersion',
      key: 'modelVersion',
      width: columnWidths.modelVersion,
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths.modelVersion,
        onResize: handleResize('modelVersion'),
      }),
    },
    {
      title: 'AUC',
      dataIndex: 'aucScore',
      key: 'aucScore',
      width: columnWidths.aucScore,
      align: 'right',
      sorter: (a, b) => (a.aucScore || 0) - (b.aucScore || 0),
      onHeaderCell: () => ({
        width: columnWidths.aucScore,
        onResize: handleResize('aucScore'),
      }),
      render: (value) => value ? value.toFixed(4) : '-',
    },
    {
      title: 'KS',
      dataIndex: 'ksStat',
      key: 'ksStat',
      width: columnWidths.ksStat,
      align: 'right',
      sorter: (a, b) => (a.ksStat || 0) - (b.ksStat || 0),
      onHeaderCell: () => ({
        width: columnWidths.ksStat,
        onResize: handleResize('ksStat'),
      }),
      render: (value) => value ? value.toFixed(4) : '-',
    },
    {
      title: 'AR',
      dataIndex: 'ar',
      key: 'ar',
      width: columnWidths.ar,
      align: 'right',
      sorter: (a, b) => (a.ar || 0) - (b.ar || 0),
      onHeaderCell: () => ({
        width: columnWidths.ar,
        onResize: handleResize('ar'),
      }),
      render: (value) => value ? value.toFixed(4) : '-',
    },
    {
      title: '상태',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: columnWidths.approvalStatus,
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths.approvalStatus,
        onResize: handleResize('approvalStatus'),
      }),
      render: (status: ApprovalStatus, record) => (
        <Tag
          icon={STATUS_ICONS[status]}
          color={STATUS_COLORS[status]}
        >
          {record.approvalStatusNm || status}
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
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '액션',
      key: 'action',
      width: 150,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
            title="상세보기"
          />
          {record.approvalStatus === 'DRAFT' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                title="수정"
              />
              <Button
                type="link"
                size="small"
                icon={<ExperimentOutlined />}
                onClick={() => handleTrain(record)}
                title="학습"
              />
            </>
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

  // 컬럼 설정 팝오버
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
      <Button size="small" onClick={handleResetColumnSettings} block>
        전체 표시
      </Button>
    </div>
  );

  // 등록 모달 탭
  const createModalTabItems = [
    {
      key: 'basic',
      label: '기본정보',
      children: (
        <>
          <Form.Item
            label="모델명"
            name="modelNm"
            rules={[
              { required: true, message: '모델명을 입력하세요.' },
              { max: 100, message: '최대 100자까지 입력 가능합니다.' },
            ]}
          >
            <Input placeholder="모델명을 입력하세요" maxLength={100} />
          </Form.Item>
          <Form.Item
            label="모델유형"
            name="modelType"
            rules={[{ required: true, message: '모델유형을 선택하세요.' }]}
          >
            <Select placeholder="모델유형 선택">
              {modelTypeOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="알고리즘"
            name="algorithmType"
            rules={[{ required: true, message: '알고리즘을 선택하세요.' }]}
          >
            <Select placeholder="알고리즘 선택">
              {algorithmOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="설명" name="modelDesc">
            <TextArea rows={4} placeholder="모델 설명 (선택)" maxLength={1000} showCount />
          </Form.Item>
        </>
      ),
    },
  ];

  return (
    <div className="model-list-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <ExperimentOutlined style={{ marginRight: 8 }} />
          모델 관리
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          신용평가 모델을 등록하고 관리합니다.
        </Text>
      </div>

      {/* 검색 영역 */}
      <Card className="search-card" size="small">
        <Form form={searchForm} layout="inline">
          <Form.Item name="algorithmType" label="알고리즘">
            <Select placeholder="전체" allowClear style={{ width: 150 }}>
              {algorithmOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="modelType" label="모델유형">
            <Select placeholder="전체" allowClear style={{ width: 130 }}>
              {modelTypeOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="approvalStatus" label="상태">
            <Select placeholder="전체" allowClear style={{ width: 120 }}>
              {statusOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="keyword" label="검색어">
            <Input placeholder="모델명" style={{ width: 150 }} />
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
              새 모델 등록
            </Button>
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
          </Space>
          <Text type="secondary">전체 {total}건</Text>
        </div>

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="modelId"
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
        />
      </Card>

      {/* 등록 모달 */}
      <Modal
        title="새 모델 등록"
        open={createModalOpen}
        onOk={handleCreateSubmit}
        onCancel={() => setCreateModalOpen(false)}
        confirmLoading={loading}
        width={600}
        okText="저장"
        cancelText="취소"
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Tabs items={createModalTabItems} defaultActiveKey="basic" />
        </Form>
      </Modal>

      {/* 수정 모달 */}
      <Modal
        title={`모델 수정 - ${editModel?.modelNm || ''}`}
        open={editModalOpen}
        onOk={handleEditSubmit}
        onCancel={() => {
          setEditModalOpen(false);
          setEditModel(null);
        }}
        confirmLoading={loading}
        width={600}
        okText="저장"
        cancelText="취소"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="모델명"
            name="modelNm"
            rules={[
              { required: true, message: '모델명을 입력하세요.' },
              { max: 100, message: '최대 100자까지 입력 가능합니다.' },
            ]}
          >
            <Input placeholder="모델명을 입력하세요" maxLength={100} />
          </Form.Item>
          <Form.Item
            label="모델유형"
            name="modelType"
            rules={[{ required: true, message: '모델유형을 선택하세요.' }]}
          >
            <Select placeholder="모델유형 선택">
              {modelTypeOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="알고리즘"
            name="algorithmType"
            rules={[{ required: true, message: '알고리즘을 선택하세요.' }]}
          >
            <Select placeholder="알고리즘 선택">
              {algorithmOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 상세 모달 */}
      <Modal
        title={`모델 상세 - ${currentModel?.modelNm || ''}`}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={900}
        footer={
          <Space>
            {currentModel?.approvalStatus === 'READY' && (
              <Button type="primary" icon={<RocketOutlined />} onClick={handleDeploy}>
                배포
              </Button>
            )}
            <Button onClick={() => setDetailModalOpen(false)}>닫기</Button>
          </Space>
        }
      >
        {currentModel && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="모델 ID">{currentModel.modelId}</Descriptions.Item>
              <Descriptions.Item label="버전">{currentModel.modelVersion}</Descriptions.Item>
              <Descriptions.Item label="알고리즘">{currentModel.algorithmTypeNm || currentModel.algorithmType}</Descriptions.Item>
              <Descriptions.Item label="모델유형">{currentModel.modelTypeNm || currentModel.modelType}</Descriptions.Item>
              <Descriptions.Item label="상태">
                <Tag
                  icon={STATUS_ICONS[currentModel.approvalStatus]}
                  color={STATUS_COLORS[currentModel.approvalStatus]}
                >
                  {currentModel.approvalStatusNm || currentModel.approvalStatus}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="학습건수">
                {currentModel.trainingDataCnt?.toLocaleString() || '-'}건
              </Descriptions.Item>
              <Descriptions.Item label="등록일시">
                {currentModel.regDt ? dayjs(currentModel.regDt).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="배포일시">
                {currentModel.deployedDt ? dayjs(currentModel.deployedDt).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* 성능 지표 */}
            {(currentModel.aucScore || currentModel.ksStat || currentModel.ar) && (
              <Card title="성능 지표" size="small" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="AUC"
                      value={currentModel.aucScore ?? '-'}
                      precision={4}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="KS"
                      value={currentModel.ksStat ?? '-'}
                      precision={4}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="AR"
                      value={currentModel.ar ?? '-'}
                      precision={4}
                    />
                  </Col>
                </Row>
              </Card>
            )}

            {/* 변경 이력 */}
            {currentModel.changeHistory && currentModel.changeHistory.length > 0 && (
              <Card title="변경 이력" size="small">
                <Timeline
                  items={currentModel.changeHistory.map((hist) => ({
                    color: hist.changeType === 'DEPLOY' ? 'green' :
                           hist.changeType === 'TRAIN_FAIL' ? 'red' : 'blue',
                    children: (
                      <div>
                        <Text strong>{hist.changeTypeNm || hist.changeType}</Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          {dayjs(hist.changeDt).format('YYYY-MM-DD HH:mm')}
                        </Text>
                        {hist.changeReason && (
                          <div><Text type="secondary">{hist.changeReason}</Text></div>
                        )}
                      </div>
                    ),
                  }))}
                />
              </Card>
            )}
          </>
        )}
      </Modal>

      {/* 학습 진행 모달 */}
      <Modal
        title="모델 학습 진행"
        open={trainModalOpen}
        onCancel={() => {
          if (trainPolling) {
            clearInterval(trainPolling);
            setTrainPolling(null);
          }
          setTrainModalOpen(false);
        }}
        footer={
          trainStatus?.approvalStatus === 'TRAINING' ? (
            <Button onClick={() => {
              if (trainPolling) {
                clearInterval(trainPolling);
                setTrainPolling(null);
              }
              setTrainModalOpen(false);
            }}>
              백그라운드로 전환
            </Button>
          ) : (
            <Button type="primary" onClick={() => {
              setTrainModalOpen(false);
              setTrainStatus(null);
            }}>
              완료
            </Button>
          )
        }
        width={500}
      >
        {trainStatus && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <Text strong>{trainStatus.modelNm}</Text>
            <Progress
              percent={trainStatus.progress}
              status={trainStatus.approvalStatus === 'TRAINING' ? 'active' :
                      trainStatus.approvalStatus === 'READY' ? 'success' :
                      trainStatus.approvalStatus === 'FAILED' ? 'exception' : 'normal'}
              style={{ marginTop: 16, marginBottom: 16 }}
            />
            <div>
              <Text type="secondary">현재 단계: {trainStatus.currentStep || '-'}</Text>
            </div>
            {trainStatus.errorMessage && (
              <div style={{ marginTop: 16 }}>
                <Text type="danger">{trainStatus.errorMessage}</Text>
              </div>
            )}
            {trainStatus.steps && (
              <Timeline
                style={{ marginTop: 24, textAlign: 'left' }}
                items={trainStatus.steps.map((step) => ({
                  color: step.status === 'COMPLETED' ? 'green' :
                         step.status === 'IN_PROGRESS' ? 'blue' : 'gray',
                  children: (
                    <span>
                      {step.step}
                      {step.duration && <Text type="secondary"> ({step.duration}초)</Text>}
                    </span>
                  ),
                }))}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ModelListPage;
