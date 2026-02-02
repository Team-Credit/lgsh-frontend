/**
 * 관리그룹 선택 팝업 모달
 */
import React, { useState, useEffect } from 'react';
import { Modal, Table, Input, Button, Space, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { personGroupService } from '@/services/personGroupService';
import type { PersonGroup } from '@/types';

interface PersonGroupSelectModalProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (personGroup: PersonGroup) => void;
  companyId?: string; // 특정 회사의 관리그룹만 조회
}

const PersonGroupSelectModal: React.FC<PersonGroupSelectModalProps> = ({
  open,
  onCancel,
  onSelect,
  companyId,
}) => {
  const [loading, setLoading] = useState(false);
  const [personGroups, setPersonGroups] = useState<PersonGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<PersonGroup[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<PersonGroup | null>(null);

  // 관리그룹 목록 조회
  useEffect(() => {
    if (open) {
      fetchPersonGroups();
      setSearchText('');
      setSelectedGroup(null);
    }
  }, [open, companyId]);

  const fetchPersonGroups = async () => {
    setLoading(true);
    try {
      const response = await personGroupService.list({
        companyId,
        useYn: 'Y',
        page: 0,
        size: 1000,
      });

      if (response.success && response.data) {
        const groupList = response.data.content || [];

        // 중복 제거: personGrp 기준으로 유일한 그룹만 표시
        const uniqueGroups = Array.from(
          new Map(groupList.map(item => [item.personGrp, item])).values()
        );

        setPersonGroups(uniqueGroups);
        setFilteredGroups(uniqueGroups);
      } else {
        message.error(response.message || '관리그룹 목록 조회 실패');
      }
    } catch (error) {
      message.error('관리그룹 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링
  useEffect(() => {
    if (!searchText) {
      setFilteredGroups(personGroups);
      return;
    }

    const filtered = personGroups.filter(
      (group) =>
        group.personGrp?.toLowerCase().includes(searchText.toLowerCase()) ||
        group.personGrpNm?.toLowerCase().includes(searchText.toLowerCase()) ||
        group.companyNm?.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredGroups(filtered);
  }, [searchText, personGroups]);

  const columns: ColumnsType<PersonGroup> = [
    {
      title: '관리그룹코드',
      dataIndex: 'personGrp',
      key: 'personGrp',
      width: 150,
    },
    {
      title: '관리그룹명',
      dataIndex: 'personGrpNm',
      key: 'personGrpNm',
      width: 200,
    },
    {
      title: '원청사',
      dataIndex: 'companyNm',
      key: 'companyNm',
      width: 200,
    },
    {
      title: '사용여부',
      dataIndex: 'useYn',
      key: 'useYn',
      width: 100,
      render: (value: string) => (value === 'Y' ? '사용' : '미사용'),
    },
  ];

  const handleSelect = () => {
    if (!selectedGroup) {
      message.warning('관리그룹을 선택해주세요.');
      return;
    }
    onSelect(selectedGroup);
  };

  return (
    <Modal
      title="관리그룹 선택"
      open={open}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          취소
        </Button>,
        <Button key="select" type="primary" onClick={handleSelect} disabled={!selectedGroup}>
          선택
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Input
          placeholder="관리그룹코드, 관리그룹명, 원청사명으로 검색"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        <Table
          columns={columns}
          dataSource={filteredGroups}
          rowKey="personGrp"
          loading={loading}
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `총 ${total}건`,
          }}
          rowSelection={{
            type: 'radio',
            onChange: (_, selectedRows) => {
              setSelectedGroup(selectedRows[0] || null);
            },
          }}
          onRow={(record) => ({
            onClick: () => setSelectedGroup(record),
          })}
        />
      </Space>
    </Modal>
  );
};

export default PersonGroupSelectModal;
