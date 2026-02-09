/**
 * 메인 레이아웃
 * - 상단 헤더 (64px)
 * - 좌측 사이드바 (260px, 접기 가능)
 * - 메인 컨텐츠
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Badge, Tooltip, Spin, Slider, Popover, message } from 'antd';
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
  StarOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { fetchMenus, setSelectedKeys, setOpenKeys, toggleCollapsed, clearMenus } from '@/store/slices/menuSlice';
import { setFontSize, resetFontSize, toggleDarkMode } from '@/store/slices/uiSlice';
import { fetchFavorites, clearFavorites, toggleFavorite } from '@/store/slices/favoriteSlice';
import type { MenuItem, FavoriteItem } from '@/types';
import { exportAllTablesFromDOM } from '@/utils/excelExport';
import { useExcelExport } from '@/contexts';
import { menuService } from '@/services/menuService';
import alertService, { type UserAlert } from '@/services/alertService';
import chatService from '@/services/chatService';
import alertService, { type UserAlert } from '@/services/alertService';
import chatService from '@/services/chatService';
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
  const { favorites } = useAppSelector((state) => state.favorite);

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

  // 컨텍스트 메뉴 상태 (사이드바 메뉴용)
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuTargetId, setContextMenuTargetId] = useState<string | null>(null);

  // 즐겨찾기 컨텍스트 메뉴 상태
  const [favContextMenuOpen, setFavContextMenuOpen] = useState(false);
  const [favContextMenuPosition, setFavContextMenuPosition] = useState({ x: 0, y: 0 });
  const [favContextMenuTargetId, setFavContextMenuTargetId] = useState<string | null>(null);

  // 알림 상태
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [alertUnreadCount, setAlertUnreadCount] = useState(0);
  const [alertLoading, setAlertLoading] = useState(false);
  const [hideReadAlerts, setHideReadAlerts] = useState(false);  // 읽은 알림 숨기기

  // 알림 목록 조회 (Popover 열 때만 호출)
  const fetchAlerts = useCallback(async (hideRead?: boolean) => {
    try {
      setAlertLoading(true);
      const shouldHideRead = hideRead !== undefined ? hideRead : hideReadAlerts;
      const result = await alertService.getAlertList({
        page: 0,
        size: 10,
        readYn: shouldHideRead ? 'N' : undefined,
      });
      setAlerts(result.content);
      const unread = await alertService.getUnreadCount();
      setAlertUnreadCount(unread);
    } catch (error) {
      console.error('알림 조회 실패:', error);
    } finally {
      setAlertLoading(false);
    }
  }, [hideReadAlerts]);

  // 미읽음 건수만 주기적 조회 (60초마다, 가벼운 API)
  useEffect(() => {
    if (!user) return;
    const pollUnreadCount = async () => {
      try {
        const unread = await alertService.getUnreadCount();
        setAlertUnreadCount(unread);
      } catch { /* ignore */ }
    };
    pollUnreadCount();
    const interval = setInterval(pollUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [user?.userId]);

  // 알림 읽음 처리
  const handleReadAlert = useCallback(async (alertId: number, linkUrl?: string) => {
    try {
      await alertService.readAlert(alertId);
      setAlertUnreadCount((prev) => Math.max(0, prev - 1));
      setAlerts((prev) =>
        prev.map((a) => (a.alertId === alertId ? { ...a, readYn: 'Y' } : a))
      );
      if (linkUrl) {
        navigate(linkUrl);
      }
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  }, [navigate]);

  // 전체 읽음 처리
  const handleReadAllAlerts = useCallback(async () => {
    try {
      await alertService.readAllAlerts();
      setAlertUnreadCount(0);
      setAlerts((prev) => prev.map((a) => ({ ...a, readYn: 'Y' })));
      message.success('모든 알림을 읽음 처리했습니다.');
    } catch (error) {
      console.error('전체 읽음 처리 실패:', error);
    }
  }, []);

  // 읽은 알림 숨기기 토글
  const handleToggleHideRead = useCallback(() => {
    const newValue = !hideReadAlerts;
    setHideReadAlerts(newValue);
    fetchAlerts(newValue);
  }, [hideReadAlerts, fetchAlerts]);

  // 메뉴 조회 (사용자 변경 시 재조회)
  useEffect(() => {
    if (user) {
      dispatch(fetchMenus());
      dispatch(fetchFavorites());
    }
  }, [dispatch, user?.userId]);

  const refreshChatUnreadCount = useCallback(async () => {
    try {
      const response = await chatService.getUnreadCount();
      setChatUnreadCount(response.data.data?.unreadCount ?? 0);
    } catch {
      setChatUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setChatUnreadCount(0);
      return;
    }
    void refreshChatUnreadCount();
    const intervalId = window.setInterval(() => {
      void refreshChatUnreadCount();
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, [user?.userId, refreshChatUnreadCount]);

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

  // 컨텍스트 메뉴 닫기 (다른 곳 클릭 시)
  useEffect(() => {
    const handleClick = () => {
      if (contextMenuOpen) {
        setContextMenuOpen(false);
      }
      if (favContextMenuOpen) {
        setFavContextMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenuOpen, favContextMenuOpen]);

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

  // 즐겨찾기 ID Set (빠른 조회용)
  const favoriteMenuIds = useMemo(() => {
    return new Set(favorites.map((f) => f.menuId));
  }, [favorites]);

  // 메뉴가 즐겨찾기인지 확인
  const isFavoriteMenu = useCallback(
    (menuId: string) => favoriteMenuIds.has(menuId),
    [favoriteMenuIds]
  );

  // 즐겨찾기 토글 핸들러
  const handleToggleFavorite = useCallback(
    async (menuId: string) => {
      const result = await dispatch(toggleFavorite(menuId));
      if (toggleFavorite.fulfilled.match(result)) {
        const response = result.payload as { isFavorite: boolean; message: string };
        message.success(response.message);
      }
      setContextMenuOpen(false);
      setFavContextMenuOpen(false);
    },
    [dispatch]
  );

  // 즐겨찾기 드롭다운 내 우클릭 핸들러
  const handleFavoriteContextMenu = useCallback(
    (e: React.MouseEvent, menuId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setFavContextMenuTargetId(menuId);
      setFavContextMenuPosition({ x: e.clientX, y: e.clientY });
      setFavContextMenuOpen(true);
    },
    []
  );

  // 컨텍스트 메뉴 핸들러 (우클릭)
  const handleMenuContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      // 클릭한 요소에서 메뉴 아이템 찾기
      const target = e.target as HTMLElement;
      const menuItem = target.closest('.ant-menu-item') as HTMLElement;

      if (menuItem) {
        // data-menu-key 속성 또는 ant-menu-item의 key 찾기
        const menuKey = menuItem.getAttribute('data-menu-key') ||
          menuItem.querySelector('[data-menu-id]')?.getAttribute('data-menu-id');

        // ant-menu는 key를 직접 노출하지 않으므로 다른 방법 사용
        // ant-menu-title-content의 텍스트로 메뉴 찾기 또는 DOM 구조 활용
        const menuItemKey = Array.from(document.querySelectorAll('.ant-menu-item'))
          .indexOf(menuItem);

        // 실제로는 ant-menu의 items에서 key를 가져와야 함
        // 여기서는 selectedKeys나 다른 방법 사용

        // DOM에서 메뉴 ID 추출 (Ant Design 5.x에서 data-menu-id 사용)
        const allMenuItems = document.querySelectorAll('.sider-menu .ant-menu-item');
        let foundMenuId: string | null = null;

        allMenuItems.forEach((item) => {
          if (item === menuItem || item.contains(target)) {
            // Ant Design Menu는 key를 data-* 속성으로 저장하지 않음
            // 대안: 메뉴 텍스트로 찾기
            const labelEl = item.querySelector('.ant-menu-title-content');
            const label = labelEl?.textContent;
            if (label) {
              // menus에서 해당 라벨을 가진 메뉴 찾기
              const findMenuByLabel = (items: MenuItem[]): string | null => {
                for (const menu of items) {
                  if (menu.menuNm === label && menu.menuUrl) {
                    return menu.menuId;
                  }
                  if (menu.children) {
                    const found = findMenuByLabel(menu.children);
                    if (found) return found;
                  }
                }
                return null;
              };
              foundMenuId = findMenuByLabel(menus);
            }
          }
        });

        if (foundMenuId) {
          setContextMenuTargetId(foundMenuId);
          setContextMenuPosition({ x: e.clientX, y: e.clientY });
          setContextMenuOpen(true);
        }
      }
    },
    [menus]
  );


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
    dispatch(clearFavorites()); // 즐겨찾기 상태 초기화
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

  // 컨텍스트 메뉴 아이템 (사이드바 메뉴 - 즐겨찾기 추가/삭제)
  const contextMenuItems: MenuProps['items'] = useMemo(() => {
    if (!contextMenuTargetId) return [];

    const isFav = isFavoriteMenu(contextMenuTargetId);
    return [
      {
        key: 'toggle-favorite',
        label: isFav ? '즐겨찾기 삭제' : '즐겨찾기 추가',
        icon: isFav ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />,
        onClick: () => handleToggleFavorite(contextMenuTargetId),
      },
    ];
  }, [contextMenuTargetId, isFavoriteMenu, handleToggleFavorite]);

  // 즐겨찾기 컨텍스트 메뉴 아이템 (즐겨찾기 제외)
  const favContextMenuItems: MenuProps['items'] = useMemo(() => {
    if (!favContextMenuTargetId) return [];

    return [
      {
        key: 'remove-favorite',
        label: '즐겨찾기 제외',
        icon: <StarFilled style={{ color: '#faad14' }} />,
        danger: true,
        onClick: () => handleToggleFavorite(favContextMenuTargetId),
      },
    ];
  }, [favContextMenuTargetId, handleToggleFavorite]);

  // 즐겨찾기 드롭다운 메뉴
  const favoriteMenuItems: MenuProps['items'] = useMemo(() => {
    if (favorites.length === 0) {
      return [
        {
          key: 'empty',
          label: (
            <div style={{ color: '#999', textAlign: 'center', padding: '8px 0' }}>
              즐겨찾기가 없습니다
            </div>
          ),
          disabled: true,
        },
      ];
    }

    return favorites.map((favorite) => ({
      key: favorite.menuId,
      label: (
        <div
          onContextMenu={(e) => handleFavoriteContextMenu(e, favorite.menuId)}
          style={{ margin: '-5px -12px', padding: '5px 12px' }}
        >
          {favorite.menuNm}
        </div>
      ),
      icon: getIconByName(favorite.menuIcon),
      onClick: () => {
        if (favorite.menuUrl) {
          menuService.recordMenuAccess(favorite.menuId);
          navigate(favorite.menuUrl);
        }
      },
    }));
  }, [favorites, navigate, handleFavoriteContextMenu]);

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
          <Dropdown
            menu={{ items: favoriteMenuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Tooltip title="즐겨찾기">
              <Badge count={favorites.length} size="small" offset={[-2, 2]}>
                <Button
                  type="text"
                  icon={favorites.length > 0 ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                  className="header-icon-btn"
                />
              </Badge>
            </Tooltip>
          </Dropdown>

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

          <Popover
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>알림</span>
                <div>
                  <Button
                    type="link"
                    size="small"
                    onClick={handleToggleHideRead}
                    style={{ fontSize: 12, padding: 0, marginRight: 8 }}
                  >
                    {hideReadAlerts ? '전체 보기' : '안읽은 것만'}
                  </Button>
                  {alertUnreadCount > 0 && (
                    <Button
                      type="link"
                      size="small"
                      onClick={handleReadAllAlerts}
                      style={{ fontSize: 12, padding: 0 }}
                    >
                      모두 읽음
                    </Button>
                  )}
                </div>
              </div>
            }
            content={
              <div style={{ width: 320, maxHeight: 400, overflowY: 'auto' }}>
                {alertLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Spin size="small" />
                  </div>
                ) : alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                    알림이 없습니다
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.alertId}
                      onClick={() => handleReadAlert(alert.alertId, alert.linkUrl)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: alert.readYn === 'N' ? '#e6f4ff' : 'transparent',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = alert.readYn === 'N' ? '#bae0ff' : '#f5f5f5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = alert.readYn === 'N' ? '#e6f4ff' : 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: alert.readYn === 'N' ? 600 : 400, fontSize: 13 }}>
                          {alert.alertTitle}
                        </span>
                        <span style={{ fontSize: 11, color: '#999', whiteSpace: 'nowrap', marginLeft: 8 }}>
                          {alert.timeAgo}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4, lineHeight: 1.4 }}>
                        {alert.alertMsg}
                      </div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                        {alert.alertTypeNm}
                      </div>
                    </div>
                  ))
                )}
              </div>
            }
            trigger="click"
            placement="bottomRight"
            onOpenChange={(open) => {
              if (open) fetchAlerts();
            }}
          >
            <Tooltip title="알림">
              <Badge count={alertUnreadCount} size="small">
                <Button type="text" icon={<BellOutlined />} className="header-icon-btn" />
              </Badge>
            </Tooltip>
          </Popover>

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
            <div onContextMenu={handleMenuContextMenu}>
              <Menu
                mode="inline"
                inlineCollapsed={collapsed}
                selectedKeys={selectedKeys}
                {...(!collapsed && { openKeys, onOpenChange: (keys) => dispatch(setOpenKeys(keys)) })}
                onSelect={handleMenuSelect}
                items={menuItems}
                className="sider-menu"
              />
              {/* 컨텍스트 메뉴 (우클릭) */}
              <Dropdown
                menu={{ items: contextMenuItems }}
                open={contextMenuOpen}
                onOpenChange={setContextMenuOpen}
                trigger={['contextMenu']}
                overlayStyle={{
                  position: 'fixed',
                  left: contextMenuPosition.x,
                  top: contextMenuPosition.y,
                }}
              >
                <div
                  style={{
                    position: 'fixed',
                    left: contextMenuPosition.x,
                    top: contextMenuPosition.y,
                    width: 1,
                    height: 1,
                    display: contextMenuOpen ? 'block' : 'none',
                  }}
                />
              </Dropdown>
            </div>
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
      {/* 즐겨찾기 컨텍스트 메뉴 (우클릭) */}
      <Dropdown
        menu={{ items: favContextMenuItems }}
        open={favContextMenuOpen}
        onOpenChange={setFavContextMenuOpen}
        trigger={['contextMenu']}
        overlayStyle={{
          position: 'fixed',
          left: favContextMenuPosition.x,
          top: favContextMenuPosition.y,
        }}
      >
        <div
          style={{
            position: 'fixed',
            left: favContextMenuPosition.x,
            top: favContextMenuPosition.y,
            width: 1,
            height: 1,
            display: favContextMenuOpen ? 'block' : 'none',
            zIndex: 9999,
          }}
        />
      </Dropdown>
    </Layout>
  );
};

export default MainLayout;
