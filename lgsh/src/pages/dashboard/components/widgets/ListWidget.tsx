/**
 * 목록 위젯 컴포넌트
 */
import React from 'react';
import { List, Tag, Typography, Avatar } from 'antd';
import { UserOutlined, WarningOutlined, NotificationOutlined } from '@ant-design/icons';
import type {
  DashboardLayoutItem,
  ListData,
  RecentEvalItem,
  AlertPersonItem,
  NoticeItem,
} from '@/types/dashboard';
import './ListWidget.css';

const { Text } = Typography;

interface ListWidgetProps {
  data: ListData<RecentEvalItem | AlertPersonItem | NoticeItem>;
  widget?: DashboardLayoutItem;
}

const ListWidget: React.FC<ListWidgetProps> = ({ data }) => {
  const { items } = data;

  // 등급 색상
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return '#059669';
      case 'B':
        return '#10b981';
      case 'C':
        return '#d97706';
      case 'D':
        return '#ea580c';
      case 'E':
        return '#dc2626';
      default:
        return '#64748b';
    }
  };

  // 알림 유형 태그
  const getAlertTypeTag = (alertType: string) => {
    switch (alertType) {
      case 'LOW_GRADE':
        return <Tag color="error">저등급</Tag>;
      case 'SCORE_DROP':
        return <Tag color="warning">점수하락</Tag>;
      case 'GRADE_DROP':
        return <Tag color="orange">등급하락</Tag>;
      default:
        return null;
    }
  };

  // 공지 중요도 태그
  const getNoticeLevelTag = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <Tag color="error">긴급</Tag>;
      case 'HIGH':
        return <Tag color="warning">중요</Tag>;
      case 'NORMAL':
        return <Tag color="default">일반</Tag>;
      default:
        return null;
    }
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 위젯 유형에 따른 렌더링
  const renderListItem = (item: RecentEvalItem | AlertPersonItem | NoticeItem) => {
    // 최근 평가 내역
    if ('evalDt' in item && 'personNm' in item) {
      const evalItem = item as RecentEvalItem;
      return (
        <List.Item className="list-widget-item">
          <List.Item.Meta
            avatar={<Avatar icon={<UserOutlined />} size="small" />}
            title={
              <div className="list-item-title">
                <span>{evalItem.personNm}</span>
                <Tag color={getGradeColor(evalItem.grade)}>{evalItem.grade}등급</Tag>
              </div>
            }
            description={
              <div className="list-item-desc">
                <span>{evalItem.score}점</span>
                <Text type="secondary">{formatDate(evalItem.evalDt)}</Text>
              </div>
            }
          />
        </List.Item>
      );
    }

    // 주의 대상자
    if ('alertType' in item) {
      const alertItem = item as AlertPersonItem;
      return (
        <List.Item className="list-widget-item">
          <List.Item.Meta
            avatar={<Avatar icon={<WarningOutlined />} size="small" style={{ background: '#dc2626' }} />}
            title={
              <div className="list-item-title">
                <span>{alertItem.personNm}</span>
                {getAlertTypeTag(alertItem.alertType)}
              </div>
            }
            description={
              <div className="list-item-desc">
                <Tag color={getGradeColor(alertItem.grade)}>{alertItem.grade}등급</Tag>
                <span>{alertItem.score}점</span>
              </div>
            }
          />
        </List.Item>
      );
    }

    // 공지사항
    if ('title' in item && 'noticeLevel' in item) {
      const noticeItem = item as NoticeItem;
      return (
        <List.Item className="list-widget-item">
          <List.Item.Meta
            avatar={<Avatar icon={<NotificationOutlined />} size="small" style={{ background: '#1e3a8a' }} />}
            title={
              <div className="list-item-title">
                <span className="notice-title">{noticeItem.title}</span>
                {getNoticeLevelTag(noticeItem.noticeLevel)}
              </div>
            }
            description={
              <Text type="secondary">{formatDate(noticeItem.regDt)}</Text>
            }
          />
        </List.Item>
      );
    }

    return null;
  };

  return (
    <div className="list-widget">
      <List
        dataSource={items}
        renderItem={renderListItem}
        size="small"
        split={true}
      />
    </div>
  );
};

export default ListWidget;
