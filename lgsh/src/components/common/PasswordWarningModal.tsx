/**
 * 비밀번호 만료 경고/강제 변경 모달
 * - 만료 임박: 경고 메시지 표시 (닫기 가능)
 * - 만료됨: 비밀번호 변경 폼 강제 표시 (변경 전까지 닫기 불가)
 */
import React, { useState } from 'react';
import { Modal, Typography, Space, Form, Input, Button, message } from 'antd';
import { WarningOutlined, LockOutlined, CalendarOutlined } from '@ant-design/icons';
import type { PasswordWarning } from '@/types';
import { userService } from '@/services';

const { Title, Text } = Typography;

interface PasswordWarningModalProps {
  open: boolean;
  passwordWarning: PasswordWarning | null;
  userId: string;
  onClose: () => void;
  onPasswordChanged: () => void;
}

const PasswordWarningModal: React.FC<PasswordWarningModalProps> = ({
  open,
  passwordWarning,
  userId,
  onClose,
  onPasswordChanged,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  if (!passwordWarning) return null;

  const { passwordExpired, daysUntilExpiry, pwdExpireDt, message: warningMessage } = passwordWarning;

  // 만료됨 → 강제 비밀번호 변경
  if (passwordExpired) {
    const handleChangePassword = async () => {
      try {
        const values = await form.validateFields();
        setLoading(true);
        const response = await userService.changePassword(userId, values.newPassword);
        if (response.success) {
          message.success('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
          onPasswordChanged();
        } else {
          message.error(response.message || '비밀번호 변경에 실패했습니다.');
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'errorFields' in error) {
          // form validation error
          return;
        }
        message.error('비밀번호 변경 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <Modal
        open={open}
        title={
          <Space>
            <LockOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
            <span style={{ color: '#ff4d4f' }}>비밀번호 만료 - 변경 필수</span>
          </Space>
        }
        closable={false}
        maskClosable={false}
        keyboard={false}
        footer={[
          <Button
            key="change"
            type="primary"
            danger
            loading={loading}
            onClick={handleChangePassword}
          >
            비밀번호 변경
          </Button>,
        ]}
        centered
        width={480}
      >
        <div style={{ padding: '16px 0' }}>
          <Text style={{ display: 'block', textAlign: 'center', fontSize: 15, marginBottom: 16, color: '#ff4d4f' }}>
            {warningMessage}
          </Text>

          {pwdExpireDt && (
            <div style={{
              textAlign: 'center',
              padding: '8px',
              background: '#fff2f0',
              borderRadius: 8,
              marginBottom: 16,
            }}>
              <Space>
                <CalendarOutlined />
                <Text type="danger">만료일: {pwdExpireDt}</Text>
              </Space>
            </div>
          )}

          <Form form={form} layout="vertical">
            <Form.Item
              name="newPassword"
              label="새 비밀번호"
              rules={[
                { required: true, message: '새 비밀번호를 입력해주세요.' },
                {
                  pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/,
                  message: '8~20자, 영문/숫자/특수문자 각 1개 이상 포함',
                },
              ]}
            >
              <Input.Password placeholder="새 비밀번호" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="새 비밀번호 확인"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '비밀번호 확인을 입력해주세요.' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('비밀번호가 일치하지 않습니다.'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="새 비밀번호 확인" />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    );
  }

  // 만료 임박 → 경고 모달 (닫기 가능)
  const getWarningColor = () => {
    if (daysUntilExpiry === undefined) return '#faad14';
    if (daysUntilExpiry <= 3) return '#ff4d4f';
    if (daysUntilExpiry <= 5) return '#fa8c16';
    return '#faad14';
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <WarningOutlined style={{ color: getWarningColor(), fontSize: 20 }} />
          <span style={{ color: getWarningColor() }}>비밀번호 만료 임박</span>
        </Space>
      }
      onOk={onClose}
      onCancel={onClose}
      cancelButtonProps={{ style: { display: 'none' } }}
      okText="확인"
      centered
      width={480}
    >
      <div style={{ padding: '16px 0' }}>
        <Title
          level={1}
          style={{
            textAlign: 'center',
            margin: '16px 0',
            color: getWarningColor(),
          }}
        >
          D-{daysUntilExpiry}
        </Title>

        <Text style={{ display: 'block', textAlign: 'center', fontSize: 15, marginBottom: 16 }}>
          {warningMessage}
        </Text>

        {pwdExpireDt && (
          <div style={{
            textAlign: 'center',
            padding: '12px',
            background: '#fafafa',
            borderRadius: 8,
            marginTop: 8,
          }}>
            <Space>
              <CalendarOutlined />
              <Text type="secondary">비밀번호 만료일: {pwdExpireDt}</Text>
            </Space>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PasswordWarningModal;
