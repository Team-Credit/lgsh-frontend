/**
 * 사용자 상세 페이지
 * USER003 - 사용자 상세 정보 및 활동 이력 조회
 * - 메뉴에서 접근: 사용자 ID 검색 후 조회
 * - 사용자 목록에서 접근: 바로 상세 조회
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Typography,
  Descriptions,
  Spin,
  Empty,
  Input,
  Form,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  UnlockOutlined,
  UserOutlined,
  HistoryOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  SearchOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table/interface';
import type { UserDetail, UserLoginHist, RecentMenu } from '@/types';
import { userService } from '@/services/userService';
import './UserDetailPage.css';

const { Title, Text } = Typography;

const UserDetailPage: React.FC = () => {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [searchForm] = Form.useForm();

  // 상태 관리
  const [loading, setLoading] = useState(false);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [searchedUserId, setSearchedUserId] = useState<string | null>(paramUserId || null);

  
  // 데이터 조회
  const fetchUserDetail = useCallback(async (targetUserId: string) => {
    if (!targetUserId) return;

    setLoading(true);
    try {
      const response = await userService.getDetail(targetUserId);
      if (response.success && response.data) {
        setUserDetail(response.data);
        setSearchedUserId(targetUserId);
      } else {
        message.error(response.message || '사용자 정보를 불러오지 못했습니다.');
        setUserDetail(null);
      }
    } catch (error) {
      console.error('사용자 상세 조회 오류:', error);
      message.error('사용자 정보를 불러오지 못했습니다.');
      setUserDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // URL 파라미터로 userId가 있으면 자동 조회
  useEffect(() => {
    if (paramUserId) {
      fetchUserDetail(paramUserId);
    }
  }, [paramUserId, fetchUserDetail]);

  // 검색 버튼 클릭
  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    if (!values.searchUserId?.trim()) {
      message.warning('사용자 ID를 입력해주세요.');
      return;
    }
    fetchUserDetail(values.searchUserId.trim());
  };

  // 초기화 버튼 클릭
  const handleReset = () => {
    searchForm.resetFields();
    setUserDetail(null);
    setSearchedUserId(null);
  };

  // 계정 잠금 해제
  const handleUnlock = async () => {
    if (!searchedUserId) return;

    setLoading(true);
    try {
      const response = await userService.unlockAccount(searchedUserId);
      if (response.success) {
        message.success('계정 잠금이 해제되었습니다.');
        fetchUserDetail(searchedUserId);
      } else {
        message.error(response.message || '잠금 해제에 실패했습니다.');
      }
    } catch (error) {
      console.error('잠금 해제 오류:', error);
      message.error('잠금 해제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 사용자 삭제
  const handleDelete = async () => {
    if (!searchedUserId) return;

    setLoading(true);
    try {
      const response = await userService.delete(searchedUserId);
      if (response.success) {
        message.success('사용자가 삭제되었습니다.');
        navigate('/users');
      } else {
        message.error(response.message || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      message.error('삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 로그인 이력 테이블 컬럼
  const loginHistoryColumns: ColumnsType<UserLoginHist> = [
    {
      title: '일시',
      dataIndex: 'loginDt',
      key: 'loginDt',
      width: 180,
      sorter: (a, b) => (a.loginDt || '').localeCompare(b.loginDt || ''),
      defaultSortOrder: 'descend',
    },
    {
      title: '활동 유형',
      dataIndex: 'loginResult',
      key: 'loginResult',
      width: 120,
      filters: [
        { text: '로그인 성공', value: 'SUCCESS' },
        { text: '로그인 실패', value: 'FAILED' },
      ],
      onFilter: (value, record) => record.loginResult === value,
      render: (result: string) => (
        <Tag color={result === 'SUCCESS' ? 'success' : 'error'}>
          {result === 'SUCCESS' ? '로그인 성공' : '로그인 실패'}
        </Tag>
      ),
    },
    {
      title: '상세 내용',
      dataIndex: 'failReason',
      key: 'failReason',
      width: 200,
      sorter: (a, b) => (a.failReason || '').localeCompare(b.failReason || ''),
      render: (reason: string, record) =>
        record.loginResult === 'SUCCESS' ? '정상 로그인' : reason || '-',
    },
    {
      title: 'IP',
      dataIndex: 'loginIp',
      key: 'loginIp',
      width: 150,
      sorter: (a, b) => (a.loginIp || '').localeCompare(b.loginIp || ''),
    },
  ];

  // 최근 메뉴 테이블 컬럼
  const recentMenuColumns: ColumnsType<RecentMenu> = [
    {
      title: '메뉴명',
      dataIndex: 'menuNm',
      key: 'menuNm',
      width: 200,
      sorter: (a, b) => (a.menuNm || '').localeCompare(b.menuNm || ''),
    },
    {
      title: '경로',
      dataIndex: 'menuPath',
      key: 'menuPath',
      width: 200,
      sorter: (a, b) => (a.menuPath || '').localeCompare(b.menuPath || ''),
    },
    {
      title: '마지막 접근',
      dataIndex: 'lastAccessDt',
      key: 'lastAccessDt',
      width: 180,
      sorter: (a, b) => (a.lastAccessDt || '').localeCompare(b.lastAccessDt || ''),
      defaultSortOrder: 'descend',
    },
    {
      title: '접근 횟수',
      dataIndex: 'accessCount',
      key: 'accessCount',
      width: 100,
      align: 'center',
      sorter: (a, b) => (a.accessCount || 0) - (b.accessCount || 0),
    },
  ];

  // 상태 태그 렌더링
  const renderStatusTag = (useYn?: string) => {
    if (useYn === 'Y') {
      return <Tag icon={<CheckCircleOutlined />} color="success">활성</Tag>;
    }
    return <Tag icon={<CloseCircleOutlined />} color="default">비활성</Tag>;
  };

  // 계정 잠금 태그 렌더링
  const renderLockTag = (lockYn?: string) => {
    if (lockYn === 'Y') {
      return <Tag icon={<LockOutlined />} color="error">잠김</Tag>;
    }
    return <Tag icon={<UnlockOutlined />} color="success">정상</Tag>;
  };

  // 검색 폼 렌더링 (메뉴에서 직접 접근 시)
  const renderSearchForm = () => (
    <Card className="search-card">
      <Form
        form={searchForm}
        layout="inline"
        onFinish={handleSearch}
        style={{ marginBottom: 0 }}
      >
        <Form.Item
          name="searchUserId"
          label="사용자 ID"
          rules={[{ required: true, message: '사용자 ID를 입력해주세요.' }]}
        >
          <Input
            placeholder="사용자 ID 입력"
            style={{ width: 200 }}
            onPressEnter={handleSearch}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              조회
            </Button>
            <Button icon={<ClearOutlined />} onClick={handleReset}>
              초기화
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );

  if (loading && !userDetail) {
    return (
      <div className="user-detail-page">
        <div className="loading-container">
          <Spin size="large" tip="로딩 중..." />
        </div>
      </div>
    );
  }

  // 메뉴에서 직접 접근했고 아직 조회하지 않은 경우
  if (!paramUserId && !userDetail) {
    return (
      <div className="user-detail-page">
        {/* 페이지 헤더 */}
        <div className="page-header">
          <div className="header-left">
            <Title level={4} style={{ margin: 0 }}>
              <UserOutlined style={{ marginRight: 8 }} />
              사용자 상세
            </Title>
          </div>
        </div>

        {/* 검색 폼 */}
        {renderSearchForm()}

        <Empty description="사용자 ID를 입력하여 조회해주세요." style={{ marginTop: 48 }} />
      </div>
    );
  }

  if (!userDetail) {
    return (
      <div className="user-detail-page">
        <Empty description="사용자 정보를 찾을 수 없습니다." />
      </div>
    );
  }

  return (
    <div className="user-detail-page">
      <Spin spinning={loading}>
        {/* 페이지 헤더 */}
        <div className="page-header">
          <div className="header-left">
            {paramUserId && (
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/users')}
                style={{ marginRight: 16 }}
              >
                목록
              </Button>
            )}
            <Title level={4} style={{ margin: 0 }}>
              <UserOutlined style={{ marginRight: 8 }} />
              사용자 상세
            </Title>
          </div>
          <div className="header-right">
            <Space>
              {userDetail.accountLockYn === 'Y' && (
                <Popconfirm
                  title="계정 잠금 해제"
                  description="이 사용자의 계정 잠금을 해제하시겠습니까?"
                  onConfirm={handleUnlock}
                  okText="해제"
                  cancelText="취소"
                >
                  <Button icon={<UnlockOutlined />}>잠금 해제</Button>
                </Popconfirm>
              )}
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/users?edit=${searchedUserId}`)}
              >
                수정
              </Button>
              <Popconfirm
                title="사용자 삭제"
                description="이 사용자를 삭제하시겠습니까?"
                onConfirm={handleDelete}
                okText="삭제"
                cancelText="취소"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  삭제
                </Button>
              </Popconfirm>
            </Space>
          </div>
        </div>

        {/* 메뉴에서 접근한 경우 검색 폼 표시 */}
        {!paramUserId && renderSearchForm()}

        {/* 사용자 정보 카드 */}
        <Card
          title={
            <Space>
              <UserOutlined />
              사용자 정보
            </Space>
          }
          className="info-card"
        >
          <Descriptions column={{ xs: 1, sm: 2, md: 3, lg: 4 }} bordered size="small">
            <Descriptions.Item label="사용자 ID">
              <Text strong>{userDetail.userId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="이름">{userDetail.userNm}</Descriptions.Item>
            <Descriptions.Item label="이메일">{userDetail.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="전화번호">{userDetail.telNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="소속회사">{userDetail.companyNm || '-'}</Descriptions.Item>
            <Descriptions.Item label="역할">
              <Tag color="blue">{userDetail.roleNm || '-'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="상태">{renderStatusTag(userDetail.useYn)}</Descriptions.Item>
            <Descriptions.Item label="계정 상태">{renderLockTag(userDetail.accountLockYn)}</Descriptions.Item>
            <Descriptions.Item label="로그인 실패">{userDetail.failLoginCnt || 0}회</Descriptions.Item>
            <Descriptions.Item label="최종 접속">{userDetail.lastLoginDt || '-'}</Descriptions.Item>
            <Descriptions.Item label="비밀번호 변경일">{userDetail.pwdChangeDt || '-'}</Descriptions.Item>
            <Descriptions.Item label="등록일">{userDetail.regDt || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Row gutter={16}>
          {/* 활동 로그 */}
          <Col xs={24} lg={16}>
            <Card
              title={
                <Space>
                  <HistoryOutlined />
                  활동 로그 (최근 50건)
                </Space>
              }
              className="history-card"
            >
              <Table
                columns={loginHistoryColumns}
                dataSource={userDetail.loginHistory || []}
                rowKey="loginSeq"
                size="small"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `총 ${total}건`,
                }}
                scroll={{ x: 650 }}
                locale={{ emptyText: '로그인 이력이 없습니다.' }}
              />
            </Card>
          </Col>

          {/* 최근 사용 메뉴 */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <AppstoreOutlined />
                  최근 사용 메뉴 (최대 5개)
                </Space>
              }
              className="recent-menu-card"
            >
              {userDetail.recentMenus && userDetail.recentMenus.length > 0 ? (
                <Table
                  columns={recentMenuColumns}
                  dataSource={userDetail.recentMenus}
                  rowKey="menuId"
                  size="small"
                  pagination={false}
                  scroll={{ x: 400 }}
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="최근 사용한 메뉴가 없습니다."
                />
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default UserDetailPage;
