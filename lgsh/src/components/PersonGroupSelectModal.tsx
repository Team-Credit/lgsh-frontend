/**
 * 관리그룹 선택 팝업 모달 (트리 선택)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Tree, Input, Button, Space, Spin, message, Typography, Empty } from 'antd';
import { SearchOutlined, FolderOutlined, FolderOpenOutlined, FileOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { personGroupService } from '@/services/personGroupService';
import type { PersonGroupTreeNode } from '@/types';

const { Text } = Typography;

interface PersonGroupSelectModalProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (personGroup: PersonGroupTreeNode) => void;
  companyId?: string;
}

const PersonGroupSelectModal: React.FC<PersonGroupSelectModalProps> = ({
  open,
  onCancel,
  onSelect,
  companyId,
}) => {
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState<PersonGroupTreeNode[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedNode, setSelectedNode] = useState<PersonGroupTreeNode | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  // 트리 데이터 조회
  useEffect(() => {
    if (open) {
      fetchTree();
      setSearchText('');
      setSelectedNode(null);
    }
  }, [open, companyId]);

  const fetchTree = async () => {
    setLoading(true);
    try {
      const response = await personGroupService.tree(companyId);
      if (response.success && response.data) {
        setTreeData(response.data);
        const allKeys = getAllKeys(response.data);
        setExpandedKeys(allKeys);
      }
    } catch (error) {
      message.error('관리그룹 트리 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 모든 키 추출 (전체 펼침용)
  const getAllKeys = (nodes: PersonGroupTreeNode[]): string[] => {
    let keys: string[] = [];
    nodes.forEach((node) => {
      keys.push(node.personGrp);
      if (node.children) {
        keys = keys.concat(getAllKeys(node.children));
      }
    });
    return keys;
  };

  // 노드 검색
  const findNode = (nodes: PersonGroupTreeNode[], key: string): PersonGroupTreeNode | null => {
    for (const node of nodes) {
      if (node.personGrp === key) return node;
      if (node.children) {
        const found = findNode(node.children, key);
        if (found) return found;
      }
    }
    return null;
  };

  // 검색 매칭 확인 (자신 또는 하위)
  const matchesSearch = (node: PersonGroupTreeNode, search: string): boolean => {
    if (
      node.personGrp.toLowerCase().includes(search) ||
      node.personGrpNm.toLowerCase().includes(search)
    ) {
      return true;
    }
    return node.children?.some((child) => matchesSearch(child, search)) || false;
  };

  // 검색 필터링된 트리 DataNode 변환
  const convertToDataNodes = (nodes: PersonGroupTreeNode[]): DataNode[] => {
    return nodes
      .filter((node) => {
        if (!searchText) return true;
        const lowerSearch = searchText.toLowerCase();
        return matchesSearch(node, lowerSearch);
      })
      .map((node) => ({
        key: node.personGrp,
        title: `${node.personGrpNm} (${node.personGrp})`,
        icon: node.children.length > 0
          ? ({ expanded }: any) => expanded ? <FolderOpenOutlined /> : <FolderOutlined />
          : <FileOutlined />,
        children: node.children.length > 0 ? convertToDataNodes(node.children) : undefined,
      }));
  };

  const dataNodes = useMemo(() => convertToDataNodes(treeData), [treeData, searchText]);

  const handleSelect = () => {
    if (!selectedNode) {
      message.warning('관리그룹을 선택해주세요.');
      return;
    }
    onSelect(selectedNode);
  };

  return (
    <Modal
      title="관리그룹 선택"
      open={open}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>취소</Button>,
        <Button key="select" type="primary" onClick={handleSelect} disabled={!selectedNode}>
          선택
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Input
          placeholder="관리그룹코드 또는 관리그룹명 검색"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        {selectedNode && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            선택됨: {selectedNode.personGrpNm} ({selectedNode.personGrp})
            {selectedNode.grpPath && ` | 경로: ${selectedNode.grpPath}`}
          </Text>
        )}

        <Spin spinning={loading}>
          {dataNodes.length > 0 ? (
            <Tree
              showIcon
              showLine={{ showLeafIcon: false }}
              treeData={dataNodes}
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              selectedKeys={selectedNode ? [selectedNode.personGrp] : []}
              onSelect={(keys) => {
                if (keys.length > 0) {
                  const node = findNode(treeData, keys[0] as string);
                  setSelectedNode(node);
                }
              }}
              style={{ maxHeight: 400, overflow: 'auto' }}
            />
          ) : (
            <Empty description="관리그룹이 없습니다" />
          )}
        </Spin>
      </Space>
    </Modal>
  );
};

export default PersonGroupSelectModal;
