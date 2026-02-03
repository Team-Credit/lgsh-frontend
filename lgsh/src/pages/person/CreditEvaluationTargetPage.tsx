/**
 * 신용평가 대상자 목록 페이지
 */
import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Popconfirm, Select, Space, Table, Typography, message } from 'antd';
import { DeleteOutlined, FileExcelOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import { personService } from '@/services/personService';
import type { PersonFull } from '@/types';
import './CreditEvaluationTargetPage.css';

const { Title, Text } = Typography;
const { Option } = Select;

interface PersonWithScore extends PersonFull {
  recentScore?: number;
}

const CreditEvaluationTargetPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<PersonWithScore[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const fetchData = async (nextPage = page, nextSize = pageSize) => {
    setLoading(true);
    try {
      const searchValues = form.getFieldsValue();
      const response = await personService.list({
        page: nextPage - 1,
        size: nextSize,
        ...searchValues,
      });

      if (!response.success || !response.data) {
        message.error(response.message || '데이터 조회에 실패했습니다.');
        return;
      }

      const content = response.data.content || [];
      const contentWithScore = content.map((item) => ({
        ...item,
        recentScore: Math.floor(Math.random() * (990 - 300 + 1)) + 300,
      }));

      setDataSource(contentWithScore);
      setTotal(response.data.totalCount ?? content.length);
    } catch (error: any) {
      console.error('데이터 조회 오류:', error);
      message.error(error?.message || '데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchData(1, pageSize);
  };

  const handleReset = () => {
    form.resetFields();
    setPage(1);
    fetchData(1, pageSize);
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('삭제할 항목을 선택해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const personIds = selectedRowKeys as string[];
      await personService.deleteBatch(personIds);
      message.success(`${personIds.length}건이 삭제되었습니다.`);
      setSelectedRowKeys([]);
      fetchData(page, pageSize);
    } catch (error: any) {
      console.error('일괄 삭제 오류:', error);
      message.error(error?.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const rowSelection: TableRowSelection<PersonWithScore> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  const columns: ColumnsType<PersonWithScore> = [
    {
      title: '이름',
      dataIndex: 'personNm',
      key: 'personNm',
      width: 120,
      align: 'center',
    },
    {
      title: '주민번호',
      dataIndex: 'personNo',
      key: 'personNo',
      width: 150,
      align: 'center',
      render: (text?: string) => {
        if (!text) return '-';
        if (text.length >= 7) return `${text.substring(0, 6)}-${text.substring(6, 7)}******`;
        return text;
      },
    },
    {
      title: '전화번호',
      dataIndex: 'mobileNo',
      key: 'mobileNo',
      width: 140,
      align: 'center',
      render: (text?: string) => text || '-',
    },
    {
      title: '그룹',
      dataIndex: 'personGrpNm',
      key: 'personGrpNm',
      width: 120,
      align: 'center',
      render: (text: string | undefined, record) => text || record.personGrp || '-',
    },
    {
      title: '상태',
      dataIndex: 'useYn',
      key: 'useYn',
      width: 100,
      align: 'center',
      render: (useYn?: string) => (
        <div className="status-badge">
          <span className={`status-dot ${useYn === 'Y' ? 'active' : 'inactive'}`} />
          {useYn === 'Y' ? '활성' : '비활성'}
        </div>
      ),
    },
    {
      title: '최근점수',
      dataIndex: 'recentScore',
      key: 'recentScore',
      width: 100,
      align: 'center',
      render: (score?: number) => <Text strong>{score ?? '-'}</Text>,
    },
    {
      title: '상세',
      key: 'action',
      width: 80,
      align: 'center',
      render: () => (
        <Button type="text" size="small">
          보기
        </Button>
      ),
    },
  ];

  return (
    <div className="credit-evaluation-target-page">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>
          신용평가 대상자 목록
        </Title>
        <Button type="primary" style={{ visibility: 'hidden' }}>
          + 신규등록
        </Button>
      </div>

      <Card className="search-card" size="small">
        <div className="search-title">조회조건</div>
        <Form form={form} layout="inline" className="search-form">
          <Form.Item name="personNm">
            <Input placeholder="검색어 입력" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="personGrp">
            <Select placeholder="그룹 전체" style={{ width: 150 }} allowClear>
              <Option value="VIP">VIP</Option>
              <Option value="NORMAL">일반</Option>
            </Select>
          </Form.Item>
          <Form.Item name="useYn">
            <Select placeholder="상태 전체" style={{ width: 150 }} allowClear>
              <Option value="Y">활성</Option>
              <Option value="N">비활성</Option>
            </Select>
          </Form.Item>

          <div style={{ marginLeft: 'auto' }}>
            <Space>
              <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>
                검색
              </Button>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>
                초기화
              </Button>
              <Button icon={<FileExcelOutlined />}>엑셀</Button>
            </Space>
          </div>
        </Form>
      </Card>

      <Card className="table-card" size="small">
        <div className="table-title">조회결과 (총 {total}건)</div>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={dataSource}
          rowKey="personId"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
              fetchData(nextPage, nextSize);
            },
          }}
          size="middle"
          bordered
        />

        <div className="footer-actions" style={{ marginTop: 16 }}>
          <Text type="secondary">선택: {selectedRowKeys.length}건</Text>
          <Popconfirm
            title="일괄 삭제"
            description="선택한 항목을 정말 삭제하시겠습니까?"
            onConfirm={handleBatchDelete}
            okText="삭제"
            cancelText="취소"
            disabled={selectedRowKeys.length === 0}
          >
            <Button danger type="primary" icon={<DeleteOutlined />} disabled={selectedRowKeys.length === 0}>
              일괄 삭제
            </Button>
          </Popconfirm>
        </div>
      </Card>
    </div>
  );
};

export default CreditEvaluationTargetPage;
