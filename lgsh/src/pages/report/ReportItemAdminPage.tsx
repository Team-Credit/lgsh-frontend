/**
 * 레포트 항목 관리 페이지 (관리자 전용)
 * 커스텀 SP 기반 레포트 항목 등록/수정/삭제
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Tooltip,
  message,
  Popconfirm,
  Typography,
  Descriptions,
  Alert,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  CodeOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  TableOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import reportService from '@/services/reportService';
import type { ReportItem, ReportItemCreateRequest, ReportItemUpdateRequest } from '@/types/report';
import './ReportItemAdminPage.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

// 차트 타입 옵션
const CHART_TYPE_OPTIONS = [
  { value: 'TEXT', label: '텍스트', icon: <FileTextOutlined /> },
  { value: 'BAR', label: '막대차트', icon: <BarChartOutlined /> },
  { value: 'PIE', label: '파이차트', icon: <PieChartOutlined /> },
  { value: 'LINE', label: '선차트', icon: <LineChartOutlined /> },
  { value: 'HISTOGRAM', label: '히스토그램', icon: <BarChartOutlined /> },
  { value: 'TABLE', label: '테이블', icon: <TableOutlined /> },
];

// 데이터 소스 옵션
const DATA_SOURCE_OPTIONS = [
  { value: 'FIXED', label: '고정 로직', desc: '시스템에 미리 정의된 로직 사용' },
  { value: 'SP', label: '저장 프로시저', desc: '사용자 정의 SP 호출' },
];

// 출력 형식 옵션
const OUTPUT_FORMAT_OPTIONS = [
  { value: 'SINGLE', label: '단일값', desc: '숫자, 문자열 등 단일 결과' },
  { value: 'LIST', label: '목록', desc: '여러 행의 데이터' },
  { value: 'CHART', label: '차트', desc: 'X축, Y축 기반 차트 데이터' },
  { value: 'TABLE', label: '테이블', desc: '표 형식 데이터' },
];

// 기본 상태 옵션
const DEFAULT_STATUS_OPTIONS = [
  { value: 'REQUIRED', label: '필수', color: 'error' },
  { value: 'AVAILABLE', label: '선택가능', color: 'processing' },
  { value: 'EXCLUDED', label: '제외', color: 'default' },
];

const ReportItemAdminPage: React.FC = () => {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ReportItem | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('basic');

  // 항목 목록 조회
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reportService.getItems('');
      if (response.success) {
        setItems(response.data || []);
      }
    } catch (error) {
      message.error('항목 목록 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 모달 열기 (등록/수정)
  const openModal = (item?: ReportItem) => {
    if (item) {
      setEditingItem(item);
      form.setFieldsValue({
        ...item,
        useYn: item.useYn === 'Y',
      });
    } else {
      setEditingItem(null);
      form.resetFields();
      form.setFieldsValue({
        dataSource: 'SP',
        defaultStatus: 'AVAILABLE',
        outputFormat: 'CHART',
        chartType: 'BAR',
        useYn: true,
      });
    }
    setActiveTab('basic');
    setModalVisible(true);
  };

  // 모달 닫기
  const closeModal = () => {
    setModalVisible(false);
    setEditingItem(null);
    form.resetFields();
  };

  // 저장 처리
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const request = {
        ...values,
        useYn: values.useYn ? 'Y' : 'N',
      };

      if (editingItem) {
        // 수정
        const response = await reportService.updateItem(editingItem.itemId, request as ReportItemUpdateRequest);
        if (response.success) {
          message.success('항목이 수정되었습니다.');
          closeModal();
          fetchItems();
        } else {
          message.error(response.message || '수정에 실패했습니다.');
        }
      } else {
        // 등록
        const response = await reportService.createItem(request as ReportItemCreateRequest);
        if (response.success) {
          message.success('항목이 등록되었습니다.');
          closeModal();
          fetchItems();
        } else {
          message.error(response.message || '등록에 실패했습니다.');
        }
      }
    } catch (error: any) {
      if (error.errorFields) {
        message.error('필수 항목을 확인해주세요.');
      } else {
        message.error('저장에 실패했습니다.');
      }
    }
  };

  // 삭제 처리
  const handleDelete = async (itemId: string) => {
    try {
      const response = await reportService.deleteItem(itemId);
      if (response.success) {
        message.success('항목이 삭제되었습니다.');
        fetchItems();
      } else {
        message.error(response.message || '삭제에 실패했습니다.');
      }
    } catch (error) {
      message.error('삭제에 실패했습니다.');
    }
  };

  // 테이블 컬럼 정의
  const columns: ColumnsType<ReportItem> = [
    {
      title: '순서',
      dataIndex: 'itemOrder',
      key: 'itemOrder',
      width: 60,
      align: 'center',
    },
    {
      title: '항목 ID',
      dataIndex: 'itemId',
      key: 'itemId',
      width: 150,
      render: (value: string, record: ReportItem) => (
        <Space>
          <Text code>{value}</Text>
          {record.systemYn === 'Y' && (
            <Tag color="blue" style={{ marginLeft: 4 }}>시스템</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '항목명',
      dataIndex: 'itemNm',
      key: 'itemNm',
      width: 180,
    },
    {
      title: '데이터 소스',
      dataIndex: 'dataSource',
      key: 'dataSource',
      width: 120,
      align: 'center',
      render: (value: string) => (
        <Tag color={value === 'SP' ? 'purple' : 'default'} icon={value === 'SP' ? <DatabaseOutlined /> : null}>
          {value === 'SP' ? 'SP' : '고정'}
        </Tag>
      ),
    },
    {
      title: 'SP 이름',
      dataIndex: 'spName',
      key: 'spName',
      width: 200,
      render: (value: string) => value ? <Text code>{value}</Text> : '-',
    },
    {
      title: '차트 유형',
      dataIndex: 'chartType',
      key: 'chartType',
      width: 100,
      align: 'center',
      render: (value: string) => {
        const option = CHART_TYPE_OPTIONS.find(o => o.value === value);
        return option ? (
          <Space size={4}>
            {option.icon}
            <span>{option.label}</span>
          </Space>
        ) : value;
      },
    },
    {
      title: '기본 상태',
      dataIndex: 'defaultStatus',
      key: 'defaultStatus',
      width: 100,
      align: 'center',
      render: (value: string) => {
        const option = DEFAULT_STATUS_OPTIONS.find(o => o.value === value);
        return option ? <Tag color={option.color}>{option.label}</Tag> : value;
      },
    },
    {
      title: '사용',
      dataIndex: 'useYn',
      key: 'useYn',
      width: 60,
      align: 'center',
      render: (value: string) => (
        <Tag color={value === 'Y' ? 'success' : 'default'}>
          {value === 'Y' ? '사용' : '미사용'}
        </Tag>
      ),
    },
    {
      title: '관리',
      key: 'actions',
      width: 100,
      align: 'center',
      fixed: 'right',
      render: (_: any, record: ReportItem) => (
        <Space>
          <Tooltip title="수정">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>
          {record.systemYn !== 'Y' && (
            <Popconfirm
              title="삭제 확인"
              description="이 항목을 삭제하시겠습니까?"
              onConfirm={() => handleDelete(record.itemId)}
              okText="삭제"
              cancelText="취소"
            >
              <Tooltip title="삭제">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="report-item-admin-page">
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>레포트 항목 관리</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchItems}>
              새로고침
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              항목 등록
            </Button>
          </Space>
        }
      >
        <Alert
          message="커스텀 SP 기반 레포트 항목"
          description="관리자가 저장 프로시저(SP)를 등록하면 월간 레포트에 동적으로 항목을 추가할 수 있습니다. SP는 표준 출력 형식을 따라야 합니다."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={items}
          rowKey="itemId"
          loading={loading}
          size="middle"
          scroll={{ x: 1200 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `총 ${total}개`,
          }}
        />
      </Card>

      {/* 등록/수정 모달 */}
      <Modal
        title={
          <Space>
            {editingItem ? <EditOutlined /> : <PlusOutlined />}
            <span>{editingItem ? '레포트 항목 수정' : '레포트 항목 등록'}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={closeModal}
        onOk={handleSave}
        width={800}
        okText={editingItem ? '수정' : '등록'}
        cancelText="취소"
      >
        <Form form={form} layout="vertical" className="report-item-form">
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="기본 정보" key="basic">
              <div className="form-grid">
                <Form.Item
                  name="itemId"
                  label="항목 ID"
                  rules={[
                    { required: true, message: '항목 ID를 입력하세요.' },
                    { pattern: /^[A-Z0-9_]+$/, message: '영문 대문자, 숫자, 언더스코어만 가능합니다.' },
                  ]}
                  tooltip="영문 대문자, 숫자, 언더스코어(_)만 사용 가능"
                >
                  <Input
                    placeholder="예: MONTHLY_EVAL_TREND"
                    disabled={!!editingItem}
                    style={{ textTransform: 'uppercase' }}
                  />
                </Form.Item>

                <Form.Item
                  name="itemNm"
                  label="항목명"
                  rules={[{ required: true, message: '항목명을 입력하세요.' }]}
                >
                  <Input placeholder="예: 월별 평가 추이" />
                </Form.Item>

                <Form.Item name="itemNmEng" label="영문명">
                  <Input placeholder="예: Monthly Evaluation Trend" />
                </Form.Item>

                <Form.Item name="itemDesc" label="설명">
                  <TextArea rows={2} placeholder="항목에 대한 설명을 입력하세요." />
                </Form.Item>

                <Form.Item name="defaultStatus" label="기본 상태">
                  <Select options={DEFAULT_STATUS_OPTIONS.map(o => ({ ...o, label: o.label }))} />
                </Form.Item>

                <Form.Item name="iconClass" label="아이콘 클래스">
                  <Input placeholder="예: fa-chart-line" />
                </Form.Item>

                <Form.Item name="itemOrder" label="정렬 순서">
                  <Input type="number" placeholder="숫자가 작을수록 먼저 표시" />
                </Form.Item>

                <Form.Item name="useYn" label="사용 여부" valuePropName="checked">
                  <Switch checkedChildren="사용" unCheckedChildren="미사용" />
                </Form.Item>
              </div>
            </TabPane>

            <TabPane tab="데이터 소스" key="datasource">
              <Form.Item
                name="dataSource"
                label="데이터 소스"
                rules={[{ required: true, message: '데이터 소스를 선택하세요.' }]}
              >
                <Select>
                  {DATA_SOURCE_OPTIONS.map(option => (
                    <Select.Option key={option.value} value={option.value}>
                      <Space>
                        {option.value === 'SP' ? <DatabaseOutlined /> : <CodeOutlined />}
                        <span>{option.label}</span>
                        <Text type="secondary" style={{ fontSize: 12 }}>- {option.desc}</Text>
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.dataSource !== curr.dataSource}>
                {({ getFieldValue }) =>
                  getFieldValue('dataSource') === 'SP' && (
                    <>
                      <Form.Item
                        name="spName"
                        label={
                          <Space>
                            <span>SP 이름</span>
                            <Tooltip title="Oracle 저장 프로시저 이름을 입력하세요. SP는 p_result OUT SYS_REFCURSOR 파라미터를 포함해야 합니다.">
                              <QuestionCircleOutlined />
                            </Tooltip>
                          </Space>
                        }
                        rules={[{ required: true, message: 'SP 이름을 입력하세요.' }]}
                      >
                        <Input placeholder="예: SP_REPORT_MONTHLY_EVAL_TREND" />
                      </Form.Item>

                      <Form.Item
                        name="spParams"
                        label={
                          <Space>
                            <span>SP 파라미터</span>
                            <Tooltip title='JSON 형식으로 파라미터를 정의합니다. :companyId, :year, :month 는 시스템이 자동 치환합니다.'>
                              <QuestionCircleOutlined />
                            </Tooltip>
                          </Space>
                        }
                      >
                        <TextArea
                          rows={3}
                          placeholder='예: {"p_company_id": ":companyId", "p_year": ":year", "p_month": ":month"}'
                        />
                      </Form.Item>
                    </>
                  )
                }
              </Form.Item>

              <Form.Item name="outputFormat" label="출력 형식">
                <Select>
                  {OUTPUT_FORMAT_OPTIONS.map(option => (
                    <Select.Option key={option.value} value={option.value}>
                      <Space>
                        <span>{option.label}</span>
                        <Text type="secondary" style={{ fontSize: 12 }}>- {option.desc}</Text>
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </TabPane>

            <TabPane tab="차트 설정" key="chart">
              <Form.Item name="chartType" label="차트 유형">
                <Select>
                  {CHART_TYPE_OPTIONS.map(option => (
                    <Select.Option key={option.value} value={option.value}>
                      <Space>
                        {option.icon}
                        <span>{option.label}</span>
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <div className="form-grid">
                <Form.Item
                  name="xAxisColumn"
                  label="X축 컬럼명"
                  tooltip="SP 결과에서 X축으로 사용할 컬럼명"
                >
                  <Input placeholder="예: EVAL_MONTH" />
                </Form.Item>

                <Form.Item
                  name="yAxisColumn"
                  label="Y축 컬럼명"
                  tooltip="SP 결과에서 Y축(값)으로 사용할 컬럼명"
                >
                  <Input placeholder="예: EVAL_CNT" />
                </Form.Item>

                <Form.Item
                  name="seriesColumn"
                  label="시리즈 컬럼명"
                  tooltip="다중 시리즈 차트에서 범례로 사용할 컬럼명"
                >
                  <Input placeholder="예: GRADE_TYPE" />
                </Form.Item>

                <Form.Item
                  name="labelFormat"
                  label="라벨 포맷"
                  tooltip="{value}는 실제 값으로 치환됩니다"
                >
                  <Input placeholder="예: {value}건" />
                </Form.Item>
              </div>

              <Form.Item
                name="colorScheme"
                label="색상 스킴 (JSON)"
                tooltip="차트에 사용할 색상 배열"
              >
                <Input placeholder='예: ["#1890ff", "#52c41a", "#faad14"]' />
              </Form.Item>

              <Form.Item name="customConfig" label="커스텀 설정 (JSON)">
                <TextArea rows={3} placeholder="추가 설정이 필요한 경우 JSON 형식으로 입력" />
              </Form.Item>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>

      {/* SP 작성 가이드 */}
      <Card title="SP 작성 가이드" style={{ marginTop: 16 }} size="small">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="기본 형식">
            <Paragraph code copyable style={{ marginBottom: 0 }}>
{`CREATE OR REPLACE PROCEDURE SP_REPORT_YOUR_NAME (
    p_company_id    IN  VARCHAR2,
    p_year          IN  NUMBER,
    p_month         IN  NUMBER,
    p_result        OUT SYS_REFCURSOR
) AS
BEGIN
    OPEN p_result FOR
    SELECT
        column1 AS X_AXIS_VALUE,
        column2 AS Y_AXIS_VALUE
    FROM your_table
    WHERE company_id = p_company_id
      AND year = p_year
      AND month = p_month;
END;`}
            </Paragraph>
          </Descriptions.Item>
          <Descriptions.Item label="주의사항">
            <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
              <li>반드시 <code>p_result OUT SYS_REFCURSOR</code> 파라미터를 포함해야 합니다.</li>
              <li>X축, Y축 컬럼명은 설정과 일치해야 합니다.</li>
              <li>에러 발생 시 EXCEPTION 처리를 권장합니다.</li>
            </ul>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default ReportItemAdminPage;
