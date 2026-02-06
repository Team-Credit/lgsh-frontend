import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, DatePicker, Empty, Form, Input, List, Modal, Select, Space, Tabs, Typography, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';
import { chatService } from '@/services/chatService';
import { chatAuditService } from '@/services/chatAuditService';
import { chatSocket } from '@/services/chatSocket';
import type { ChatAuditRequestCreate, ChatAuditRequestResponse, ChatMessage, ChatRoom } from '@/types';
import './ChatPage.css';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const ChatPage: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [auditTab, setAuditTab] = useState<'chat' | 'audit' | 'approve'>('chat');
  const [auditRequests, setAuditRequests] = useState<ChatAuditRequestResponse[]>([]);
  const [auditPendingRequests, setAuditPendingRequests] = useState<ChatAuditRequestResponse[]>([]);
  const [auditSubmitting, setAuditSubmitting] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditApproveOpen, setAuditApproveOpen] = useState(false);
  const [auditApproveTarget, setAuditApproveTarget] = useState<ChatAuditRequestResponse | null>(null);
  const [auditApproveAction, setAuditApproveAction] = useState<'approve' | 'reject'>('approve');
  const [auditForm] = Form.useForm<{ range?: any; keyword?: string; roomId?: string }>();
  const [auditApproveForm] = Form.useForm<{ comment?: string }>();

  const isAdmin = useMemo(() => {
    const roleId = user?.roleId?.toUpperCase() ?? '';
    const roleNm = user?.roleNm?.toUpperCase() ?? '';
    return roleId.includes('ADMIN') || roleNm.includes('ADMIN') || roleNm.includes('관리자');
  }, [user?.roleId, user?.roleNm]);

  const isManager = useMemo(() => {
    const roleId = user?.roleId?.toUpperCase() ?? '';
    const roleNm = user?.roleNm?.toUpperCase() ?? '';
    return roleId.includes('MANAGER') || roleNm.includes('MANAGER');
  }, [user?.roleId, user?.roleNm]);

  const showApiError = (error: unknown, fallback: string) => {
    const err = error as { response?: { data?: { message?: string } } };
    message.error(err.response?.data?.message || fallback);
  };

  const loadAuditRequests = useCallback(async () => {
    if (!isManager) return;
    setAuditLoading(true);
    try {
      const response = await chatAuditService.listRequests();
      setAuditRequests(response.data.data ?? []);
    } catch (error) {
      showApiError(error, '감사 요청 목록을 불러오지 못했습니다.');
    } finally {
      setAuditLoading(false);
    }
  }, [isManager]);

  const loadAuditPendingRequests = useCallback(async () => {
    if (!isAdmin) return;
    setAuditLoading(true);
    try {
      const response = await chatAuditService.listRequests('PENDING');
      setAuditPendingRequests(response.data.data ?? []);
    } catch (error) {
      showApiError(error, '승인 대기 목록을 불러오지 못했습니다.');
    } finally {
      setAuditLoading(false);
    }
  }, [isAdmin]);

  const handleAuditSubmit = async () => {
    try {
      const values = await auditForm.validateFields();
      const [start, end] = values.range ?? [];
      if (!start || !end) {
        message.warning('기간을 선택해주세요.');
        return;
      }
      const payload: ChatAuditRequestCreate = {
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD'),
        keyword: values.keyword?.trim() || undefined,
        roomId: values.roomId || undefined,
      };
      setAuditSubmitting(true);
      await chatAuditService.createRequest(payload);
      message.success('감사 요청이 등록되었습니다.');
      auditForm.resetFields();
      await loadAuditRequests();
    } catch (error) {
      showApiError(error, '감사 요청 처리에 실패했습니다.');
    } finally {
      setAuditSubmitting(false);
    }
  };

  const handleAuditDownload = async (req: ChatAuditRequestResponse) => {
    try {
      const response = await chatAuditService.downloadRequestPdf(req.requestId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = req.pdfFileNm || 'chat_audit.pdf';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showApiError(error, 'PDF 다운로드에 실패했습니다.');
    }
  };

  const openApproveModal = (req: ChatAuditRequestResponse, action: 'approve' | 'reject') => {
    setAuditApproveTarget(req);
    setAuditApproveAction(action);
    setAuditApproveOpen(true);
    auditApproveForm.resetFields();
  };

  const handleApproveSubmit = async () => {
    if (!auditApproveTarget) return;
    try {
      const values = await auditApproveForm.validateFields();
      await chatAuditService.approveRequest(auditApproveTarget.requestId, {
        approve: auditApproveAction === 'approve',
        comment: values.comment?.trim(),
      });
      message.success(auditApproveAction === 'approve' ? '승인되었습니다.' : '반려되었습니다.');
      setAuditApproveOpen(false);
      setAuditApproveTarget(null);
      await loadAuditPendingRequests();
    } catch (error) {
      showApiError(error, '승인/반려 처리에 실패했습니다.');
    }
  };

  const loadRooms = useCallback(async () => {
    if (!user) return;
    setLoadingRooms(true);
    try {
      const response = await chatService.getRooms({ offset: 0, limit: 100 });
      const roomList = response.data.data ?? [];
      setRooms(roomList);

      if (roomList.length === 0) {
        setSelectedRoomId('');
        setMessages([]);
        return;
      }

      setSelectedRoomId((prev) => {
        if (prev && roomList.some((room) => room.roomId === prev)) return prev;
        return roomList[0].roomId;
      });
    } catch (error) {
      showApiError(error, '채팅방 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingRooms(false);
    }
  }, [user]);

  const loadMessages = useCallback(async (roomId: string) => {
    if (!roomId) return;
    setLoadingMessages(true);
    try {
      const response = await chatService.getMessages(roomId, { offset: 0, limit: 200 });
      const list = response.data.data ?? [];
      setMessages([...list].reverse());
      await chatService.markRoomRead(roomId);
      await loadRooms();
    } catch (error) {
      showApiError(error, '메시지를 불러오지 못했습니다.');
    } finally {
      setLoadingMessages(false);
    }
  }, [loadRooms]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (auditTab === 'audit') {
      void loadAuditRequests();
    } else if (auditTab === 'approve') {
      void loadAuditPendingRequests();
    }
  }, [auditTab, loadAuditRequests, loadAuditPendingRequests]);

  useEffect(() => {
    if (!selectedRoomId) return;
    void loadMessages(selectedRoomId);
  }, [selectedRoomId, loadMessages]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !user) return;

    chatSocket.connect({
      token,
      roomId: selectedRoomId || undefined,
      isAdmin,
      companyId: user.companyId,
      onRoomMessage: (payload) => {
        if (!payload.roomId || payload.roomId !== selectedRoomId) return;
        setMessages((prev) => [...prev, { ...payload, regDt: payload.regDt ?? new Date().toISOString() }]);
      },
      onScopeMessage: () => {
        void loadRooms();
      },
      onError: () => {
        message.warning('실시간 채팅 연결이 끊겼습니다.');
      },
    });

    return () => {
      chatSocket.disconnect();
    };
  }, [isAdmin, loadRooms, selectedRoomId, user]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadRooms();
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [loadRooms]);

  const selectedRoom = rooms.find((room) => room.roomId === selectedRoomId) ?? null;

  const handleSend = async () => {
    if (!selectedRoomId || !inputMessage.trim() || !user?.userId) return;
    setSending(true);
    try {
      await chatService.sendMessage({
        roomId: selectedRoomId,
        senderId: user.userId,
        message: inputMessage.trim(),
      });
      setInputMessage('');
      await loadRooms();
    } catch (error) {
      showApiError(error, '메시지 전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  const auditRoomOptions = useMemo(() => (
    rooms.map((room) => ({ label: room.roomNm, value: room.roomId }))
  ), [rooms]);

  const auditStatusLabel = (status?: string) => {
    if (status === 'APPROVED') return '승인';
    if (status === 'REJECTED') return '반려';
    return '대기';
  };

  const renderAuditRequestList = () => (
    <List
      dataSource={auditRequests}
      loading={auditLoading}
      locale={{ emptyText: '감사 요청이 없습니다.' }}
      renderItem={(item) => (
        <List.Item
          actions={[
            item.status === 'APPROVED' ? (
              <Button type="link" onClick={() => handleAuditDownload(item)}>PDF 다운로드</Button>
            ) : null,
          ]}
        >
          <List.Item.Meta
            title={`상태: ${auditStatusLabel(item.status)} | 기간: ${item.startDate} ~ ${item.endDate}`}
            description={`키워드: ${item.keyword ?? '-'} | 건수: ${item.resultCount ?? 0}건 | ES: ${item.useEs ?? 'N'}`}
          />
        </List.Item>
      )}
    />
  );

  const renderAuditApprovalList = () => (
    <List
      dataSource={auditPendingRequests}
      loading={auditLoading}
      locale={{ emptyText: '승인 대기 요청이 없습니다.' }}
      renderItem={(item) => (
        <List.Item
          actions={[
            <Button key="approve" type="primary" onClick={() => openApproveModal(item, 'approve')}>승인</Button>,
            <Button key="reject" danger onClick={() => openApproveModal(item, 'reject')}>반려</Button>,
          ]}
        >
          <List.Item.Meta
            title={`요청자: ${item.requestUserId} | 기간: ${item.startDate} ~ ${item.endDate}`}
            description={`키워드: ${item.keyword ?? '-'} | 회사: ${item.companyId}`}
          />
        </List.Item>
      )}
    />
  );

  const renderAuditPanel = () => (
    <div>
      <Form
        form={auditForm}
        layout="vertical"
        onFinish={handleAuditSubmit}
      >
        <Form.Item label="기간" name="range" rules={[{ required: true, message: '기간을 선택해주세요.' }]}>
          <RangePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="키워드" name="keyword">
          <Input placeholder="키워드 입력 (선택)" />
        </Form.Item>
        <Form.Item label="채팅방" name="roomId">
          <Select allowClear placeholder="채팅방 선택" options={auditRoomOptions} />
        </Form.Item>
        <Button type="primary" loading={auditSubmitting} onClick={handleAuditSubmit} disabled={!isManager}>
          감사 요청
        </Button>
      </Form>

      <div style={{ marginTop: 16 }}>
        {renderAuditRequestList()}
      </div>
    </div>
  );

  const renderApprovePanel = () => (
    <div>
      {renderAuditApprovalList()}
    </div>
  );

  return (
    <div className="chat-page">
      <Title level={4} className="chat-page-title">실시간 채팅</Title>
      <div className="chat-layout">
        <Card className="chat-room-panel" loading={loadingRooms} title="채팅방">
          {rooms.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="채팅방이 없습니다." />
          ) : (
            <List
              dataSource={rooms}
              renderItem={(room) => (
                <List.Item
                  className={`chat-room-item ${room.roomId === selectedRoomId ? 'active' : ''}`}
                  onClick={() => setSelectedRoomId(room.roomId)}
                >
                  <div className="chat-room-top">
                    <Text strong>{room.roomNm}</Text>
                    <Badge count={room.unreadCnt} overflowCount={99} size="small" />
                  </div>
                  <Text type="secondary" className="chat-room-last">{room.latestMsg || '메시지 없음'}</Text>
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card
          className="chat-message-panel"
          title={selectedRoom ? `${selectedRoom.roomNm} (${selectedRoom.roomType})` : '메시지'}
          loading={auditTab === 'chat' ? loadingMessages : false}
        >
          <Tabs
            activeKey={auditTab}
            onChange={(key) => setAuditTab(key as 'chat' | 'audit' | 'approve')}
            items={[
              {
                key: 'chat',
                label: '채팅',
                children: selectedRoom ? (
                  <>
                    <div className="chat-message-list">
                      {messages.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="메시지가 없습니다." />
                      ) : (
                        messages.map((msg, idx) => {
                          const mine = msg.senderId === user?.userId;
                          return (
                            <div key={`${msg.msgId ?? 'new'}-${idx}`} className={`chat-bubble-wrap ${mine ? 'mine' : ''}`}>
                              <div className={`chat-bubble ${mine ? 'mine' : ''}`}>
                                {!mine && <Text className="chat-sender">{msg.senderId}</Text>}
                                <Text>{msg.message}</Text>
                                <Text type="secondary" className="chat-time">{formatTime(msg.regDt)}</Text>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <Space.Compact className="chat-input-wrap">
                      <TextArea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        placeholder="메시지를 입력하세요."
                        onPressEnter={(e) => {
                          if (!e.shiftKey) {
                            e.preventDefault();
                            void handleSend();
                          }
                        }}
                      />
                      <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={handleSend}>
                        전송
                      </Button>
                    </Space.Compact>
                  </>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="채팅방을 선택하세요." />
                ),
              },
              {
                key: 'audit',
                label: '감사 요청',
                disabled: !isManager,
                children: renderAuditPanel(),
              },
              {
                key: 'approve',
                label: '승인',
                disabled: !isAdmin,
                children: renderApprovePanel(),
              },
            ]}
          />
        </Card>
      </div>

      <Modal
        title={auditApproveAction === 'approve' ? '감사 요청 승인' : '감사 요청 반려'}
        open={auditApproveOpen}
        onOk={handleApproveSubmit}
        onCancel={() => setAuditApproveOpen(false)}
        okText={auditApproveAction === 'approve' ? '승인' : '반려'}
        cancelText="취소"
      >
        <Form form={auditApproveForm} layout="vertical">
          <Form.Item label="코멘트" name="comment">
            <Input.TextArea rows={3} placeholder="선택 입력" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ChatPage;
