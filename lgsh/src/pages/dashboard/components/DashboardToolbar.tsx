/**
 * 대시보드 툴바 컴포넌트
 */
import React from 'react';
import { Button, Space, Tag, Tooltip, Typography } from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  ReloadOutlined,
  UndoOutlined,
  AppstoreOutlined,
  LayoutOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import './DashboardToolbar.css';

const { Title, Text } = Typography;

interface DashboardToolbarProps {
  isEditMode: boolean;
  hasUnsavedChanges: boolean;
  onEditToggle: () => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  onRefresh: () => void;
  onWidgetSelect: () => void;
  onAutoArrange: () => void;
}

const DashboardToolbar: React.FC<DashboardToolbarProps> = ({
  isEditMode,
  hasUnsavedChanges,
  onEditToggle,
  onSave,
  onCancel,
  onReset,
  onRefresh,
  onWidgetSelect,
  onAutoArrange,
}) => {
  return (
    <div className="dashboard-toolbar">
      <div className="toolbar-left">
        <div className="toolbar-header">
          <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
            <DashboardOutlined style={{ marginRight: 8 }} />
            대시보드
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            주요 지표와 현황을 한눈에 확인합니다.
          </Text>
        </div>
        <div className="toolbar-tags">
          {isEditMode && (
            <Tag color="processing" className="edit-mode-tag">
              편집 모드
            </Tag>
          )}
          {hasUnsavedChanges && (
            <Tag color="warning" className="unsaved-tag">
              저장되지 않은 변경
            </Tag>
          )}
        </div>
      </div>

      <div className="toolbar-right">
        <Space size="small">
          {isEditMode ? (
            <>
              <Tooltip title="위젯 선택">
                <Button
                  icon={<AppstoreOutlined />}
                  onClick={onWidgetSelect}
                >
                  위젯 선택
                </Button>
              </Tooltip>
              <Tooltip title="자동 정렬">
                <Button
                  icon={<LayoutOutlined />}
                  onClick={onAutoArrange}
                >
                  자동 정렬
                </Button>
              </Tooltip>
              <Tooltip title="초기화">
                <Button
                  icon={<UndoOutlined />}
                  onClick={onReset}
                  danger
                >
                  초기화
                </Button>
              </Tooltip>
              <Tooltip title="취소">
                <Button
                  icon={<CloseOutlined />}
                  onClick={onCancel}
                >
                  취소
                </Button>
              </Tooltip>
              <Tooltip title="저장">
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={onSave}
                >
                  저장
                </Button>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="새로고침">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={onRefresh}
                >
                  새로고침
                </Button>
              </Tooltip>
              <Tooltip title="편집">
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={onEditToggle}
                >
                  편집
                </Button>
              </Tooltip>
            </>
          )}
        </Space>
      </div>
    </div>
  );
};

export default DashboardToolbar;
