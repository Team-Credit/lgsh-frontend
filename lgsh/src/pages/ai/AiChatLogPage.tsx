/**
 * AI 채팅 로그 조회 페이지
 * - 좌측: 로그 그리드
 * - 우측: 선택한 대화 상세
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Form,
  Input,
  Select,
  message,
  Tag,
  Typography,
  DatePicker,
  Empty,
  Spin,
  Tooltip,
  Avatar,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  MessageOutlined,
  UserOutlined,
  RobotOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table/interface';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useAppSelector } from '@/store/hooks';
import { aiChatLogService } from '@/services/aiChatLogService';
import type { AiChatLog } from '@/types/aiChatLog';
import './AiChatLogPage.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AiChatLogPage: React.FC = () => {
  const [searchForm] = Form.useForm();

  // 로그인 사용자 정보
  const currentUser = useAppSelector((state) => state.auth.user);

  // 상태 관리
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<AiChatLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 선택된 로그 및 대화 내용
  const [selectedLog, setSelectedLog] = useState<AiChatLog | null>(null);
  const [conversationMessages, setConversationMessages] = useState<AiChatLog[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);

  // 데이터 조회
  const fetchData = useCallback(async (currentPage = page) => {
    setLoading(true);
    try {
      const searchValues = searchForm.getFieldsValue();
      const dateRange = searchValues.dateRange as [Dayjs, Dayjs] | undefined;

      const response = await aiChatLogService.list({
        page: currentPage - 1,
        size: pageSize,
        userId: currentUser?.userId,
        question: searchValues.question,
        questionType: searchValues.questionType,
        status: searchValues.status,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
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
  }, [page, pageSize, searchForm, currentUser?.userId]);

  // 대화 내용 조회
  const fetchConversation = useCallback(async (conversationId: string) => {
    setLoadingConversation(true);
    try {
      const response = await aiChatLogService.getConversation(conversationId);
      if (response.success && response.data) {
        setConversationMessages(response.data);
      } else {
        message.error(response.message || '대화 내용을 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('대화 조회 오류:', error);
      message.error('대화 내용을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchData();
  }, []);

  // 검색
  const handleSearch = () => {
    setPage(1);
    setSelectedLog(null);
    setConversationMessages([]);
    fetchData(1);
  };

  // 초기화
  const handleReset = () => {
    searchForm.resetFields();
    setPage(1);
    setSelectedLog(null);
    setConversationMessages([]);
    fetchData(1);
  };

  // 행 선택
  const handleRowClick = (record: AiChatLog) => {
    setSelectedLog(record);
    fetchConversation(record.conversationId);
  };

  // 질문 텍스트 자르기
  const truncateText = (text: string, maxLength = 50) => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // 상태 태그 렌더링
  const renderStatusTag = (status?: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Tag color="success">성공</Tag>;
      case 'ERROR':
        return <Tag color="error">오류</Tag>;
      case 'PENDING':
        return <Tag color="processing">진행중</Tag>;
      default:
        return <Tag>{status || '-'}</Tag>;
    }
  };

  // 테이블 컬럼 정의
  const columns: ColumnsType<AiChatLog> = useMemo(() => [
    {
      title: '질문내용',
      dataIndex: 'question',
      key: 'question',
      width: 300,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{truncateText(text, 40)}</span>
        </Tooltip>
      ),
    },
    {
      title: '유형',
      dataIndex: 'questionType',
      key: 'questionType',
      width: 100,
      align: 'center',
      render: (type: string) => {
        const typeMap: Record<string, { label: string; color: string }> = {
          CREDIT: { label: '신용평가', color: 'blue' },
          PERSON: { label: '대상자', color: 'green' },
          GENERAL: { label: '일반', color: 'default' },
        };
        const config = typeMap[type] || { label: type || '-', color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center',
      render: renderStatusTag,
    },
    {
      title: '응답시간',
      dataIndex: 'responseTimeMs',
      key: 'responseTimeMs',
      width: 100,
      align: 'right',
      render: (ms: number) => (ms ? `${(ms / 1000).toFixed(2)}초` : '-'),
    },
    {
      title: '등록일시',
      dataIndex: 'regDt',
      key: 'regDt',
      width: 160,
      sorter: (a, b) => new Date(a.regDt || 0).getTime() - new Date(b.regDt || 0).getTime(),
      render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
  ], []);

  return (
    <div className="ai-chatlog-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <MessageOutlined style={{ marginRight: 8 }} />
          AI 채팅 로그
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          내가 질문한 AI 채팅 기록을 조회합니다.
        </Text>
      </div>

      {/* 검색 영역 */}
      <Card className="search-card" size="small">
        <Form form={searchForm} layout="inline">
          <Form.Item name="question" label="질문내용">
            <Input placeholder="질문 내용 검색" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="questionType" label="유형">
            <Select placeholder="전체" allowClear style={{ width: 120 }}>
              <Option value="CREDIT">신용평가</Option>
              <Option value="PERSON">대상자</Option>
              <Option value="GENERAL">일반</Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="상태">
            <Select placeholder="전체" allowClear style={{ width: 100 }}>
              <Option value="SUCCESS">성공</Option>
              <Option value="ERROR">오류</Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="기간">
            <RangePicker style={{ width: 240 }} />
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

      {/* 메인 콘텐츠: 좌측 그리드 + 우측 상세 */}
      <div className="main-content">
        {/* 좌측: 로그 목록 */}
        <Card className="log-list-card" size="small">
          <div className="card-header">
            <Text strong>채팅 로그</Text>
            <Text type="secondary">전체 {total}건</Text>
          </div>
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="messageId"
            loading={loading}
            size="small"
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total) => `전체 ${total}건`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
                fetchData(p);
              },
            }}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: {
                cursor: 'pointer',
                backgroundColor: selectedLog?.messageId === record.messageId ? '#e6f7ff' : undefined,
              },
            })}
            scroll={{ y: 'calc(100vh - 380px)' }}
          />
        </Card>

        {/* 우측: 대화 상세 */}
        <Card className="conversation-card" size="small">
          <div className="card-header">
            <Text strong>대화 내용</Text>
            {selectedLog && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {selectedLog.conversationId}
              </Text>
            )}
          </div>

          <div className="conversation-content">
            {loadingConversation ? (
              <div className="loading-container">
                <Spin tip="대화 내용을 불러오는 중..." />
              </div>
            ) : selectedLog && conversationMessages.length > 0 ? (
              <div className="messages-container">
                {conversationMessages.map((msg, index) => (
                  <React.Fragment key={msg.messageId || index}>
                    {/* 질문 */}
                    {msg.question && (
                      <div className="chat-message user">
                        <div className="message-avatar">
                          <Avatar
                            size={32}
                            icon={<UserOutlined />}
                            style={{ backgroundColor: '#1890ff' }}
                          />
                        </div>
                        <div className="message-content">
                          <div className="message-header">
                            <Text strong>나</Text>
                            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              {dayjs(msg.regDt).format('YYYY-MM-DD HH:mm:ss')}
                            </Text>
                          </div>
                          <div className="message-text">
                            <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                              {msg.question}
                            </Paragraph>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* 답변 */}
                    {msg.answer && (
                      <div className="chat-message ai">
                        <div className="message-avatar">
                          <Avatar
                            size={32}
                            icon={<RobotOutlined />}
                            style={{ backgroundColor: '#52c41a' }}
                          />
                        </div>
                        <div className="message-content">
                          <div className="message-header">
                            <Text strong>AI 어시스턴트</Text>
                            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              {dayjs(msg.regDt).format('YYYY-MM-DD HH:mm:ss')}
                            </Text>
                          </div>
                          <div className="message-text">
                            <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                              {msg.answer}
                            </Paragraph>
                          </div>
                          {msg.responseTimeMs && (
                            <div className="message-meta">
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                응답시간: {(msg.responseTimeMs / 1000).toFixed(2)}초
                                {msg.tokenCount && ` | 토큰: ${msg.tokenCount}`}
                                {msg.modelId && ` | 모델: ${msg.modelId}`}
                              </Text>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="왼쪽 목록에서 채팅 로그를 선택하세요"
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AiChatLogPage;
