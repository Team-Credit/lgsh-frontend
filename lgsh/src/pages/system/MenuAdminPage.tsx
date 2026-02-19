import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  App,
  Tree,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Popconfirm,
  Divider,
  Typography,
} from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';
import {
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  DeleteOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import {
  LayoutGrid,
  Menu,
  Settings,
  Users,
  FileText,
  Folder,
  ClipboardList,
  PanelsTopLeft,
} from 'lucide-react';
import type { MenuItem } from '@/types';
import { menuService } from '@/services/menuService';
import { useMenuPermission } from '@/hooks';
import './MenuAdminPage.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ICON_OPTIONS = [
  { value: 'layout-grid', label: 'LayoutGrid', icon: <LayoutGrid size={16} /> },
  { value: 'menu', label: 'Menu', icon: <Menu size={16} /> },
  { value: 'settings', label: 'Settings', icon: <Settings size={16} /> },
  { value: 'users', label: 'Users', icon: <Users size={16} /> },
  { value: 'file-text', label: 'FileText', icon: <FileText size={16} /> },
  { value: 'folder', label: 'Folder', icon: <Folder size={16} /> },
  { value: 'clipboard-list', label: 'ClipboardList', icon: <ClipboardList size={16} /> },
  { value: 'panels-top-left', label: 'PanelsTopLeft', icon: <PanelsTopLeft size={16} /> },
];

const MenuAdminPage: React.FC = () => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const { canWrite, canDelete } = useMenuPermission('M0802');
  const [treeData, setTreeData] = useState<MenuItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leftWidth, setLeftWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const minLeftWidth = 260;
  const maxLeftWidth = 560;
  const useYn = Form.useWatch('useYn', form);

  const loadTree = async () => {
    setLoadingTree(true);
    try {
      const response = await menuService.getAdminMenuTree();
      if (response.success && response.data) {
        setTreeData(response.data.menus || []);
      } else {
        setTreeData([]);
        message.error(response.message || '메뉴 트리 조회에 실패했습니다.');
      }
    } catch (error: any) {
      setTreeData([]);
      message.error(error?.response?.data?.message || '메뉴 트리 조회에 실패했습니다.');
    } finally {
      setLoadingTree(false);
    }
  };

  const loadDetail = async (menuId: string) => {
    setLoadingDetail(true);
    try {
      const response = await menuService.getAdminMenuDetail(menuId);
      if (response.success && response.data) {
        form.setFieldsValue(response.data);
      } else {
        message.error(response.message || '메뉴 상세 조회에 실패했습니다.');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '메뉴 상세 조회에 실패했습니다.');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const container = document.querySelector('.menu-admin-grid');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const nextWidth = event.clientX - rect.left;
      if (nextWidth >= minLeftWidth && nextWidth <= maxLeftWidth) {
        setLeftWidth(nextWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const treeNodes: DataNode[] = useMemo(() => {
    const toNode = (menu: MenuItem): DataNode => ({
      key: menu.menuId,
      title: (
        <span className={`menu-admin-node${menu.useYn === 'N' ? ' is-disabled' : ''}`}>
          {menu.menuNm}
          {menu.useYn === 'N' && <span className="menu-admin-node__status">비활성</span>}
        </span>
      ),
      children: menu.children ? menu.children.map(toNode) : [],
    });
    return treeData.map(toNode);
  }, [treeData]);

  const parentOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const walk = (menus: MenuItem[]) => {
      menus.forEach((menu) => {
        options.push({ value: menu.menuId, label: `${menu.menuNm} (${menu.menuId})` });
        if (menu.children && menu.children.length > 0) {
          walk(menu.children);
        }
      });
    };
    walk(treeData);
    return options;
  }, [treeData]);

  const handleSelect: TreeProps['onSelect'] = (keys) => {
    if (!keys || keys.length === 0) {
      return;
    }
    const menuId = String(keys[0]);
    setSelectedId(menuId);
    const findMenu = (menus: MenuItem[], targetId: string): MenuItem | null => {
      for (const menu of menus) {
        if (menu.menuId === targetId) return menu;
        if (menu.children && menu.children.length > 0) {
          const found = findMenu(menu.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    const selectedMenu = findMenu(treeData, menuId);
    if (selectedMenu) {
      form.setFieldsValue(selectedMenu);
      return;
    }
    loadDetail(menuId);
  };

  const handleAddRoot = () => {
    setSelectedId(null);
    form.resetFields();
    form.setFieldsValue({
      useYn: 'Y',
    });
  };

  const handleAddChild = () => {
    const parentId = selectedId;
    if (!parentId) {
      message.warning('상위 메뉴를 먼저 선택해주세요.');
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      parentMenuId: parentId,
      useYn: 'Y',
    });
    setSelectedId(null);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const menuId = values.menuId || null;
      const response = await menuService.saveAdminMenu(menuId, values);
      if (response.success && response.data) {
        message.success('저장되었습니다.');
        await loadTree();
        const newId = response.data.menuId || values.menuId;
        if (newId) {
          setSelectedId(newId);
          await loadDetail(newId);
        }
        return;
      }
      message.error(response.message || '저장에 실패했습니다.');
    } catch (error: any) {
      if (error?.response?.data?.code === 'ERR_MENU_002') {
        message.error('하위 메뉴가 존재하여 삭제할 수 없습니다.');
        return;
      }
      message.error(error?.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };


  const handleActivate = async () => {
    const menuId = form.getFieldValue('menuId');
    if (!menuId) {
      message.warning('활성화할 메뉴를 선택해주세요.');
      return;
    }
    try {
      setSaving(true);
      const response = await menuService.activateAdminMenu(menuId);
      if (response.success) {
        message.success('메뉴가 활성화되었습니다.');
        await loadTree();
        await loadDetail(menuId);
        return;
      }
      message.error(response.message || '활성화에 실패했습니다.');
    } catch (error: any) {
      message.error(error?.response?.data?.message || '활성화에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    const menuId = form.getFieldValue('menuId');
    if (!menuId) {
      message.warning('비활성화할 메뉴를 선택해주세요.');
      return;
    }
    try {
      setSaving(true);
      const response = await menuService.deactivateAdminMenu(menuId);
      if (response.success) {
        message.success('메뉴가 비활성화되었습니다.');
        await loadTree();
        await loadDetail(menuId);
        return;
      }
      message.error(response.message || '비활성화에 실패했습니다.');
    } catch (error: any) {
      message.error(error?.response?.data?.message || '비활성화에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const menuId = form.getFieldValue('menuId');
    if (!menuId) {
      message.warning('삭제할 메뉴를 선택해주세요.');
      return;
    }

    try {
      setSaving(true);
      const response = await menuService.deleteAdminMenu(menuId);
      if (response.success) {
        message.success('메뉴가 삭제되었습니다.');
        setSelectedId(null);
        form.resetFields();
        await loadTree();
        return;
      }
      message.error(response.message || '삭제에 실패했습니다.');
    } catch (error: any) {
      if (error?.response?.data?.code === 'ERR_MENU_002') {
        message.error('하위 메뉴가 존재하여 삭제할 수 없습니다.');
        return;
      }
      message.error(error?.response?.data?.message || '삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDrop: TreeProps['onDrop'] = async (info) => {
    // 부모 노드 내부로 드롭(dropToGap=false)은 허용하지 않음
    // → 같은 부모 아래 순서 변경만 지원 (레벨/사이클 오류 방지)
    if (!info.dropToGap) {
      message.warning('같은 레벨 내에서만 순서를 변경할 수 있습니다.');
      return;
    }

    const dragKey = String(info.dragNode.key);
    const dropKey = String(info.node.key);
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    // 드래그 노드와 드롭 대상의 부모가 같은지 확인 (같은 레벨만 허용)
    const findParentId = (items: MenuItem[], targetId: string, parentId: string | null): string | null | undefined => {
      for (const item of items) {
        if (item.menuId === targetId) return parentId;
        if (item.children && item.children.length > 0) {
          const found = findParentId(item.children, targetId, item.menuId);
          if (found !== undefined) return found;
        }
      }
      return undefined;
    };

    const dragParent = findParentId(treeData, dragKey, null);
    const dropParent = findParentId(treeData, dropKey, null);

    if (dragParent !== dropParent) {
      message.warning('같은 레벨 내에서만 순서를 변경할 수 있습니다.');
      return;
    }

    const data = JSON.parse(JSON.stringify(treeData)) as MenuItem[];
    let dragObj: MenuItem | null = null;

    const loop = (
      items: MenuItem[],
      key: string,
      callback: (item: MenuItem, index: number, list: MenuItem[]) => void,
    ) => {
      for (let i = 0; i < items.length; i += 1) {
        if (items[i].menuId === key) {
          callback(items[i], i, items);
          return;
        }
        if (items[i].children && items[i].children!.length > 0) {
          loop(items[i].children!, key, callback);
        }
      }
    };

    loop(data, dragKey, (item, index, list) => {
      list.splice(index, 1);
      dragObj = item;
    });

    if (!dragObj) {
      return;
    }

    // dropToGap=true: 같은 레벨 내 위치 조정
    let targetList: MenuItem[] = [];
    let targetIndex = 0;
    loop(data, dropKey, (_, index, list) => {
      targetList = list;
      targetIndex = index;
    });
    if (dropPosition === -1) {
      targetList.splice(targetIndex, 0, dragObj);
    } else {
      targetList.splice(targetIndex + 1, 0, dragObj);
    }

    setTreeData(data);

    // 변경된 형제 목록만 추출하여 서버로 전송 (전체 트리 전송 불필요)
    const orders: { menuId: string; parentMenuId: string | null; sortOrder: number }[] = [];
    const buildOrders = (items: MenuItem[], parentId: string | null) => {
      items.forEach((menu, index) => {
        orders.push({
          menuId: menu.menuId,
          parentMenuId: parentId,
          sortOrder: index + 1,
        });
        if (menu.children && menu.children.length > 0) {
          buildOrders(menu.children, menu.menuId);
        }
      });
    };
    buildOrders(data, null);

    try {
      await menuService.updateAdminMenuOrder({ orders });
      message.success('메뉴 정렬이 저장되었습니다.');
      await loadTree();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '메뉴 정렬 저장에 실패했습니다.');
      await loadTree();
    }
  };

  return (
    <div className="menu-admin-page">
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <AppstoreOutlined style={{ marginRight: 8 }} />
          메뉴관리
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>시스템 메뉴 구조를 관리하고 활성/비활성 상태를 설정합니다.</Text>
      </div>
      <div
        className={`menu-admin-grid${isResizing ? ' is-resizing' : ''}`}
        style={{ ['--menu-grid-cols' as any]: `${leftWidth}px 8px 1fr` }}
      >
        <Card
          title="메뉴 트리"
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadTree} loading={loadingTree} />
              {canWrite && (
                <Button icon={<PlusOutlined />} onClick={handleAddRoot}>
                  신규 루트
                </Button>
              )}
              {canWrite && <Button onClick={handleAddChild}>하위 추가</Button>}
            </Space>
          }
          className="menu-admin-tree"
          styles={{ body: { height: '100%', overflow: 'auto' } }}
        >
          <Tree
            treeData={treeNodes}
            selectedKeys={selectedId ? [selectedId] : []}
            onSelect={handleSelect}
            draggable
            allowDrop={({ dropNode, dropPosition }) => {
              // dropPosition: -1(위), 0(내부), 1(아래) → 0(내부 삽입)은 허용하지 않음
              if (dropPosition === 0) return false;
              return true;
            }}
            onDrop={handleDrop}
          />
        </Card>

        <div
          className="menu-admin-resizer"
          onMouseDown={() => setIsResizing(true)}
          role="separator"
          aria-orientation="vertical"
        />

        <Card
          title="메뉴 상세"
          extra={
            <Space>
              {useYn === 'N' && (
                <Button onClick={handleActivate}>
                  활성화
                </Button>
              )}
              {useYn === 'Y' && (
                <Popconfirm
                  title="비활성화 확인"
                  description="해당 메뉴가 비활성화 됩니다. 진행하시겠습니까?"
                  onConfirm={handleDeactivate}
                  okText="예"
                  cancelText="아니요"
                >
                  <Button>
                    비활성화
                  </Button>
                </Popconfirm>
              )}
              {canWrite && (
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                  저장
                </Button>
              )}
              {canDelete && (
                <Popconfirm
                  title="삭제 확인"
                  description="선택한 메뉴를 삭제하시겠습니까?"
                  onConfirm={handleDelete}
                  okText="삭제"
                  cancelText="취소"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    삭제
                  </Button>
                </Popconfirm>
              )}
            </Space>
          }
          className="menu-admin-detail"
          loading={loadingDetail}
        >
          <Form form={form} layout="vertical">
            <Form.Item label="메뉴 ID" name="menuId">
              <Input readOnly placeholder="자동 생성" />
            </Form.Item>
            <Form.Item
              label="메뉴명"
              name="menuNm"
              rules={[{ required: true, message: '메뉴명을 입력해주세요.' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item label="상위 메뉴" name="parentMenuId">
              <Select
                allowClear
                placeholder="상위 메뉴 선택"
                options={parentOptions}
              />
            </Form.Item>
            <Form.Item label="레벨" name="menuLevel" hidden>
              <InputNumber min={1} max={3} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="정렬 순서" name="sortOrder" hidden>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="URL" name="menuUrl">
              <Input />
            </Form.Item>
            <Form.Item label="아이콘" name="menuIcon">
              <Select
                allowClear
                placeholder="Lucide 아이콘 선택"
                options={ICON_OPTIONS.map((item) => ({
                  value: item.value,
                  label: (
                    <Space>
                      {item.icon}
                      {item.label}
                    </Space>
                  ),
                }))}
              />
            </Form.Item>
            <Form.Item label="사용 여부" name="useYn">
              <Select
                options={[
                  { value: 'Y', label: 'Y' },
                  { value: 'N', label: 'N' },
                ]}
              />
            </Form.Item>
            <Divider />
            <Form.Item label="메뉴 설명" name="menuDesc">
              <TextArea rows={4} />
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default MenuAdminPage;
