/**
 * AI 오류 해결 패널 컴포넌트
 * 에러 목록 및 AI 제안 해결
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Select,
  Input,
  Modal,
  Form,
  message,
  Tag,
  Typography,
  Empty,
  Spin,
  Descriptions,
  Divider,
  Alert,
  Row,
  Col,
  Statistic,
  Tooltip,
} from 'antd';
import {
  RobotOutlined,
  CheckOutlined,
  ReloadOutlined,
  BulbOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import rawDataService from '@/services/rawDataService';
import type {
  ErrorLog,
  ErrorSummary,
  ErrorResolveRequest,
  UploadProgress,
} from '@/types/rawData';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ErrorResolverPanelProps {
  companyId: string;
  uploadId: string | null;
  onErrorResolved?: () => void;
}

const ErrorResolverPanel: React.FC<ErrorResolverPanelProps> = ({
  companyId,
  uploadId,
  onErrorResolved,
}) => {
  // 상태
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);

  // 필터
  const [filterErrorType, setFilterErrorType] = useState<string | undefined>();
  const [filterResolvedYn, setFilterResolvedYn] = useState<string>('N');

  // 선택된 에러
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);

  // 에러 요약
  const [summary, setSummary] = useState<ErrorSummary[]>([]);

  // 업로드 정보 (에러 메시지 포함)
  const [uploadInfo, setUploadInfo] = useState<UploadProgress | null>(null);

  // AI 제안 요청 중
  const [aiLoading, setAiLoading] = useState(false);

  // 해결 모달
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [form] = Form.useForm();

  // 에러 목록 조회
  const fetchErrors = useCallback(async () => {
    if (!uploadId) return;

    setLoading(true);
    try {
      const result = await rawDataService.getErrorList({
        uploadId,
        errorType: filterErrorType,
        resolvedYn: filterResolvedYn,
        page,
        size: pageSize,
      });
      setErrors(result.content);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('에러 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [uploadId, filterErrorType, filterResolvedYn, page, pageSize]);

  // 에러 요약 조회
  const fetchSummary = useCallback(async () => {
    if (!uploadId) return;

    try {
      const result = await rawDataService.getErrorSummary(uploadId);
      setSummary(result);
    } catch (error) {
      console.error('에러 요약 조회 실패:', error);
    }
  }, [uploadId]);

  // 업로드 정보 조회 (에러 메시지 포함)
  const fetchUploadInfo = useCallback(async () => {
    if (!uploadId) return;

    try {
      const result = await rawDataService.getUploadProgress(uploadId);
      setUploadInfo(result);
    } catch (error) {
      console.error('업로드 정보 조회 실패:', error);
    }
  }, [uploadId]);

  useEffect(() => {
    if (uploadId) {
      fetchErrors();
      fetchSummary();
      fetchUploadInfo();
    } else {
      setErrors([]);
      setTotalCount(0);
      setSummary([]);
      setUploadInfo(null);
    }
  }, [uploadId, fetchErrors, fetchSummary, fetchUploadInfo]);

  // AI 제안 요청
  const handleAiSuggest = async (errorLogId: string) => {
    setAiLoading(true);
    try {
      await rawDataService.requestAiSuggestion(errorLogId);
      message.success('AI 제안이 요청되었습니다.');
      fetchErrors();
    } catch (error) {
      message.error('AI 제안 요청 실패');
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  // 해결 처리
  const handleResolve = async () => {
    if (!selectedError) return;

    try {
      const values = await form.validateFields();
      setResolving(true);

      const request: ErrorResolveRequest = {
        errorLogId: selectedError.errorLogId,
        resolvedValue: values.resolvedValue,
        resolvedMethod: values.resolvedMethod,
      };

      await rawDataService.resolveError(selectedError.errorLogId, request);
      message.success('오류가 해결되었습니다.');

      setResolveModalVisible(false);
      setSelectedError(null);
      fetchErrors();
      fetchSummary();
      onErrorResolved?.();
    } catch (error) {
      message.error('해결 처리 실패');
      console.error(error);
    } finally {
      setResolving(false);
    }
  };

  // 해결 모달 열기
  const openResolveModal = (error: ErrorLog) => {
    setSelectedError(error);
    form.resetFields();
    form.setFieldsValue({
      resolvedValue: error.aiSuggestion || error.sourceValue || '',
      resolvedMethod: error.aiSuggestion ? 'AI' : 'MANUAL',
    });
    setResolveModalVisible(true);
  };

  // 에러 타입 태그
  const renderErrorTypeTag = (type: string) => {
    const config: Record<string, { color: string; text: string }> = {
      VALIDATION: { color: 'orange', text: '유효성검증' },
      CONVERSION: { color: 'red', text: '변환오류' },
      REQUIRED: { color: 'volcano', text: '필수값누락' },
      LENGTH: { color: 'magenta', text: '길이초과' },
      FORMAT: { color: 'purple', text: '형식오류' },
    };
    const cfg = config[type] || { color: 'default', text: type };
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };

  // 테이블 컬럼
  const columns: ColumnsType<ErrorLog> = [
    {
      title: '행',
      dataIndex: 'rowNum',
      key: 'rowNum',
      width: 70,
      align: 'center',
    },
    {
      title: '컬럼',
      dataIndex: 'columnNm',
      key: 'columnNm',
      width: 120,
    },
    {
      title: '타입',
      dataIndex: 'errorType',
      key: 'errorType',
      width: 100,
      render: renderErrorTypeTag,
    },
    {
      title: '원본값',
      dataIndex: 'sourceValue',
      key: 'sourceValue',
      width: 150,
      ellipsis: true,
    },
    {
      title: '에러 메시지',
      dataIndex: 'errorMsg',
      key: 'errorMsg',
      ellipsis: true,
    },
    {
      title: 'AI 제안',
      dataIndex: 'aiSuggestion',
      key: 'aiSuggestion',
      width: 80,
      align: 'center',
      render: (v) => (
        v ? <Tag color="blue" icon={<BulbOutlined />}>있음</Tag> : '-'
      ),
    },
    {
      title: '상태',
      dataIndex: 'resolvedYn',
      key: 'resolvedYn',
      width: 80,
      align: 'center',
      render: (v) => (
        v === 'Y' ? (
          <Tag color="success" icon={<CheckOutlined />}>해결됨</Tag>
        ) : (
          <Tag color="error" icon={<ExclamationCircleOutlined />}>미해결</Tag>
        )
      ),
    },
    {
      title: '작업',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          {record.resolvedYn !== 'Y' && (
            <>
              <Tooltip title="AI 제안 요청">
                <Button
                  type="text"
                  icon={<RobotOutlined />}
                  onClick={() => handleAiSuggest(record.errorLogId)}
                  loading={aiLoading}
                />
              </Tooltip>
              <Tooltip title="해결 처리">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openResolveModal(record)}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  // 업로드 미선택 시
  if (!uploadId) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="업로드 이력을 선택하세요"
      >
        <Text type="secondary">
          데이터업로드 탭에서 업로드 이력을 선택하면 오류 목록이 표시됩니다.
        </Text>
      </Empty>
    );
  }

  return (
    <div className="error-resolver-container">
      {/* 에러 목록 패널 */}
      <div className="error-list-panel">
        {/* 업로드 실패 메시지 */}
        {uploadInfo?.uploadStatus === 'FAILED' && uploadInfo?.errorMsg && (
          <Alert
            message="업로드 실패"
            description={uploadInfo.errorMsg}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 요약 카드 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            {summary.slice(0, 4).map((s) => (
              <Col span={6} key={s.errorType + s.errorCode}>
                <Statistic
                  title={s.errorTypeNm || s.errorType}
                  value={s.unresolvedCount}
                  suffix={`/ ${s.errorCount}`}
                  valueStyle={{
                    color: s.unresolvedCount > 0 ? '#cf1322' : '#3f8600',
                  }}
                />
              </Col>
            ))}
          </Row>
        </Card>

        {/* 필터 */}
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="에러 타입"
            allowClear
            style={{ width: 150 }}
            value={filterErrorType}
            onChange={setFilterErrorType}
          >
            <Select.Option value="VALIDATION">유효성검증</Select.Option>
            <Select.Option value="CONVERSION">변환오류</Select.Option>
            <Select.Option value="REQUIRED">필수값누락</Select.Option>
            <Select.Option value="LENGTH">길이초과</Select.Option>
          </Select>
          <Select
            placeholder="해결 상태"
            style={{ width: 120 }}
            value={filterResolvedYn}
            onChange={setFilterResolvedYn}
          >
            <Select.Option value="">전체</Select.Option>
            <Select.Option value="N">미해결</Select.Option>
            <Select.Option value="Y">해결됨</Select.Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchErrors}>
            새로고침
          </Button>
        </Space>

        {/* 에러 테이블 */}
        <Table
          columns={columns}
          dataSource={errors}
          rowKey="errorLogId"
          loading={loading}
          size="small"
          rowClassName={(record) =>
            record.resolvedYn === 'Y' ? 'error-row-resolved' : 'error-row-error'
          }
          onRow={(record) => ({
            onClick: () => setSelectedError(record),
            style: {
              cursor: 'pointer',
              background: selectedError?.errorLogId === record.errorLogId ? '#e6f7ff' : undefined,
            },
          })}
          pagination={{
            current: page + 1,
            pageSize,
            total: totalCount,
            showTotal: (total) => `총 ${total}건`,
            onChange: (p) => setPage(p - 1),
          }}
        />
      </div>

      {/* 상세 패널 */}
      <div className="error-detail-panel">
        <Card
          title="오류 상세"
          className="error-detail-card"
          extra={
            selectedError && selectedError.resolvedYn !== 'Y' && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => openResolveModal(selectedError)}
              >
                해결
              </Button>
            )
          }
        >
          {selectedError ? (
            <>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="행 번호">
                  {selectedError.rowNum}
                </Descriptions.Item>
                <Descriptions.Item label="컬럼명">
                  {selectedError.columnNm}
                </Descriptions.Item>
                <Descriptions.Item label="에러 타입">
                  {renderErrorTypeTag(selectedError.errorType)}
                </Descriptions.Item>
                <Descriptions.Item label="원본값">
                  <Text code>{selectedError.sourceValue || '(빈값)'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="에러 메시지">
                  <Text type="danger">{selectedError.errorMsg}</Text>
                </Descriptions.Item>
                {selectedError.resolvedYn === 'Y' && (
                  <>
                    <Descriptions.Item label="해결값">
                      <Text code type="success">{selectedError.resolvedValue}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="해결 방법">
                      {selectedError.resolvedMethod === 'AI' ? (
                        <Tag color="blue" icon={<RobotOutlined />}>AI</Tag>
                      ) : selectedError.resolvedMethod === 'MANUAL' ? (
                        <Tag color="green" icon={<EditOutlined />}>수동</Tag>
                      ) : (
                        <Tag>{selectedError.resolvedMethod}</Tag>
                      )}
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>

              {/* AI 제안 카드 */}
              {selectedError.aiSuggestion && (
                <Card
                  size="small"
                  className="ai-suggestion-card"
                  title={
                    <span>
                      <RobotOutlined style={{ marginRight: 8 }} />
                      AI 제안
                    </span>
                  }
                  style={{ marginTop: 16 }}
                >
                  <Paragraph className="ai-suggestion-content">
                    {selectedError.aiSuggestion}
                  </Paragraph>
                </Card>
              )}

              {/* AI 제안 요청 버튼 */}
              {!selectedError.aiSuggestion && selectedError.resolvedYn !== 'Y' && (
                <Button
                  type="dashed"
                  icon={<RobotOutlined />}
                  onClick={() => handleAiSuggest(selectedError.errorLogId)}
                  loading={aiLoading}
                  style={{ marginTop: 16, width: '100%' }}
                >
                  AI 해결 제안 요청
                </Button>
              )}
            </>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="에러를 선택하세요"
            />
          )}
        </Card>
      </div>

      {/* 해결 모달 */}
      <Modal
        title="오류 해결"
        open={resolveModalVisible}
        onOk={handleResolve}
        onCancel={() => setResolveModalVisible(false)}
        okText="해결 완료"
        cancelText="취소"
        confirmLoading={resolving}
      >
        <Form form={form} layout="vertical">
          {selectedError && (
            <Alert
              message={`${selectedError.columnNm} 컬럼, ${selectedError.rowNum}행`}
              description={selectedError.errorMsg}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item
            name="resolvedValue"
            label="해결값"
            rules={[{ required: true, message: '해결값을 입력하세요.' }]}
          >
            <TextArea rows={3} placeholder="수정된 값을 입력하세요" />
          </Form.Item>

          <Form.Item
            name="resolvedMethod"
            label="해결 방법"
            rules={[{ required: true, message: '해결 방법을 선택하세요.' }]}
          >
            <Select>
              <Select.Option value="MANUAL">수동 수정</Select.Option>
              <Select.Option value="AI">AI 제안 적용</Select.Option>
              <Select.Option value="SKIP">스킵 (무시)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ErrorResolverPanel;
