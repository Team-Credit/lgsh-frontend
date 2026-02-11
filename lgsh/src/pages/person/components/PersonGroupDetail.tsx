// src/pages/person/components/PersonGroupDetail.tsx
import React, { useEffect, useState } from 'react';
import {
  Card, Form, Input, Select, Button, Space, Divider, Typography, InputNumber, Tag, message,
} from 'antd';
import {
  SaveOutlined, DeleteOutlined, PlusOutlined,
  FolderOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import type { PersonGroupRequest, PersonGroupTreeNode } from '@/types';
import { personGroupService } from '@/services/personGroupService';
import UserGrpMapTable from './UserGrpMapTable';

const { Text } = Typography;
const { Option } = Select;

interface PersonGroupDetailProps {
  selectedGroup: PersonGroupTreeNode | null;
  parentGroup: PersonGroupTreeNode | null;
  mode: 'view' | 'create' | 'edit';
  companyId: string;
  onSaved: () => void;
  onDeleted: () => void;
  onAddChild: (parentGrp: string) => void;
  canWrite?: boolean;
  canDelete?: boolean;
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Level 1 (루트)',
  2: 'Level 2 (중간)',
  3: 'Level 3 (말단)',
};

const PersonGroupDetail: React.FC<PersonGroupDetailProps> = ({
  selectedGroup,
  parentGroup,
  mode,
  companyId,
  onSaved,
  onDeleted,
  onAddChild,
  canWrite = true,
  canDelete: permDelete = true,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 폼 초기화
  useEffect(() => {
    if (mode === 'create') {
      form.resetFields();
      form.setFieldsValue({
        companyId,
        parentGrp: parentGroup?.personGrp || null,
        useYn: 'Y',
        sortOrder: 0,
      });
    } else if (selectedGroup) {
      form.setFieldsValue({
        personGrp: selectedGroup.personGrp,
        parentGrp: selectedGroup.parentGrp,
        companyId: selectedGroup.companyId,
        personGrpNm: selectedGroup.personGrpNm,
        personNmEng: selectedGroup.personNmEng || '',
        sortOrder: selectedGroup.sortOrder,
        useYn: selectedGroup.useYn,
      });
    }
  }, [selectedGroup, mode, parentGroup, companyId, form]);

  // 저장
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const requestData: PersonGroupRequest = {
        ...values,
        parentGrp: values.parentGrp || null,
        personNmEng: values.personNmEng || null,
      };

      let response;
      if (mode === 'create') {
        response = await personGroupService.create(requestData);
      } else {
        response = await personGroupService.update(
          selectedGroup!.personGrp,
          requestData
        );
      }

      if (response?.success) {
        message.success(mode === 'create' ? '등록되었습니다.' : '수정되었습니다.');
        onSaved();
      } else {
        message.error(response?.message || '저장에 실패했습니다.');
      }
    } catch (error: any) {
      if (error?.errorFields) {
        message.error('입력값을 확인해주세요.');
      } else {
        message.error(error?.response?.data?.message || '저장 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!selectedGroup) return;

    if (selectedGroup.children.length > 0) {
      message.error('하위 그룹이 존재하여 삭제할 수 없습니다. 하위 그룹을 먼저 삭제하세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await personGroupService.delete(selectedGroup.personGrp);
      if (response.success) {
        message.success('삭제되었습니다.');
        onDeleted();
      } else {
        message.error(response.message || '삭제에 실패했습니다.');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 아무것도 선택하지 않은 상태
  if (!selectedGroup && mode !== 'create') {
    return (
      <div className="grp-detail-empty">
        <InfoCircleOutlined style={{ fontSize: 48 }} />
        <Text type="secondary">좌측 트리에서 관리그룹을 선택하세요.</Text>
      </div>
    );
  }

  const currentLevel = mode === 'create'
    ? (parentGroup ? parentGroup.grpLevel + 1 : 1)
    : selectedGroup?.grpLevel || 1;

  return (
    <div className="grp-detail-container">
      {/* 그룹 정보 */}
      <Card
        title={
          <Space>
            <FolderOutlined />
            {mode === 'create' ? '관리그룹 등록' : `${selectedGroup?.personGrpNm || ''}`}
            {currentLevel && (
              <Tag color="blue">{LEVEL_LABELS[currentLevel]}</Tag>
            )}
          </Space>
        }
        size="small"
        extra={
          canWrite && mode !== 'create' && selectedGroup && selectedGroup.grpLevel < 3 && (
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => onAddChild(selectedGroup.personGrp)}
            >
              하위 추가
            </Button>
          )
        }
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item
            label="관리그룹코드"
            name="personGrp"
            rules={[
              { required: true, message: '관리그룹코드를 입력하세요.' },
              { max: 20, message: '최대 20자까지 입력 가능합니다.' },
              { pattern: /^[A-Z0-9_]+$/, message: '영문 대문자, 숫자, 언더스코어만 허용됩니다.' },
            ]}
          >
            <Input
              placeholder="예: GRP_SEOUL"
              disabled={mode === 'edit'}
              maxLength={20}
            />
          </Form.Item>

          <Form.Item label="상위 관리그룹" name="parentGrp">
            <Input
              placeholder="없음 (루트)"
              disabled
              addonAfter={
                parentGroup ? (
                  <Text type="secondary">{parentGroup.personGrpNm}</Text>
                ) : (
                  <Text type="secondary">루트</Text>
                )
              }
            />
          </Form.Item>

          <Form.Item name="companyId" hidden>
            <Input />
          </Form.Item>

          <Form.Item
            label="관리그룹명"
            name="personGrpNm"
            rules={[
              { required: true, message: '관리그룹명을 입력하세요.' },
              { max: 100, message: '최대 100자까지 입력 가능합니다.' },
            ]}
          >
            <Input placeholder="관리그룹명" maxLength={100} />
          </Form.Item>

          <Form.Item
            label="관리그룹 영문명"
            name="personNmEng"
            rules={[{ max: 200, message: '최대 200자까지 입력 가능합니다.' }]}
          >
            <Input placeholder="영문명 (선택)" maxLength={200} />
          </Form.Item>

          <Space size="large">
            <Form.Item label="정렬순서" name="sortOrder">
              <InputNumber min={0} max={99999} />
            </Form.Item>
            <Form.Item label="사용여부" name="useYn">
              <Select style={{ width: 100 }}>
                <Option value="Y">사용</Option>
                <Option value="N">미사용</Option>
              </Select>
            </Form.Item>
          </Space>

          {/* 경로 정보 (편집 모드에서만) */}
          {mode !== 'create' && selectedGroup && (
            <div className="grp-path-info">
              <Text type="secondary" style={{ fontSize: 12 }}>
                경로: {selectedGroup.grpPath}
              </Text>
            </div>
          )}
        </Form>

        <Divider style={{ margin: '12px 0' }} />

        <Space>
          {canWrite && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={loading}
            >
              저장
            </Button>
          )}
          {permDelete && mode !== 'create' && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
              loading={loading}
            >
              삭제
            </Button>
          )}
        </Space>
      </Card>

      {/* 소속 사용자 (편집 모드에서만) */}
      {mode !== 'create' && selectedGroup && (
        <Card title="소속 사용자" size="small" style={{ marginTop: 16 }}>
          <UserGrpMapTable personGrp={selectedGroup.personGrp} />
        </Card>
      )}
    </div>
  );
};

export default PersonGroupDetail;
