/**
 * 대시보드 페이지 (기본 템플릿)
 */
import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import { DashboardOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <DashboardOutlined style={{ marginRight: 8 }} />
          대시보드
        </Title>
        <Text type="secondary">신용평가 현황을 한눈에 확인하세요.</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Text type="secondary">총 평가 건수</Text>
            <Title level={2} style={{ margin: '8px 0 0' }}>-</Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Text type="secondary">오늘 평가 건수</Text>
            <Title level={2} style={{ margin: '8px 0 0' }}>-</Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Text type="secondary">평균 신용점수</Text>
            <Title level={2} style={{ margin: '8px 0 0' }}>-</Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Text type="secondary">운영 모델</Text>
            <Title level={2} style={{ margin: '8px 0 0' }}>-</Title>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <Text type="secondary">
          대시보드 데이터는 추후 구현됩니다. 현재는 기본 레이아웃 템플릿입니다.
        </Text>
      </Card>
    </div>
  );
};

export default DashboardPage;
