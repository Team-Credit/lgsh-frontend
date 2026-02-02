/**
 * 대시보드 페이지 (예시)
 */

import React from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag } from 'antd';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
// import { RefreshButton } from '@/components/common'; // TODO: RefreshButton 컴포넌트 추가 필요
import './DashboardPage.css';

// 통계 카드 데이터
const stats = [
  {
    title: '전체 대상자',
    value: 12847,
    icon: <Users size={24} />,
    trend: { value: 12.5, type: 'up' },
    color: '#1e3a8a',
  },
  {
    title: '금일 평가',
    value: 234,
    icon: <Target size={24} />,
    trend: { value: 8.2, type: 'up' },
    color: '#059669',
  },
  {
    title: '고위험군',
    value: 1523,
    icon: <AlertTriangle size={24} />,
    trend: { value: 3.1, type: 'down' },
    color: '#dc2626',
  },
  {
    title: '평균 점수',
    value: 687,
    icon: <CheckCircle size={24} />,
    trend: { value: 2.3, type: 'up' },
    color: '#d97706',
  },
];

// 최근 평가 데이터
const recentEvaluations = [
  { key: '1', name: '홍길동', score: 720, grade: 'B', change: 15, date: '2026-01-14' },
  { key: '2', name: '김철수', score: 650, grade: 'C', change: -10, date: '2026-01-14' },
  { key: '3', name: '이영희', score: 810, grade: 'A', change: 25, date: '2026-01-14' },
  { key: '4', name: '박민수', score: 540, grade: 'D', change: -5, date: '2026-01-14' },
  { key: '5', name: '정수진', score: 690, grade: 'B', change: 20, date: '2026-01-14' },
];

// 등급별 색상
const gradeColors: Record<string, string> = {
  A: '#059669',
  B: '#0284c7',
  C: '#d97706',
  D: '#dc2626',
  E: '#7c3aed',
};

const columns = [
  {
    title: '대상자명',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '점수',
    dataIndex: 'score',
    key: 'score',
    render: (score: number) => <span className="font-semibold">{score}</span>,
  },
  {
    title: '등급',
    dataIndex: 'grade',
    key: 'grade',
    render: (grade: string) => (
      <Tag color={gradeColors[grade]}>{grade}등급</Tag>
    ),
  },
  {
    title: '변동',
    dataIndex: 'change',
    key: 'change',
    render: (change: number) => (
      <span className={change > 0 ? 'text-success' : 'text-error'}>
        {change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {' '}{Math.abs(change)}점
      </span>
    ),
  },
  {
    title: '평가일',
    dataIndex: 'date',
    key: 'date',
  },
];

const DashboardPage: React.FC = () => {
  return (
    <div className="page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <h1 className="page-title">
          <span className="page-title-icon">
            <Target size={20} />
          </span>
          대시보드
        </h1>
        {/* <div className="page-actions">
          <RefreshButton onClick={() => console.log('새로고침')} />
        </div> */}
      </div>

      {/* 통계 카드 */}
      <Row gutter={[16, 16]} className="mb-4">
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card className="stat-card">
              <div className="stat-card-content">
                <div className="stat-card-left">
                  <div className="stat-card-title">{stat.title}</div>
                  <div className="stat-card-value">
                    <Statistic 
                      value={stat.value} 
                      valueStyle={{ fontSize: 28, fontWeight: 700 }}
                    />
                  </div>
                  <div className={`stat-card-trend ${stat.trend.type}`}>
                    {stat.trend.type === 'up' ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )}
                    <span>{stat.trend.value}%</span>
                    <span className="text-muted">전월 대비</span>
                  </div>
                </div>
                <div 
                  className="stat-card-icon" 
                  style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
                >
                  {stat.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* 등급 분포 */}
        <Col xs={24} lg={8}>
          <Card title="등급 분포" className="chart-card">
            <div className="grade-distribution">
              {[
                { grade: 'A', percent: 15, count: 1927 },
                { grade: 'B', percent: 35, count: 4496 },
                { grade: 'C', percent: 30, count: 3854 },
                { grade: 'D', percent: 15, count: 1927 },
                { grade: 'E', percent: 5, count: 643 },
              ].map((item) => (
                <div key={item.grade} className="grade-item">
                  <div className="grade-label">
                    <Tag color={gradeColors[item.grade]}>{item.grade}등급</Tag>
                    <span className="grade-count">{item.count.toLocaleString()}명</span>
                  </div>
                  <Progress 
                    percent={item.percent} 
                    strokeColor={gradeColors[item.grade]}
                    showInfo={false}
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* 최근 평가 */}
        <Col xs={24} lg={16}>
          <Card title="최근 평가 내역" className="table-card">
            <Table
              columns={columns}
              dataSource={recentEvaluations}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
