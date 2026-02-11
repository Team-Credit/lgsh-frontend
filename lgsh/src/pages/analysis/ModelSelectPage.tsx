/**
 * 분석관리 > 모델 선택
 */
import React, { useEffect, useState } from 'react';
import { Card, Button, Typography, message } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import type { ApprovalStatus, AlgorithmType, ModelListResponse, ModelType } from '@/types';
import { modelService } from '@/services/modelService';
import './ModelSelectPage.css';

const { Title, Text } = Typography;

const modelSelectOrder: ModelType[] = ['MAIN', 'BACKUP', 'REFERENCE'];

const modelSelectLabels: Partial<Record<ModelType, { tag: string; title: string; empty: string; hint: string }>> = {
  MAIN: {
    tag: "운영중",
    title: "운영 모델",
    empty: "모델 없음",
    hint: "모델 등록 필요",
  },
  BACKUP: {
    tag: "백업모델",
    title: "백업 모델",
    empty: "모델 없음",
    hint: "모델 등록 필요",
  },
  REFERENCE: {
    tag: "참조용",
    title: "참조 모델",
    empty: "모델 없음",
    hint: "모델 등록 필요",
  },
  CHALLENGER: {
    tag: "챌린저",
    title: "챌린저 모델",
    empty: "모델 없음",
    hint: "모델 등록 필요",
  },
  TEST: {
    tag: "테스트",
    title: "테스트 모델",
    empty: "모델 없음",
    hint: "모델 등록 필요",
  },
};

const modelTypeTags: Record<ModelType, string> = {
  MAIN: "운영중",
  BACKUP: "백업모델",
  REFERENCE: "참조용",
  CHALLENGER: "챌린저",
  TEST: "테스트",
};

const algorithmTitles: Record<AlgorithmType, string> = {
  LOGISTIC: 'Logistic Regression',
  TABNET: 'TabNet',
  XGBOOST: 'XGBoost',
};

const pickModelByType = (models: ModelListResponse[], modelType: ModelType) => {
  const filtered = models.filter((item) => item.modelType === modelType);
  if (filtered.length === 0) return null;

  const priority: Record<ApprovalStatus, number> = {
    DEPLOYED: 0,
    READY: 1,
    APPROVED: 2,
    TRAINING: 3,
    DRAFT: 4,
    ARCHIVED: 5,
    FAILED: 6,
  };

  return [...filtered].sort((a, b) => {
    const pa = priority[a.approvalStatus] ?? 99;
    const pb = priority[b.approvalStatus] ?? 99;
    if (pa !== pb) return pa - pb;
    const adt = new Date(a.deployedDt || a.regDt || 0).getTime();
    const bdt = new Date(b.deployedDt || b.regDt || 0).getTime();
    return bdt - adt;
  })[0];
};

const getAccuracyPercent = (aucScore?: number) => {
  if (aucScore == null) return '--';
  const value = aucScore > 1 ? aucScore : aucScore * 100;
  return `${value.toFixed(1)}%`;
};

const isDeployableStatus = (status?: ApprovalStatus) => status === 'DRAFT' || status === 'APPROVED';

const normalizeModelId = (value?: string | null) => (value ?? '').replace(/[_-]/g, '').toUpperCase();
const pickDefaultModelId = (list: ModelListResponse[]) => {
  const preferred = list.find((m) => normalizeModelId(m.modelId) === 'MDL001')?.modelId;
  return preferred || list[0]?.modelId || null;
};

const ModelSelectPage: React.FC = () => {
  const [cardModels, setCardModels] = useState<ModelListResponse[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);

  const fetchCardModels = async () => {
    try {
      const response = await modelService.list({ page: 0, size: 200 });
      if (response.data.success && response.data.data) {
        const list = response.data.data.content || [];
        const picked = modelSelectOrder
          .map((modelType) => pickModelByType(list, modelType))
          .filter((item): item is ModelListResponse => Boolean(item));
        setCardModels(picked);
        setSelectedModelId((prev) => {
          const selectable = picked.filter((item) => item.modelType !== 'REFERENCE');
          if (selectable.length === 0) return null;
          if (prev && selectable.some((item) => item.modelId === prev)) return prev;
          return pickDefaultModelId(selectable);
        });
      } else {
        message.error(response.data.message || "모델 정보를 불러오지 못했습니다.");
      }
    } catch (error) {
      console.error('Model card fetch error:', error);
      message.error("모델 정보를 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    fetchCardModels();
    const id = setInterval(fetchCardModels, 10000);
    return () => clearInterval(id);
  }, []);

  const handleApplySelectedModel = async () => {
    if (!selectedModelId) {
      message.warning("선택된 모델이 없습니다.");
      return;
    }

    const selected = cardModels.find((item) => item.modelId === selectedModelId);
    if (selected?.algorithmType === 'XGBOOST') {
      message.warning("참조용 모델은 선택할 수 없습니다.");
      return;
    }
    if (!isDeployableStatus(selected?.approvalStatus)) {
      const statusLabel = selected?.approvalStatusNm || selected?.approvalStatus || "알 수 없음";
      message.warning(`현재 상태(${statusLabel})에서는 모델 적용을 할 수 없습니다. 승인 완료 모델만 적용 가능합니다.`);
      return;
    }

    setApplyLoading(true);
    try {
      const response = await modelService.deploy(selectedModelId, {
        deployReason: 'MODEL_SELECT_APPLY',
      });
      if (response.data.success) {
        message.success("선택한 모델이 적용되었습니다.");
        fetchCardModels();
      } else {
        message.error(response.data.message || "모델 적용에 실패했습니다.");
      }
    } catch (error: unknown) {
      console.error('Model apply error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        message.error(axiosError.response?.data?.message || "모델 적용에 실패했습니다.");
      } else {
        message.error("모델 적용 중 오류가 발생했습니다.");
      }
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div className="model-select-page fade-in">
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <RocketOutlined style={{ marginRight: 8 }} />
          모델 선택
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          모델 정확도를 확인하고 선택한 모델을 적용하세요.
        </Text>
      </div>

      <Card className="model-select-card" size="small">
        <div className="model-select-grid">
          {modelSelectOrder.map((modelType) => {
            const model = cardModels.find((item) => item.modelType === modelType) || null;
            const label = modelSelectLabels[modelType]!;
            const selected = model && selectedModelId === model.modelId;
            const selectable = Boolean(model) && modelType !== 'REFERENCE';
            const deployed = model?.approvalStatus === 'DEPLOYED' && model?.modelType === 'MAIN';
            const algorithmClass = model?.algorithmType ? model.algorithmType.toLowerCase() : '';
            const title = model ? (model.algorithmTypeNm || algorithmTitles[model.algorithmType]) : label.title;
            const tagText = model ? (modelTypeTags[model.modelType] || label.tag) : label.tag;
            return (
              <button
                key={modelType}
                type="button"
                className={`model-select-tile ${algorithmClass} ${selected ? 'selected' : ''} ${model ? '' : 'empty'} ${selectable ? '' : 'disabled'} ${deployed ? 'deployed' : ''}`}
                onClick={() => {
                  if (selectable && model) {
                    setSelectedModelId(model.modelId);
                  }
                }}
                disabled={!selectable}
              >
                <div className="model-select-tag">{tagText}</div>
                <div className={`model-select-hero ${algorithmClass}`} />
                <div className="model-select-content">
                  <div className="model-select-title">{title}</div>
                  <div className="model-select-name">{model ? model.modelNm : label.empty}</div>
                  <div className="model-select-accuracy">{model ? getAccuracyPercent(model.aucScore) : '--'}</div>
                  <div className="model-select-meta">
                    {model ? '' : label.hint}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="model-select-run">
          <Button
            type="primary"
            icon={<RocketOutlined />}
            loading={applyLoading}
            onClick={handleApplySelectedModel}
          >
            선택 모델 적용
          </Button>
          {selectedModelId && (
            <Text type="secondary" className="model-select-current">
              선택된 모델: {selectedModelId}
            </Text>
          )}
        </div>
        <Text type="secondary" className="model-select-hint">
          선택한 모델을 기준으로 실제 적용합니다.
        </Text>
      </Card>
    </div>
  );
};

export default ModelSelectPage;
