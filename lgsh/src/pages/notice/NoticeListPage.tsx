import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Pagination,
  message,
  Typography,
  Modal,
  Form,
  DatePicker,
  Switch,
  Select,
  Spin,
  Popconfirm,
} from 'antd';
import {
  SearchOutlined,
  PushpinFilled,
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table/interface';
import { noticeService } from '@/services/noticeService';
import { Notice } from '@/types';
import dayjs, { Dayjs } from 'dayjs';
import { useMenuPermission } from '@/hooks';
import './NoticeListPage.css';

const { Title, Text } = Typography;

const NoticeListPage: React.FC = () => {
  const { canWrite, canDelete } = useMenuPermission('M0701');
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.roleId === 'ADMIN';

  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<Notice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<Notice[]>([]);
  const [bulkExpireOpen, setBulkExpireOpen] = useState(false);
  const [bulkExpireDate, setBulkExpireDate] = useState<Dayjs | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editTargetId, setEditTargetId] = useState<number | null>(null);
  const [editForm] = Form.useForm();

  const fetchData = useCallback(async (currentPage = page) => {
    setLoading(true);
    try {
      const response = await noticeService.list({
        page: currentPage,
        size: pageSize,
        keyword,
      });

      console.log('[NoticeList] API response:', JSON.stringify(response));

      if (response.success && response.data) {
        const today = dayjs().format('YYYYMMDD');
        console.log('[NoticeList] today:', today);
        const enriched = (response.data.content || []).map((item: Notice) => {
          const computed = item.expiredYn || (item.endDt && item.endDt < today ? 'Y' : 'N');
          console.log(`[NoticeList] id=${item.noticeId}, endDt="${item.endDt}", expiredYn="${item.expiredYn}", computed="${computed}"`);
          return { ...item, expiredYn: computed as 'Y' | 'N' };
        });
        setDataSource(enriched);
        setTotal(response.data.totalCount);
      } else {
        console.error('[NoticeList] 조회 실패:', response);
        message.error(response.message || '데이터 조회에 실패했습니다.');
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || '데이터 조회 중 오류가 발생했습니다.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword]);

  useEffect(() => {
    fetchData();
  }, []);

  const normalizeDate = (value?: string) => {
    if (!value) return '';
    const raw = String(value);
    if (/^\d{8}$/.test(raw)) return raw;
    const parsed = dayjs(raw);
    return parsed.isValid() ? parsed.format('YYYYMMDD') : '';
  };

  const handleSearch = () => {
    setPage(1);
    fetchData(1);
  };

  const handleReset = () => {
    setKeyword('');
    setPage(1);
    fetchData(1);
  };

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
    fetchData(newPage);
  };

  const handleOpenBulkExpire = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('대상을 선택해 주세요.');
      return;
    }
    setBulkExpireDate(null);
    setBulkExpireOpen(true);
  };

  const handleBulkExpire = async () => {
    if (!bulkExpireDate) {
      message.warning('만료 기한을 선택해 주세요.');
      return;
    }
    setBulkSubmitting(true);
    try {
      await Promise.all(
        selectedRows.map((row) =>
          noticeService.update(row.noticeId, {
            title: row.title,
            content: row.content || '',
            lvl: row.lvl,
            pinYn: row.pinYn,
            useYn: row.useYn,
            startDt: normalizeDate(row.startDt),
            endDt: bulkExpireDate.format('YYYYMMDD'),
          })
        )
      );
      message.success('만료 기한이 일괄 설정되었습니다.');
      setBulkExpireOpen(false);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      fetchData(1);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '만료 기한 설정에 실패했습니다.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const openEditModal = async (record: Notice) => {
    setEditTargetId(record.noticeId);
    setEditModalOpen(true);
    setEditLoading(true);
    try {
      const response = await noticeService.get(record.noticeId);
      if (response.success && response.data) {
        editForm.setFieldsValue({
          title: response.data.title,
          lvl: response.data.lvl,
          pinYn: response.data.pinYn === 'Y',
          useYn: response.data.useYn === 'Y',
          period: [
            response.data.startDt ? dayjs(response.data.startDt) : null,
            response.data.endDt ? dayjs(response.data.endDt) : null,
          ],
          content: response.data.content || '',
        });
      } else {
        message.error(response.message || '공지 상세 조회에 실패했습니다.');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '공지 상세 조회에 실패했습니다.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editTargetId) return;
    try {
      const values = await editForm.validateFields();
      setEditSubmitting(true);
      const payload = {
        title: values.title,
        content: values.content || '',
        lvl: values.lvl,
        pinYn: values.pinYn ? 'Y' : 'N',
        useYn: values.useYn ? 'Y' : 'N',
        startDt: values.period?.[0] ? values.period[0].format('YYYYMMDD') : '',
        endDt: values.period?.[1] ? values.period[1].format('YYYYMMDD') : '',
      };
      const response = await noticeService.update(editTargetId, payload);
      if (response.success) {
        message.success('공지사항이 수정되었습니다.');
        setEditModalOpen(false);
        fetchData(page);
      } else {
        message.error(response.message || '수정에 실패했습니다.');
      }
    } catch (error: any) {
      if (error?.errorFields) {
        message.error('필수 항목을 확인해 주세요.');
      } else {
        message.error(error?.response?.data?.message || '수정에 실패했습니다.');
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (noticeId: number) => {
    try {
      const response = await noticeService.delete(noticeId);
      if (response.success) {
        message.success('공지사항이 삭제되었습니다.');
        fetchData(page);
      } else {
        message.error(response.message || '삭제에 실패했습니다.');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const columns: ColumnsType<Notice> = [
    {
      title: '번호',
      dataIndex: 'noticeId',
      key: 'noticeId',
      width: 80,
      align: 'center',
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Notice) => (
        <Space>
          {record.pinYn === 'Y' && <PushpinFilled style={{ color: '#faad14' }} />}
          {record.expiredYn === 'Y' && <Tag color="default">만료</Tag>}
          {record.lvl === '3' && <Tag color="red">긴급</Tag>}
          {record.lvl === '2' && <Tag color="orange">중요</Tag>}
          {record.lvl === '1' && <Tag color="default">일반</Tag>}
          <a className="notice-list__title-link" onClick={() => navigate(`/notices/${record.noticeId}`)}>
            {text}
          </a>
        </Space>
      ),
    },
    {
      title: '작성자',
      dataIndex: 'regUserId',
      key: 'regUserId',
      width: 120,
      align: 'center',
    },
    {
      title: '등록일',
      dataIndex: 'regDt',
      key: 'regDt',
      width: 160,
      align: 'center',
    },
    {
      title: '조회수',
      dataIndex: 'viewCnt',
      key: 'viewCnt',
      width: 100,
      align: 'center',
      render: (cnt: number) => cnt.toLocaleString(),
    },
    ...(isAdmin
      ? [
          {
            title: '액션',
            key: 'actions',
            width: 90,
            align: 'center' as const,
            render: (_: unknown, record: Notice) => (
              <Space size="small">
                {canWrite && (
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEditModal(record)}
                    title="수정"
                  />
                )}
                {canDelete && (
                  <Popconfirm
                    title="정말 삭제하시겠습니까?"
                    okText="삭제"
                    cancelText="취소"
                    onConfirm={() => handleDelete(record.noticeId)}
                  >
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      title="삭제"
                    />
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="notice-page">
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          공지사항
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          공지사항을 조회하고 관리합니다.
        </Text>
      </div>

      <Card className="search-card" size="small">
        <Space wrap>
          <Input
            placeholder="제목 + 내용 검색"
            style={{ width: 300 }}
            value={keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            조회
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            초기화
          </Button>
          {isAdmin && (
            <Button icon={<CalendarOutlined />} onClick={handleOpenBulkExpire}>
              만료 기한 설정
            </Button>
          )}
          {isAdmin && canWrite && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/notices/create')}>
              등록
            </Button>
          )}
        </Space>
      </Card>

      <Card size="small">
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">총 {total.toLocaleString()}건</Text>
          {isAdmin && selectedRowKeys.length > 0 && (
            <Text type="secondary" style={{ marginLeft: 12 }}>
              선택 {selectedRowKeys.length}건
            </Text>
          )}
        </div>

        <Table
          dataSource={dataSource}
          columns={columns}
          rowKey="noticeId"
          loading={loading}
          pagination={false}
          className="notice-list__table"
          rowSelection={
            isAdmin
              ? {
                  selectedRowKeys,
                  onChange: (keys, rows) => {
                    setSelectedRowKeys(keys);
                    setSelectedRows(rows);
                  },
                }
              : undefined
          }
          rowClassName={(record) => {
            if (record.expiredYn === 'Y') return 'notice-list__expired-row';
            if (record.pinYn === 'Y') return 'notice-list__pinned-row';
            return '';
          }}
        />

        <div className="notice-list__pagination">
          <Pagination
            current={page}
            total={total}
            pageSize={pageSize}
            onChange={handlePageChange}
            showSizeChanger
            showTotal={(total) => `총 ${total}건`}
            pageSizeOptions={['10', '20', '50']}
          />
        </div>
      </Card>

      <Modal
        title="만료 기한 설정"
        open={bulkExpireOpen}
        onCancel={() => setBulkExpireOpen(false)}
        onOk={handleBulkExpire}
        okText="설정"
        cancelText="취소"
        confirmLoading={bulkSubmitting}
      >
        <DatePicker
          style={{ width: '100%' }}
          placeholder="만료 기한 선택"
          value={bulkExpireDate}
          onChange={(date) => setBulkExpireDate(date)}
        />
      </Modal>

      <Modal
        title="공지사항 수정"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleEditSubmit}
        okText="저장"
        cancelText="취소"
        confirmLoading={editSubmitting}
        destroyOnClose
      >
        <Spin spinning={editLoading}>
          <Form form={editForm} layout="vertical">
            <Form.Item name="title" label="제목" rules={[{ required: true, message: '제목을 입력해 주세요.' }]}>
              <Input placeholder="제목 입력" />
            </Form.Item>
            <Form.Item name="lvl" label="중요도" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="1">일반</Select.Option>
                <Select.Option value="2">중요</Select.Option>
                <Select.Option value="3">긴급</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="period" label="게시 기간">
              <DatePicker.RangePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="pinYn" label="상단 고정" valuePropName="checked">
              <Switch checkedChildren="고정" unCheckedChildren="해제" />
            </Form.Item>
            <Form.Item name="useYn" label="사용 여부" valuePropName="checked">
              <Switch checkedChildren="사용" unCheckedChildren="미사용" />
            </Form.Item>
            <Form.Item name="content" label="내용" rules={[{ required: true, message: '내용을 입력해 주세요.' }]}>
              <Input.TextArea rows={6} placeholder="내용 입력" />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </div>
  );
};

export default NoticeListPage;
