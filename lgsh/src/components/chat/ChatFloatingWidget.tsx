import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Drawer, Empty, Input, List, Space, Typography, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';
import { chatService } from '@/services/chatService';
import { chatSocket } from '@/services/chatSocket';
import type { ChatMessage, ChatRoom } from '@/types';
import './ChatFloatingWidget.css';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface ChatFloatingWidgetProps {
  unreadCount: number;
  onRefreshUnread: () => void;
}

const ChatFloatingWidget: React.FC<ChatFloatingWidgetProps> = ({ unreadCount, onRefreshUnread }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const user = useAppSelector((state) => state.auth.user);
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const isAdmin = useMemo(() => {
    const roleId = user?.roleId?.toUpperCase() ?? '';
    const roleNm = user?.roleNm?.toUpperCase() ?? '';
    return roleId.includes('ADMIN') || roleNm.includes('ADMIN') || roleNm.includes('관리자');
  }, [user?.roleId, user?.roleNm]);

  const formatTime = (value?: string) => {
    if (!value) return '';
    const date = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return value;
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const showApiError = (error: unknown, fallback: string) => {
    const err = error as { response?: { data?: { message?: string } } };
    void messageApi.error(err.response?.data?.message || fallback);
  };

  const loadRooms = useCallback(async () => {
    if (!user) return;
    setLoadingRooms(true);
    try {
      const response = await chatService.getRooms({ offset: 0, limit: 100 });
      const list = response.data.data ?? [];
      setRooms(list);
      setSelectedRoomId((prev) => {
        if (prev && list.some((room) => room.roomId === prev)) return prev;
        return list[0]?.roomId ?? '';
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
      setMessages([...(response.data.data ?? [])].reverse());
      await chatService.markRoomRead(roomId);
      onRefreshUnread();
      await loadRooms();
    } catch (error) {
      showApiError(error, '메시지를 불러오지 못했습니다.');
    } finally {
      setLoadingMessages(false);
    }
  }, [loadRooms, onRefreshUnread]);

  useEffect(() => {
    if (!open) return;
    void loadRooms();
  }, [open, loadRooms]);

  useEffect(() => {
    if (!open || !selectedRoomId) return;
    void loadMessages(selectedRoomId);
  }, [open, selectedRoomId, loadMessages]);

  useEffect(() => {
    if (!open || !user) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    chatSocket.connect({
      token,
      roomId: selectedRoomId || undefined,
      isAdmin,
      companyId: user.companyId,
      onRoomMessage: (payload) => {
        if (payload.roomId !== selectedRoomId) return;
        setMessages((prev) => [...prev, payload]);
      },
      onScopeMessage: () => {
        void loadRooms();
        onRefreshUnread();
      },
      onError: () => {
        void messageApi.warning('실시간 채팅 연결이 끊겼습니다.');
      },
    });

    return () => {
      chatSocket.disconnect();
    };
  }, [open, selectedRoomId, isAdmin, user, loadRooms, onRefreshUnread]);

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
      await loadMessages(selectedRoomId);
      onRefreshUnread();
    } catch (error) {
      showApiError(error, '메시지 전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {contextHolder}
      <div className="chat-fab-wrap">
        <Badge count={unreadCount} overflowCount={99}>
          <Button
            type="primary"
            shape="circle"
            size="large"
            className="chat-fab-btn"
            onClick={() => setOpen(true)}
            aria-label="채팅 열기"
          >
            <span className="chat-fab-emoji" aria-hidden>💬</span>
          </Button>
        </Badge>
      </div>

      <Drawer
        title={<Title level={5} style={{ margin: 0 }}>실시간 채팅</Title>}
        placement="right"
        width={460}
        onClose={() => setOpen(false)}
        open={open}
      >
        <div className="chat-drawer-layout">
          <div className="chat-drawer-rooms">
            {loadingRooms ? (
              <Text type="secondary">채팅방 로딩 중...</Text>
            ) : rooms.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="채팅방이 없습니다." />
            ) : (
              <List
                dataSource={rooms}
                renderItem={(room) => (
                  <List.Item
                    className={`chat-drawer-room-item ${room.roomId === selectedRoomId ? 'active' : ''}`}
                    onClick={() => setSelectedRoomId(room.roomId)}
                  >
                    <div className="chat-drawer-room-top">
                      <Text strong>{room.roomNm}</Text>
                      <Badge count={room.unreadCnt} size="small" overflowCount={99} />
                    </div>
                    <Text type="secondary" className="chat-drawer-room-last">{room.latestMsg || '메시지 없음'}</Text>
                  </List.Item>
                )}
              />
            )}
          </div>

          <div className="chat-drawer-messages">
            {loadingMessages ? (
              <Text type="secondary">메시지 로딩 중...</Text>
            ) : !selectedRoomId ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="채팅방을 선택하세요." />
            ) : (
              <>
                <div className="chat-drawer-message-list">
                  {messages.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="메시지가 없습니다." />
                  ) : (
                    messages.map((msg, index) => {
                      const mine = msg.senderId === user?.userId;
                      return (
                        <div key={`${msg.msgId ?? 'new'}-${index}`} className={`chat-drawer-bubble-wrap ${mine ? 'mine' : ''}`}>
                          <div className={`chat-drawer-bubble ${mine ? 'mine' : ''}`}>
                            {!mine && <Text className="chat-drawer-sender">{msg.senderId}</Text>}
                            <Text>{msg.message}</Text>
                            <Text type="secondary" className="chat-drawer-time">{formatTime(msg.regDt)}</Text>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <Space.Compact className="chat-drawer-input-wrap">
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
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default ChatFloatingWidget;
