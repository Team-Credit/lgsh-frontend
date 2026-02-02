/**
 * 메시지 Context
 * - TB_SYS_MESSAGE 테이블의 메시지를 전역 관리
 * - API에서 로드하여 캐시
 * - 메시지 코드로 메시지 조회 및 출력
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { message as antMessage, Modal } from 'antd';
import type { SystemMessage } from '@/types/message';
import { DEFAULT_MESSAGES } from '@/types/message';

// ========== Context 타입 ==========
interface MessageContextType {
  /** 메시지 로드 완료 여부 */
  isLoaded: boolean;
  /** 메시지 코드로 메시지 텍스트 조회 */
  getText: (msgCode: string, params?: Record<string, string>) => string;
  /** 메시지 코드로 메시지 객체 조회 */
  getMessage: (msgCode: string) => SystemMessage | null;
  /** 성공 메시지 출력 (Toast) */
  showSuccess: (msgCode: string, params?: Record<string, string>) => void;
  /** 에러 메시지 출력 (Toast) */
  showError: (msgCode: string, params?: Record<string, string>) => void;
  /** 경고 메시지 출력 (Toast) */
  showWarning: (msgCode: string, params?: Record<string, string>) => void;
  /** 정보 메시지 출력 (Toast) */
  showInfo: (msgCode: string, params?: Record<string, string>) => void;
  /** 확인 모달 표시 */
  showConfirm: (msgCode: string, onOk: () => void, onCancel?: () => void) => void;
  /** 커스텀 메시지 출력 (코드 없이 직접 메시지) */
  showCustom: (type: 'success' | 'error' | 'warning' | 'info', text: string) => void;
  /** 메시지 새로고침 (API 재호출) */
  refreshMessages: () => Promise<void>;
}

// ========== Context 생성 ==========
const MessageContext = createContext<MessageContextType | null>(null);

// ========== Provider Props ==========
interface MessageProviderProps {
  children: React.ReactNode;
  /** 메시지 API URL (기본: /api/v1/messages) */
  apiUrl?: string;
  /** 초기 로드 여부 (기본: true) */
  loadOnMount?: boolean;
}

// ========== 파라미터 치환 함수 ==========
const replaceParams = (text: string, params?: Record<string, string>): string => {
  if (!params) return text;
  
  let result = text;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  return result;
};

// ========== Provider 컴포넌트 ==========
export const MessageProvider: React.FC<MessageProviderProps> = ({
  children,
  apiUrl = '/api/v1/messages',
  loadOnMount = true,
}) => {
  const [messages, setMessages] = useState<Record<string, SystemMessage>>(DEFAULT_MESSAGES);
  const [isLoaded, setIsLoaded] = useState(false);

  // 메시지 로드 함수
  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const messageMap: Record<string, SystemMessage> = {};
          data.data.forEach((msg: SystemMessage) => {
            messageMap[msg.msgCode] = msg;
          });
          setMessages({ ...DEFAULT_MESSAGES, ...messageMap });
        }
      }
    } catch (error) {
      console.warn('메시지 로드 실패, 기본 메시지 사용:', error);
      // 기본 메시지 유지
    } finally {
      setIsLoaded(true);
    }
  }, [apiUrl]);

  // 마운트 시 메시지 로드
  useEffect(() => {
    if (loadOnMount) {
      loadMessages();
    } else {
      setIsLoaded(true);
    }
  }, [loadOnMount, loadMessages]);

  // 메시지 텍스트 조회
  const getText = useCallback((msgCode: string, params?: Record<string, string>): string => {
    const msg = messages[msgCode];
    if (!msg) {
      console.warn(`메시지 코드를 찾을 수 없음: ${msgCode}`);
      return msgCode;
    }
    return replaceParams(msg.msgText, params);
  }, [messages]);

  // 메시지 객체 조회
  const getMessage = useCallback((msgCode: string): SystemMessage | null => {
    return messages[msgCode] || null;
  }, [messages]);

  // Toast 출력 함수들
  const showSuccess = useCallback((msgCode: string, params?: Record<string, string>) => {
    antMessage.success(getText(msgCode, params));
  }, [getText]);

  const showError = useCallback((msgCode: string, params?: Record<string, string>) => {
    antMessage.error(getText(msgCode, params));
  }, [getText]);

  const showWarning = useCallback((msgCode: string, params?: Record<string, string>) => {
    antMessage.warning(getText(msgCode, params));
  }, [getText]);

  const showInfo = useCallback((msgCode: string, params?: Record<string, string>) => {
    antMessage.info(getText(msgCode, params));
  }, [getText]);

  // 커스텀 메시지 (코드 없이)
  const showCustom = useCallback((type: 'success' | 'error' | 'warning' | 'info', text: string) => {
    antMessage[type](text);
  }, []);

  // 확인 모달
  const showConfirm = useCallback((
    msgCode: string, 
    onOk: () => void, 
    onCancel?: () => void
  ) => {
    Modal.confirm({
      title: '확인',
      content: getText(msgCode),
      okText: '확인',
      cancelText: '취소',
      centered: true,
      onOk,
      onCancel,
    });
  }, [getText]);

  // 메시지 새로고침
  const refreshMessages = useCallback(async () => {
    setIsLoaded(false);
    await loadMessages();
  }, [loadMessages]);

  const value: MessageContextType = {
    isLoaded,
    getText,
    getMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showCustom,
    refreshMessages,
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};

// ========== Hook ==========
export const useMessage = (): MessageContextType => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage must be used within MessageProvider');
  }
  return context;
};

export default MessageContext;
