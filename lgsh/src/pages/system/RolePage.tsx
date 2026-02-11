/**
 * 시스템관리 > 역할관리 페이지
 */
import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Button,
    Form,
    Input,
    Select,
    message,
    Row,
    Col,
    Tag,
    Divider,
    Checkbox,
    Typography,
} from 'antd';
import {
    SearchOutlined,
    SaveOutlined,
    PlusOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { roleService } from '@/services/roleService';
import { Role, RoleListRequest, RoleMenu } from '@/types';
import { useMenuPermission } from '@/hooks';

const { Title, Text } = Typography;
const { Option } = Select;

// TEMP: verbose error logging for role APIs (remove when done)
const DEBUG_ROLE_LOGS = true;

const RolePage: React.FC = () => {
    const { canWrite } = useMenuPermission('M0803');
    const [form] = Form.useForm();
    const [searchForm] = Form.useForm();

    // State
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const [roleMenus, setRoleMenus] = useState<RoleMenu[]>([]);

    const logRoleError = (context: string, error: any) => {
        if (!DEBUG_ROLE_LOGS) return;
        const status = error?.response?.status;
        const url = error?.config?.url;
        const data = error?.response?.data;
        console.error(`[Role] ${context} failed`, { status, url, data, error });
    };

    // Initial Load
    useEffect(() => {
        fetchRoles();
    }, []);

    // Fetch Roles
    const fetchRoles = async () => {
        setLoading(true);
        try {
            const values = searchForm.getFieldsValue();
            const params: RoleListRequest = {
                roleNm: values.roleNm,
                roleId: values.roleId,
                useYn: values.useYn as 'Y' | 'N' | undefined,
            };
            const response = await roleService.list(params);

            if (response?.success && Array.isArray(response.data)) {
                setRoles(response.data);
                return;
            }
            message.error(response?.message || '역할 목록 조회 실패');
        } catch (error) {
            logRoleError('fetchRoles', error);
            message.error('역할 목록 조회 실패');
        } finally {
            setLoading(false);
        }
    };

    // Fetch Role Menus
    const fetchRoleMenus = async (roleId: string) => {
        try {
            const response = await roleService.getMenus(roleId);
            const menus = response.data || [];
            setRoleMenus(menus);
        } catch (error) {
            logRoleError('fetchRoleMenus', error);
            message.error('메뉴 권한 조회 실패');
        }
    };

    // Columns
    const columns: ColumnsType<Role> = [
        { title: 'ID', dataIndex: 'roleId', width: 150 },
        { title: '역할명', dataIndex: 'roleNm', width: 200 },
        { title: '사용', dataIndex: 'useYn', width: 80, align: 'center', render: (v) => v === 'Y' ? <Tag color="green">Y</Tag> : <Tag color="red">N</Tag> },
    ];

    // Selection
    const onRowSelect = (record: Role) => {
        setSelectedRole(record);
        form.setFieldsValue(record);
        fetchRoleMenus(record.roleId);
    };

    // Create Mode
    const handleCreate = () => {
        setSelectedRole(null);
        form.resetFields();
        form.setFieldsValue({ useYn: 'Y' });
        setRoleMenus([]);
    };

    // Save Role
    const handleSaveRole = async () => {
        try {
            const values = await form.validateFields();
            const response = await roleService.save({ ...values });
            if (response?.success) {
                message.success('저장되었습니다.');
                fetchRoles();
            } else {
                message.error(response?.message || '저장 실패');
            }
            // Optional: keep selection or reset
        } catch (error) {
            if ((error as any)?.errorFields) {
                message.warning('필수 값을 확인해주세요.');
                return;
            }
            logRoleError('saveRole', error);
            const messageText =
                (error as any)?.response?.data?.message ||
                (error as any)?.message ||
                '저장 실패';
            message.error(messageText);
        }
    };

    // Toggle Permission
    const handlePermissionChange = (menuId: string, field: keyof RoleMenu, checked: boolean) => {
        const updateTree = (list: RoleMenu[]): RoleMenu[] => {
            return list.map(node => {
                if (node.menuId === menuId) {
                    return { ...node, [field]: checked ? 'Y' : 'N' };
                }
                if (node.children) {
                    return { ...node, children: updateTree(node.children) };
                }
                return node;
            });
        };

        setRoleMenus(prev => updateTree(prev));
    };

    // Save Permissions
    const handleSavePermissions = async () => {
        if (!selectedRole) {
            message.warning('선택된 역할이 없습니다.');
            return;
        }

        try {
            await roleService.saveMenus(selectedRole.roleId, roleMenus);
            message.success('권한이 저장되었습니다.');
            fetchRoleMenus(selectedRole.roleId); // Refresh
        } catch (error) {
            logRoleError('saveRoleMenus', error);
            message.error('권한 저장 실패');
        }
    };

    const permColumns: ColumnsType<RoleMenu> = [
        { title: '메뉴명', dataIndex: 'menuNm', key: 'menuNm' },
        { title: '조회', dataIndex: 'canRead', key: 'canRead', align: 'center', render: (v, r) => <Checkbox checked={v === 'Y'} onChange={(e) => handlePermissionChange(r.menuId, 'canRead', e.target.checked)} /> },
        { title: '저장', dataIndex: 'canWrite', key: 'canWrite', align: 'center', render: (v, r) => <Checkbox checked={v === 'Y'} onChange={(e) => handlePermissionChange(r.menuId, 'canWrite', e.target.checked)} /> },
        { title: '삭제', dataIndex: 'canDelete', key: 'canDelete', align: 'center', render: (v, r) => <Checkbox checked={v === 'Y'} onChange={(e) => handlePermissionChange(r.menuId, 'canDelete', e.target.checked)} /> },
        { title: '엑셀', dataIndex: 'exportYn', key: 'exportYn', align: 'center', render: (v, r) => <Checkbox checked={v === 'Y'} onChange={(e) => handlePermissionChange(r.menuId, 'exportYn', e.target.checked)} /> },
    ];

    return (
        <div style={{ padding: 24, height: '100%', overflow: 'hidden' }}>
            <div className="page-header">
                <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
                    <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                    역할관리
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>역할을 관리하고 메뉴별 접근 권한을 설정합니다.</Text>
            </div>
            <Row gutter={[16, 16]} style={{ height: '100%' }}>
                {/* Left: Role List */}
                <Col span={8} style={{ height: '100%' }}>
                    <Card
                        title="역할 목록"
                        extra={canWrite && <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>신규</Button>}
                        bodyStyle={{ padding: 0, height: 'calc(100vh - 200px)', overflowY: 'auto' }}
                    >
                        <Form form={searchForm} layout="inline" style={{ padding: 16 }} onFinish={fetchRoles}>
                            <Form.Item name="roleNm"><Input placeholder="역할명" /></Form.Item>
                            <Form.Item><Button icon={<SearchOutlined />} htmlType="submit" /></Form.Item>
                        </Form>
                        <Table
                            columns={columns}
                            dataSource={roles}
                            rowKey="roleId"
                            size="small"
                            pagination={false}
                            loading={loading}
                            onRow={(record) => ({
                                onClick: () => onRowSelect(record),
                                style: { cursor: 'pointer', backgroundColor: selectedRole?.roleId === record.roleId ? '#e6f7ff' : '' }
                            })}
                        />
                    </Card>
                </Col>

                {/* Right: Detail & Perms */}
                <Col span={16} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Top: Form */}
                    <Card title="역할 상세" extra={canWrite && <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveRole}>저장</Button>}>
                        <Form form={form} layout="vertical">
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="roleId" label="역할 ID" rules={[{ required: true }]}><Input disabled={!!selectedRole} /></Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="roleNm" label="역할명" rules={[{ required: true }]}><Input /></Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item name="roleDesc" label="설명"><Input.TextArea rows={2} /></Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="useYn" label="사용여부"><Select><Option value="Y">Y</Option><Option value="N">N</Option></Select></Form.Item>
                                </Col>
                            </Row>
                        </Form>
                    </Card>

                    <Divider style={{ margin: '12px 0' }} />

                    {/* Bottom: Permissions (TreeTable) */}
                    <Card title="메뉴 권한" style={{ flex: 1, overflow: 'hidden' }} bodyStyle={{ height: '100%', overflowY: 'auto' }}
                        extra={canWrite && <Button type="primary" onClick={handleSavePermissions}>권한 저장</Button>}
                    >
                        <Table
                            columns={permColumns}
                            dataSource={roleMenus}
                            rowKey="menuId"
                            pagination={false}
                            size="small"
                            expandable={{ defaultExpandAllRows: true }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default RolePage;
