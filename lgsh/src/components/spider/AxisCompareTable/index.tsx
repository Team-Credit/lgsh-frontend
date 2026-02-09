/**
 * 축별 비교 상세 테이블
 */
import React from 'react';
import { Card, Table, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { SpiderAnalysisResult, AxisDiff } from '@/types/spider';

interface Props {
  result: SpiderAnalysisResult;
}

interface TableRow {
  key: string;
  category: string;
  expValue: number;
  ctlValue: number;
  diff: number;
}

const AxisCompareTable: React.FC<Props> = ({ result }) => {
  const { experiment, control, diff } = result;

  const dataSource: TableRow[] = experiment.axes.map((axis, idx) => ({
    key: axis.key,
    category: axis.axis,
    expValue: axis.value,
    ctlValue: control.axes[idx]?.value ?? 0,
    diff: diff[idx]?.diff ?? 0,
  }));

  const columns: ColumnsType<TableRow> = [
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: `분석 대상 (${experiment.label})`,
      dataIndex: 'expValue',
      key: 'expValue',
      width: 140,
      align: 'center',
      render: (val: number) => val.toFixed(1),
    },
    {
      title: `비교 기준 (${control.label})`,
      dataIndex: 'ctlValue',
      key: 'ctlValue',
      width: 140,
      align: 'center',
      render: (val: number) => val.toFixed(1),
    },
    {
      title: '차이',
      dataIndex: 'diff',
      key: 'diff',
      width: 120,
      align: 'center',
      render: (val: number) => {
        const isPositive = val > 0;
        const color = isPositive ? '#ff4d4f' : val < 0 ? '#52c41a' : '#999';
        const sign = isPositive ? '+' : '';
        const icon = isPositive ? <ArrowUpOutlined /> : val < 0 ? <ArrowDownOutlined /> : null;
        return (
          <span style={{ color, fontWeight: 500 }}>
            {sign}{val.toFixed(1)} {icon}
          </span>
        );
      },
    },
  ];

  return (
    <Card size="small" title="축별 비교 상세" style={{ marginBottom: 16 }}>
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        bordered
      />
    </Card>
  );
};

export default AxisCompareTable;
