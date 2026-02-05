/**
 * 월간레포트 - 마감관리
 * 월간 데이터 마감 및 이력 관리
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Select,
  Tag,
  message,
  Modal,
  Input,
  Typography,
  Tooltip,
  Row,
  Col,
  Statistic,
  Timeline,
  Descriptions,
  Alert,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table/interface';
import {
  LockOutlined,
  UnlockOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import reportService from '@/services/reportService';
import type { MonthlyClose, CloseChangeHistory } from '@/types/report';
import { useAppSelector } from '@/store/hooks';
import './ReportClosePage.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// 상태 컬러
const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
  OPEN: { color: 'default', icon: <ClockCircleOutlined />, text: '미마감' },
  CLOSED: { color: 'success', icon: <LockOutlined />, text: '마감완료' },
  CANCELLED: { color: 'warning', icon: <UnlockOutlined />, text: '마감취소' },
};

const ReportClosePage: React.FC = () => {
  // 로그인 사용자 정보
  const currentUser = useAppSelector((state) => state.auth.user);
  const userCompanyId = currentUser?.companyId || '';

  // 상태
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(dayjs().year());
  const [dataSource, setDataSource] = useState<MonthlyClose[]>([]);

  // 통계
  const [stats, setStats] = useState({
    closed: 0,
    open: 0,
    cancelled: 0,
  });

  // 마감 모달
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeMonth, setCloseMonth] = useState<number | null>(null);
  const [closeNote, setCloseNote] = useState('');
  const [closing, setClosing] = useState(false);

  // 취소 모달
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelMonth, setCancelMonth] = useState<number | null>(null);
  const [cancelCloseSeq, setCancelCloseSeq] = useState<number | null>(null);  // 마감 일련번호
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // 이력 모달
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyMonth, setHistoryMonth] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<CloseChangeHistory[]>([]);

  // 데이터 로드
  const loadData = useCallback(async () => {
    if (!userCompanyId) return;

    setLoading(true);
    try {
      const response = await reportService.getCloseStatus(userCompanyId, year);
      if (response.success && response.data) {
        // 12개월 데이터 보장
        const monthlyData: MonthlyClose[] = [];
        for (let m = 1; m <= 12; m++) {
          const existing = response.data.find((d) => d.month === m);
          if (existing) {
            monthlyData.push(existing);
          } else {
            monthlyData.push({
              companyId: userCompanyId,
              year,
              month: m,
              closeStatus: 'OPEN',
              closedDt: null,
              closedBy: null,
              closeNote: null,
              canCancel: false,
            });
          }
        }
        setDataSource(monthlyData);

        // 통계 계산
        const closed = monthlyData.filter((d) => d.closeStatus === 'CLOSED').length;
        const open = monthlyData.filter((d) => d.closeStatus === 'OPEN').length;
        const cancelled = monthlyData.filter((d) => d.closeStatus === 'CANCELLED').length;
        setStats({ closed, open, cancelled });
      } else {
        message.error(response.message || '데이터를 불러오지 못했습니다.');
      }
    } catch (error) {
      message.error('데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [userCompanyId, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 마감 처리
  const handleClose = (month: number) => {
    setCloseMonth(month);
    setCloseNote('');
    setCloseModalOpen(true);
  };

  const handleCloseConfirm = async () => {
    if (!closeMonth) return;

    setClosing(true);
    try {
      const response = await reportService.processClose({
        companyId: userCompanyId,
        year,
        month: closeMonth,
        closeNote,
      });

      if (response.success) {
        message.success(`${year}년 ${closeMonth}월 마감이 완료되었습니다.`);
        setCloseModalOpen(false);
        loadData();
      } else {
        message.error(response.message || '마감 처리에 실패했습니다.');
      }
    } catch (error) {
      message.error('마감 처리 중 오류가 발생했습니다.');
    } finally {
      setClosing(false);
    }
  };

  // 마감 취소
  const handleCancel = (record: MonthlyClose) => {
    setCancelMonth(record.month);
    setCancelCloseSeq(record.closeSeq || null);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancelCloseSeq) {
      message.warning('마감 정보를 찾을 수 없습니다.');
      return;
    }
    if (!cancelReason.trim()) {
      message.warning('취소 사유를 입력해주세요.');
      return;
    }

    setCancelling(true);
    try {
      const response = await reportService.cancelClose({
        closeSeq: cancelCloseSeq,
        reason: cancelReason,
      });

      if (response.success) {
        message.success(`${year}년 ${cancelMonth}월 마감이 취소되었습니다.`);
        setCancelModalOpen(false);
        loadData();
      } else {
        message.error(response.message || '마감 취소에 실패했습니다.');
      }
    } catch (error) {
      message.error('마감 취소 중 오류가 발생했습니다.');
    } finally {
      setCancelling(false);
    }
  };

  // 이력 조회
  const handleViewHistory = async (month: number) => {
    setHistoryMonth(month);
    setHistoryModalOpen(true);
    setHistoryLoading(true);

    try {
      const response = await reportService.getCloseHistory(userCompanyId, year, month);
      if (response.success && response.data) {
        setHistoryData(response.data);
      } else {
        setHistoryData([]);
      }
    } catch (error) {
      message.error('이력 조회 중 오류가 발생했습니다.');
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 테이블 컬럼
  const columns: ColumnsType<MonthlyClose> = [
    {
      title: '월',
      dataIndex: 'month',
      key: 'month',
      width: 80,
      align: 'center',
      render: (month: number) => `${month}월`,
    },
    {
      title: '상태',
      dataIndex: 'closeStatus',
      key: 'closeStatus',
      width: 120,
      align: 'center',
      render: (status: string, record: MonthlyClose) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;
        return (
          <Tag color={config.color} icon={config.icon}>
            {record.closeStatusNm || config.text}
          </Tag>
        );
      },
    },
    {
      title: '마감일시',
      dataIndex: 'closedDt',
      key: 'closedDt',
      width: 160,
      align: 'center',
      render: (dt: string | null) =>
        dt ? dayjs(dt).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '처리자',
      dataIndex: 'closedByNm',
      key: 'closedBy',
      width: 120,
      align: 'center',
      render: (nm: string | undefined, record: MonthlyClose) =>
        nm || record.closedBy || '-',
    },
    {
      title: '비고',
      dataIndex: 'closeNote',
      key: 'closeNote',
      ellipsis: true,
      render: (note: string | null) => note || '-',
    },
    {
      title: '작업',
      key: 'action',
      width: 200,
      align: 'center',
      render: (_: any, record: MonthlyClose) => (
        <Space>
          {record.closeStatus === 'OPEN' && (
            <Tooltip title="마감처리">
              <Button
                type="primary"
                size="small"
                icon={<LockOutlined />}
                onClick={() => handleClose(record.month)}
              >
                마감
              </Button>
            </Tooltip>
          )}
          {record.closeStatus === 'CLOSED' && (record.canCancel === true || record.canCancel === 'Y') && (
            <Tooltip title="마감취소">
              <Button
                size="small"
                danger
                icon={<UnlockOutlined />}
                onClick={() => handleCancel(record)}
              >
                취소
              </Button>
            </Tooltip>
          )}
          {record.closeStatus === 'CLOSED' && record.canCancel !== true && record.canCancel !== 'Y' && (
            <Tooltip title="차월이 마감되어 취소할 수 없습니다">
              <Button size="small" disabled icon={<UnlockOutlined />}>
                취소
              </Button>
            </Tooltip>
          )}
          <Tooltip title="이력보기">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => handleViewHistory(record.month)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 연도 옵션
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = dayjs().year() - 2 + i;
    return { value: y, label: `${y}년` };
  });

  return (
    <div className="report-close-page">
      <Card
        title={
          <Space>
            <CalendarOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>
              월간 마감관리
            </Title>
          </Space>
        }
        extra={
          <Space>
            <Select
              value={year}
              onChange={setYear}
              options={yearOptions}
              style={{ width: 100 }}
            />
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              새로고침
            </Button>
          </Space>
        }
      >
        {/* 통계 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="마감완료"
                value={stats.closed}
                suffix="/ 12월"
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="미마감"
                value={stats.open}
                suffix="/ 12월"
                valueStyle={{ color: '#8c8c8c' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="진행률"
                value={Math.round((stats.closed / 12) * 100)}
                suffix="%"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        <Alert
          message="마감 안내"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>마감 처리된 월의 데이터는 수정할 수 없습니다.</li>
              <li>마감 취소는 차월이 마감되지 않은 경우에만 가능합니다.</li>
              <li>마감 후 레포트 생성 시 마감된 데이터로 고정됩니다.</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 테이블 */}
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="month"
          loading={loading}
          size="middle"
          pagination={false}
        />
      </Card>

      {/* 마감 확인 모달 */}
      <Modal
        title={
          <Space>
            <LockOutlined />
            {`${year}년 ${closeMonth}월 마감`}
          </Space>
        }
        open={closeModalOpen}
        onCancel={() => setCloseModalOpen(false)}
        onOk={handleCloseConfirm}
        confirmLoading={closing}
        okText="마감"
        cancelText="취소"
      >
        <Alert
          message="마감 처리를 진행하시겠습니까?"
          description="마감 후에는 해당 월의 데이터가 동결되며, 수정이 불가능합니다."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div>
          <Text>마감 비고 (선택)</Text>
          <TextArea
            value={closeNote}
            onChange={(e) => setCloseNote(e.target.value)}
            placeholder="마감 관련 메모를 입력하세요"
            rows={3}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>

      {/* 마감 취소 모달 */}
      <Modal
        title={
          <Space>
            <UnlockOutlined />
            {`${year}년 ${cancelMonth}월 마감 취소`}
          </Space>
        }
        open={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        onOk={handleCancelConfirm}
        confirmLoading={cancelling}
        okText="취소 확인"
        cancelText="닫기"
        okButtonProps={{ danger: true }}
      >
        <Alert
          message="마감 취소를 진행하시겠습니까?"
          description="마감 취소 후에는 데이터 수정이 다시 가능해집니다."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div>
          <Text type="danger">* 취소 사유 (필수)</Text>
          <TextArea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="취소 사유를 입력하세요"
            rows={3}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>

      {/* 이력 모달 */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            {`${year}년 ${historyMonth}월 변경 이력`}
          </Space>
        }
        open={historyModalOpen}
        onCancel={() => setHistoryModalOpen(false)}
        footer={null}
        width={600}
      >
        <Spin spinning={historyLoading}>
          {historyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              변경 이력이 없습니다.
            </div>
          ) : (
            <Timeline
              items={historyData.map((item) => ({
                color:
                  item.changeType === 'CLOSE'
                    ? 'green'
                    : item.changeType === 'CANCEL'
                    ? 'red'
                    : 'blue',
                children: (
                  <div>
                    <div>
                      <Tag
                        color={
                          item.changeType === 'CLOSE'
                            ? 'success'
                            : item.changeType === 'CANCEL'
                            ? 'error'
                            : 'processing'
                        }
                      >
                        {item.changeTypeNm || item.changeType}
                      </Tag>
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        {dayjs(item.changedDt).format('YYYY-MM-DD HH:mm:ss')}
                      </Text>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Text>처리자: {item.changedByNm || item.changedBy}</Text>
                    </div>
                    {item.changeReason && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary">사유: {item.changeReason}</Text>
                      </div>
                    )}
                  </div>
                ),
              }))}
            />
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default ReportClosePage;
