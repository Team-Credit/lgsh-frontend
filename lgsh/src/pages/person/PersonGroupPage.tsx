/**
 * 관리그룹 관리 페이지 (계층형 트리 + 상세)
 */
import React, { useState, useEffect } from 'react';
import { Typography, message } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import type { PersonGroupTreeNode } from '@/types';
import { personGroupService } from '@/services/personGroupService';
import { useAppSelector } from '@/store/hooks';
import PersonGroupTree from './components/PersonGroupTree';
import PersonGroupDetail from './components/PersonGroupDetail';
import './PersonGroupPage.css';

const { Title, Text } = Typography;

// 트리에서 노드 찾기 (재귀)
const findNodeInTree = (
  nodes: PersonGroupTreeNode[],
  personGrp: string
): PersonGroupTreeNode | null => {
  for (const node of nodes) {
    if (node.personGrp === personGrp) return node;
    if (node.children) {
      const found = findNodeInTree(node.children, personGrp);
      if (found) return found;
    }
  }
  return null;
};

const PersonGroupPage: React.FC = () => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const userCompanyId = currentUser?.companyId || '';

  const [treeData, setTreeData] = useState<PersonGroupTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PersonGroupTreeNode | null>(null);
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
  const [parentGroup, setParentGroup] = useState<PersonGroupTreeNode | null>(null);

  // 트리 조회
  const fetchTree = async () => {
    setTreeLoading(true);
    try {
      const response = await personGroupService.tree(userCompanyId || undefined);
      if (response.success && response.data) {
        setTreeData(response.data);
      }
    } catch (error) {
      message.error('관리그룹 트리 조회에 실패했습니다.');
    } finally {
      setTreeLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  // 트리 노드 선택
  const handleSelect = (personGrp: string) => {
    const node = findNodeInTree(treeData, personGrp);
    setSelectedKey(personGrp);
    setSelectedGroup(node);
    setParentGroup(node?.parentGrp ? findNodeInTree(treeData, node.parentGrp) : null);
    setMode('edit');
  };

  // 루트 그룹 추가
  const handleAddRoot = () => {
    setSelectedKey(null);
    setSelectedGroup(null);
    setParentGroup(null);
    setMode('create');
  };

  // 하위 그룹 추가
  const handleAddChild = (parentGrp: string) => {
    const parent = findNodeInTree(treeData, parentGrp);
    setSelectedKey(null);
    setSelectedGroup(null);
    setParentGroup(parent);
    setMode('create');
  };

  // 저장 후 처리
  const handleSaved = () => {
    fetchTree();
    setMode('view');
    setSelectedKey(null);
    setSelectedGroup(null);
  };

  // 삭제 후 처리
  const handleDeleted = () => {
    fetchTree();
    setSelectedKey(null);
    setSelectedGroup(null);
    setMode('view');
  };

  return (
    <div className="person-group-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <TeamOutlined style={{ marginRight: 8 }} />
          관리그룹 관리
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          계층 구조로 관리그룹을 관리합니다.
        </Text>
      </div>

      {/* 메인 레이아웃: 좌측 트리 + 우측 상세 */}
      <div className="grp-layout">
        {/* 좌측: 트리 */}
        <PersonGroupTree
          treeData={treeData}
          selectedKey={selectedKey}
          loading={treeLoading}
          onSelect={handleSelect}
          onAddRoot={handleAddRoot}
          onAddChild={handleAddChild}
        />

        {/* 우측: 상세/등록 */}
        <PersonGroupDetail
          selectedGroup={selectedGroup}
          parentGroup={parentGroup}
          mode={mode}
          companyId={userCompanyId}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onAddChild={handleAddChild}
        />
      </div>
    </div>
  );
};

export default PersonGroupPage;
