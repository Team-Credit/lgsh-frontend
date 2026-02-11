/**
 * 배치 스케줄 관리 탭
 * 스케줄 목록, 등록/수정/삭제, 활성화 토글
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Switch,
  Modal,
  message,
  Tooltip,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table/interface';
import type { BatchSchedule } from '@/types/batch';
import { batchService } from '@/services/batchService';
import { cronToReadable } from '@/utils/cronHelper';
import BatchScheduleModal from './BatchScheduleModal';

const { Text } = Typography;

/**
 * 날짜 문자열을 짧은 형식으로 변환
 * "2025-06-15 11:20:00" → "06-15 11:20"
 * 올해가 아닌 경우 "2024-06-15 11:20"
 */
function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  // YYYY-MM-DD HH24:MI:SS 형식 기대
  const parts = dateStr.split(' ');
  if (parts.length < 2) return dateStr;

  const datePart = parts[0]; // "2025-06-15"
  const timePart = parts[1]; // "11:20:00"

  const [year, month, day] = datePart.split('-');
  const currentYear = new Date().getFullYear().toString();
  const shortTime = timePart.substring(0, 5); // "11:20"

  if (year === currentYear) {
    return `${month}-${day} ${shortTime}`;
  }
  return `${year}-${month}-${day} ${shortTime}`;
}

interface BatchScheduleTabProps {
  batchTypes: { value: string; label: string }[];
}

const BatchScheduleTab: React.FC<BatchScheduleTabProps> = ({ batchTypes }) => {
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<BatchSchedule[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<BatchSchedule | null>(null);

  // 배치유형명 조회
  const getBatchTypeName = useCallback(
    (batchType: string): string => {
      const found = batchTypes.find((t) => t.value === batchType);
      return found ? found.label : batchType;
    },
    [batchTypes]
  );

  // 목록 조회
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await batchService.getScheduleList();
      setDataList(response.content);
    } catch (error) {
      message.error('스케줄 목록 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // 등록 모달 열기
  const handleAdd = () => {
    setEditRecord(null);
    setModalOpen(true);
  };

  // 수정 모달 열기
  const handleEdit = (record: BatchSchedule) => {
    setEditRecord(record);
    setModalOpen(true);
  };

  // 삭제
  const handleDelete = (record: BatchSchedule) => {
    Modal.confirm({
      title: '스케줄 삭제',
      content: (
        <div>
          <Text strong>{record.scheduleName}</Text> 스케줄을 삭제하시겠습니까?
          <br />
          <Text type="secondary">삭제 후 해당 스케줄은 더 이상 실행되지 않습니다.</Text>
        </div>
      ),
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        try {
          await batchService.deleteSchedule(record.scheduleSeq);
          message.success('스케줄이 삭제되었습니다.');
          fetchList();
        } catch (error: any) {
          if (error?.response?.data?.message) {
            message.error(error.response.data.message);
          } else {
            message.error('스케줄 삭제에 실패했습니다.');
          }
        }
      },
    });
  };

  // 활성화/비활성화 토글
  const handleToggle = async (record: BatchSchedule, checked: boolean) => {
    try {
      await batchService.toggleSchedule(record.scheduleSeq, checked);
      message.success(checked ? '스케줄이 활성화되었습니다.' : '스케줄이 비활성화되었습니다.');
      fetchList();
    } catch (error: any) {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('스케줄 상태 변경에 실패했습니다.');
      }
    }
  };

  // 테이블 컬럼
  const columns: ColumnsType<BatchSchedule> = [
    {
      title: '스케줄명',
      dataIndex: 'scheduleName',
      key: 'scheduleName',
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '배치유형',
      dataIndex: 'batchType',
      key: 'batchType',
      width: 130,
      render: (val: string) => <Tag color="blue">{getBatchTypeName(val)}</Tag>,
    },
    {
      title: '실행주기',
      dataIndex: 'cronExpression',
      key: 'cronExpression',
      width: 150,
      render: (cron: string) => (
        <Tooltip title={cron}>
          <Text>{cronToReadable(cron)}</Text>
        </Tooltip>
      ),
    },
    {
      title: '최종실행',
      dataIndex: 'lastExecDt',
      key: 'lastExecDt',
      width: 150,
      render: (val: string) =>
        val ? (
          <Tooltip title={val}>
            <Text>{formatDateShort(val)}</Text>
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      title: '다음실행',
      dataIndex: 'nextExecDt',
      key: 'nextExecDt',
      width: 150,
      render: (val: string) =>
        val ? (
          <Tooltip title={val}>
            <Space>
              <ClockCircleOutlined style={{ color: '#1890ff' }} />
              <Text>{formatDateShort(val)}</Text>
            </Space>
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      title: '상태',
      dataIndex: 'useYn',
      key: 'useYn',
      width: 80,
      align: 'center',
      render: (val: string, record: BatchSchedule) => (
        <Switch
          checked={val === 'Y'}
          size="small"
          onChange={(checked) => handleToggle(record, checked)}
        />
      ),
    },
    {
      title: '관리',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_: any, record: BatchSchedule) => (
        <Space size="small">
          <Tooltip title="수정">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="삭제">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 툴바 */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          스케줄 등록
        </Button>
        <Button icon={<ReloadOutlined />} onClick={fetchList} loading={loading}>
          조회
        </Button>
      </div>

      {/* 테이블 */}
      <Table
        columns={columns}
        dataSource={dataList}
        rowKey="scheduleSeq"
        loading={loading}
        size="small"
        scroll={{ x: 'max-content' }}
        pagination={false}
        bordered
      />

      {/* 등록/수정 모달 */}
      <BatchScheduleModal
        open={modalOpen}
        editRecord={editRecord}
        batchTypes={batchTypes}
        onClose={() => {
          setModalOpen(false);
          setEditRecord(null);
        }}
        onSaved={fetchList}
      />
    </div>
  );
};

export default BatchScheduleTab;
