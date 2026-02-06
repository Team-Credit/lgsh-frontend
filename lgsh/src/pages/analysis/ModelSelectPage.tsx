/**
 * ???? > ?? ??
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
    tag: "\uC6B4\uC601\uC911",
    title: "\uC6B4\uC601 \uBAA8\uB378",
    empty: "\uBAA8\uB378 \uC5C6\uC74C",
    hint: "\uBAA8\uB378 \uB4F1\uB85D \uD544\uC694",
  },
  BACKUP: {
    tag: "\uBC31\uC5C5\uBAA8\uB378",
    title: "\uBC31\uC5C5 \uBAA8\uB378",
    empty: "\uBAA8\uB378 \uC5C6\uC74C",
    hint: "\uBAA8\uB378 \uB4F1\uB85D \uD544\uC694",
  },
  REFERENCE: {
    tag: "\uCC38\uC870\uC6A9",
    title: "\uCC38\uC870 \uBAA8\uB378",
    empty: "\uBAA8\uB378 \uC5C6\uC74C",
    hint: "\uBAA8\uB378 \uB4F1\uB85D \uD544\uC694",
  },
  CHALLENGER: {
    tag: "\uCC48\uB9B0\uC800",
    title: "\uCC48\uB9B0\uC800 \uBAA8\uB378",
    empty: "\uBAA8\uB378 \uC5C6\uC74C",
    hint: "\uBAA8\uB378 \uB4F1\uB85D \uD544\uC694",
  },
  TEST: {
    tag: "\uD14C\uC2A4\uD2B8",
    title: "\uD14C\uC2A4\uD2B8 \uBAA8\uB378",
    empty: "\uBAA8\uB378 \uC5C6\uC74C",
    hint: "\uBAA8\uB378 \uB4F1\uB85D \uD544\uC694",
  },
};

const modelTypeTags: Record<ModelType, string> = {
  MAIN: "\uC6B4\uC601\uC911",
  BACKUP: "\uBC31\uC5C5\uBAA8\uB378",
  REFERENCE: "\uCC38\uC870\uC6A9",
  CHALLENGER: "\uCC48\uB9B0\uC800",
  TEST: "\uD14C\uC2A4\uD2B8",
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
          return selectable[0].modelId;
        });
      } else {
        message.error(response.data.message || "\uBAA8\uB378 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      }
    } catch (error) {
      console.error('Model card fetch error:', error);
      message.error("\uBAA8\uB378 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    }
  };

  useEffect(() => {
    fetchCardModels();
    const id = setInterval(fetchCardModels, 10000);
    return () => clearInterval(id);
  }, []);

  const handleApplySelectedModel = async () => {
    if (!selectedModelId) {
      message.warning("\uC120\uD0DD\uB41C \uBAA8\uB378\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
      return;
    }

    const selected = cardModels.find((item) => item.modelId === selectedModelId);
    if (selected?.algorithmType === 'XGBOOST') {
      message.warning("\uCC38\uC870\uC6A9 \uBAA8\uB378\uC740 \uC120\uD0DD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
      return;
    }
    if (!isDeployableStatus(selected?.approvalStatus)) {
      const statusLabel = selected?.approvalStatusNm || selected?.approvalStatus || "\uC54C \uC218 \uC5C6\uC74C";
      message.warning(`\uD604\uC7AC \uC0C1\uD0DC(${statusLabel})\uC5D0\uC11C\uB294 \uBAA8\uB378 \uC801\uC6A9\uC744 \uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC2B9\uC778 \uC644\uB8CC \uBAA8\uB378\uB9CC \uC801\uC6A9 \uAC00\uB2A5\uD569\uB2C8\uB2E4.`);
      return;
    }

    setApplyLoading(true);
    try {
      const response = await modelService.deploy(selectedModelId, {
        deployReason: 'MODEL_SELECT_APPLY',
      });
      if (response.data.success) {
        message.success("\uC120\uD0DD\uD55C \uBAA8\uB378\uC774 \uC801\uC6A9\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
        fetchCardModels();
      } else {
        message.error(response.data.message || "\uBAA8\uB378 \uC801\uC6A9\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      }
    } catch (error: unknown) {
      console.error('Model apply error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        message.error(axiosError.response?.data?.message || "\uBAA8\uB378 \uC801\uC6A9\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      } else {
        message.error("\uBAA8\uB378 \uC801\uC6A9 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
      }
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div className="model-select-page fade-in">
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          {"\uBAA8\uB378 \uC120\uD0DD"}
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {"\uBAA8\uB378 \uC815\uD655\uB3C4\uB97C \uD655\uC778\uD558\uACE0 \uC120\uD0DD한 \uBAA8\uB378을 \uC801\uC6A9하세요."}
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
            {"\uC120\uD0DD \uBAA8\uB378 \uC801\uC6A9"}
          </Button>
          {selectedModelId && (
            <Text type="secondary" className="model-select-current">
              {"\uC120\uD0DD\uB41C \uBAA8\uB378: "} {selectedModelId}
            </Text>
          )}
        </div>
        <Text type="secondary" className="model-select-hint">
          {"\uC120\uD0DD한 \uBAA8\uB378을 \uAE30\uC900으로 \uC2E4제 적\uC6A9합니다."}
        </Text>
      </Card>
    </div>
  );
};

export default ModelSelectPage;
