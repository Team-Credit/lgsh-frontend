/**
 * 분석관리 > 모델 선택
 */
import React, { useEffect, useState } from 'react';
import { Card, Button, Typography, message, Select } from 'antd';
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

// 승인 상태 우선순위 (모듈 레벨로 추출 - pickModelByType + backupModels 정렬에서 공통 사용)
const approvalPriority: Record<ApprovalStatus, number> = {
  DEPLOYED: 0,
  READY: 1,
  APPROVED: 2,
  TRAINING: 3,
  DRAFT: 4,
  ARCHIVED: 5,
  FAILED: 6,
};

const pickModelByType = (models: ModelListResponse[], modelType: ModelType) => {
  const filtered = models.filter((item) => item.modelType === modelType);
  if (filtered.length === 0) return null;

  return [...filtered].sort((a, b) => {
    const pa = approvalPriority[a.approvalStatus] ?? 99;
    const pb = approvalPriority[b.approvalStatus] ?? 99;
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
  const [backupModels, setBackupModels] = useState<ModelListResponse[]>([]);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);

  const fetchCardModels = async () => {
    try {
      const response = await modelService.list({ page: 0, size: 200 });
      if (response.data.success && response.data.data) {
        const list = response.data.data.content || [];

        // MAIN / BACKUP(best 1개) / REFERENCE 각 타입별 최우선 모델
        const picked = modelSelectOrder
          .map((modelType) => pickModelByType(list, modelType))
          .filter((item): item is ModelListResponse => Boolean(item));
        setCardModels(picked);

        // 백업 모델 전체 목록 (우선순위 정렬)
        const allBackups = list
          .filter((item) => item.modelType === 'BACKUP')
          .sort((a, b) => {
            const pa = approvalPriority[a.approvalStatus] ?? 99;
            const pb = approvalPriority[b.approvalStatus] ?? 99;
            if (pa !== pb) return pa - pb;
            const adt = new Date(a.deployedDt || a.regDt || 0).getTime();
            const bdt = new Date(b.deployedDt || b.regDt || 0).getTime();
            return bdt - adt;
          });
        setBackupModels(allBackups);

        // selectedBackupId: 기존 선택이 유효하면 유지, 없으면 최우선 백업으로 기본값
        setSelectedBackupId((prev) => {
          if (prev && allBackups.some((m) => m.modelId === prev)) return prev;
          return allBackups[0]?.modelId || null;
        });

        // selectedModelId: cardModels(non-REFERENCE) + backupModels 전체 범위에서 유효성 검증
        setSelectedModelId((prev) => {
          const selectableCard = picked.filter((item) => item.modelType !== 'REFERENCE');
          if (prev) {
            const stillValid =
              selectableCard.some((m) => m.modelId === prev) ||
              allBackups.some((m) => m.modelId === prev);
            if (stillValid) return prev;
          }
          return selectableCard[0]?.modelId || allBackups[0]?.modelId || null;
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

    // cardModels + backupModels 전체에서 선택된 모델 검색
    const selected = [...cardModels, ...backupModels].find((item) => item.modelId === selectedModelId);
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
            // 백업 모델은 selectedBackupId로 찾은 모델 표시, 나머지는 기존 cardModels 사용
            const model =
              modelType === 'BACKUP'
                ? backupModels.find((m) => m.modelId === selectedBackupId) || null
                : cardModels.find((item) => item.modelType === modelType) || null;

            const label = modelSelectLabels[modelType]!;

            // 백업 타일은 selectedBackupId와 selectedModelId 일치 여부로 선택 상태 판단
            const selected =
              modelType === 'BACKUP'
                ? selectedModelId === selectedBackupId
                : Boolean(model && selectedModelId === model.modelId);

            // 백업 타일은 백업 모델이 1개 이상이면 선택 가능
            const selectable =
              (Boolean(model) || (modelType === 'BACKUP' && backupModels.length > 0))
              && modelType !== 'REFERENCE';

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
                  if (selectable) {
                    if (modelType === 'BACKUP') {
                      if (selectedBackupId) setSelectedModelId(selectedBackupId);
                    } else if (model) {
                      setSelectedModelId(model.modelId);
                    }
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

                  {/* 백업 모델 2개 이상일 때: 드롭다운으로 원하는 백업 모델 선택 가능 */}
                  {modelType === 'BACKUP' && backupModels.length > 1 && (
                    <div
                      className="model-select-backup-picker"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Select
                        size="small"
                        value={selectedBackupId}
                        style={{ width: '100%' }}
                        popupMatchSelectWidth={false}
                        onChange={(value) => {
                          setSelectedBackupId(value);
                          setSelectedModelId(value);
                        }}
                        options={backupModels.map((m) => ({
                          value: m.modelId,
                          label: `${m.modelNm || m.modelId} (${m.approvalStatusNm || m.approvalStatus})`,
                        }))}
                      />
                    </div>
                  )}
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
