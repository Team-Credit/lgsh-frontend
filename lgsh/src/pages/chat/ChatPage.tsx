import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Empty, Input, List, Space, Typography, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';
import { chatService } from '@/services/chatService';
import { chatSocket } from '@/services/chatSocket';
import type { ChatMessage, ChatRoom } from '@/types';
import './ChatPage.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

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

  const isAdmin = useMemo(() => {
    const roleId = user?.roleId?.toUpperCase() ?? '';
    const roleNm = user?.roleNm?.toUpperCase() ?? '';
    return roleId.includes('ADMIN') || roleNm.includes('ADMIN') || roleNm.includes('관리자');
  }, [user?.roleId, user?.roleNm]);

  const showApiError = (error: unknown, fallback: string) => {
    const err = error as { response?: { data?: { message?: string } } };
    message.error(err.response?.data?.message || fallback);
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
          loading={loadingMessages}
        >
          {selectedRoom ? (
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
          )}
        </Card>
      </div>
    </div>
  );
};

export default ChatPage;
