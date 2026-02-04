/**
 * 대시보드 툴바 컴포넌트
 */
import React from 'react';
import { Button, Space, Tag, Tooltip, Typography, DatePicker } from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  ReloadOutlined,
  UndoOutlined,
  AppstoreOutlined,
  LayoutOutlined,
  DashboardOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import './DashboardToolbar.css';

const { Title, Text } = Typography;

interface DashboardToolbarProps {
  isEditMode: boolean;
  hasUnsavedChanges: boolean;
  selectedYearMonth: string | null;
  lastEvalMonth: string | null;
  isLoadingYearMonth: boolean;
  onEditToggle: () => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  onRefresh: () => void;
  onWidgetSelect: () => void;
  onAutoArrange: () => void;
  onYearMonthChange: (yearMonth: string | null) => void;
}

const DashboardToolbar: React.FC<DashboardToolbarProps> = ({
  isEditMode,
  hasUnsavedChanges,
  selectedYearMonth,
  lastEvalMonth,
  isLoadingYearMonth,
  onEditToggle,
  onSave,
  onCancel,
  onReset,
  onRefresh,
  onWidgetSelect,
  onAutoArrange,
  onYearMonthChange,
}) => {
  // 년월을 dayjs 객체로 변환
  const selectedDate = selectedYearMonth
    ? dayjs(selectedYearMonth, 'YYYYMM')
    : null;

  // 년월 변경 핸들러
  const handleYearMonthChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      onYearMonthChange(date.format('YYYYMM'));
    } else {
      onYearMonthChange(null);
    }
  };

  // 기본값(마지막 평가 년월)과 다른지 확인
  const isCustomYearMonth = selectedYearMonth && lastEvalMonth && selectedYearMonth !== lastEvalMonth;

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

      {/* 년월 선택기 (편집 모드가 아닐 때만 표시) */}
      {!isEditMode && (
        <div className="toolbar-center">
          <Space size="small" align="center">
            <CalendarOutlined style={{ color: '#666' }} />
            <Text type="secondary" style={{ fontSize: 13 }}>기준 년월:</Text>
            <DatePicker
              picker="month"
              value={selectedDate}
              onChange={handleYearMonthChange}
              format="YYYY년 MM월"
              allowClear={false}
              disabled={isLoadingYearMonth}
              style={{ width: 140 }}
              placeholder="년월 선택"
            />
            {isCustomYearMonth && (
              <Tooltip title="마지막 평가 년월로 복원">
                <Button
                  size="small"
                  type="link"
                  onClick={() => onYearMonthChange(null)}
                >
                  기본값
                </Button>
              </Tooltip>
            )}
          </Space>
        </div>
      )}

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
