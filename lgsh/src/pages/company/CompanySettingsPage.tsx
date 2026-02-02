/**
 * 원청사 설정 페이지
 * M0602 - 원청사별 라이선스(최대 사용자 수) 관리
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
  Tag,
  Progress,
  Typography,
  Popover,
  Checkbox,
  Divider,
  InputNumber,
  Tooltip,
  DatePicker,
} from 'antd';
import dayjs from 'dayjs';
import {
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  SlidersOutlined,
  EditOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table/interface';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import type { CompanySettings, CompanySettingsParams, LicenseUpdateRequest } from '@/types';
import { companySettingsService } from '@/services/companySettingsService';
import { useCommonCodes } from '@/hooks';
import { getLicenseUsageColor, getLicenseStatusLabel } from '@/types/companySetting';
import './CompanySettingsPage.css';
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

const CompanySettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();

  // 공통코드 조회
  const { codeMap, getLabel } = useCommonCodes(['COMPANY_TYPE', 'CONTRACT_STATUS']);

  // 상태 관리
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<CompanySettings[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 컬럼 너비 초기값
  const defaultColumnWidths = {
    companyId: 120,
    companyNm: 180,
    companyType: 100,
    contractStatus: 100,
    contractPeriod: 200,
    maxUsers: 120,
    currentUsers: 120,
    usageRate: 180,
    action: 100,
  };

  // localStorage에서 저장된 컬럼 너비 불러오기
  const getStoredColumnWidths = () => {
    try {
      const stored = localStorage.getItem('companySettingsColumnWidths');
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
  const [currentRecord, setCurrentRecord] = useState<CompanySettings | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // 컬럼 표시 설정
  const defaultVisibleColumns = {
    companyId: true,
    companyNm: true,
    companyType: true,
    contractStatus: true,
    contractPeriod: true,
    maxUsers: true,
    currentUsers: true,
    usageRate: true,
  };

  const getStoredVisibleColumns = () => {
    try {
      const stored = localStorage.getItem('companySettingsVisibleColumns');
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
        localStorage.setItem('companySettingsVisibleColumns', JSON.stringify(newState));
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
      localStorage.removeItem('companySettingsVisibleColumns');
    } catch (error) {
      console.error('컬럼 표시 설정 초기화 실패:', error);
    }
  };

  // 컬럼 레이블 정의
  const columnLabels: { [key: string]: string } = {
    companyId: '원청사ID',
    companyNm: '원청사명',
    companyType: '업종',
    contractStatus: '계약상태',
    contractPeriod: '계약기간',
    maxUsers: '최대사용자',
    currentUsers: '현재사용자',
    usageRate: '사용률',
  };

  // 데이터 조회
  const fetchData = useCallback(async (currentPage = page) => {
    setLoading(true);
    try {
      const searchValues = searchForm.getFieldsValue();
      const params: CompanySettingsParams = {
        page: currentPage - 1,
        size: pageSize,
        keyword: searchValues.keyword,
        companyType: searchValues.companyType,
        contractStatus: searchValues.contractStatus,
        useYn: searchValues.useYn,
      };

      const response = await companySettingsService.getSettingsList(params);

      setDataSource(response.content);
      setTotal(response.totalCount);

      if (response.content.length === 0) {
        message.info('조회된 데이터가 없습니다.');
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

  // 수정 모달 열기
  const handleEdit = (record: CompanySettings) => {
    setCurrentRecord(record);
    form.setFieldsValue({
      maxUsers: record.maxUsers,
      contractStartDt: record.contractStartDt ? dayjs(record.contractStartDt) : null,
      contractEndDt: record.contractEndDt ? dayjs(record.contractEndDt) : null,
    });
    setModalOpen(true);
  };

  // 저장
  const handleSubmit = async () => {
    if (!currentRecord) return;

    try {
      const values = await form.validateFields();
      setModalLoading(true);

      const request: LicenseUpdateRequest = {
        maxUsers: values.maxUsers,
        contractStartDt: values.contractStartDt ? values.contractStartDt.format('YYYY-MM-DD') : undefined,
        contractEndDt: values.contractEndDt ? values.contractEndDt.format('YYYY-MM-DD') : undefined,
      };

      await companySettingsService.updateLicense(currentRecord.companyId, request);

      message.success('원청사 설정이 수정되었습니다.');
      setModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('저장 오류:', error);
      if (error instanceof Error && 'errorFields' in error) {
        message.error('입력값을 확인해주세요.');
      } else {
        const errorMessage = error?.response?.data?.message || error?.message || '저장 중 오류가 발생했습니다.';
        message.error(errorMessage);
      }
    } finally {
      setModalLoading(false);
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
        localStorage.setItem('companySettingsColumnWidths', JSON.stringify(newWidths));
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
      localStorage.removeItem('companySettingsColumnWidths');
      localStorage.removeItem('companySettingsVisibleColumns');
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

  // 테이블 컬럼 정의
  const allColumns: ColumnsType<CompanySettings> = [
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
      title: '계약기간',
      key: 'contractPeriod',
      width: columnWidths.contractPeriod,
      sorter: (a, b) => (a.contractStartDt || '').localeCompare(b.contractStartDt || ''),
      onHeaderCell: () => ({
        width: columnWidths.contractPeriod,
        onResize: handleResize('contractPeriod'),
      }),
      render: (_, record) => {
        const start = record.contractStartDt || '-';
        const end = record.contractEndDt || '무기한';
        const daysLeft = record.daysUntilExpiry;

        return (
          <div>
            <div style={{ fontSize: 13 }}>{start} ~ {end}</div>
            {daysLeft !== undefined && daysLeft !== null && daysLeft < 9999 && (
              <div style={{ fontSize: 11, color: daysLeft <= 30 ? '#ff4d4f' : '#999' }}>
                ({daysLeft > 0 ? `${daysLeft}일 남음` : daysLeft === 0 ? '오늘 만료' : '만료됨'})
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: (
        <span>
          최대사용자
          <Tooltip title="원청사별 최대 등록 가능한 사용자 수">
            <InfoCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
          </Tooltip>
        </span>
      ),
      dataIndex: 'maxUsers',
      key: 'maxUsers',
      width: columnWidths.maxUsers,
      align: 'right',
      sorter: (a, b) => (a.maxUsers || 0) - (b.maxUsers || 0),
      onHeaderCell: () => ({
        width: columnWidths.maxUsers,
        onResize: handleResize('maxUsers'),
      }),
      render: (value: number) => (
        <span style={{ fontWeight: 500 }}>{value?.toLocaleString() || 0}명</span>
      ),
    },
    {
      title: '현재사용자',
      dataIndex: 'currentUsers',
      key: 'currentUsers',
      width: columnWidths.currentUsers,
      align: 'right',
      sorter: (a, b) => (a.currentUsers || 0) - (b.currentUsers || 0),
      onHeaderCell: () => ({
        width: columnWidths.currentUsers,
        onResize: handleResize('currentUsers'),
      }),
      render: (value: number) => `${value?.toLocaleString() || 0}명`,
    },
    {
      title: '사용률',
      dataIndex: 'usageRate',
      key: 'usageRate',
      width: columnWidths.usageRate,
      sorter: (a, b) => (a.usageRate || 0) - (b.usageRate || 0),
      onHeaderCell: () => ({
        width: columnWidths.usageRate,
        onResize: handleResize('usageRate'),
      }),
      render: (_, record) => {
        const rate = record.usageRate || 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress
              percent={rate}
              size="small"
              strokeColor={getLicenseUsageColor(rate)}
              style={{ flex: 1, minWidth: 80 }}
              format={(percent) => `${percent?.toFixed(1)}%`}
            />
            <Tag color={getLicenseUsageColor(rate)} style={{ margin: 0, minWidth: 55, textAlign: 'center' }}>
              {getLicenseStatusLabel(rate)}
            </Tag>
          </div>
        );
      },
    },
    {
      title: '관리',
      key: 'action',
      width: columnWidths.action,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
          title="수정"
        >
          수정
        </Button>
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

  return (
    <div className="company-settings-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <SlidersOutlined style={{ marginRight: 8 }} />
          원청사 설정
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          원청사별 라이선스(최대 사용자 수)를 관리합니다.
        </Text>
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
          <Form.Item name="useYn" label="사용여부">
            <Select placeholder="전체" allowClear style={{ width: 100 }}>
              <Option value="Y">사용</Option>
              <Option value="N">미사용</Option>
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

      {/* 수정 모달 */}
      <Modal
        title={
          <Space>
            <SlidersOutlined />
            원청사 설정
          </Space>
        }
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={modalLoading}
        width={560}
        okText="저장"
        cancelText="취소"
      >
        {currentRecord && (
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <div className="license-info-section">
              <div className="info-row">
                <span className="info-label">원청사:</span>
                <span className="info-value">{currentRecord.companyNm} ({currentRecord.companyId})</span>
              </div>
              <div className="info-row">
                <span className="info-label">현재 사용자:</span>
                <span className="info-value">{currentRecord.currentUsers?.toLocaleString() || 0}명</span>
              </div>
              <div className="info-row">
                <span className="info-label">현재 사용률:</span>
                <Progress
                  percent={currentRecord.usageRate || 0}
                  size="small"
                  strokeColor={getLicenseUsageColor(currentRecord.usageRate || 0)}
                  style={{ width: 200 }}
                  format={(percent) => `${percent?.toFixed(1)}%`}
                />
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }}>계약 기간</Divider>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item
                label="계약 시작일"
                name="contractStartDt"
                style={{ flex: 1 }}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="시작일 선택"
                  format="YYYY-MM-DD"
                />
              </Form.Item>
              <Form.Item
                label="계약 종료일"
                name="contractEndDt"
                style={{ flex: 1 }}
                extra={
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    * 미지정시 무기한
                  </Text>
                }
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="종료일 선택 (미지정시 무기한)"
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </div>

            <Divider style={{ margin: '16px 0' }}>라이선스</Divider>
            <Form.Item
              label="최대 사용자 수"
              name="maxUsers"
              rules={[
                { required: true, message: '최대 사용자 수를 입력하세요.' },
                {
                  type: 'number',
                  min: currentRecord.currentUsers || 1,
                  message: `현재 사용자 수(${currentRecord.currentUsers}명)보다 작게 설정할 수 없습니다.`,
                },
              ]}
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  * 현재 사용자 수보다 작게 설정할 수 없습니다.
                </Text>
              }
            >
              <InputNumber
                min={currentRecord.currentUsers || 1}
                max={99999}
                style={{ width: '100%' }}
                placeholder="최대 사용자 수 입력"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as unknown as number}
                addonAfter="명"
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default CompanySettingsPage;
