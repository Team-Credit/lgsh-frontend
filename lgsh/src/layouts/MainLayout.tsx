/**
 * 메인 레이아웃
 * - 상단 헤더 (64px)
 * - 좌측 사이드바 (260px, 접기 가능)
 * - 메인 컨텐츠
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Badge, Tooltip, Spin, Slider, Popover } from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  DashboardOutlined,
  TeamOutlined,
  BarChartOutlined,
  FileTextOutlined,
  ToolOutlined,
  ExperimentOutlined,
  RobotOutlined,
  BankOutlined,
  SafetyOutlined,
  LineChartOutlined,
  PlayCircleOutlined,
  IdcardOutlined,
  FundOutlined,
  LayoutOutlined,
  CalculatorOutlined,
  HistoryOutlined,
  AppstoreOutlined,
  TableOutlined,
  DatabaseOutlined,
  UsergroupAddOutlined,
  BuildOutlined,
  SlidersFilled,
  BulbOutlined,
  EditOutlined,
  TagsOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
  ToolFilled,
  MessageOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
  CommentOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  UnorderedListOutlined,
  UserSwitchOutlined,
  FontSizeOutlined,
  FileExcelOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { fetchMenus, setSelectedKeys, setOpenKeys, toggleCollapsed, clearMenus } from '@/store/slices/menuSlice';
import { setFontSize, resetFontSize, toggleDarkMode } from '@/store/slices/uiSlice';
import type { MenuItem } from '@/types';
import { exportAllTablesFromDOM } from '@/utils/excelExport';
import { useExcelExport } from '@/contexts';
import { menuService } from '@/services/menuService';
import { chatService } from '@/services/chatService';
import { useTokenRefresh } from '@/hooks';
import SessionTimeoutModal from '@/components/common/SessionTimeoutModal';
import ContractWarningModal from '@/components/common/ContractWarningModal';
import ChatFloatingWidget from '@/components/chat/ChatFloatingWidget';
import { clearContractWarning } from '@/store/slices/authSlice';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

/**
 * FontAwesome 아이콘명을 Ant Design 아이콘 컴포넌트로 동적 변환
 * DB에서 관리하는 MENU_ICON 값(예: 'fa-dashboard', 'fa-users')을 받아서
 * 해당하는 Ant Design 아이콘을 반환합니다.
 *
 * @param iconName - DB의 MENU_ICON 컬럼 값 (예: 'fa-tachometer-alt', 'fa-users')
 * @returns React 아이콘 컴포넌트 또는 기본 아이콘
 */
const getIconByName = (iconName: string | null | undefined): React.ReactNode => {
  if (!iconName) return <FileTextOutlined />;

  // FontAwesome 접두사 제거 (fa-, fas-, far-, fab- 등)
  const cleanName = iconName.replace(/^(fa[srb]?-)/i, '');

  // 아이콘 이름 매핑 (kebab-case를 camelCase로 변환하고 매핑)
  const iconMapping: Record<string, React.ReactNode> = {
    // 대시보드 & 차트
    'tachometer-alt': <DashboardOutlined />,
    dashboard: <DashboardOutlined />,
    'chart-line': <LineChartOutlined />,
    'chart-bar': <BarChartOutlined />,
    'chart-area': <FundOutlined />,
    'bar-chart': <BarChartOutlined />,

    // 사용자 & 팀
    users: <TeamOutlined />,
    'user-friends': <UsergroupAddOutlined />,
    'user-cog': <UserOutlined />,
    'user-shield': <SafetyCertificateOutlined />,
    'user-check': <CheckCircleOutlined />,
    'user-circle': <UserOutlined />,
    'user-add': <UserAddOutlined />,
    'user-plus': <UserAddOutlined />,
    'user-switch': <UserSwitchOutlined />,
    'id-card': <IdcardOutlined />,
    team: <TeamOutlined />,

    // 건물 & 회사
    building: <BankOutlined />,
    bank: <BankOutlined />,
    briefcase: <BuildOutlined />,

    // 실행 & 액션
    'play-circle': <PlayCircleOutlined />,
    calculator: <CalculatorOutlined />,
    flask: <ExperimentOutlined />,
    experiment: <ExperimentOutlined />,

    // 분석 & 데이터
    brain: <AppstoreOutlined />,
    cubes: <AppstoreOutlined />,
    database: <DatabaseOutlined />,
    'layer-group': <LayoutOutlined />,

    // 시스템 & 설정
    cogs: <ToolOutlined />,
    wrench: <ToolFilled />,
    tool: <ToolOutlined />,
    'sliders-h': <SlidersFilled />,
    setting: <SettingOutlined />,

    // 알림 & 공지
    bullhorn: <BulbOutlined />,
    bell: <BellOutlined />,

    // 로봇 & AI
    robot: <RobotOutlined />,
    comments: <CommentOutlined />,
    'comment-alt': <MessageOutlined />,

    // 문서 & 파일
    'file-text': <FileTextOutlined />,
    list: <TableOutlined />,
    'list-ul': <UnorderedListOutlined />,
    edit: <EditOutlined />,
    'folder-open': <FolderOpenOutlined />,

    // 조직 & 구조
    sitemap: <ApartmentOutlined />,
    tags: <TagsOutlined />,

    // 시간 & 이력
    clock: <ClockCircleOutlined />,
    history: <HistoryOutlined />,

    // 기타
    safety: <SafetyOutlined />,
  };

  // 매핑된 아이콘 반환, 없으면 기본 아이콘
  return iconMapping[cleanName] || iconMapping[iconName] || <FileTextOutlined />;
};

const MainLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, contractWarning } = useAppSelector((state) => state.auth);
  const { menus, collapsed, selectedKeys, openKeys, loading } = useAppSelector((state) => state.menu);
  const { fontSize, darkMode } = useAppSelector((state) => state.ui);

  // 계약 만료 경고 모달 상태
  const [showContractWarning, setShowContractWarning] = React.useState(false);
  const [chatUnreadCount, setChatUnreadCount] = React.useState(0);

  // 계약 만료 경고 모달 표시 (로그인 후 최초 1회)
  useEffect(() => {
    if (contractWarning?.showWarning) {
      setShowContractWarning(true);
    }
  }, [contractWarning]);

  // 계약 만료 경고 모달 닫기
  const handleCloseContractWarning = () => {
    setShowContractWarning(false);
    dispatch(clearContractWarning());
  };

  // 토큰 자동 갱신 훅
  const { showWarning, timeRemaining, extendSession, handleLogout: tokenLogout } = useTokenRefresh();

  // 엑셀 내보내기 훅
  const { exportAll, hasHandlers, isExporting } = useExcelExport();

  // 사이드바 너비 상태 관리
  const [siderWidth, setSiderWidth] = React.useState(260);
  const [isResizing, setIsResizing] = React.useState(false);
  const minWidth = 200;
  const maxWidth = 400;

  // 메뉴 조회 (사용자 변경 시 재조회)
  useEffect(() => {
    if (user) {
      dispatch(fetchMenus());
    }
  }, [dispatch, user?.userId]);

  const refreshChatUnreadCount = useCallback(async () => {
    if (!user) {
      setChatUnreadCount(0);
      return;
    }
    try {
      const response = await chatService.getUnreadCount();
      setChatUnreadCount(response.data.data?.unreadCount ?? 0);
    } catch {
      setChatUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    void refreshChatUnreadCount();
    const intervalId = window.setInterval(() => {
      void refreshChatUnreadCount();
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [refreshChatUnreadCount]);

  const handleRefreshUnread = useCallback(() => {
    void refreshChatUnreadCount();
  }, [refreshChatUnreadCount]);

  // 초기 폰트 크기 적용
  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
  }, [fontSize]);

  // 초기 다크모드 적용
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // 역방향 URL 맵 생성 (menuUrl -> menuId) - URL로 메뉴 찾기용
  const urlToMenuIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    const buildMap = (items: MenuItem[]) => {
      items.forEach((item) => {
        if (item.menuUrl) {
          map[item.menuUrl] = item.menuId;
        }
        if (item.children) {
          buildMap(item.children);
        }
      });
    };
    buildMap(menus);
    return map;
  }, [menus]);

  // URL 변경 시 선택 메뉴 업데이트 (menuUrl -> menuId 매핑 사용)
  useEffect(() => {
    const currentPath = location.pathname;
    // URL을 menuId로 변환하여 선택 상태 설정
    const menuId = urlToMenuIdMap[currentPath];
    if (menuId) {
      dispatch(setSelectedKeys([menuId]));
    } else {
      // 매핑이 없으면 기존 방식 (path 마지막 부분 사용)
      const pathParts = currentPath.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        dispatch(setSelectedKeys([pathParts[pathParts.length - 1]]));
      }
    }
  }, [location.pathname, dispatch, urlToMenuIdMap]);

  // 리사이저 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSiderWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, minWidth, maxWidth]);

  // 메뉴 URL 맵 생성 (menuId -> menuUrl)
  const menuUrlMap = useMemo(() => {
    const map: Record<string, string> = {};
    const buildMap = (items: MenuItem[]) => {
      items.forEach((item) => {
        if (item.menuUrl) {
          map[item.menuId] = item.menuUrl;
        }
        if (item.children) {
          buildMap(item.children);
        }
      });
    };
    buildMap(menus);
    return map;
  }, [menus]);


  // 메뉴 데이터를 Ant Design 형식으로 변환
  const menuItems: MenuProps['items'] = useMemo(() => {
    const convertMenu = (items: MenuItem[]): MenuProps['items'] => {
      return items.map((item) => ({
        key: item.menuId,
        label: item.menuNm,
        icon: getIconByName(item.menuIcon),
        children: item.children && item.children.length > 0 ? convertMenu(item.children) : undefined,
      }));
    };
    return convertMenu(menus);
  }, [menus]);

  // 메뉴 선택 핸들러
  const handleMenuSelect = ({ key }: { key: string }) => {
    const url = menuUrlMap[key];
    if (url) {
      // Redis에 메뉴 접근 기록
      menuService.recordMenuAccess(key);
      navigate(url);
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    dispatch(clearMenus()); // 메뉴 상태 초기화
    await dispatch(logout());
    navigate('/login');
  };

  // 폰트 크기 변경 핸들러
  const handleFontSizeChange = (value: number) => {
    dispatch(setFontSize(value));
  };

  // 폰트 크기 슬라이더 컨텐츠
  const fontSizeContent = (
    <div style={{ width: 200, padding: '8px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'white' }}>
        <span>폰트 크기</span>
        <span>{fontSize}px</span>
      </div>
      <Slider
        min={12}
        max={20}
        value={fontSize}
        onChange={handleFontSizeChange}
        tooltip={{ formatter: (value) => `${value}px` }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <Button size="small" onClick={() => dispatch(resetFontSize())}>
          초기화
        </Button>
      </div>
    </div>
  );

  // 사용자 드롭다운 메뉴
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: '내 정보',
      icon: <UserOutlined />,
    },
    {
      key: 'settings',
      label: '설정',
      icon: <SettingOutlined />,
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: '로그아웃',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className="main-layout">
      {/* 헤더 */}
      <Header className="main-header">
        <div className="header-left">
          <div className="header-brand">
            <img src="/logo.png" alt="로지신해" className="header-logo logo-animated" />
            <div className="header-brand-text">
              <span className="header-title">로지신해</span>
              <span className="header-subtitle">AI 신용평가 시스템</span>
            </div>
          </div>
        </div>

        <div className="header-right">
          <Popover
            content={fontSizeContent}
            title={null}
            trigger="click"
            placement="bottomRight"
            overlayInnerStyle={{ background: 'rgba(0, 0, 0, 0.85)', color: 'white' }}
          >
            <Tooltip title="폰트 크기">
              <Button type="text" icon={<FontSizeOutlined />} className="header-icon-btn" />
            </Tooltip>
          </Popover>

          <Tooltip title="엑셀 다운로드 (전체)">
            <Button
              type="text"
              icon={<FileExcelOutlined />}
              className="header-icon-btn"
              loading={isExporting}
              onClick={async () => {
                // 1. Context에 등록된 핸들러가 있으면 전체 데이터 내보내기
                if (hasHandlers) {
                  await exportAll();
                  return;
                }
                // 2. 핸들러가 없으면 DOM 방식으로 fallback (현재 페이지만)
                const success = exportAllTablesFromDOM();
                if (!success) {
                  import('antd').then(({ message }) => {
                    message.warning('현재 화면에 다운로드할 테이블이 없습니다.');
                  });
                }
              }}
            />
          </Tooltip>

          <Tooltip title={darkMode ? '라이트 모드' : '다크 모드'}>
            <Button
              type="text"
              icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
              className="header-icon-btn"
              onClick={() => dispatch(toggleDarkMode())}
            />
          </Tooltip>

          <Tooltip title="알림">
            <Badge count={chatUnreadCount} size="small" overflowCount={99}>
              <Button
                type="text"
                icon={<BellOutlined />}
                className="header-icon-btn"
                onClick={() => navigate('/chat')}
              />
            </Badge>
          </Tooltip>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div className="user-info">
              <Avatar icon={<UserOutlined />} className="user-avatar" />
              <div className="user-text">
                <span className="user-name">{user?.userNm || '사용자'}</span>
                <span className="user-role">{user?.roleNm || '역할'}</span>
              </div>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Layout>
        {/* 사이드바 */}
        <Sider
          width={collapsed ? 80 : siderWidth}
          collapsedWidth={80}
          collapsed={collapsed}
          className="main-sider"
          trigger={null}
          style={{ position: 'relative' }}
        >
          <div className="sider-toggle">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => dispatch(toggleCollapsed())}
              className="toggle-btn"
            />
          </div>

          {loading ? (
            <div className="menu-loading">
              <Spin />
            </div>
          ) : (
            <Menu
              mode="inline"
              inlineCollapsed={collapsed}
              selectedKeys={selectedKeys}
              {...(!collapsed && { openKeys, onOpenChange: (keys) => dispatch(setOpenKeys(keys)) })}
              onSelect={handleMenuSelect}
              items={menuItems}
              className="sider-menu"
            />
          )}

          {/* 리사이저 */}
          {!collapsed && (
            <div
              className="sider-resizer"
              onMouseDown={handleMouseDown}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                cursor: 'col-resize',
                backgroundColor: isResizing ? '#1890ff' : 'transparent',
                transition: isResizing ? 'none' : 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isResizing) {
                  e.currentTarget.style.backgroundColor = 'rgba(24, 144, 255, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isResizing) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            />
          )}
        </Sider>

        {/* 컨텐츠 */}
        <Content className="main-content">
          <Outlet />
        </Content>
      </Layout>

      {/* 세션 만료 경고 모달 */}
      <SessionTimeoutModal
        open={showWarning}
        timeRemaining={timeRemaining}
        onExtend={extendSession}
        onLogout={tokenLogout}
      />

      {/* 계약 만료 임박 경고 모달 */}
      <ContractWarningModal
        open={showContractWarning}
        contractWarning={contractWarning}
        onClose={handleCloseContractWarning}
      />

      <ChatFloatingWidget
        unreadCount={chatUnreadCount}
        onRefreshUnread={handleRefreshUnread}
      />
    </Layout>
  );
};

export default MainLayout;
