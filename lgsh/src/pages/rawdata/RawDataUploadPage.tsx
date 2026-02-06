/**
 * 기초 데이터 업로드 페이지
 * 3개 탭: 매핑설정 / 데이터업로드 / AI오류해결
 * 모델관리 페이지 디자인 참조
 */
import React, { useState } from 'react';
import {
  Tabs,
  Badge,
  Typography,
} from 'antd';
import {
  SettingOutlined,
  CloudUploadOutlined,
  BugOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';
import MappingGrid from './components/MappingGrid';
import UploadGrid from './components/UploadGrid';
import ErrorResolverPanel from './components/ErrorResolverPanel';
import rawDataService from '@/services/rawDataService';
import './RawDataUploadPage.css';

const { Title, Text } = Typography;

const RawDataUploadPage: React.FC = () => {
  // 로그인 사용자 정보
  const currentUser = useAppSelector((state) => state.auth.user);
  const userCompanyId = currentUser?.companyId || '';

  // 상태
  const [activeTab, setActiveTab] = useState('mapping');
  const [unresolvedErrorCount, setUnresolvedErrorCount] = useState(0);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);

  // 미해결 에러 수 조회
  const fetchUnresolvedErrorCount = async (uploadId: string) => {
    try {
      const result = await rawDataService.getErrorList({
        uploadId,
        resolvedYn: 'N',
        page: 0,
        size: 1,
      });
      setUnresolvedErrorCount(result.totalCount);
    } catch (error) {
      console.error('에러 수 조회 실패:', error);
    }
  };

  // 업로드 완료 또는 이력에서 오류 보기 클릭 시 호출
  const handleUploadComplete = (uploadId: string) => {
    setCurrentUploadId(uploadId);
    fetchUnresolvedErrorCount(uploadId);
    // AI 오류해결 탭으로 전환
    setActiveTab('error');
  };

  // 에러 해결 시 카운트 업데이트
  const handleErrorResolved = () => {
    if (currentUploadId) {
      fetchUnresolvedErrorCount(currentUploadId);
    }
  };

  // 탭 아이템
  const tabItems = [
    {
      key: 'mapping',
      label: (
        <span>
          <SettingOutlined />
          매핑설정
        </span>
      ),
      children: (
        <MappingGrid companyId={userCompanyId} />
      ),
    },
    {
      key: 'upload',
      label: (
        <span>
          <CloudUploadOutlined />
          데이터업로드
        </span>
      ),
      children: (
        <UploadGrid
          companyId={userCompanyId}
          onUploadComplete={handleUploadComplete}
        />
      ),
    },
    {
      key: 'error',
      label: (
        <span>
          <BugOutlined />
          AI오류해결
          {unresolvedErrorCount > 0 && (
            <Badge
              count={unresolvedErrorCount}
              style={{ marginLeft: 8 }}
              size="small"
            />
          )}
        </span>
      ),
      children: (
        <ErrorResolverPanel
          companyId={userCompanyId}
          uploadId={currentUploadId}
          onErrorResolved={handleErrorResolved}
        />
      ),
    },
  ];

  return (
    <div className="rawdata-upload-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <DatabaseOutlined style={{ marginRight: 8 }} />
          기초 데이터 업로드
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          CSV 파일 업로드를 통해 신용평가 기초 데이터를 등록하고 관리합니다.
        </Text>
      </div>

      {/* 탭 영역 */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        type="card"
        size="large"
      />
    </div>
  );
};

export default RawDataUploadPage;
