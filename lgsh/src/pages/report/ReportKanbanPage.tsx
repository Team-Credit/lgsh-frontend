/**
 * 월간레포트 - 칸반보드
 * 레포트 항목 선택 및 구성 관리
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Tag,
  message,
  Spin,
  Modal,
  Select,
  Tooltip,
  Badge,
  Empty,
  Descriptions,
  Alert,
  Input,
  Divider,
  List,
  Statistic,
  Row,
  Col,
  Tabs,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  TableOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  EditOutlined,
  BulbOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import reportService from '@/services/reportService';
import type { ReportItem, KanbanColumn, KanbanColumnType, ReportPreviewData, AiSummaryData } from '@/types/report';
import { useAppSelector } from '@/store/hooks';
import './ReportKanbanPage.css';

const { Title, Text } = Typography;

// 컬럼 설정
const COLUMNS: KanbanColumn[] = [
  {
    id: 'available',
    title: '선택 가능',
    color: '#1890ff',
    items: [],
  },
  {
    id: 'required',
    title: '포함 항목',
    color: '#52c41a',
    items: [],
  },
  {
    id: 'excluded',
    title: '제외',
    color: '#ff4d4f',
    items: [],
  },
];

// 차트 타입 아이콘
const CHART_ICONS: Record<string, React.ReactNode> = {
  BAR: <BarChartOutlined />,
  PIE: <PieChartOutlined />,
  LINE: <LineChartOutlined />,
  HISTOGRAM: <BarChartOutlined />,
  TABLE: <TableOutlined />,
};

const ReportKanbanPage: React.FC = () => {
  // 로그인 사용자 정보
  const currentUser = useAppSelector((state) => state.auth.user);
  const userCompanyId = currentUser?.companyId || '';

  // 상태
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [columns, setColumns] = useState<KanbanColumn[]>(COLUMNS.map((c) => ({ ...c, items: [] })));
  const [originalItems, setOriginalItems] = useState<ReportItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // 연월 선택
  const [year, setYear] = useState(dayjs().year());
  const [month, setMonth] = useState(dayjs().month() + 1);

  // 미리보기 모달
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ReportPreviewData | null>(null);

  // 생성 모달
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateChecking, setGenerateChecking] = useState(false);  // PDF 생성 버튼 마감 체크 로딩
  const [reportTitle, setReportTitle] = useState('');
  const [includeAiSummary, setIncludeAiSummary] = useState(true);

  // AI 요약 편집
  const [editedAiSummary, setEditedAiSummary] = useState<{
    summary: string;
    keyInsights: string[];
    recommendations: string[];
    riskLevel: string;
  } | null>(null);
  const [isEditingAiSummary, setIsEditingAiSummary] = useState(false);

  // 미리보기 캐시
  const previewCacheRef = useRef<{
    key: string;
    data: ReportPreviewData;
    timestamp: number;
  } | null>(null);
  const [isCachedPreview, setIsCachedPreview] = useState(false);

  // 드래그 상태
  const [draggedItem, setDraggedItem] = useState<ReportItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnType | null>(null);

  // 데이터 로드
  const loadItems = useCallback(async () => {
    if (!userCompanyId) return;

    setLoading(true);
    try {
      // 1. 항목 목록 조회 (사용중인 항목만)
      const itemsResponse = await reportService.getItems('Y');
      if (!itemsResponse.success || !itemsResponse.data) {
        message.error(itemsResponse.message || '레포트 항목을 불러오지 못했습니다.');
        return;
      }

      const items = itemsResponse.data;
      setOriginalItems(items);

      // 2. 사용자별 저장된 선택 조회
      try {
        const selectionsResponse = await reportService.getUserItemSelections();
        if (selectionsResponse.success && selectionsResponse.data && selectionsResponse.data.length > 0) {
          // 저장된 선택이 있으면 적용
          const selectionMap = new Map<string, { status: string; order: number }>();
          selectionsResponse.data.forEach((sel: any) => {
            selectionMap.set(sel.itemId || sel.ITEM_ID, {
              status: sel.itemStatus || sel.ITEM_STATUS,
              order: sel.itemOrder || sel.ITEM_ORDER || 0,
            });
          });

          // 항목에 저장된 선택 상태 적용
          const itemsWithSelections = items.map((item) => {
            const selection = selectionMap.get(item.itemId);
            if (selection) {
              return {
                ...item,
                status: selection.status as any,
                displayOrder: selection.order,
              };
            }
            // 저장된 선택이 없으면 기본 상태 유지
            return item;
          });

          distributeItemsToColumns(itemsWithSelections);
        } else {
          // 저장된 선택이 없으면 기본 상태로 분배
          distributeItemsToColumns(items);
        }
      } catch (selError) {
        // 선택 조회 실패시에도 기본 항목은 표시
        console.warn('사용자 선택 조회 실패:', selError);
        distributeItemsToColumns(items);
      }

      setHasChanges(false);
    } catch (error) {
      message.error('레포트 항목 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [userCompanyId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // 항목을 컬럼에 분배
  const distributeItemsToColumns = (items: ReportItem[]) => {
    const newColumns = COLUMNS.map((col) => ({
      ...col,
      items: [] as ReportItem[],
    }));

    items.forEach((item) => {
      let columnId: KanbanColumnType = 'available';
      // 필수 항목 (DEFAULT_STATUS가 REQUIRED이거나 isRequired가 true) 또는 사용자 선택이 REQUIRED/SELECTED인 경우
      const isRequired = item.isRequired === true || item.defaultStatus === 'REQUIRED';
      if (item.status === 'REQUIRED' || isRequired) {
        columnId = 'required';
      } else if (item.status === 'EXCLUDED') {
        columnId = 'excluded';
      } else if (item.status === 'SELECTED') {
        columnId = 'required';
      }

      const column = newColumns.find((c) => c.id === columnId);
      if (column) {
        column.items.push({ ...item });
      }
    });

    // 정렬 - 포함 항목 컬럼에서는 필수 항목이 항상 맨 위에 오도록 정렬
    newColumns.forEach((col) => {
      if (col.id === 'required') {
        // 포함 항목 컬럼: 필수 항목이 맨 위, 그 다음 선택 항목
        col.items.sort((a, b) => {
          const aRequired = a.isRequired === true || a.defaultStatus === 'REQUIRED';
          const bRequired = b.isRequired === true || b.defaultStatus === 'REQUIRED';

          // 둘 다 필수이거나 둘 다 선택이면 displayOrder로 정렬
          if (aRequired === bRequired) {
            return a.displayOrder - b.displayOrder;
          }
          // 필수 항목이 위로
          return aRequired ? -1 : 1;
        });
      } else {
        col.items.sort((a, b) => a.displayOrder - b.displayOrder);
      }
    });

    setColumns(newColumns);
  };

  // 필수 항목 여부 확인 (DEFAULT_STATUS가 REQUIRED이거나 isRequired가 true인 경우)
  const isRequiredItem = (item: ReportItem): boolean => {
    return item.isRequired === true || item.defaultStatus === 'REQUIRED';
  };

  // 드래그 시작
  const handleDragStart = (e: React.DragEvent, item: ReportItem) => {
    // 필수 항목은 드래그 불가
    if (isRequiredItem(item)) {
      e.preventDefault();
      message.warning('필수 항목은 이동할 수 없습니다.');
      return;
    }
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.itemId);
  };

  // 드래그 오버
  const handleDragOver = (e: React.DragEvent, columnId: KanbanColumnType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  // 드래그 리브
  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  // 드롭
  const handleDrop = (e: React.DragEvent, targetColumnId: KanbanColumnType) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedItem) return;

    // 같은 컬럼이면 무시
    const sourceColumn = columns.find((col) =>
      col.items.some((item) => item.itemId === draggedItem.itemId)
    );
    if (sourceColumn?.id === targetColumnId) {
      setDraggedItem(null);
      return;
    }

    // 컬럼 업데이트
    const newColumns = columns.map((col) => {
      if (col.items.some((item) => item.itemId === draggedItem.itemId)) {
        // 소스 컬럼에서 제거
        return {
          ...col,
          items: col.items.filter((item) => item.itemId !== draggedItem.itemId),
        };
      }
      if (col.id === targetColumnId) {
        // 타겟 컬럼에 추가
        const newStatus =
          targetColumnId === 'required'
            ? 'SELECTED'
            : targetColumnId === 'excluded'
            ? 'EXCLUDED'
            : 'SELECTED';

        // 포함 항목 컬럼인 경우, 필수 항목 아래에 추가
        if (targetColumnId === 'required') {
          const requiredItems = col.items.filter(
            (item) => item.isRequired === true || item.defaultStatus === 'REQUIRED'
          );
          const nonRequiredItems = col.items.filter(
            (item) => !(item.isRequired === true || item.defaultStatus === 'REQUIRED')
          );
          return {
            ...col,
            items: [
              ...requiredItems,
              ...nonRequiredItems,
              { ...draggedItem, status: newStatus as any },
            ],
          };
        }

        return {
          ...col,
          items: [...col.items, { ...draggedItem, status: newStatus as any }],
        };
      }
      return col;
    });

    setColumns(newColumns);
    setDraggedItem(null);
    setHasChanges(true);
  };

  // 드래그 종료
  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverColumn(null);
  };

  // 저장
  const handleSave = async () => {
    if (!userCompanyId) return;

    setSaving(true);
    try {
      const selections: { itemId: string; status: string; displayOrder: number }[] = [];

      columns.forEach((col) => {
        // 포함 항목 컬럼인 경우 필수 항목이 맨 위에 오도록 정렬 후 저장
        let sortedItems = col.items;
        if (col.id === 'required') {
          sortedItems = [...col.items].sort((a, b) => {
            const aRequired = a.isRequired === true || a.defaultStatus === 'REQUIRED';
            const bRequired = b.isRequired === true || b.defaultStatus === 'REQUIRED';
            if (aRequired === bRequired) return 0;
            return aRequired ? -1 : 1;
          });
        }

        sortedItems.forEach((item, index) => {
          let status = 'SELECTED';
          if (col.id === 'excluded') status = 'EXCLUDED';
          else if (col.id === 'required') status = 'SELECTED';
          else status = 'SELECTED';

          selections.push({
            itemId: item.itemId,
            status,
            displayOrder: index + 1,
          });
        });
      });

      const response = await reportService.saveItemSelections(userCompanyId, selections);
      if (response.success) {
        message.success('저장되었습니다.');
        setHasChanges(false);
        loadItems();
      } else {
        message.error(response.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      message.error('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 캐시 키 생성
  const getPreviewCacheKey = () => {
    const requiredItems = columns.find((c) => c.id === 'required')?.items || [];
    const itemIds = requiredItems.map((item) => item.itemId).sort().join(',');
    return `${userCompanyId}:${year}:${month}:${itemIds}`;
  };

  // 미리보기 (캐시 지원)
  const handlePreview = async (forceRefresh = false) => {
    const requiredItems = columns.find((c) => c.id === 'required')?.items || [];
    if (requiredItems.length === 0) {
      message.warning('포함할 항목을 선택해주세요.');
      return;
    }

    const cacheKey = getPreviewCacheKey();

    // 캐시 히트: 강제 새로고침이 아니고, 캐시 키가 일치하면 즉시 표시
    if (!forceRefresh && previewCacheRef.current?.key === cacheKey) {
      setPreviewData(previewCacheRef.current.data);
      setIsCachedPreview(true);
      setPreviewOpen(true);
      return;
    }

    setPreviewLoading(true);
    setEditedAiSummary(null);
    setIsCachedPreview(false);
    try {
      const itemIds = requiredItems.map((item) => item.itemId);
      const response = await reportService.getPreview({
        companyId: userCompanyId,
        year,
        month,
        itemIds,
        includeAiSummary: true,
        includeCharts: false,
      });

      if (response.success && response.data) {
        setPreviewData(response.data);
        // 캐시에 저장
        previewCacheRef.current = {
          key: cacheKey,
          data: response.data,
          timestamp: Date.now(),
        };
        setPreviewOpen(true);
      } else {
        message.error(response.message || '미리보기 데이터 조회에 실패했습니다.');
      }
    } catch (error) {
      message.error('미리보기 데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // 미리보기 재생성 (캐시 무시)
  const handlePreviewRefresh = () => {
    handlePreview(true);
  };

  // 마감 상태 체크 (해당 월 이후에 마감된 월이 있으면 차단)
  const checkCloseStatus = async (): Promise<boolean> => {
    try {
      // 선택한 연도와 다음 연도의 마감 상태 조회
      const selectedMonthValue = year * 12 + month;
      const responses = await Promise.all([
        reportService.getCloseStatus(userCompanyId, year),
        reportService.getCloseStatus(userCompanyId, year + 1),  // 다음 연도도 체크
      ]);

      // 선택한 월 이후로 마감된 월이 있는지 확인
      for (const response of responses) {
        if (response.success && response.data) {
          const hasClosedMonth = response.data.some((closeData) => {
            const closeMonthValue = closeData.year * 12 + closeData.month;
            return closeMonthValue >= selectedMonthValue && closeData.closeStatus === 'CLOSED';
          });
          if (hasClosedMonth) return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('마감 상태 조회 실패:', error);
      return false;  // 조회 실패 시 허용
    }
  };

  // PDF 생성 (마감 상태 체크 후 모달 열기)
  const handleGenerate = async () => {
    const requiredItems = columns.find((c) => c.id === 'required')?.items || [];
    if (requiredItems.length === 0) {
      message.warning('포함할 항목을 선택해주세요.');
      return;
    }

    // 마감 상태 체크 (가벼운 API 호출, Django 실행 안함)
    setGenerateChecking(true);
    try {
      const isClosed = await checkCloseStatus();
      if (isClosed) {
        message.error('해당 월은 마감되어 레포트를 생성할 수 없습니다.');
        return;
      }

      // 마감 체크 통과 - 모달 열기
      setReportTitle(`${year}년 ${month}월 신용평가 월간 레포트`);
      setGenerateOpen(true);
    } catch (error) {
      message.error('마감 상태 확인 중 오류가 발생했습니다.');
    } finally {
      setGenerateChecking(false);
    }
  };

  const handleGenerateConfirm = async () => {
    const requiredItems = columns.find((c) => c.id === 'required')?.items || [];

    // 필수 항목이 맨 위에 오도록 정렬
    const sortedItems = [...requiredItems].sort((a, b) => {
      const aRequired = a.isRequired === true || a.defaultStatus === 'REQUIRED';
      const bRequired = b.isRequired === true || b.defaultStatus === 'REQUIRED';
      if (aRequired === bRequired) return 0;
      return aRequired ? -1 : 1;
    });

    // 디버깅: 편집된 AI 요약 확인
    console.log('PDF 생성 요청 - editedAiSummary:', editedAiSummary);

    setGenerating(true);
    try {
      const requestPayload = {
        year,
        month,
        title: reportTitle,
        selectedItems: sortedItems.map((item, index) => ({
          itemId: item.itemId,
          status: 'SELECTED' as const,
          order: index + 1,
        })),
        includeAiSummary,
        // 편집된 AI 요약이 있으면 전달
        customAiSummary: editedAiSummary || undefined,
      };
      console.log('PDF 생성 요청 payload:', requestPayload);

      const response = await reportService.generate(requestPayload);

      if (response.success) {
        message.success('레포트 생성이 요청되었습니다.');
        setGenerateOpen(false);
      } else {
        // 마감 에러 등의 경우 모달 닫고 에러 메시지 표시
        message.error(response.message || '레포트 생성에 실패했습니다.');
        setGenerateOpen(false);
      }
    } catch (error) {
      message.error('레포트 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  // 연도 옵션
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = dayjs().year() - 2 + i;
    return { value: y, label: `${y}년` };
  });

  // 월 옵션
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}월`,
  }));

  // 포함된 항목 수
  const selectedCount = columns.find((c) => c.id === 'required')?.items.length || 0;

  // 작업 진행 중 여부 (버튼 비활성화용)
  const isAnyOperationInProgress = loading || saving || previewLoading || generateChecking;

  return (
    <div className="report-kanban-page">
      <Card
        title={
          <Space>
            <FilePdfOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>
              월간레포트 항목 선택
            </Title>
          </Space>
        }
        extra={
          <Space>
            <Select
              value={year}
              onChange={setYear}
              options={yearOptions}
              style={{ width: 100 }}
              disabled={isAnyOperationInProgress}
            />
            <Select
              value={month}
              onChange={setMonth}
              options={monthOptions}
              style={{ width: 80 }}
              disabled={isAnyOperationInProgress}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={loadItems}
              loading={loading}
              disabled={!loading && isAnyOperationInProgress}
            >
              새로고침
            </Button>
            <Button
              icon={<EyeOutlined />}
              onClick={() => handlePreview()}
              disabled={selectedCount === 0 || (!previewLoading && isAnyOperationInProgress)}
              loading={previewLoading}
            >
              미리보기
            </Button>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={handleGenerate}
              disabled={selectedCount === 0 || (!generateChecking && isAnyOperationInProgress)}
              loading={generateChecking}
            >
              PDF 생성
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges || (!saving && isAnyOperationInProgress)}
            >
              저장
            </Button>
          </Space>
        }
      >
        {hasChanges && (
          <Alert
            message="변경사항이 있습니다. 저장 버튼을 클릭하여 저장해주세요."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <div className="kanban-info">
          <Text type="secondary">
            드래그하여 항목을 이동할 수 있습니다. &quot;포함 항목&quot; 컬럼에 있는 항목이
            레포트에 포함됩니다.
          </Text>
          <Badge count={selectedCount} style={{ marginLeft: 8 }}>
            <Tag color="blue">선택된 항목</Tag>
          </Badge>
        </div>

        <Spin spinning={loading}>
          <div className="kanban-board">
            {columns.map((column) => (
              <div
                key={column.id}
                className={`kanban-column ${dragOverColumn === column.id ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div
                  className="kanban-column-header"
                  style={{ borderColor: column.color }}
                >
                  <Space>
                    <Text strong style={{ color: column.color }}>
                      {column.title}
                    </Text>
                    <Badge
                      count={column.items.length}
                      style={{ backgroundColor: column.color }}
                    />
                  </Space>
                </div>
                <div className="kanban-column-content">
                  {column.items.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="항목을 여기로 드래그하세요"
                    />
                  ) : (
                    column.items.map((item) => (
                      <div
                        key={item.itemId}
                        className={`kanban-item ${isRequiredItem(item) ? 'required' : ''} ${
                          draggedItem?.itemId === item.itemId ? 'dragging' : ''
                        }`}
                        draggable={!isRequiredItem(item)}
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="kanban-item-header">
                          <Space>
                            {item.chartType && CHART_ICONS[item.chartType]}
                            <Text strong>{item.itemNm}</Text>
                          </Space>
                          {isRequiredItem(item) && (
                            <Tooltip title="필수 항목">
                              <Tag color="red" size="small">
                                필수
                              </Tag>
                            </Tooltip>
                          )}
                        </div>
                        <div className="kanban-item-body">
                          <Text type="secondary" ellipsis>
                            {item.itemDesc}
                          </Text>
                        </div>
                        <div className="kanban-item-footer">
                          <Tag color="default">{item.itemCategory}</Tag>
                          {item.chartType && (
                            <Tag color="blue">{item.chartType}</Tag>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </Spin>
      </Card>

      {/* 미리보기 모달 */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            {`${year}년 ${month}월 레포트 미리보기`}
          </Space>
        }
        open={previewOpen}
        onCancel={() => {
          setPreviewOpen(false);
          setIsEditingAiSummary(false);
        }}
        footer={[
          <Button key="close" onClick={() => setPreviewOpen(false)}>
            닫기
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handlePreviewRefresh}
            loading={previewLoading}
          >
            재생성
          </Button>,
          <Button
            key="generate"
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={() => {
              setPreviewOpen(false);
              handleGenerate();
            }}
          >
            PDF 생성
          </Button>,
        ]}
        width={1000}
      >
        <Spin spinning={previewLoading}>
          {previewData && (
            <div className="preview-content">
              {isCachedPreview && previewCacheRef.current && (
                <Alert
                  message={`이전 조회 데이터입니다 (${dayjs(previewCacheRef.current.timestamp).format('HH:mm')} 조회). 최신 데이터가 필요하면 재생성 버튼을 클릭하세요.`}
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                  style={{ marginBottom: 16 }}
                  closable
                />
              )}
              {/* 기본 통계 */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="총 평가 건수"
                      value={previewData.stats?.evalCount || 0}
                      suffix="건"
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="평균 점수"
                      value={previewData.stats?.avgScore || 0}
                      precision={1}
                      suffix="점"
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="포함 항목"
                      value={Object.keys(previewData.items || {}).length}
                      suffix="개"
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Card>
                </Col>
              </Row>

              <Tabs
                defaultActiveKey="ai"
                items={[
                  {
                    key: 'ai',
                    label: (
                      <span>
                        <RobotOutlined /> AI 요약
                      </span>
                    ),
                    children: (
                      <div>
                        {previewData.aiSummary?.success ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                              <Title level={5} style={{ margin: 0 }}>
                                <BulbOutlined style={{ marginRight: 8 }} />
                                AI 분석 결과
                              </Title>
                              <Button
                                icon={<EditOutlined />}
                                size="small"
                                onClick={() => {
                                  if (!isEditingAiSummary && previewData.aiSummary) {
                                    setEditedAiSummary({
                                      summary: previewData.aiSummary.summary || '',
                                      keyInsights: previewData.aiSummary.keyInsights || [],
                                      recommendations: previewData.aiSummary.recommendations || [],
                                      riskLevel: previewData.aiSummary.riskLevel || 'MEDIUM',
                                    });
                                  }
                                  setIsEditingAiSummary(!isEditingAiSummary);
                                }}
                              >
                                {isEditingAiSummary ? '편집 취소' : '편집'}
                              </Button>
                            </div>

                            {/* 위험도 표시 */}
                            <Space style={{ marginBottom: 16 }}>
                              <Tag
                                color={
                                  (editedAiSummary?.riskLevel || previewData.aiSummary.riskLevel) === 'HIGH'
                                    ? 'red'
                                    : (editedAiSummary?.riskLevel || previewData.aiSummary.riskLevel) === 'MEDIUM'
                                    ? 'orange'
                                    : 'green'
                                }
                              >
                                <WarningOutlined /> 위험도: {editedAiSummary?.riskLevel || previewData.aiSummary.riskLevel || 'N/A'}
                              </Tag>
                              {previewData.aiSummary.trend && (
                                <Tag color="blue">
                                  추세: {previewData.aiSummary.trend === 'UP' ? '상승' : previewData.aiSummary.trend === 'DOWN' ? '하락' : '안정'}
                                </Tag>
                              )}
                            </Space>

                            {/* 종합 요약 */}
                            <Card title="종합 요약" size="small" style={{ marginBottom: 16 }}>
                              {isEditingAiSummary ? (
                                <Input.TextArea
                                  value={editedAiSummary?.summary || ''}
                                  onChange={(e) =>
                                    setEditedAiSummary((prev) => ({
                                      ...prev!,
                                      summary: e.target.value,
                                    }))
                                  }
                                  rows={4}
                                />
                              ) : (
                                <Text>{editedAiSummary?.summary || previewData.aiSummary.summary}</Text>
                              )}
                            </Card>

                            {/* 주요 인사이트 */}
                            <Card title="주요 인사이트" size="small" style={{ marginBottom: 16 }}>
                              <List
                                dataSource={editedAiSummary?.keyInsights || previewData.aiSummary.keyInsights || []}
                                renderItem={(item, index) => (
                                  <List.Item>
                                    {isEditingAiSummary ? (
                                      <Input
                                        value={item}
                                        onChange={(e) => {
                                          const newInsights = [...(editedAiSummary?.keyInsights || [])];
                                          newInsights[index] = e.target.value;
                                          setEditedAiSummary((prev) => ({
                                            ...prev!,
                                            keyInsights: newInsights,
                                          }));
                                        }}
                                        style={{ width: '100%' }}
                                      />
                                    ) : (
                                      <Text>• {item}</Text>
                                    )}
                                  </List.Item>
                                )}
                                size="small"
                              />
                            </Card>

                            {/* 권장 사항 */}
                            <Card title="권장 사항" size="small">
                              <List
                                dataSource={editedAiSummary?.recommendations || previewData.aiSummary.recommendations || []}
                                renderItem={(item, index) => (
                                  <List.Item>
                                    {isEditingAiSummary ? (
                                      <Input
                                        value={item}
                                        onChange={(e) => {
                                          const newRecs = [...(editedAiSummary?.recommendations || [])];
                                          newRecs[index] = e.target.value;
                                          setEditedAiSummary((prev) => ({
                                            ...prev!,
                                            recommendations: newRecs,
                                          }));
                                        }}
                                        style={{ width: '100%' }}
                                      />
                                    ) : (
                                      <Text>• {item}</Text>
                                    )}
                                  </List.Item>
                                )}
                                size="small"
                              />
                            </Card>
                          </div>
                        ) : (
                          <Alert
                            message="AI 요약 생성 실패"
                            description={previewData.aiSummary?.error || 'AI 요약을 생성할 수 없습니다.'}
                            type="warning"
                            showIcon
                          />
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'items',
                    label: (
                      <span>
                        <BarChartOutlined /> 항목 데이터
                      </span>
                    ),
                    children: (
                      <div>
                        {Object.entries(previewData.items || {}).map(([itemId, itemData]) => {
                          const chartIcon = CHART_ICONS[itemData?.chartType] || <TableOutlined />;
                          return (
                            <Card
                              key={itemId}
                              title={
                                <Space>
                                  {chartIcon}
                                  {itemId}
                                </Space>
                              }
                              size="small"
                              style={{ marginBottom: 12 }}
                              extra={<Tag color="blue">{itemData?.chartType}</Tag>}
                            >
                              {itemData?.error ? (
                                <Alert message={itemData.error} type="error" showIcon />
                              ) : (
                                <div>
                                  <Text type="secondary">
                                    데이터: {Array.isArray(itemData?.data) ? `${itemData.data.length}건` : '1건'}
                                  </Text>
                                  {Array.isArray(itemData?.data) && itemData.data.length > 0 && (
                                    <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
                                      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                                        <thead>
                                          <tr style={{ background: '#fafafa' }}>
                                            {Object.keys(itemData.data[0] || {}).map((key) => (
                                              <th key={key} style={{ padding: '4px 8px', border: '1px solid #f0f0f0', textAlign: 'left' }}>
                                                {key}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {itemData.data.slice(0, 10).map((row: any, idx: number) => (
                                            <tr key={idx}>
                                              {Object.values(row).map((val: any, vIdx) => (
                                                <td key={vIdx} style={{ padding: '4px 8px', border: '1px solid #f0f0f0' }}>
                                                  {typeof val === 'number' ? val.toLocaleString() : String(val)}
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                      {itemData.data.length > 10 && (
                                        <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                                          ... 외 {itemData.data.length - 10}건 더 있음
                                        </Text>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    ),
                  },
                ]}
              />

              {/* 에러 항목 표시 */}
              {previewData.errorItems && previewData.errorItems.length > 0 && (
                <Alert
                  message={`${previewData.errorItems.length}개 항목에서 오류 발생`}
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {previewData.errorItems.map((item) => (
                        <li key={item.itemId}>
                          {item.itemId}: {item.error}
                        </li>
                      ))}
                    </ul>
                  }
                  type="warning"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </div>
          )}
        </Spin>
      </Modal>

      {/* PDF 생성 모달 */}
      <Modal
        title={
          <Space>
            <FilePdfOutlined />
            레포트 생성
          </Space>
        }
        open={generateOpen}
        onCancel={() => !generating && setGenerateOpen(false)}
        onOk={handleGenerateConfirm}
        confirmLoading={generating}
        okText="생성"
        cancelText="취소"
        cancelButtonProps={{ disabled: generating }}
        closable={!generating}
        maskClosable={!generating}
      >
        <Spin spinning={generating} tip="레포트 생성 중...">
          <div style={{ marginBottom: 16 }}>
            <Text>레포트 제목</Text>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              disabled={generating}
              style={{
                width: '100%',
                padding: '8px 12px',
                marginTop: 8,
                border: '1px solid #d9d9d9',
                borderRadius: 6,
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <RobotOutlined />
              <Text>AI 요약 포함</Text>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Select
                value={includeAiSummary}
                onChange={setIncludeAiSummary}
                style={{ width: '100%' }}
                disabled={generating}
                options={[
                  { value: true, label: '포함' },
                  { value: false, label: '제외' },
                ]}
              />
            </div>
          </div>
          <Alert
            message={`${selectedCount}개 항목이 레포트에 포함됩니다.`}
            type="info"
            showIcon
          />
        </Spin>
      </Modal>
    </div>
  );
};

export default ReportKanbanPage;
