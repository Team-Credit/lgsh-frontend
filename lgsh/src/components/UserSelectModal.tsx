/**
 * 사용자 선택 팝업 모달
 */
import React, { useState, useEffect } from 'react';
import { Modal, Table, Input, Button, Space, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { userService } from '@/services/userService';
import type { User } from '@/types';

interface UserSelectModalProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (user: User) => void;
  companyId?: string; // 특정 회사의 사용자만 조회
}

const UserSelectModal: React.FC<UserSelectModalProps> = ({
  open,
  onCancel,
  onSelect,
  companyId,
}) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 사용자 목록 조회
  useEffect(() => {
    if (open) {
      fetchUsers();
      setSearchText('');
      setSelectedUser(null);
    }
  }, [open, companyId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.list({
        companyId,
        useYn: 'Y',
        page: 0,
        size: 1000,
      });

      if (response.success && response.data) {
        const userList = response.data.content || [];
        setUsers(userList);
        setFilteredUsers(userList);
      } else {
        message.error(response.message || '사용자 목록 조회 실패');
      }
    } catch (error) {
      message.error('사용자 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링
  useEffect(() => {
    if (!searchText) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(
      (user) =>
        user.userId?.toLowerCase().includes(searchText.toLowerCase()) ||
        user.userNm?.toLowerCase().includes(searchText.toLowerCase()) ||
        user.companyNm?.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchText, users]);

  const columns: ColumnsType<User> = [
    {
      title: '사용자ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 150,
    },
    {
      title: '사용자명',
      dataIndex: 'userNm',
      key: 'userNm',
      width: 150,
    },
    {
      title: '원청사',
      dataIndex: 'companyNm',
      key: 'companyNm',
      width: 200,
    },
    {
      title: '권한',
      dataIndex: 'roleNm',
      key: 'roleNm',
      width: 150,
    },
  ];

  const handleSelect = () => {
    if (!selectedUser) {
      message.warning('사용자를 선택해주세요.');
      return;
    }
    onSelect(selectedUser);
  };

  return (
    <Modal
      title="사용자 선택"
      open={open}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          취소
        </Button>,
        <Button key="select" type="primary" onClick={handleSelect} disabled={!selectedUser}>
          선택
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Input
          placeholder="사용자ID, 사용자명, 원청사명으로 검색"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="userId"
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
              setSelectedUser(selectedRows[0] || null);
            },
          }}
          onRow={(record) => ({
            onClick: () => setSelectedUser(record),
          })}
        />
      </Space>
    </Modal>
  );
};

export default UserSelectModal;
