/**
 * AI 챗봇 페이지
 * 신용평가 관련 AI 기반 질의응답 서비스
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Typography,
  Avatar,
  Tooltip,
  message,
  Spin,
  Empty,
} from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  LikeOutlined,
  DislikeOutlined,
  LikeFilled,
  DislikeFilled,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import aiChatService from '@/services/aiChatService';
import type { ChatMessage, AiSuggestion } from '@/types/aiChat';
import './AiChatPage.css';

const { TextArea } = Input;
const { Text, Title } = Typography;

const AiChatPage: React.FC = () => {
  // 상태
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 스크롤 하단 유지
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 초기 추천 질문 로드
  useEffect(() => {
    loadSuggestions();
  }, []);

  // 추천 질문 로드
  const loadSuggestions = async (lastQuestion?: string) => {
    try {
      const response = await aiChatService.getSuggestions(undefined, lastQuestion);
      if (response.success && response.data) {
        setSuggestions(response.data);
      }
    } catch (error) {
      console.error('추천 질문 로드 실패:', error);
    }
  };

  // 메시지 전송
  const handleSendMessage = useCallback(
    async (text?: string) => {
      const question = (text || inputValue).trim();
      if (!question || isLoading) return;

      setInputValue('');
      setIsLoading(true);

      // 사용자 메시지 추가
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: question,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // AI 응답 메시지 (스트리밍 시작)
      const aiMessageId = `ai-${Date.now()}`;
      setCurrentStreamingId(aiMessageId);
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        type: 'ai',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, aiMessage]);

      // SSE 스트리밍 시작
      abortControllerRef.current = aiChatService.streamChat(
        question,
        conversationId,
        undefined, // personId
        // onChunk
        (chunk: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, content: msg.content + chunk } : msg
            )
          );
        },
        // onDone
        (messageId: string, convId: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, id: messageId, isStreaming: false } : msg
            )
          );
          setConversationId(convId);
          setCurrentStreamingId(null);
          setIsLoading(false);

          // 추천 질문 갱신
          loadSuggestions(question);
        },
        // onError
        (errorCode: string, errorMessage: string) => {
          message.error(errorMessage || 'AI 응답 생성에 실패했습니다.');
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: '응답 생성에 실패했습니다. 다시 시도해주세요.', isStreaming: false }
                : msg
            )
          );
          setCurrentStreamingId(null);
          setIsLoading(false);
        },
        // onSuggestions
        (newSuggestions: AiSuggestion[]) => {
          setSuggestions(newSuggestions);
        }
      );
    },
    [inputValue, isLoading, conversationId]
  );

  // 피드백 처리
  const handleFeedback = async (messageId: string, rating: 'like' | 'dislike') => {
    // 임시 ID는 피드백 불가
    if (messageId.startsWith('ai-')) {
      message.warning('응답이 완료된 후 피드백을 등록할 수 있습니다.');
      return;
    }

    try {
      await aiChatService.saveFeedback({
        messageId,
        rating: rating === 'like' ? 1 : -1,
      });

      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, feedback: rating } : msg))
      );

      message.success('피드백을 등록했습니다.');
    } catch (error) {
      message.error('피드백 저장에 실패했습니다.');
    }
  };

  // 추천 질문 클릭
  const handleSuggestionClick = (suggestion: AiSuggestion) => {
    handleSendMessage(suggestion.suggestionText);
  };

  // 키보드 이벤트 (Enter로 전송)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 새 대화 시작
  const handleNewConversation = () => {
    // 스트리밍 중이면 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setMessages([]);
    setConversationId(undefined);
    setCurrentStreamingId(null);
    setIsLoading(false);
    setInputValue('');
    loadSuggestions();

    message.info('새 대화를 시작합니다.');
  };

  // 대화 삭제
  const handleDeleteConversation = async () => {
    if (!conversationId) {
      handleNewConversation();
      return;
    }

    try {
      await aiChatService.deleteConversation(conversationId);
      handleNewConversation();
      message.success('대화가 삭제되었습니다.');
    } catch (error) {
      message.error('대화 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="ai-chat-container">
      <Card
        title={
          <div className="ai-chat-header">
            <Space>
              <RobotOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={4} style={{ margin: 0 }}>
                AI 신용분석 어시스턴트
              </Title>
            </Space>
            <Space>
              <Tooltip title="새 대화">
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={handleNewConversation}
                />
              </Tooltip>
              <Tooltip title="대화 삭제">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteConversation}
                  disabled={messages.length === 0}
                />
              </Tooltip>
            </Space>
          </div>
        }
        className="ai-chat-card"
        bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        {/* 메시지 영역 */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <RobotOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 24 }} />
              <Title level={4}>안녕하세요! 신용분석 AI 어시스턴트입니다.</Title>
              <Text type="secondary">
                신용점수, 등급, 분석 결과에 대해 궁금한 점을 물어보세요.
              </Text>

              {/* 초기 추천 질문 */}
              {suggestions.length > 0 && (
                <div className="welcome-suggestions">
                  <Text type="secondary" style={{ marginBottom: 12, display: 'block' }}>
                    이런 질문을 해보세요:
                  </Text>
                  <Space wrap>
                    {suggestions.slice(0, 4).map((suggestion, index) => (
                      <Button
                        key={index}
                        size="small"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion.suggestionText}
                      </Button>
                    ))}
                  </Space>
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message ${msg.type === 'user' ? 'user-message' : 'ai-message'}`}
                >
                  <Avatar
                    icon={msg.type === 'user' ? <UserOutlined /> : <RobotOutlined />}
                    className={`message-avatar ${msg.type}-avatar`}
                  />
                  <div className="message-content">
                    <div className="message-bubble">
                      {msg.content || (msg.isStreaming && <Spin size="small" />)}
                      {msg.isStreaming && msg.content && (
                        <span className="streaming-cursor">|</span>
                      )}
                    </div>

                    {/* AI 메시지 피드백 버튼 */}
                    {msg.type === 'ai' && !msg.isStreaming && msg.content && (
                      <div className="message-feedback">
                        <Text type="secondary" className="feedback-label">
                          이 답변이 도움이 되었나요?
                        </Text>
                        <Tooltip title="도움이 됐어요">
                          <Button
                            type="text"
                            size="small"
                            icon={
                              msg.feedback === 'like' ? (
                                <LikeFilled style={{ color: '#52c41a' }} />
                              ) : (
                                <LikeOutlined />
                              )
                            }
                            onClick={() => handleFeedback(msg.id, 'like')}
                            className={msg.feedback === 'like' ? 'feedback-active' : ''}
                          />
                        </Tooltip>
                        <Tooltip title="도움이 안됐어요">
                          <Button
                            type="text"
                            size="small"
                            icon={
                              msg.feedback === 'dislike' ? (
                                <DislikeFilled style={{ color: '#ff4d4f' }} />
                              ) : (
                                <DislikeOutlined />
                              )
                            }
                            onClick={() => handleFeedback(msg.id, 'dislike')}
                            className={msg.feedback === 'dislike' ? 'feedback-active' : ''}
                          />
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 추천 질문 (대화 중) */}
        {messages.length > 0 && suggestions.length > 0 && !isLoading && (
          <div className="suggestion-buttons">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <Button
                key={index}
                size="small"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.suggestionText}
              </Button>
            ))}
          </div>
        )}

        {/* 입력 영역 */}
        <div className="chat-input-area">
          <TextArea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="질문을 입력하세요... (Shift+Enter로 줄바꿈)"
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={isLoading}
            maxLength={2000}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => handleSendMessage()}
            loading={isLoading}
            disabled={!inputValue.trim()}
          >
            전송
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AiChatPage;
