/**
 * 모델 변수 관리 페이지
 * VAR-001 - 분석관리 > 변수 메타 관리
 * 테이블: TB_MODEL_VARIABLE
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Form,
    Input,
    Select,
    Modal,
    message,
    Tag,
    Typography,
    Popover,
    Checkbox,
    Divider,
    InputNumber,
    Popconfirm,
} from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    SettingOutlined,
    EditOutlined,
    DeleteOutlined,
    FunctionOutlined,
} from '@ant-design/icons';
import type { ColumnsType, ColumnType } from 'antd/es/table/interface';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import type {
    Variable,
    VariableListParams,
    VariableCreateRequest,
    VariableUpdateRequest,
    ModelListResponse,
} from '@/types';
import { variableService } from '@/services/variableService';
import { modelService } from '@/services/modelService';
import { useCommonCodes, useMenuPermission } from '@/hooks';
import './VariableListPage.css';
import 'react-resizable/css/styles.css';

const { Title, Text } = Typography;
const { Option } = Select;

// 공통코드 키
const CODE_KEYS = {
    VARIABLE_GROUP: 'VARIABLE_GROUP',
    VARIABLE_TYPE: 'VARIABLE_TYPE',
    ENCODING_TYPE: 'ENCODING_TYPE',
};

// Resizable 컬럼 헤더
const ResizableTitle = (
    props: React.HTMLAttributes<HTMLElement> & {
        onResize: (e: React.SyntheticEvent<Element>, data: ResizeCallbackData) => void;
        width: number;
    }
) => {
    const { onResize, width, ...restProps } = props;

    if (!width) {
        return <th {...restProps} />;
    }

    return (
        <Resizable
            width={width}
            height={0}
            handle={
                <span
                    className="react-resizable-handle"
                    onClick={(e) => e.stopPropagation()}
                />
            }
            onResize={onResize}
            draggableOpts={{ enableUserSelectHack: false }}
        >
            <th {...restProps} />
        </Resizable>
    );
};

const VariableListPage: React.FC = () => {
    const { canWrite, canDelete } = useMenuPermission('M0409');
    const [searchForm] = Form.useForm();
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();

    // 공통코드 조회
    const { codeMap, loading: codeLoading } = useCommonCodes([
        CODE_KEYS.VARIABLE_GROUP,
        CODE_KEYS.VARIABLE_TYPE,
        CODE_KEYS.ENCODING_TYPE,
    ]);

    const variableGroupOptions = codeMap[CODE_KEYS.VARIABLE_GROUP] || [];
    const variableTypeOptions = codeMap[CODE_KEYS.VARIABLE_TYPE] || [];
    const encodingTypeOptions = codeMap[CODE_KEYS.ENCODING_TYPE] || [];

    // 상태 관리
    const [loading, setLoading] = useState(false);
    const [dataSource, setDataSource] = useState<Variable[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // 모델 목록
    const [modelList, setModelList] = useState<ModelListResponse[]>([]);
    const [modelLoading, setModelLoading] = useState(false);

    // 모달 상태
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editVariable, setEditVariable] = useState<Variable | null>(null);

    // 컬럼 너비
    const defaultColumnWidths: Record<string, number> = {
        modelNm: 150,
        variableId: 150,
        variableNm: 150,
        variableGroup: 120,
        variableType: 100,
        encodingType: 100,
        variableOrder: 80,
        weight: 80,
        useYn: 80,
        regDt: 150,
        action: 120,
    };

    const getStoredColumnWidths = () => {
        try {
            const stored = localStorage.getItem('variableColumnWidths');
            if (stored) {
                return { ...defaultColumnWidths, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('컬럼 너비 불러오기 실패:', error);
        }
        return defaultColumnWidths;
    };

    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(getStoredColumnWidths());

    // 컬럼 표시 설정
    const defaultVisibleColumns: Record<string, boolean> = {
        modelNm: true,
        variableId: true,
        variableNm: true,
        variableGroup: true,
        variableType: true,
        encodingType: true,
        variableOrder: true,
        weight: true,
        useYn: true,
        regDt: true,
    };

    const getStoredVisibleColumns = () => {
        try {
            const stored = localStorage.getItem('variableVisibleColumns');
            if (stored) {
                return { ...defaultVisibleColumns, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('컬럼 표시 설정 불러오기 실패:', error);
        }
        return defaultVisibleColumns;
    };

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(getStoredVisibleColumns());

    // 컬럼 레이블
    const columnLabels: Record<string, string> = {
        modelNm: '모델명',
        variableId: '변수ID',
        variableNm: '변수명',
        variableGroup: '변수그룹',
        variableType: '변수유형',
        encodingType: '인코딩유형',
        variableOrder: '순서',
        weight: '가중치',
        useYn: '사용여부',
        regDt: '등록일시',
    };

    // 모델 목록 조회
    const fetchModelList = async () => {
        setModelLoading(true);
        try {
            const response = await modelService.list({ size: 1000 });
            if (response.data?.success && response.data?.data) {
                setModelList(response.data.data.content || []);
            }
        } catch (error) {
            console.error('모델 목록 조회 오류:', error);
        } finally {
            setModelLoading(false);
        }
    };

    // 데이터 조회
    const fetchData = async (currentPage = page) => {
        setLoading(true);
        try {
            const searchValues = searchForm.getFieldsValue();
            const params: VariableListParams = {
                page: currentPage,
                size: pageSize,
                ...searchValues,
            };

            const response = await variableService.list(params);

            if (response.success && response.data) {
                setDataSource(response.data.content);
                setTotal(response.data.totalCount);

                if (response.data.content.length === 0) {
                    message.info('조회된 데이터가 없습니다.');
                }
            } else {
                message.error(response.message || '데이터 조회에 실패했습니다.');
            }
        } catch (error: unknown) {
            console.error('데이터 조회 오류:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: { message?: string } } };
                message.error(axiosError.response?.data?.message || '데이터 조회에 실패했습니다.');
            } else {
                message.error('데이터 조회 중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 초기 로드
    useEffect(() => {
        fetchModelList();
    }, []);

    useEffect(() => {
        if (!codeLoading) {
            fetchData();
        }
    }, [codeLoading]);

    // 검색
    const handleSearch = () => {
        setPage(1);
        fetchData(1);
    };

    // 초기화
    const handleReset = () => {
        searchForm.resetFields();
        setPage(1);
        fetchData(1);
    };

    // 등록 모달 열기
    const handleCreate = () => {
        createForm.resetFields();
        createForm.setFieldsValue({ useYn: 'Y' });
        setCreateModalOpen(true);
    };

    // 등록 저장
    const handleCreateSubmit = async () => {
        try {
            const values = await createForm.validateFields();
            setLoading(true);

            const requestData: VariableCreateRequest = {
                modelId: values.modelId,
                variableId: values.variableId,
                variableNm: values.variableNm,
                variableGroup: values.variableGroup,
                variableType: values.variableType,
                encodingType: values.encodingType,
                variableOrder: values.variableOrder,
                weight: values.weight,
                useYn: values.useYn || 'Y',
            };

            const response = await variableService.create(requestData);

            if (response.success) {
                message.success('변수가 등록되었습니다.');
                setCreateModalOpen(false);
                fetchData();
            } else {
                message.error(response.message || '등록에 실패했습니다.');
            }
        } catch (error: unknown) {
            console.error('등록 오류:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: { message?: string } } };
                message.error(axiosError.response?.data?.message || '등록에 실패했습니다.');
            } else {
                message.error('등록 중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 수정 모달 열기
    const handleEdit = (record: Variable) => {
        setEditVariable(record);
        editForm.setFieldsValue({
            modelId: record.modelId,
            variableId: record.variableId,
            variableNm: record.variableNm,
            variableGroup: record.variableGroup,
            variableType: record.variableType,
            encodingType: record.encodingType,
            variableOrder: record.variableOrder,
            weight: record.weight,
            useYn: record.useYn,
        });
        setEditModalOpen(true);
    };

    // 수정 저장
    const handleEditSubmit = async () => {
        if (!editVariable) return;

        try {
            const values = await editForm.validateFields();
            setLoading(true);

            const requestData: VariableUpdateRequest = {
                modelId: values.modelId,
                variableId: values.variableId,
                variableNm: values.variableNm,
                variableGroup: values.variableGroup,
                variableType: values.variableType,
                encodingType: values.encodingType,
                variableOrder: values.variableOrder,
                weight: values.weight,
                useYn: values.useYn,
            };

            const response = await variableService.update(editVariable.variableSeq, requestData);

            if (response.success) {
                message.success('변수가 수정되었습니다.');
                setEditModalOpen(false);
                setEditVariable(null);
                fetchData();
            } else {
                message.error(response.message || '수정에 실패했습니다.');
            }
        } catch (error: unknown) {
            console.error('수정 오류:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: { message?: string } } };
                message.error(axiosError.response?.data?.message || '수정에 실패했습니다.');
            } else {
                message.error('수정 중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 삭제
    const handleDelete = async (record: Variable) => {
        try {
            setLoading(true);
            const response = await variableService.delete(record.variableSeq);

            if (response.success) {
                message.success('변수가 삭제되었습니다.');
                fetchData();
            } else {
                message.error(response.message || '삭제에 실패했습니다.');
            }
        } catch (error: unknown) {
            console.error('삭제 오류:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: { message?: string } } };
                message.error(axiosError.response?.data?.message || '삭제에 실패했습니다.');
            } else {
                message.error('삭제 중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 컬럼 너비 조절
    const handleResize = (key: string) => (_: React.SyntheticEvent, { size }: ResizeCallbackData) => {
        const newWidths = { ...columnWidths, [key]: size.width };
        setColumnWidths(newWidths);
        localStorage.setItem('variableColumnWidths', JSON.stringify(newWidths));
    };

    // 컬럼 표시 토글
    const handleColumnVisibilityChange = (key: string, checked: boolean) => {
        const newVisible = { ...visibleColumns, [key]: checked };
        setVisibleColumns(newVisible);
        localStorage.setItem('variableVisibleColumns', JSON.stringify(newVisible));
    };

    // 테이블 컬럼 정의
    const baseColumns: ColumnsType<Variable> = [
        {
            title: '모델명',
            dataIndex: 'modelNm',
            key: 'modelNm',
            width: columnWidths.modelNm,
            sorter: (a, b) => (a.modelNm || '').localeCompare(b.modelNm || ''),
            ellipsis: true,
            render: (text: string, record: Variable) => text || record.modelId,
        },
        {
            title: '변수ID',
            dataIndex: 'variableId',
            key: 'variableId',
            width: columnWidths.variableId,
            sorter: (a, b) => a.variableId.localeCompare(b.variableId),
            ellipsis: true,
        },
        {
            title: '변수명',
            dataIndex: 'variableNm',
            key: 'variableNm',
            width: columnWidths.variableNm,
            sorter: (a, b) => a.variableNm.localeCompare(b.variableNm),
            ellipsis: true,
        },
        {
            title: '변수그룹',
            dataIndex: 'variableGroupNm',
            key: 'variableGroup',
            width: columnWidths.variableGroup,
            sorter: (a, b) => (a.variableGroupNm || '').localeCompare(b.variableGroupNm || ''),
            render: (text: string, record: Variable) => (
                <Tag color="blue">{text || record.variableGroup}</Tag>
            ),
        },
        {
            title: '변수유형',
            dataIndex: 'variableTypeNm',
            key: 'variableType',
            width: columnWidths.variableType,
            sorter: (a, b) => (a.variableTypeNm || '').localeCompare(b.variableTypeNm || ''),
            render: (text: string, record: Variable) => (
                <Tag color="green">{text || record.variableType}</Tag>
            ),
        },
        {
            title: '인코딩유형',
            dataIndex: 'encodingTypeNm',
            key: 'encodingType',
            width: columnWidths.encodingType,
            sorter: (a, b) => (a.encodingTypeNm || '').localeCompare(b.encodingTypeNm || ''),
            render: (text: string, record: Variable) => text || record.encodingType || '-',
        },
        {
            title: '순서',
            dataIndex: 'variableOrder',
            key: 'variableOrder',
            width: columnWidths.variableOrder,
            align: 'right',
            sorter: (a, b) => (a.variableOrder ?? 0) - (b.variableOrder ?? 0),
            render: (value: number | null) => value !== null ? value : '-',
        },
        {
            title: '가중치',
            dataIndex: 'weight',
            key: 'weight',
            width: columnWidths.weight,
            align: 'right',
            sorter: (a, b) => (a.weight ?? 0) - (b.weight ?? 0),
            render: (value: number | null) => value !== null ? value.toFixed(4) : '-',
        },
        {
            title: '사용여부',
            dataIndex: 'useYn',
            key: 'useYn',
            width: columnWidths.useYn,
            align: 'center',
            sorter: (a, b) => a.useYn.localeCompare(b.useYn),
            render: (useYn: string) => (
                <Tag color={useYn === 'Y' ? 'success' : 'default'}>
                    {useYn === 'Y' ? '사용' : '미사용'}
                </Tag>
            ),
        },
        {
            title: '등록일시',
            dataIndex: 'regDt',
            key: 'regDt',
            width: columnWidths.regDt,
            align: 'center',
            sorter: (a, b) => (a.regDt || '').localeCompare(b.regDt || ''),
        },
        {
            title: '관리',
            key: 'action',
            width: columnWidths.action,
            align: 'center',
            fixed: 'right',
            render: (_: unknown, record: Variable) => (
                <Space size="small">
                    {canWrite && (
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                            title="수정"
                        />
                    )}
                    {canDelete && (
                        <Popconfirm
                            title="삭제 확인"
                            description="이 변수를 삭제하시겠습니까?"
                            onConfirm={() => handleDelete(record)}
                            okText="삭제"
                            cancelText="취소"
                        >
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                title="삭제"
                            />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    // 표시할 컬럼 필터링 및 resizable 적용
    const columns: ColumnsType<Variable> = useMemo(() => {
        return baseColumns
            .filter((col) => {
                const key = (col as ColumnType<Variable>).key as string;
                if (key === 'action') return true;
                return visibleColumns[key] !== false;
            })
            .map((col) => {
                const key = (col as ColumnType<Variable>).key as string;
                if (key === 'action') return col;

                return {
                    ...col,
                    onHeaderCell: () => ({
                        width: columnWidths[key] || 100,
                        onResize: handleResize(key),
                    }),
                };
            });
    }, [visibleColumns, columnWidths]);

    // 페이지 변경
    const handlePageChange = (newPage: number, newPageSize: number) => {
        setPage(newPage);
        setPageSize(newPageSize);
        fetchData(newPage);
    };

    // 컬럼 설정 팝오버
    const columnSettingsContent = (
        <div style={{ width: 200 }}>
            <div style={{ marginBottom: 8 }}>
                <Text strong>표시할 컬럼 선택</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            {Object.entries(columnLabels).map(([key, label]) => (
                <div key={key} style={{ marginBottom: 4 }}>
                    <Checkbox
                        checked={visibleColumns[key] !== false}
                        onChange={(e) => handleColumnVisibilityChange(key, e.target.checked)}
                    >
                        {label}
                    </Checkbox>
                </div>
            ))}
        </div>
    );

    // 변수 폼 필드
    const renderVariableFormFields = (isEdit = false) => (
        <>
            <Form.Item
                name="modelId"
                label="모델"
                rules={[{ required: true, message: '모델을 선택하세요.' }]}
            >
                <Select
                    placeholder="모델 선택"
                    loading={modelLoading}
                    showSearch
                    optionFilterProp="children"
                    disabled={isEdit}
                >
                    {modelList.map((model) => (
                        <Option key={model.modelId} value={model.modelId}>
                            {model.modelNm} ({model.modelId})
                        </Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item
                name="variableId"
                label="변수ID"
                rules={[
                    { required: true, message: '변수ID를 입력하세요.' },
                    { pattern: /^[A-Z_][A-Z0-9_]*$/, message: '영문 대문자, 숫자, 언더스코어만 사용 가능합니다.' }
                ]}
            >
                <Input
                    placeholder="예: CREDIT_SCORE"
                    maxLength={50}
                    style={{ textTransform: 'uppercase' }}
                    disabled={isEdit}
                />
            </Form.Item>

            <Form.Item
                name="variableNm"
                label="변수명"
                rules={[{ required: true, message: '변수명을 입력하세요.' }]}
            >
                <Input placeholder="변수명 입력" maxLength={100} />
            </Form.Item>

            <Form.Item
                name="variableGroup"
                label="변수그룹"
                rules={[{ required: true, message: '변수그룹을 선택하세요.' }]}
            >
                <Select placeholder="변수그룹 선택">
                    {variableGroupOptions.map((opt) => (
                        <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item
                name="variableType"
                label="변수유형"
                rules={[{ required: true, message: '변수유형을 선택하세요.' }]}
            >
                <Select placeholder="변수유형 선택">
                    {variableTypeOptions.map((opt) => (
                        <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item
                name="encodingType"
                label="인코딩유형"
            >
                <Select placeholder="인코딩유형 선택" allowClear>
                    {encodingTypeOptions.map((opt) => (
                        <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item
                name="variableOrder"
                label="순서"
            >
                <InputNumber style={{ width: '100%' }} placeholder="변수 순서" min={1} />
            </Form.Item>

            <Form.Item
                name="weight"
                label="가중치"
            >
                <InputNumber
                    style={{ width: '100%' }}
                    placeholder="가중치"
                    step={0.0001}
                    precision={4}
                />
            </Form.Item>

            <Form.Item
                name="useYn"
                label="사용여부"
                initialValue="Y"
            >
                <Select>
                    <Option value="Y">사용</Option>
                    <Option value="N">미사용</Option>
                </Select>
            </Form.Item>
        </>
    );

    return (
        <div className="variable-page">
            {/* 페이지 헤더 */}
            <div className="page-header">
                <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
                    <FunctionOutlined style={{ marginRight: 8 }} />
                    변수 메타 관리
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                    모델별 변수의 메타 정보를 관리합니다.
                </Text>
            </div>

            {/* 검색 영역 */}
            <Card className="search-card" size="small">
                <Form form={searchForm} layout="inline">
                    <Form.Item name="modelId" label="모델">
                        <Select
                            style={{ width: 200 }}
                            placeholder="전체"
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            loading={modelLoading}
                        >
                            {modelList.map((model) => (
                                <Option key={model.modelId} value={model.modelId}>
                                    {model.modelNm}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="variableGroup" label="변수그룹">
                        <Select
                            style={{ width: 150 }}
                            placeholder="전체"
                            allowClear
                        >
                            {variableGroupOptions.map((opt) => (
                                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="keyword" label="검색어">
                        <Input
                            placeholder="변수ID, 변수명 검색"
                            style={{ width: 200 }}
                            prefix={<SearchOutlined />}
                            onPressEnter={handleSearch}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                                조회
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>
                                초기화
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>

            {/* 테이블 영역 */}
            <Card size="small">
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">
                        총 {total.toLocaleString()}건
                    </Text>
                    <Space>
                        <Popover
                            content={columnSettingsContent}
                            title={null}
                            trigger="click"
                            placement="bottomRight"
                        >
                            <Button icon={<SettingOutlined />}>컬럼 설정</Button>
                        </Popover>
                        {canWrite && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                                등록
                            </Button>
                        )}
                    </Space>
                </div>

                <Table
                    dataSource={dataSource}
                    columns={columns}
                    rowKey="variableSeq"
                    loading={loading || codeLoading}
                    pagination={{
                        current: page,
                        total: total,
                        pageSize: pageSize,
                        onChange: handlePageChange,
                        showSizeChanger: true,
                        showTotal: (total) => `총 ${total}건`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                    }}
                    scroll={{ x: 1400 }}
                    size="small"
                    components={{
                        header: {
                            cell: ResizableTitle,
                        },
                    }}
                />
            </Card>

            {/* 등록 모달 */}
            <Modal
                title="변수 등록"
                open={createModalOpen}
                onOk={handleCreateSubmit}
                onCancel={() => setCreateModalOpen(false)}
                width={600}
                confirmLoading={loading}
                okText="등록"
                cancelText="취소"
            >
                <Form form={createForm} layout="vertical">
                    {renderVariableFormFields(false)}
                </Form>
            </Modal>

            {/* 수정 모달 */}
            <Modal
                title="변수 수정"
                open={editModalOpen}
                onOk={handleEditSubmit}
                onCancel={() => {
                    setEditModalOpen(false);
                    setEditVariable(null);
                }}
                width={600}
                confirmLoading={loading}
                okText="수정"
                cancelText="취소"
            >
                <Form form={editForm} layout="vertical">
                    {renderVariableFormFields(true)}
                </Form>
            </Modal>
        </div>
    );
};

export default VariableListPage;
