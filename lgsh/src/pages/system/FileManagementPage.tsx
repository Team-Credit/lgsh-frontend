/**
 * 파일관리 페이지
 * FILE001 - 시스템 파일 업로드/다운로드/관리
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
  Upload,
  Progress,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  DownloadOutlined,
  UploadOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FileImageOutlined,
  FolderOutlined,
  InboxOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table/interface';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import type { FileInfo, FileRequest, FileConfig } from '@/types';
import { fileService } from '@/services/fileService';
import { useCommonCode, useMenuPermission } from '@/hooks';
import { useExcelExport } from '@/contexts';
import type { ExcelColumn } from '@/utils/excelExport';
import './FileManagementPage.css';
import 'react-resizable/css/styles.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;

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

// 파일 카테고리별 색상 매핑
const FILE_CATEGORY_COLORS: { [key: string]: string } = {
  DOCUMENT: 'blue',
  IMAGE: 'orange',
  DATA: 'green',
  REPORT: 'purple',
};

// 컬럼 레이블 정의
const columnLabels: { [key: string]: string } = {
  fileNm: '파일명',
  fileCategory: '카테고리',
  fileExt: '확장자',
  fileSize: '파일크기',
  downloadCnt: '다운로드',
  regDt: '등록일',
  useYn: '사용',
};

// 파일 확장자별 아이콘 반환
const getFileIcon = (ext: string) => {
  const lowerExt = ext?.toLowerCase();
  switch (lowerExt) {
    case 'pdf':
      return <FilePdfOutlined className="file-type-icon pdf" />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileExcelOutlined className="file-type-icon excel" />;
    case 'doc':
    case 'docx':
      return <FileWordOutlined className="file-type-icon word" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'svg':
      return <FileImageOutlined className="file-type-icon image" />;
    default:
      return <FileOutlined className="file-type-icon default" />;
  }
};

const FileManagementPage: React.FC = () => {
  const { canWrite, canDelete } = useMenuPermission('M0807');
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [uploadForm] = Form.useForm();

  // 공통코드에서 파일 카테고리 조회
  const { options: fileCategories } = useCommonCode('FILE_CATEGORY');

  // 상태
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<FileInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [fileConfigs, setFileConfigs] = useState<FileConfig[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 컬럼 너비 초기값
  const defaultColumnWidths: { [key: string]: number } = {
    fileNm: 300,
    fileCategory: 110,
    fileExt: 90,
    fileSize: 100,
    downloadCnt: 100,
    regDt: 150,
    useYn: 90,
    action: 150,
  };

  // localStorage에서 저장된 컬럼 너비 불러오기
  const getStoredColumnWidths = () => {
    try {
      const stored = localStorage.getItem('fileColumnWidths');
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
    fileNm: true,
    fileCategory: true,
    fileExt: true,
    fileSize: true,
    downloadCnt: true,
    regDt: true,
    useYn: true,
  };

  const getStoredVisibleColumns = () => {
    try {
      const stored = localStorage.getItem('fileVisibleColumns');
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
        localStorage.setItem('fileVisibleColumns', JSON.stringify(newState));
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
        localStorage.setItem('fileColumnWidths', JSON.stringify(newWidths));
      } catch (error) {
        console.error('컬럼 너비 저장 실패:', error);
      }
      return newWidths;
    });
  };

  // 컬럼 설정 초기화
  const handleResetColumnSettings = () => {
    setColumnWidths(defaultColumnWidths);
    setVisibleColumns(defaultVisibleColumns);
    try {
      localStorage.removeItem('fileColumnWidths');
      localStorage.removeItem('fileVisibleColumns');
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
      const response = await fileService.getFileList({
        fileCategory: values.fileCategory,
        fileExt: values.fileExt,
        searchKeyword: values.searchKeyword,
        useYn: values.useYn,
        page: page - 1,
        size: size,
      });
      setDataList(response.content);
      setTotal(response.totalCount);
    } catch (error) {
      message.error('파일 목록 조회에 실패했습니다.');
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

  // 초기 로딩
  useEffect(() => {
    fetchList();
  }, []);

  // 엑셀 내보내기 핸들러 등록
  const { registerExportHandler, unregisterExportHandler } = useExcelExport();

  // 엑셀 컬럼 정의
  const excelColumns: ExcelColumn[] = useMemo(() => [
    { key: 'fileId', title: '파일ID', width: 20 },
    { key: 'fileNm', title: '파일명', width: 40 },
    { key: 'fileCategory', title: '카테고리', width: 15 },
    { key: 'fileExt', title: '확장자', width: 10 },
    { key: 'fileSizeFormatted', title: '파일크기', width: 15 },
    { key: 'downloadCnt', title: '다운로드횟수', width: 12 },
    { key: 'regDt', title: '등록일시', width: 20 },
    { key: 'useYn', title: '사용여부', width: 10 },
  ], []);

  // 전체 데이터 조회 함수 (엑셀용)
  const fetchAllDataForExcel = useCallback(async (): Promise<FileInfo[]> => {
    const values = searchForm.getFieldsValue();
    const response = await fileService.getFileList({
      fileCategory: values.fileCategory,
      fileExt: values.fileExt,
      searchKeyword: values.searchKeyword,
      useYn: values.useYn,
      page: 0,
      size: 50000,
    });
    return response.content;
  }, [searchForm]);

  // 핸들러 등록/해제
  useEffect(() => {
    registerExportHandler('fileManagement', {
      sheetName: '파일목록',
      totalCount: total,
      fetchAllData: fetchAllDataForExcel,
      columns: excelColumns,
    });

    return () => {
      unregisterExportHandler('fileManagement');
    };
  }, [registerExportHandler, unregisterExportHandler, total, fetchAllDataForExcel, excelColumns]);

  // 업로드 모달 열기
  const handleOpenUpload = () => {
    setFileList([]);
    uploadForm.resetFields();
    uploadForm.setFieldsValue({ fileCategory: 'DOCUMENT' });
    setUploadModalOpen(true);
  };

  // 수정 모달 열기
  const handleOpenEdit = (record: FileInfo) => {
    setSelectedFile(record);
    form.setFieldsValue({
      fileNm: record.fileNm,
      fileCategory: record.fileCategory,
      description: record.description,
      useYn: record.useYn,
    });
    setModalOpen(true);
  };

  // 파일 설정 모달 열기
  const handleOpenConfig = async () => {
    try {
      const configs = await fileService.getFileConfigs();
      setFileConfigs(configs);
      setConfigModalOpen(true);
    } catch (error) {
      message.error('파일 설정 조회에 실패했습니다.');
    }
  };

  // 파일 업로드 처리
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('업로드할 파일을 선택하세요.');
      return;
    }

    try {
      const values = await uploadForm.validateFields();
      setUploading(true);
      setUploadProgress(0);

      // beforeUpload에서 File 객체를 직접 저장했으므로 originFileObj 또는 직접 참조
      const files = fileList.map((f) => (f.originFileObj || f) as File);

      if (files.length === 1) {
        await fileService.uploadFile(files[0], values.fileCategory, values.description);
        message.success('파일이 업로드되었습니다.');
      } else {
        await fileService.uploadMultipleFiles(files, values.fileCategory, values.description);
        message.success(`${files.length}개 파일이 업로드되었습니다.`);
      }

      setUploadModalOpen(false);
      setFileList([]);
      fetchList();
    } catch (error: any) {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (!error.errorFields) {
        message.error('파일 업로드에 실패했습니다.');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 파일 정보 수정
  const handleSave = async () => {
    if (!selectedFile) return;

    try {
      const values = await form.validateFields();
      const request: FileRequest = {
        fileNm: values.fileNm,
        fileCategory: values.fileCategory,
        description: values.description,
        useYn: values.useYn,
      };

      await fileService.updateFile(selectedFile.fileId, request);
      message.success('파일 정보가 수정되었습니다.');

      setModalOpen(false);
      fetchList();
    } catch (error: any) {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (!error.errorFields) {
        message.error('파일 정보 수정에 실패했습니다.');
      }
    }
  };

  // 파일 삭제
  const handleDelete = async (record: FileInfo) => {
    try {
      await fileService.deleteFile(record.fileId);
      message.success('파일이 삭제되었습니다.');
      setDataList((prev) => prev.filter((item) => item.fileId !== record.fileId));
      setTotal((prev) => prev - 1);
    } catch (error: any) {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('파일 삭제에 실패했습니다.');
      }
    }
  };

  // 파일 다운로드
  const handleDownload = async (record: FileInfo) => {
    try {
      await fileService.downloadFile(record.fileId, record.fileNm);
    } catch (error) {
      message.error('파일 다운로드에 실패했습니다.');
    }
  };

  // 업로드 props
  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      setFileList((prev) => [...prev, file as any]);
      return false;
    },
    onRemove: (file) => {
      setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
    },
  };

  // 테이블 컬럼 정의
  const allColumns: ColumnsType<FileInfo> = [
    {
      title: '파일명',
      dataIndex: 'fileNm',
      key: 'fileNm',
      width: columnWidths.fileNm,
      sorter: (a, b) => (a.fileNm || '').localeCompare(b.fileNm || ''),
      onHeaderCell: () => ({
        width: columnWidths.fileNm,
        onResize: handleResize('fileNm'),
      }),
      render: (text: string, record: FileInfo) => (
        <Space>
          {getFileIcon(record.fileExt)}
          <Tooltip title={record.description || text}>
            <Text strong style={{ maxWidth: 250, display: 'inline-block' }} ellipsis>
              {text}
            </Text>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '카테고리',
      dataIndex: 'fileCategory',
      key: 'fileCategory',
      width: columnWidths.fileCategory,
      align: 'center',
      filters: fileCategories.map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.fileCategory === value,
      onHeaderCell: () => ({
        width: columnWidths.fileCategory,
        onResize: handleResize('fileCategory'),
      }),
      render: (val: string, record: FileInfo) => (
        <Tag color={FILE_CATEGORY_COLORS[val] || 'default'}>
          {record.fileCategoryNm || val}
        </Tag>
      ),
    },
    {
      title: '확장자',
      dataIndex: 'fileExt',
      key: 'fileExt',
      width: columnWidths.fileExt,
      align: 'center',
      sorter: (a, b) => (a.fileExt || '').localeCompare(b.fileExt || ''),
      onHeaderCell: () => ({
        width: columnWidths.fileExt,
        onResize: handleResize('fileExt'),
      }),
      render: (val: string) => <Tag>{val?.toUpperCase()}</Tag>,
    },
    {
      title: '파일크기',
      dataIndex: 'fileSizeFormatted',
      key: 'fileSize',
      width: columnWidths.fileSize,
      align: 'right',
      sorter: (a, b) => (a.fileSize || 0) - (b.fileSize || 0),
      onHeaderCell: () => ({
        width: columnWidths.fileSize,
        onResize: handleResize('fileSize'),
      }),
    },
    {
      title: '다운로드',
      dataIndex: 'downloadCnt',
      key: 'downloadCnt',
      width: columnWidths.downloadCnt,
      align: 'center',
      sorter: (a, b) => (a.downloadCnt || 0) - (b.downloadCnt || 0),
      onHeaderCell: () => ({
        width: columnWidths.downloadCnt,
        onResize: handleResize('downloadCnt'),
      }),
      render: (val: number) => <Text type="secondary">{val || 0}회</Text>,
    },
    {
      title: '등록일',
      dataIndex: 'regDt',
      key: 'regDt',
      width: columnWidths.regDt,
      align: 'center',
      sorter: (a, b) => (a.regDt || '').localeCompare(b.regDt || ''),
      onHeaderCell: () => ({
        width: columnWidths.regDt,
        onResize: handleResize('regDt'),
      }),
      render: (val: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {val?.replace('T', ' ').substring(0, 16)}
        </Text>
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
      render: (_: any, record: FileInfo) => (
        <Space size="small">
          <Tooltip title="다운로드">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
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
          localStorage.removeItem('fileVisibleColumns');
        }}
        block
      >
        전체 표시
      </Button>
    </div>
  );

  return (
    <div className="file-management-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <FolderOutlined style={{ marginRight: 8 }} />
          파일관리
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          시스템 파일을 업로드하고 관리합니다.
        </Text>
      </div>

      {/* 메인 카드 */}
      <Card size="small" className="file-card">
        {/* 검색 폼 */}
        <Form form={searchForm} layout="inline" className="search-form" onFinish={() => { setCurrentPage(1); fetchList(1, pageSize); }}>
          <Form.Item name="fileCategory" label="카테고리">
            <Select placeholder="전체" allowClear style={{ width: 120 }}>
              {fileCategories.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  <Tag color={FILE_CATEGORY_COLORS[opt.value] || 'default'} style={{ marginRight: 0 }}>
                    {opt.label}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="fileExt" label="확장자">
            <Input placeholder="예: pdf" allowClear style={{ width: 100 }} />
          </Form.Item>
          <Form.Item name="searchKeyword" label="검색어">
            <Input placeholder="파일명" allowClear style={{ width: 200 }} />
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
              <Button type="primary" icon={<UploadOutlined />} onClick={handleOpenUpload}>
                파일 업로드
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
            <Button icon={<InfoCircleOutlined />} onClick={handleOpenConfig}>
              파일 설정
            </Button>
          </Space>
        </div>

        {/* 테이블 */}
        <Table
          columns={columns}
          dataSource={dataList}
          rowKey="fileId"
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

      {/* 업로드 모달 */}
      <Modal
        title="파일 업로드"
        open={uploadModalOpen}
        onOk={handleUpload}
        onCancel={() => setUploadModalOpen(false)}
        width={600}
        okText="업로드"
        cancelText="취소"
        confirmLoading={uploading}
      >
        <Form form={uploadForm} layout="vertical">
          <div className="upload-dragger">
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">클릭 또는 파일을 여기에 끌어다 놓으세요</p>
              <p className="ant-upload-hint">
                단일 또는 다중 파일 업로드를 지원합니다.
              </p>
            </Dragger>
          </div>
          {uploading && (
            <Progress percent={uploadProgress} status="active" style={{ marginBottom: 16 }} />
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fileCategory"
                label="파일 카테고리"
                rules={[{ required: true, message: '카테고리를 선택하세요' }]}
              >
                <Select placeholder="카테고리 선택">
                  {fileCategories.length > 0 ? (
                    fileCategories.map((opt) => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))
                  ) : (
                    <>
                      <Option value="DOCUMENT">문서</Option>
                      <Option value="IMAGE">이미지</Option>
                      <Option value="DATA">데이터</Option>
                      <Option value="REPORT">리포트</Option>
                    </>
                  )}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="설명">
            <TextArea rows={2} placeholder="파일 설명 (선택)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 수정 모달 */}
      <Modal
        title="파일 정보 수정"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={500}
        okText="저장"
        cancelText="취소"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="fileNm"
            label="파일명"
            rules={[
              { required: true, message: '파일명을 입력하세요' },
              { max: 200, message: '파일명은 200자 이내로 입력하세요' },
            ]}
          >
            <Input placeholder="파일명" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fileCategory"
                label="파일 카테고리"
                rules={[{ required: true, message: '카테고리를 선택하세요' }]}
              >
                <Select placeholder="카테고리 선택">
                  {fileCategories.length > 0 ? (
                    fileCategories.map((opt) => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))
                  ) : (
                    <>
                      <Option value="DOCUMENT">문서</Option>
                      <Option value="IMAGE">이미지</Option>
                      <Option value="DATA">데이터</Option>
                      <Option value="REPORT">리포트</Option>
                    </>
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="useYn" label="사용여부">
                <Select>
                  <Option value="Y">Y</Option>
                  <Option value="N">N</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="description"
            label="설명"
            rules={[{ max: 500, message: '설명은 500자 이내로 입력하세요' }]}
          >
            <TextArea rows={3} placeholder="파일 설명 (선택)" />
          </Form.Item>
          {selectedFile && (
            <div className="file-info-box">
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Text type="secondary">파일 크기:</Text>{' '}
                  <Text strong>{selectedFile.fileSizeFormatted}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">확장자:</Text>{' '}
                  <Text strong>{selectedFile.fileExt?.toUpperCase()}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">다운로드:</Text>{' '}
                  <Text strong>{selectedFile.downloadCnt || 0}회</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">등록자:</Text>{' '}
                  <Text strong>{selectedFile.regUserId}</Text>
                </Col>
              </Row>
            </div>
          )}
        </Form>
      </Modal>

      {/* 파일 설정 모달 */}
      <Modal
        title="파일 설정"
        open={configModalOpen}
        onCancel={() => setConfigModalOpen(false)}
        footer={<Button onClick={() => setConfigModalOpen(false)}>닫기</Button>}
        width={500}
      >
        {fileConfigs.map((config) => (
          <div key={config.configCode} className="config-item">
            <div>
              <div className="config-label">{config.configCodeNm}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {config.description}
              </Text>
            </div>
            <div className="config-value">
              <Tag color="blue">{config.configValue}</Tag>
            </div>
          </div>
        ))}
      </Modal>
    </div>
  );
};

export default FileManagementPage;
