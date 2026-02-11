// src/pages/person/components/PersonGroupTree.tsx
import React, { useMemo } from 'react';
import { Tree, Badge, Typography, Button, Tooltip } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  PlusOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';
import type { PersonGroupTreeNode } from '@/types';

const { Text } = Typography;

interface PersonGroupTreeProps {
  treeData: PersonGroupTreeNode[];
  selectedKey: string | null;
  loading: boolean;
  onSelect: (personGrp: string) => void;
  onAddRoot: () => void;
  onAddChild: (parentGrp: string) => void;
  onDrop?: TreeProps['onDrop'];
  canWrite?: boolean;
}

// 트리 노드 제목 렌더링
const renderTitle = (node: PersonGroupTreeNode): React.ReactNode => (
  <span className="grp-tree-title">
    <span className="grp-tree-name">{node.personGrpNm}</span>
    <span className="grp-tree-info">
      <Tooltip title={`사용자 ${node.userCount}명`}>
        <Badge count={node.userCount} size="small" color="#1677ff" overflowCount={99}>
          <UserOutlined style={{ fontSize: 12 }} />
        </Badge>
      </Tooltip>
      <Tooltip title={`대상자 ${node.personCount}명`}>
        <Badge count={node.personCount} size="small" color="#52c41a" overflowCount={9999}>
          <TeamOutlined style={{ fontSize: 12 }} />
        </Badge>
      </Tooltip>
    </span>
  </span>
);

// PersonGroupTreeNode → Ant Design DataNode 변환
const convertToDataNode = (nodes: PersonGroupTreeNode[]): DataNode[] => {
  return nodes.map((node) => ({
    key: node.personGrp,
    title: renderTitle(node),
    icon: node.children.length > 0
      ? ({ expanded }: any) => expanded ? <FolderOpenOutlined /> : <FolderOutlined />
      : <FileOutlined />,
    children: node.children.length > 0 ? convertToDataNode(node.children) : undefined,
    isLeaf: node.children.length === 0,
  }));
};

const PersonGroupTree: React.FC<PersonGroupTreeProps> = ({
  treeData,
  selectedKey,
  loading,
  onSelect,
  onAddRoot,
  onDrop,
  canWrite = true,
}) => {
  const dataNodes = useMemo(() => convertToDataNode(treeData), [treeData]);

  return (
    <div className="grp-tree-container">
      <div className="grp-tree-header">
        <Text strong>관리그룹 트리</Text>
        {canWrite && (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={onAddRoot}
          >
            루트 추가
          </Button>
        )}
      </div>

      <Tree
        showIcon
        showLine={{ showLeafIcon: false }}
        treeData={dataNodes}
        selectedKeys={selectedKey ? [selectedKey] : []}
        defaultExpandAll
        onSelect={(keys) => {
          if (keys.length > 0) {
            onSelect(keys[0] as string);
          }
        }}
        draggable={!!onDrop}
        onDrop={onDrop}
        loading={loading}
      />
    </div>
  );
};

export default PersonGroupTree;
