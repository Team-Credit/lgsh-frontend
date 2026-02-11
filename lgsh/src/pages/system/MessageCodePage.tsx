/**
 * 메시지코드관리 페이지
 * MSG001 - 시스템 메시지 코드 (에러/성공/경고) 관리
 * 다국어 지원 (LANG_CODE)
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Popconfirm,
  Tag,
  Row,
  Col,
  Typography,
  Tooltip,
  Popover,
  Checkbox,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  MessageOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table/interface';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import type { SysMessage, SysMessageRequest, SysMessageType } from '@/types';
import { sysMessageService } from '@/services/sysMessageService';
import { useCommonCode, useMenuPermission } from '@/hooks';
import { useExcelExport } from '@/contexts';
import type { ExcelColumn } from '@/utils/excelExport';
import './MessageCodePage.css';
import 'react-resizable/css/styles.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Resizable 컬럼 헤더 컴포넌트
const ResizableTitle = (
  props: React.HTMLAttributes<any> & {
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

// 메시지 유형별 색상 매핑
const MESSAGE_TYPE_COLORS: { [key: string]: string } = {
  CONFIRM: 'cyan',
  ERROR: 'red',
  INFO: 'blue',
  SUCCESS: 'green',
  WARNING: 'orange',
};

// 컬럼 레이블 정의
const columnLabels: { [key: string]: string } = {
  msgCode: '메시지코드',
  langCode: '언어',
  msgType: '타입',
  msgTitle: '제목',
  msgDesc: '메시지 내용',
  useYn: '사용',
};

const MessageCodePage: React.FC = () => {
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();

  // 메뉴 권한
  const { canWrite, canDelete } = useMenuPermission('M0805');

  // 공통코드에서 언어코드, 메시지유형, 메시지카테고리, 표시위치 조회
  const { options: langCodes } = useCommonCode('LANG_CODE');
  const { options: msgTypes } = useCommonCode('MSG_TYPE');
  const { options: msgCategories } = useCommonCode('MSG_CATEGORY');
  const { options: displayLocations } = useCommonCode('DISPLAY_LOCATION');

  // 상태
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<SysMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 컬럼 너비 초기값
  const defaultColumnWidths: { [key: string]: number } = {
    msgCode: 150,
    langCode: 90,
    msgType: 110,
    msgTitle: 200,
    msgDesc: 350,
    useYn: 90,
    action: 120,
  };

  // localStorage에서 저장된 컬럼 너비 불러오기
  const getStoredColumnWidths = () => {
    try {
      const stored = localStorage.getItem('messageColumnWidths');
      if (stored) {
        return { ...defaultColumnWidths, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('컬럼 너비 불러오기 실패:', error);
    }
    return defaultColumnWidths;
  };

  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(
    getStoredColumnWidths()
  );

  // 컬럼 표시 설정
  const defaultVisibleColumns: { [key: string]: boolean } = {
    msgCode: true,
    langCode: true,
    msgType: true,
    msgTitle: true,
    msgDesc: true,
    useYn: true,
  };

  const getStoredVisibleColumns = () => {
    try {
      const stored = localStorage.getItem('messageVisibleColumns');
      if (stored) {
        return { ...defaultVisibleColumns, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('컬럼 표시 설정 불러오기 실패:', error);
    }
    return defaultVisibleColumns;
  };

  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>(
    getStoredVisibleColumns()
  );

  // 컬럼 표시 토글
  const handleColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    setVisibleColumns((prev) => {
      const newState = { ...prev, [columnKey]: visible };
      try {
        localStorage.setItem('messageVisibleColumns', JSON.stringify(newState));
      } catch (error) {
        console.error('컬럼 표시 설정 저장 실패:', error);
      }
      return newState;
    });
  };

  // 컬럼 리사이즈 핸들러
  const handleResize = (key: string) => (_: React.SyntheticEvent, { size }: ResizeCallbackData) => {
    setColumnWidths((prevWidths) => {
      const newWidths = {
        ...prevWidths,
        [key]: size.width,
      };
      try {
        localStorage.setItem('messageColumnWidths', JSON.stringify(newWidths));
      } catch (error) {
        console.error('컬럼 너비 저장 실패:', error);
      }
      return newWidths;
    });
  };

  // 컬럼 설정 초기화 (너비 + 표시 설정)
  const handleResetColumnSettings = () => {
    setColumnWidths(defaultColumnWidths);
    setVisibleColumns(defaultVisibleColumns);
    try {
      localStorage.removeItem('messageColumnWidths');
      localStorage.removeItem('messageVisibleColumns');
      message.success('컬럼 설정이 초기화되었습니다.');
    } catch (error) {
      console.error('컬럼 설정 초기화 실패:', error);
    }
  };

  // 목록 조회
  const fetchList = useCallback(async (page: number = currentPage, size: number = pageSize) => {
    setLoading(true);
    try {
      const values = searchForm.getFieldsValue();
      const response = await sysMessageService.getMessageList({
        langCode: values.langCode || 'KO',
        msgType: values.msgType,
        searchKeyword: values.searchKeyword,
        useYn: values.useYn,
        page: page - 1,  // API는 0-based
        size: size,
      });
      setDataList(response.content);
      setTotal(response.totalCount);
    } catch (error) {
      message.error('메시지 목록 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [searchForm, currentPage, pageSize]);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number, size?: number) => {
    const newSize = size || pageSize;
    setCurrentPage(page);
    setPageSize(newSize);
    fetchList(page, newSize);
  };

  // 초기 로딩 - langCode 기본값 설정 후 조회
  useEffect(() => {
    searchForm.setFieldsValue({ langCode: 'KO' });
    fetchList();
  }, []);

  // 엑셀 내보내기 핸들러 등록
  const { registerExportHandler, unregisterExportHandler } = useExcelExport();

  // 엑셀 컬럼 정의
  const excelColumns: ExcelColumn[] = useMemo(() => [
    { key: 'msgCode', title: '메시지코드', width: 20 },
    { key: 'langCode', title: '언어', width: 10 },
    { key: 'msgType', title: '타입', width: 12 },
    { key: 'msgCategory', title: '카테고리', width: 15 },
    { key: 'msgTitle', title: '제목', width: 25 },
    { key: 'msgDesc', title: '메시지 내용', width: 50 },
    { key: 'useYn', title: '사용여부', width: 10 },
  ], []);

  // 전체 데이터 조회 함수 (엑셀용)
  const fetchAllDataForExcel = useCallback(async (): Promise<SysMessage[]> => {
    const values = searchForm.getFieldsValue();
    const response = await sysMessageService.getMessageList({
      langCode: values.langCode || 'KO',
      msgType: values.msgType,
      searchKeyword: values.searchKeyword,
      useYn: values.useYn,
      page: 0,
      size: 50000, // 전체 조회
    });
    return response.content;
  }, [searchForm]);

  // 핸들러 등록/해제
  useEffect(() => {
    registerExportHandler('messageCode', {
      sheetName: '메시지코드',
      totalCount: total,
      fetchAllData: fetchAllDataForExcel,
      columns: excelColumns,
    });

    return () => {
      unregisterExportHandler('messageCode');
    };
  }, [registerExportHandler, unregisterExportHandler, total, fetchAllDataForExcel, excelColumns]);

  // 등록 모달 열기
  const handleOpenCreate = () => {
    setModalMode('create');
    form.resetFields();
    // 현재 검색 조건의 langCode를 기본값으로 설정
    const currentLangCode = searchForm.getFieldValue('langCode') || 'KO';
    form.setFieldsValue({
      langCode: currentLangCode,
      msgType: 'INFO',
      useYn: 'Y',
    });
    setModalOpen(true);
  };

  // 수정 모달 열기
  const handleOpenEdit = (record: SysMessage) => {
    setModalMode('edit');
    form.setFieldsValue({
      msgCode: record.msgCode,
      langCode: record.langCode,
      msgType: record.msgType,
      msgCategory: record.msgCategory,
      msgTitle: record.msgTitle,
      msgDesc: record.msgDesc,
      msgParams: record.msgParams,
      displayLocation: record.displayLocation,
      relatedUrl: record.relatedUrl,
      useYn: record.useYn,
    });
    setModalOpen(true);
  };

  // 저장
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const request: SysMessageRequest = {
        msgCode: values.msgCode,
        langCode: values.langCode,
        msgType: values.msgType,
        msgCategory: values.msgCategory,
        msgTitle: values.msgTitle,
        msgDesc: values.msgDesc,
        msgParams: values.msgParams,
        displayLocation: values.displayLocation,
        relatedUrl: values.relatedUrl,
        useYn: values.useYn,
      };

      if (modalMode === 'create') {
        await sysMessageService.createMessage(request);
        message.success('메시지가 등록되었습니다.');
      } else {
        await sysMessageService.updateMessage(values.msgCode, values.langCode, request);
        message.success('메시지가 수정되었습니다.');
      }

      setModalOpen(false);
      fetchList();
    } catch (error: any) {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (!error.errorFields) {
        message.error('메시지 저장에 실패했습니다.');
      }
    }
  };

  // 삭제
  const handleDelete = async (record: SysMessage) => {
    try {
      await sysMessageService.deleteMessage(record.msgCode, record.langCode);
      message.success('메시지가 삭제되었습니다.');
      // 삭제된 항목만 목록에서 제거
      setDataList((prev) =>
        prev.filter((item) => !(item.msgCode === record.msgCode && item.langCode === record.langCode))
      );
      setTotal((prev) => prev - 1);
    } catch (error: any) {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('메시지 삭제에 실패했습니다.');
      }
    }
  };

  // 테이블 컬럼 정의
  const allColumns: ColumnsType<SysMessage> = [
    {
      title: '메시지코드',
      dataIndex: 'msgCode',
      key: 'msgCode',
      width: columnWidths.msgCode,
      sorter: (a, b) => (a.msgCode || '').localeCompare(b.msgCode || ''),
      onHeaderCell: () => ({
        width: columnWidths.msgCode,
        onResize: handleResize('msgCode'),
      }),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '언어',
      dataIndex: 'langCode',
      key: 'langCode',
      width: columnWidths.langCode,
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths.langCode,
        onResize: handleResize('langCode'),
      }),
      render: (val: string) => <Tag>{val}</Tag>,
    },
    {
      title: '타입',
      dataIndex: 'msgType',
      key: 'msgType',
      width: columnWidths.msgType,
      align: 'center',
      filters: msgTypes.map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.msgType === value,
      onHeaderCell: () => ({
        width: columnWidths.msgType,
        onResize: handleResize('msgType'),
      }),
      render: (val: SysMessageType) => {
        return <Tag color={MESSAGE_TYPE_COLORS[val] || 'default'}>{val}</Tag>;
      },
    },
    {
      title: '제목',
      dataIndex: 'msgTitle',
      key: 'msgTitle',
      width: columnWidths.msgTitle,
      ellipsis: true,
      onHeaderCell: () => ({
        width: columnWidths.msgTitle,
        onResize: handleResize('msgTitle'),
      }),
    },
    {
      title: '메시지 내용',
      dataIndex: 'msgDesc',
      key: 'msgDesc',
      width: columnWidths.msgDesc,
      ellipsis: true,
      sorter: (a, b) => (a.msgDesc || '').localeCompare(b.msgDesc || ''),
      onHeaderCell: () => ({
        width: columnWidths.msgDesc,
        onResize: handleResize('msgDesc'),
      }),
      render: (text: string, record: SysMessage) => (
        <Tooltip title={record.msgCategory ? `[${record.msgCategory}] ${text}` : text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '사용',
      dataIndex: 'useYn',
      key: 'useYn',
      width: columnWidths.useYn,
      align: 'center',
      filters: [
        { text: 'Y', value: 'Y' },
        { text: 'N', value: 'N' },
      ],
      onFilter: (value, record) => record.useYn === value,
      onHeaderCell: () => ({
        width: columnWidths.useYn,
        onResize: handleResize('useYn'),
      }),
      render: (val: string) =>
        val === 'Y' ? <Tag color="green">Y</Tag> : <Tag color="default">N</Tag>,
    },
    {
      title: '관리',
      key: 'action',
      width: columnWidths.action,
      fixed: 'right',
      render: (_: any, record: SysMessage) => (
        <Space size="small">
          {canWrite && (
            <Tooltip title="수정">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleOpenEdit(record)}
              />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="삭제 확인"
              description="정말 삭제하시겠습니까?"
              onConfirm={() => handleDelete(record)}
              okText="삭제"
              cancelText="취소"
            >
              <Tooltip title="삭제">
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 표시할 컬럼 필터링
  const columns = useMemo(() => {
    return allColumns.filter((col) => {
      const key = col.key as string;
      if (key === 'action') return true;
      return visibleColumns[key] !== false;
    });
  }, [allColumns, visibleColumns]);

  // 컬럼 설정 팝오버 내용
  const columnSettingsContent = (
    <div style={{ width: 180 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>표시할 컬럼 선택</div>
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
      <Divider style={{ margin: '8px 0' }} />
      <Button
        size="small"
        onClick={() => {
          setVisibleColumns(defaultVisibleColumns);
          localStorage.removeItem('messageVisibleColumns');
        }}
        block
      >
        전체 표시
      </Button>
    </div>
  );

  return (
    <div className="message-code-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <MessageOutlined style={{ marginRight: 8 }} />
          메시지코드관리
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          시스템 메시지 코드 (에러/성공/경고)를 관리합니다.
        </Text>
      </div>

      {/* 메인 카드 */}
      <Card size="small" className="message-card">
        {/* 검색 폼 */}
        <Form form={searchForm} layout="inline" className="search-form" onFinish={() => { setCurrentPage(1); fetchList(1, pageSize); }}>
          <Form.Item name="langCode" label="언어">
            <Select placeholder="선택" style={{ width: 100 }}>
              {langCodes.length > 0 ? (
                langCodes.map((code) => (
                  <Option key={code.value} value={code.value}>
                    {code.label}
                  </Option>
                ))
              ) : (
                <>
                  <Option value="KO">한국어</Option>
                  <Option value="EN">English</Option>
                </>
              )}
            </Select>
          </Form.Item>
          <Form.Item name="msgType" label="메시지타입">
            <Select placeholder="전체" allowClear style={{ width: 120 }}>
              {msgTypes.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  <Tag color={MESSAGE_TYPE_COLORS[opt.value] || 'default'} style={{ marginRight: 0 }}>
                    {opt.label}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="searchKeyword" label="검색어">
            <Input placeholder="코드 또는 메시지" allowClear style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="useYn" label="사용">
            <Select placeholder="전체" allowClear style={{ width: 80 }}>
              <Option value="Y">Y</Option>
              <Option value="N">N</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                조회
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  searchForm.resetFields();
                  searchForm.setFieldsValue({ langCode: 'KO' });
                  setCurrentPage(1);
                  fetchList(1, pageSize);
                }}
              >
                초기화
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 툴바 */}
        <div style={{ marginBottom: 12 }}>
          <Space>
            {canWrite && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                메시지 등록
              </Button>
            )}
            <Popover
              content={columnSettingsContent}
              title={null}
              trigger="click"
              placement="bottomLeft"
            >
              <Button icon={<SettingOutlined />} title="컬럼 설정">
                컬럼 설정
              </Button>
            </Popover>
            <Button icon={<ReloadOutlined />} onClick={handleResetColumnSettings} title="컬럼 초기화">
              컬럼 초기화
            </Button>
          </Space>
        </div>

        {/* 테이블 */}
        <Table
          columns={columns}
          dataSource={dataList}
          rowKey={(record) => `${record.msgCode}_${record.langCode}`}
          loading={loading}
          size="small"
          scroll={{ x: 'max-content', y: 'calc(100vh - 420px)' }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} / 총 ${total}건`,
            onChange: handlePageChange,
            onShowSizeChange: handlePageChange,
          }}
          bordered
          components={{
            header: {
              cell: ResizableTitle,
            },
          }}
          onRow={(record) => ({
            onDoubleClick: () => handleOpenEdit(record),
          })}
        />
      </Card>

      {/* 등록/수정 모달 */}
      <Modal
        title={modalMode === 'create' ? '메시지 등록' : '메시지 수정'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={700}
        okText="저장"
        cancelText="취소"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="msgCode"
                label="메시지 코드"
                rules={[
                  { required: true, message: '메시지 코드를 입력하세요' },
                  {
                    pattern: /^[A-Z0-9_]+$/,
                    message: '영문 대문자, 숫자, 언더스코어만 사용 가능',
                  },
                ]}
              >
                <Input
                  placeholder="예: ERR_AUTH_001"
                  disabled={modalMode === 'edit'}
                  style={{ textTransform: 'uppercase' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="langCode"
                label="언어 코드"
                rules={[{ required: true, message: '언어 코드를 선택하세요' }]}
              >
                <Select placeholder="언어 선택" disabled={modalMode === 'edit'}>
                  {langCodes.length > 0 ? (
                    langCodes.map((code) => (
                      <Option key={code.value} value={code.value}>
                        {code.label}
                      </Option>
                    ))
                  ) : (
                    <>
                      <Option value="KO">한국어</Option>
                      <Option value="EN">English</Option>
                    </>
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="msgType"
                label="메시지 유형"
                rules={[{ required: true, message: '메시지 유형을 선택하세요' }]}
              >
                <Select placeholder="유형 선택">
                  {msgTypes.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      <Tag color={MESSAGE_TYPE_COLORS[opt.value] || 'default'} style={{ marginRight: 4 }}>
                        {opt.label}
                      </Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="msgCategory" label="카테고리">
                <Select placeholder="카테고리 선택 (선택)" allowClear>
                  {msgCategories.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="msgTitle" label="메시지 제목">
                <Input placeholder="메시지 제목 (선택)" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="msgDesc"
            label="메시지 내용"
            rules={[{ required: true, message: '메시지 내용을 입력하세요' }]}
          >
            <TextArea rows={3} placeholder="메시지 내용 입력" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="msgParams" label="파라미터">
                <Input placeholder="메시지 파라미터 (예: {0}, {1})" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="displayLocation" label="표시 위치">
                <Select placeholder="표시 위치 선택 (선택)" allowClear>
                  {displayLocations.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={18}>
              <Form.Item name="relatedUrl" label="관련 URL">
                <Input placeholder="관련 URL (선택)" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="useYn" label="사용여부">
                <Select>
                  <Option value="Y">Y</Option>
                  <Option value="N">N</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default MessageCodePage;
