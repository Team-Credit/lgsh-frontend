/**
 * 로지신해 모달 컴포넌트
 * - Ant Design Modal 래핑
 * - 업무용 모달 프리셋 제공
 */

import React from 'react';
import { Modal as AntModal, Button } from 'antd';
import type { ModalProps as AntModalProps } from 'antd';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Info,
  AlertTriangle,
} from 'lucide-react';
import { SaveButton, DeleteButton, ApproveButton } from '../Button';
import './styles.css';

// ========== 기본 모달 ==========
export interface ModalProps extends Omit<AntModalProps, 'onOk' | 'onCancel'> {
  /** 확인 버튼 클릭 */
  onOk?: () => void | Promise<void>;
  /** 취소 버튼 클릭 */
  onCancel?: () => void;
  /** 확인 버튼 로딩 */
  confirmLoading?: boolean;
  /** 확인 버튼 텍스트 */
  okText?: string;
  /** 취소 버튼 텍스트 */
  cancelText?: string;
  /** 취소 버튼 숨김 */
  hideCancel?: boolean;
  /** 확인 버튼 숨김 */
  hideOk?: boolean;
  /** 모달 타입 */
  type?: 'default' | 'form' | 'confirm' | 'delete';
}

/**
 * 기본 모달 컴포넌트
 */
export const Modal: React.FC<ModalProps> = ({
  children,
  onOk,
  onCancel,
  confirmLoading = false,
  okText = '확인',
  cancelText = '취소',
  hideCancel = false,
  hideOk = false,
  type = 'default',
  footer,
  ...props
}) => {
  // 커스텀 푸터
  const renderFooter = () => {
    if (footer !== undefined) return footer;

    if (type === 'delete') {
      return (
        <div className="modal-footer">
          {!hideCancel && <Button onClick={onCancel}>{cancelText}</Button>}
          {!hideOk && (
            <DeleteButton 
              onClick={onOk} 
              loading={confirmLoading}
            >
              {okText}
            </DeleteButton>
          )}
        </div>
      );
    }

    if (type === 'form') {
      return (
        <div className="modal-footer">
          {!hideCancel && <Button onClick={onCancel}>{cancelText}</Button>}
          {!hideOk && (
            <SaveButton 
              onClick={onOk} 
              loading={confirmLoading}
            >
              {okText}
            </SaveButton>
          )}
        </div>
      );
    }

    if (type === 'confirm') {
      return (
        <div className="modal-footer">
          {!hideCancel && <Button onClick={onCancel}>{cancelText}</Button>}
          {!hideOk && (
            <ApproveButton 
              onClick={onOk} 
              loading={confirmLoading}
            >
              {okText}
            </ApproveButton>
          )}
        </div>
      );
    }

    // 기본
    return (
      <div className="modal-footer">
        {!hideCancel && (
          <Button onClick={onCancel}>{cancelText}</Button>
        )}
        {!hideOk && (
          <Button type="primary" onClick={onOk} loading={confirmLoading}>
            {okText}
          </Button>
        )}
      </div>
    );
  };

  return (
    <AntModal
      {...props}
      onCancel={onCancel}
      footer={renderFooter()}
      className={`lgsh-modal lgsh-modal-${type} ${props.className || ''}`}
      centered
      destroyOnClose
    >
      {children}
    </AntModal>
  );
};

// ========== 폼 모달 ==========
export interface FormModalProps extends ModalProps {
  /** 폼 제출 핸들러 */
  onSubmit?: () => void | Promise<void>;
}

/**
 * 폼 모달 (등록/수정용)
 */
export const FormModal: React.FC<FormModalProps> = ({
  onSubmit,
  okText = '저장',
  ...props
}) => {
  return (
    <Modal
      {...props}
      type="form"
      okText={okText}
      onOk={onSubmit}
    />
  );
};

// ========== 확인 모달 ==========
export interface ConfirmModalProps extends Omit<ModalProps, 'children'> {
  /** 메시지 */
  message: React.ReactNode;
  /** 아이콘 타입 */
  iconType?: 'info' | 'success' | 'warning' | 'error';
}

/**
 * 확인 모달
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  message,
  iconType = 'warning',
  title = '확인',
  okText = '확인',
  ...props
}) => {
  const iconMap = {
    info: <Info size={48} className="confirm-icon confirm-icon-info" />,
    success: <CheckCircle size={48} className="confirm-icon confirm-icon-success" />,
    warning: <AlertTriangle size={48} className="confirm-icon confirm-icon-warning" />,
    error: <XCircle size={48} className="confirm-icon confirm-icon-error" />,
  };

  return (
    <Modal
      {...props}
      title={title}
      type="confirm"
      okText={okText}
      width={420}
    >
      <div className="confirm-content">
        {iconMap[iconType]}
        <div className="confirm-message">{message}</div>
      </div>
    </Modal>
  );
};

// ========== 삭제 확인 모달 ==========
export interface DeleteConfirmModalProps extends Omit<ModalProps, 'children'> {
  /** 삭제 대상 명칭 */
  targetName?: string;
  /** 커스텀 메시지 */
  message?: React.ReactNode;
}

/**
 * 삭제 확인 모달
 */
export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  targetName,
  message,
  title = '삭제 확인',
  okText = '삭제',
  ...props
}) => {
  const defaultMessage = targetName 
    ? `'${targetName}'을(를) 삭제하시겠습니까?`
    : '선택한 항목을 삭제하시겠습니까?';

  return (
    <Modal
      {...props}
      title={title}
      type="delete"
      okText={okText}
      width={420}
    >
      <div className="confirm-content">
        <AlertCircle size={48} className="confirm-icon confirm-icon-error" />
        <div className="confirm-message">
          {message || defaultMessage}
        </div>
        <div className="confirm-warning">
          이 작업은 되돌릴 수 없습니다.
        </div>
      </div>
    </Modal>
  );
};

// ========== 알림 모달 (결과 표시용) ==========
export interface AlertModalProps extends Omit<ModalProps, 'children'> {
  /** 메시지 */
  message: React.ReactNode;
  /** 알림 타입 */
  alertType?: 'success' | 'error' | 'warning' | 'info';
}

/**
 * 알림 모달 (결과 표시용)
 */
export const AlertModal: React.FC<AlertModalProps> = ({
  message,
  alertType = 'info',
  title,
  okText = '확인',
  ...props
}) => {
  const titleMap = {
    success: '완료',
    error: '오류',
    warning: '경고',
    info: '알림',
  };

  const iconMap = {
    success: <CheckCircle size={48} className="confirm-icon confirm-icon-success" />,
    error: <XCircle size={48} className="confirm-icon confirm-icon-error" />,
    warning: <AlertTriangle size={48} className="confirm-icon confirm-icon-warning" />,
    info: <Info size={48} className="confirm-icon confirm-icon-info" />,
  };

  return (
    <Modal
      {...props}
      title={title || titleMap[alertType]}
      okText={okText}
      hideCancel
      width={420}
    >
      <div className="confirm-content">
        {iconMap[alertType]}
        <div className="confirm-message">{message}</div>
      </div>
    </Modal>
  );
};

export default Modal;
