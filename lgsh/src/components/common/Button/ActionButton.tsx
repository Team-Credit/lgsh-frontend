/**
 * 액션 버튼 컴포넌트
 * - Primary, Success, Warning, Danger 타입 지원
 */
import React from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import { colors } from '@/styles/theme';

export type ActionButtonType = 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface ActionButtonProps extends Omit<ButtonProps, 'type'> {
  actionType?: ActionButtonType;
}

const actionStyles: Record<ActionButtonType, React.CSSProperties> = {
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: 'white',
  },
  success: {
    backgroundColor: colors.success,
    borderColor: colors.success,
    color: 'white',
  },
  warning: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
    color: 'white',
  },
  danger: {
    backgroundColor: colors.error,
    borderColor: colors.error,
    color: 'white',
  },
  info: {
    backgroundColor: colors.info,
    borderColor: colors.info,
    color: 'white',
  },
};

const ActionButton: React.FC<ActionButtonProps> = ({
  actionType = 'primary',
  style,
  children,
  ...props
}) => {
  return (
    <Button {...props} style={{ ...actionStyles[actionType], ...style }}>
      {children}
    </Button>
  );
};

// 용도별 버튼 컴포넌트
export const SaveButton: React.FC<Omit<ActionButtonProps, 'actionType'>> = (props) => (
  <ActionButton actionType="primary" {...props}>
    {props.children || '저장'}
  </ActionButton>
);

export const ApproveButton: React.FC<Omit<ActionButtonProps, 'actionType'>> = (props) => (
  <ActionButton actionType="success" {...props}>
    {props.children || '승인'}
  </ActionButton>
);

export const DeleteButton: React.FC<Omit<ActionButtonProps, 'actionType'>> = (props) => (
  <ActionButton actionType="danger" {...props}>
    {props.children || '삭제'}
  </ActionButton>
);

export const ExportButton: React.FC<Omit<ActionButtonProps, 'actionType'>> = (props) => (
  <ActionButton actionType="success" {...props}>
    {props.children || '내보내기'}
  </ActionButton>
);

export default ActionButton;
