/**
 * 세션 만료 경고 모달
 * - 10분 이상 미활동 시 표시
 * - 60초 카운트다운 후 자동 로그아웃
 */
import React from 'react';
import { Modal, Typography, Space, Progress } from 'antd';
import { ClockCircleOutlined, LogoutOutlined, SyncOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface SessionTimeoutModalProps {
  open: boolean;
  timeRemaining: string; // "MM:SS" 형식
  onExtend: () => Promise<void>;
  onLogout: () => void;
}

const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  open,
  timeRemaining,
  onExtend,
  onLogout,
}) => {
  // 남은 시간에서 초 추출 (퍼센트 계산용)
  const [minutes, seconds] = timeRemaining.split(':').map(Number);
  const totalSeconds = minutes * 60 + seconds;
  const percent = Math.round((totalSeconds / 60) * 100);

  return (
    <Modal
      open={open}
      closable={false}
      maskClosable={false}
      keyboard={false}
      centered
      width={400}
      footer={null}
      styles={{
        body: { padding: '24px 32px', textAlign: 'center' },
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 아이콘 */}
        <ClockCircleOutlined
          style={{
            fontSize: 48,
            color: percent > 50 ? '#faad14' : '#ff4d4f',
          }}
        />

        {/* 제목 */}
        <Title level={4} style={{ margin: 0 }}>
          세션이 곧 만료됩니다
        </Title>

        {/* 설명 */}
        <Text type="secondary">
          장시간 활동이 없어 보안을 위해
          <br />
          자동으로 로그아웃됩니다.
        </Text>

        {/* 카운트다운 */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Progress
            type="circle"
            percent={percent}
            format={() => (
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: percent > 50 ? '#faad14' : '#ff4d4f',
                }}
              >
                {timeRemaining}
              </span>
            )}
            strokeColor={percent > 50 ? '#faad14' : '#ff4d4f'}
            size={120}
          />
        </div>

        {/* 버튼 그룹 */}
        <Space size="middle">
          <button
            onClick={onLogout}
            style={{
              padding: '10px 24px',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              background: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
            }}
          >
            <LogoutOutlined />
            로그아웃
          </button>
          <button
            onClick={onExtend}
            style={{
              padding: '10px 24px',
              border: 'none',
              borderRadius: 6,
              background: '#1890ff',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <SyncOutlined />
            세션 연장
          </button>
        </Space>

        {/* 안내 문구 */}
        <Text type="secondary" style={{ fontSize: 12 }}>
          '세션 연장' 클릭 시 로그인 상태가 유지됩니다.
        </Text>
      </Space>
    </Modal>
  );
};

export default SessionTimeoutModal;
