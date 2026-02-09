// src/pages/person/components/UserGrpMapTable.tsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Select, Popconfirm, Tag, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UserGrpMap, User } from '@/types';
import { personGroupService } from '@/services/personGroupService';
import UserSelectModal from '@/components/UserSelectModal';

const { Option } = Select;

interface UserGrpMapTableProps {
  personGrp: string;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'red',
  MANAGER: 'blue',
  VIEWER: 'default',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '관리자',
  MANAGER: '매니저',
  VIEWER: '조회자',
};

const UserGrpMapTable: React.FC<UserGrpMapTableProps> = ({ personGrp }) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserGrpMap[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);

  // 사용자 목록 조회
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await personGroupService.getUsers(personGrp);
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      message.error('사용자 목록 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [personGrp]);

  // 사용자 추가
  const handleAddUser = async (user: User) => {
    try {
      const response = await personGroupService.addUser(personGrp, {
        userId: user.userId,
        grpRole: 'VIEWER',
      });
      if (response.success) {
        message.success('사용자가 추가되었습니다.');
        fetchUsers();
      } else {
        message.error(response.message || '사용자 추가에 실패했습니다.');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '사용자 추가 중 오류가 발생했습니다.');
    }
    setUserModalOpen(false);
  };

  // 사용자 제거
  const handleRemoveUser = async (userId: string) => {
    try {
      const response = await personGroupService.removeUser(personGrp, userId);
      if (response.success) {
        message.success('사용자가 제거되었습니다.');
        fetchUsers();
      } else {
        message.error(response.message || '사용자 제거에 실패했습니다.');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '사용자 제거 중 오류가 발생했습니다.');
    }
  };

  // 역할 변경
  const handleRoleChange = async (userId: string, grpRole: string) => {
    try {
      const response = await personGroupService.updateUserRole(personGrp, userId, grpRole);
      if (response.success) {
        message.success('역할이 변경되었습니다.');
        fetchUsers();
      } else {
        message.error(response.message || '역할 변경에 실패했습니다.');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '역할 변경 중 오류가 발생했습니다.');
    }
  };

  const columns: ColumnsType<UserGrpMap> = [
    {
      title: '사용자 ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
    },
    {
      title: '이름',
      dataIndex: 'userNm',
      key: 'userNm',
      width: 100,
    },
    {
      title: '역할',
      dataIndex: 'grpRole',
      key: 'grpRole',
      width: 130,
      render: (role: string, record: UserGrpMap) => (
        <Select
          value={role}
          size="small"
          style={{ width: 110 }}
          onChange={(value) => handleRoleChange(record.userId, value)}
        >
          <Option value="ADMIN">
            <Tag color={ROLE_COLORS.ADMIN}>{ROLE_LABELS.ADMIN}</Tag>
          </Option>
          <Option value="MANAGER">
            <Tag color={ROLE_COLORS.MANAGER}>{ROLE_LABELS.MANAGER}</Tag>
          </Option>
          <Option value="VIEWER">
            <Tag color={ROLE_COLORS.VIEWER}>{ROLE_LABELS.VIEWER}</Tag>
          </Option>
        </Select>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 50,
      align: 'center',
      render: (_, record) => (
        <Popconfirm
          title="이 사용자를 그룹에서 제거하시겠습니까?"
          onConfirm={() => handleRemoveUser(record.userId)}
          okText="제거"
          cancelText="취소"
        >
          <Button type="link" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setUserModalOpen(true)}
        >
          사용자 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="userId"
        loading={loading}
        size="small"
        pagination={false}
      />

      <UserSelectModal
        open={userModalOpen}
        onCancel={() => setUserModalOpen(false)}
        onSelect={handleAddUser}
      />
    </>
  );
};

export default UserGrpMapTable;
