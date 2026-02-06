/**
 * 매핑 설정 그리드 컴포넌트
 * CSV 컬럼 매핑 규칙 관리
 * 모델관리 페이지 디자인 참조
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  message,
  Popconfirm,
  Typography,
  Tag,
  Tooltip,
  Popover,
  Checkbox,
  Divider,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SettingOutlined,
  SearchOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import rawDataService from '@/services/rawDataService';
import type {
  CsvMapping,
  CsvMappingRequest,
} from '@/types/rawData';
import {
  TARGET_COLUMN_OPTIONS,
  DATA_TYPE_OPTIONS,
  TARGET_TABLE_OPTIONS,
} from '@/types/rawData';
import { useAppSelector } from '@/store/hooks';
import 'react-resizable/css/styles.css';

const { Text } = Typography;

interface MappingGridProps {
  companyId?: string;
}

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

const MappingGrid: React.FC<MappingGridProps> = ({ companyId: propCompanyId }) => {
  const [searchForm] = Form.useForm();
  const [form] = Form.useForm();

  // 로그인 사용자 정보
  const currentUser = useAppSelector((state) => state.auth.user);
  const isAdmin = !currentUser?.companyId; // companyId가 없으면 종합관리자

  // 상태
  const [loading, setLoading] = useState(false);
  const [mappings, setMappings] = useState<CsvMapping[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // 조회 조건 상태
  const [companies, setCompanies] = useState<{ companyId: string; companyNm: string }[]>([]);

  // 모달 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMapping, setEditingMapping] = useState<CsvMapping | null>(null);

  // 컬럼 너비
  const defaultColumnWidths: Record<string, number> = {
    displayOrder: 70,
    companyNm: 120,
    targetTable: 130,
    sourceColumn: 150,
    targetColumn: 180,
    dataType: 100,
    dataLength: 80,
    dateFormat: 120,
    isRequired: 70,
    defaultValue: 120,
    useYn: 70,
    action: 100,
  };

  const getStoredColumnWidths = () => {
    try {
      const stored = localStorage.getItem('mappingColumnWidths');
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
    displayOrder: true,
    companyNm: true,
    targetTable: true,
    sourceColumn: true,
    targetColumn: true,
    dataType: true,
    dataLength: true,
    dateFormat: true,
    isRequired: true,
    defaultValue: true,
    useYn: true,
  };

  const getStoredVisibleColumns = () => {
    try {
      const stored = localStorage.getItem('mappingVisibleColumns');
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
    displayOrder: '순서',
    companyNm: '원청사',
    targetTable: '대상테이블',
    sourceColumn: '원본컬럼',
    targetColumn: '대상컬럼',
    dataType: '데이터타입',
    dataLength: '길이',
    dateFormat: '날짜형식',
    isRequired: '필수',
    defaultValue: '기본값',
    useYn: '사용',
  };

  // 원청사 목록 조회 (관리자용)
  const fetchCompanies = useCallback(async () => {
    if (!isAdmin) return;
    try {
      // 매핑 목록에서 원청사 목록 추출 (실제 API가 있으면 대체)
      const result = await rawDataService.getMappingList({
        page: 0,
        size: 1000,
      });
      const uniqueCompanies = new Map<string, string>();
      result.content.forEach((m) => {
        if (m.companyId && m.companyNm) {
          uniqueCompanies.set(m.companyId, m.companyNm);
        }
      });
      setCompanies(
        Array.from(uniqueCompanies.entries()).map(([id, nm]) => ({
          companyId: id,
          companyNm: nm,
        }))
      );
    } catch (error) {
      console.error('원청사 목록 조회 실패:', error);
    }
  }, [isAdmin]);

  // 데이터 조회
  const fetchMappings = useCallback(async () => {
    setLoading(true);
    try {
      const searchValues = searchForm.getFieldsValue();
      const result = await rawDataService.getMappingList({
        companyId: isAdmin ? searchValues.companyId : propCompanyId,
        targetTable: searchValues.targetTable,
        useYn: searchValues.useYn,
        page,
        size: pageSize,
      });

      // 검색어 필터링 (프론트엔드에서)
      let filteredContent = result.content;
      if (searchValues.keyword) {
        const keyword = searchValues.keyword.toLowerCase();
        filteredContent = result.content.filter(
          (m) =>
            m.sourceColumn?.toLowerCase().includes(keyword) ||
            m.targetColumn?.toLowerCase().includes(keyword)
        );
      }

      setMappings(filteredContent);
      setTotalCount(searchValues.keyword ? filteredContent.length : result.totalCount);
    } catch (error) {
      message.error('매핑 규칙 조회에 실패했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [searchForm, isAdmin, propCompanyId, page, pageSize]);

  useEffect(() => {
    fetchMappings();
    if (isAdmin) {
      fetchCompanies();
    }
  }, [fetchMappings, fetchCompanies, isAdmin]);

  // 검색
  const handleSearch = () => {
    setPage(0);
    fetchMappings();
  };

  // 초기화
  const handleReset = () => {
    searchForm.resetFields();
    setPage(0);
    fetchMappings();
  };

  // 컬럼 리사이즈 핸들러
  const handleResize = (key: string) => (_: React.SyntheticEvent, { size }: ResizeCallbackData) => {
    setColumnWidths((prevWidths) => {
      const newWidths = { ...prevWidths, [key]: size.width };
      try {
        localStorage.setItem('mappingColumnWidths', JSON.stringify(newWidths));
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
        localStorage.setItem('mappingVisibleColumns', JSON.stringify(newState));
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
      localStorage.removeItem('mappingColumnWidths');
      localStorage.removeItem('mappingVisibleColumns');
      message.success('컬럼 설정이 초기화되었습니다.');
    } catch (error) {
      console.error('컬럼 설정 초기화 실패:', error);
    }
  };

  // CSV 템플릿 다운로드
  const handleDownloadTemplate = () => {
    // 표준 CSV 템플릿 생성 (컬럼명 기반)
    const headers = TARGET_COLUMN_OPTIONS.map((opt) => opt.value).join(',');
    const sampleRow = TARGET_COLUMN_OPTIONS.map((opt) => {
      if (opt.dataType === 'DATE') return '2024-01-01';
      if (opt.dataType === 'NUMBER') return '0';
      return '';
    }).join(',');

    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'credit_raw_data_template.csv';
    link.click();
    message.success('CSV 템플릿이 다운로드되었습니다.');
  };

  // 디폴트 매핑 생성
  const handleCreateDefaultMappings = async () => {
    // 원청사 결정
    const targetCompanyId = isAdmin
      ? searchForm.getFieldValue('companyId')
      : propCompanyId || currentUser?.companyId;

    if (!targetCompanyId) {
      message.error('원청사를 선택해주세요.');
      return;
    }

    Modal.confirm({
      title: '디폴트 매핑 생성',
      content: (
        <div>
          <p>TB_CREDIT_RAW_DATA 테이블의 모든 컬럼에 대해 기본 매핑 규칙을 생성합니다.</p>
          <p>총 <strong>{TARGET_COLUMN_OPTIONS.length}개</strong>의 매핑 규칙이 생성됩니다.</p>
          <p style={{ color: '#ff4d4f' }}>이미 존재하는 매핑은 건너뜁니다.</p>
        </div>
      ),
      okText: '생성',
      cancelText: '취소',
      onOk: async () => {
        setLoading(true);
        let successCount = 0;
        let skipCount = 0;

        try {
          let firstError: string | null = null;
          for (let i = 0; i < TARGET_COLUMN_OPTIONS.length; i++) {
            const opt = TARGET_COLUMN_OPTIONS[i];
            try {
              const request: CsvMappingRequest = {
                companyId: targetCompanyId,
                mappingNm: opt.label, // 매핑명 = 컬럼 한글명
                targetTable: 'TB_CREDIT_RAW_DATA',
                sourceColumn: opt.value, // CSV 컬럼명 = DB 컬럼명
                targetColumn: opt.value,
                dataType: opt.dataType,
                isRequired: 'required' in opt && opt.required ? 'Y' : 'N',
                displayOrder: i + 1,
                useYn: 'Y',
              };
              await rawDataService.createMapping(request);
              successCount++;
            } catch (err) {
              // 중복 등 에러 시 건너뜀
              skipCount++;
              // 첫 번째 에러 메시지 저장
              if (!firstError && err instanceof Error) {
                firstError = err.message;
                console.error(`매핑 생성 실패 [${opt.value}]:`, err.message);
              }
            }
          }

          if (successCount > 0) {
            message.success(`디폴트 매핑 생성 완료: ${successCount}개 생성, ${skipCount}개 건너뜀`);
          } else if (firstError) {
            message.warning(`모든 매핑 생성 실패: ${firstError}`);
          }
          fetchMappings();
        } catch (error) {
          message.error('디폴트 매핑 생성 중 오류가 발생했습니다.');
          console.error(error);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 모달 열기 (등록/수정)
  const openModal = (mapping?: CsvMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      form.setFieldsValue({
        targetTable: mapping.targetTable || 'TB_CREDIT_RAW_DATA',
        sourceColumn: mapping.sourceColumn,
        targetColumn: mapping.targetColumn,
        dataType: mapping.dataType || 'VARCHAR',
        dataLength: mapping.dataLength,
        dateFormat: mapping.dateFormat,
        defaultValue: mapping.defaultValue,
        isRequired: mapping.isRequired === 'Y',
        displayOrder: mapping.displayOrder,
        useYn: mapping.useYn !== 'N',
      });
    } else {
      setEditingMapping(null);
      form.resetFields();
      form.setFieldsValue({
        targetTable: 'TB_CREDIT_RAW_DATA',
        dataType: 'VARCHAR',
        isRequired: false,
        useYn: true,
      });
    }
    setModalVisible(true);
  };

  // 저장
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // 원청사 결정
      const targetCompanyId = isAdmin
        ? searchForm.getFieldValue('companyId') || propCompanyId
        : propCompanyId;

      if (!targetCompanyId) {
        message.error('원청사를 선택해주세요.');
        return;
      }

      const request: CsvMappingRequest = {
        companyId: targetCompanyId,
        targetTable: values.targetTable,
        sourceColumn: values.sourceColumn,
        targetColumn: values.targetColumn,
        dataType: values.dataType,
        dataLength: values.dataLength,
        dateFormat: values.dateFormat,
        defaultValue: values.defaultValue,
        isRequired: values.isRequired ? 'Y' : 'N',
        displayOrder: values.displayOrder,
        useYn: values.useYn ? 'Y' : 'N',
      };

      if (editingMapping) {
        await rawDataService.updateMapping(editingMapping.mappingId, request);
        message.success('매핑 규칙이 수정되었습니다.');
      } else {
        await rawDataService.createMapping(request);
        message.success('매핑 규칙이 등록되었습니다.');
      }

      setModalVisible(false);
      fetchMappings();
    } catch (error) {
      message.error('저장에 실패했습니다.');
      console.error(error);
    }
  };

  // 삭제
  const handleDelete = async (mappingId: string) => {
    try {
      await rawDataService.deleteMapping(mappingId);
      message.success('매핑 규칙이 삭제되었습니다.');
      fetchMappings();
    } catch (error) {
      message.error('삭제에 실패했습니다.');
      console.error(error);
    }
  };

  // 테이블 컬럼 정의
  const allColumns: ColumnsType<CsvMapping> = [
    {
      title: '순서',
      dataIndex: 'displayOrder',
      key: 'displayOrder',
      width: columnWidths.displayOrder,
      align: 'center',
      sorter: (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0),
      onHeaderCell: () => ({
        width: columnWidths.displayOrder,
        onResize: handleResize('displayOrder'),
      }),
    },
    {
      title: '원청사',
      dataIndex: 'companyNm',
      key: 'companyNm',
      width: columnWidths.companyNm,
      ellipsis: true,
      sorter: (a, b) => (a.companyNm || '').localeCompare(b.companyNm || ''),
      onHeaderCell: () => ({
        width: columnWidths.companyNm,
        onResize: handleResize('companyNm'),
      }),
    },
    {
      title: '대상테이블',
      dataIndex: 'targetTable',
      key: 'targetTable',
      width: columnWidths.targetTable,
      sorter: (a, b) => (a.targetTable || '').localeCompare(b.targetTable || ''),
      onHeaderCell: () => ({
        width: columnWidths.targetTable,
        onResize: handleResize('targetTable'),
      }),
      render: (value: string) => {
        const option = TARGET_TABLE_OPTIONS.find((o) => o.value === value);
        return option ? option.label : value;
      },
    },
    {
      title: '원본컬럼',
      dataIndex: 'sourceColumn',
      key: 'sourceColumn',
      width: columnWidths.sourceColumn,
      sorter: (a, b) => (a.sourceColumn || '').localeCompare(b.sourceColumn || ''),
      onHeaderCell: () => ({
        width: columnWidths.sourceColumn,
        onResize: handleResize('sourceColumn'),
      }),
    },
    {
      title: '대상컬럼',
      dataIndex: 'targetColumn',
      key: 'targetColumn',
      width: columnWidths.targetColumn,
      sorter: (a, b) => (a.targetColumn || '').localeCompare(b.targetColumn || ''),
      onHeaderCell: () => ({
        width: columnWidths.targetColumn,
        onResize: handleResize('targetColumn'),
      }),
      render: (value: string) => {
        const option = TARGET_COLUMN_OPTIONS.find((o) => o.value === value);
        return option ? `${option.label} (${value})` : value;
      },
    },
    {
      title: '데이터타입',
      dataIndex: 'dataType',
      key: 'dataType',
      width: columnWidths.dataType,
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths.dataType,
        onResize: handleResize('dataType'),
      }),
      render: (value: string) => {
        const colors: Record<string, string> = {
          VARCHAR: 'blue',
          NUMBER: 'green',
          DATE: 'orange',
          CODE: 'purple',
        };
        return <Tag color={colors[value] || 'default'}>{value}</Tag>;
      },
    },
    {
      title: '길이',
      dataIndex: 'dataLength',
      key: 'dataLength',
      width: columnWidths.dataLength,
      align: 'center',
      sorter: (a, b) => (a.dataLength || 0) - (b.dataLength || 0),
      onHeaderCell: () => ({
        width: columnWidths.dataLength,
        onResize: handleResize('dataLength'),
      }),
    },
    {
      title: '날짜형식',
      dataIndex: 'dateFormat',
      key: 'dateFormat',
      width: columnWidths.dateFormat,
      onHeaderCell: () => ({
        width: columnWidths.dateFormat,
        onResize: handleResize('dateFormat'),
      }),
    },
    {
      title: '필수',
      dataIndex: 'isRequired',
      key: 'isRequired',
      width: columnWidths.isRequired,
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths.isRequired,
        onResize: handleResize('isRequired'),
      }),
      render: (value: string) => (
        value === 'Y' ? <Tag color="red">필수</Tag> : '-'
      ),
    },
    {
      title: '기본값',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      width: columnWidths.defaultValue,
      ellipsis: true,
      onHeaderCell: () => ({
        width: columnWidths.defaultValue,
        onResize: handleResize('defaultValue'),
      }),
    },
    {
      title: '사용',
      dataIndex: 'useYn',
      key: 'useYn',
      width: columnWidths.useYn,
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths.useYn,
        onResize: handleResize('useYn'),
      }),
      render: (value: string) => (
        value === 'Y' ? <Tag color="green">사용</Tag> : <Tag color="red">미사용</Tag>
      ),
    },
    {
      title: '작업',
      key: 'action',
      width: 100,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="수정">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.mappingId)}
            okText="삭제"
            cancelText="취소"
          >
            <Tooltip title="삭제">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
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

  return (
    <div className="mapping-grid-page">
      {/* 조회 조건 */}
      <Card className="search-card" size="small" style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline">
          <Form.Item name="companyId" label="원청사">
            {isAdmin ? (
              <Select
                placeholder="전체"
                allowClear
                style={{ width: 150 }}
              >
                {companies.map((c) => (
                  <Select.Option key={c.companyId} value={c.companyId}>
                    {c.companyNm}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <Input
                value={currentUser?.companyNm || currentUser?.companyId || ''}
                disabled
                style={{ width: 150, backgroundColor: '#f5f5f5' }}
              />
            )}
          </Form.Item>
          <Form.Item name="targetTable" label="대상테이블">
            <Select placeholder="전체" allowClear style={{ width: 150 }}>
              {TARGET_TABLE_OPTIONS.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="useYn" label="사용여부">
            <Select placeholder="전체" allowClear style={{ width: 100 }}>
              <Select.Option value="Y">사용</Select.Option>
              <Select.Option value="N">미사용</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="keyword" label="검색어">
            <Input placeholder="컬럼명" style={{ width: 150 }} />
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
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              매핑 추가
            </Button>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={handleCreateDefaultMappings}
              style={{ backgroundColor: '#faad14', borderColor: '#faad14', color: '#fff' }}
            >
              디폴트 매핑 생성
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              CSV 템플릿
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
          <Text type="secondary">전체 {totalCount}건</Text>
        </div>

        <Table
          columns={columns}
          dataSource={mappings}
          rowKey="mappingId"
          loading={loading}
          size="middle"
          bordered
          scroll={{ x: 1400 }}
          pagination={{
            current: page + 1,
            pageSize,
            total: totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `전체 ${total}건`,
            onChange: (p, ps) => {
              setPage(p - 1);
              setPageSize(ps || 20);
            },
          }}
          components={{
            header: {
              cell: ResizableTitle,
            },
          }}
        />
      </Card>

      {/* 등록/수정 모달 */}
      <Modal
        title={editingMapping ? '매핑 규칙 수정' : '매핑 규칙 등록'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="저장"
        cancelText="취소"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            targetTable: 'TB_CREDIT_RAW_DATA',
            dataType: 'VARCHAR',
            isRequired: false,
            useYn: true,
          }}
        >
          <Form.Item
            name="targetTable"
            label="대상 테이블"
            rules={[{ required: true, message: '대상 테이블을 선택하세요.' }]}
          >
            <Select placeholder="데이터가 저장될 테이블">
              {TARGET_TABLE_OPTIONS.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="sourceColumn"
            label="원본 컬럼명"
            rules={[{ required: true, message: '원본 컬럼명을 입력하세요.' }]}
          >
            <Input placeholder="CSV 파일의 컬럼명" />
          </Form.Item>

          <Form.Item
            name="targetColumn"
            label="대상 컬럼"
            rules={[{ required: true, message: '대상 컬럼을 선택하세요.' }]}
          >
            <Select
              placeholder="매핑할 시스템 컬럼"
              showSearch
              optionFilterProp="children"
            >
              {TARGET_COLUMN_OPTIONS.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="dataType" label="데이터 타입">
                <Select>
                  {DATA_TYPE_OPTIONS.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dataLength" label="길이">
                <InputNumber min={1} max={4000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="displayOrder" label="순서">
                <InputNumber min={1} max={999} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="dateFormat"
            label="날짜 형식"
            tooltip="예: yyyyMMdd, yyyy-MM-dd"
          >
            <Input placeholder="날짜 타입인 경우 형식 지정" />
          </Form.Item>

          <Form.Item name="defaultValue" label="기본값">
            <Input placeholder="값이 비어있을 때 사용할 기본값" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="isRequired" label="필수 여부" valuePropName="checked">
                <Switch checkedChildren="필수" unCheckedChildren="선택" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="useYn" label="사용 여부" valuePropName="checked">
                <Switch checkedChildren="사용" unCheckedChildren="미사용" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default MappingGrid;
