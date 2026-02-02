/**
 * 계약 만료 임박 경고 모달
 * - 로그인 후 계약 만료가 임박한 경우 표시
 */
import React from 'react';
import { Modal, Typography, Space } from 'antd';
import { WarningOutlined, CalendarOutlined } from '@ant-design/icons';
import type { ContractWarning } from '@/types';

const { Title, Text } = Typography;

interface ContractWarningModalProps {
  open: boolean;
  contractWarning: ContractWarning | null;
  onClose: () => void;
}

const ContractWarningModal: React.FC<ContractWarningModalProps> = ({
  open,
  contractWarning,
  onClose,
}) => {
  if (!contractWarning) return null;

  const { daysUntilExpiry, contractEndDt, message } = contractWarning;

  // 남은 일수에 따른 위험 레벨 색상
  const getWarningColor = () => {
    if (daysUntilExpiry === undefined) return '#faad14';
    if (daysUntilExpiry <= 7) return '#ff4d4f'; // 빨강 (위험)
    if (daysUntilExpiry <= 14) return '#fa8c16'; // 주황 (경고)
    return '#faad14'; // 노랑 (주의)
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <WarningOutlined style={{ color: getWarningColor(), fontSize: 20 }} />
          <span style={{ color: getWarningColor() }}>계약 만료 임박</span>
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
          {message}
        </Text>

        {contractEndDt && (
          <div style={{
            textAlign: 'center',
            padding: '12px',
            background: '#fafafa',
            borderRadius: 8,
            marginTop: 8,
          }}>
            <Space>
              <CalendarOutlined />
              <Text type="secondary">계약 종료일: {contractEndDt}</Text>
            </Space>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ContractWarningModal;
