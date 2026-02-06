/**
         * LGSH 레이아웃
 * - 상단 헤더 (64px)
 * - 좌측 사이드바 (280px, 접기 가능)
 * - 메인 콘텐츠 영역
 * - 1920x1080 해상도 기준
 */

import React, { useState, createContext, useContext } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Input, Badge, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  DashboardOutlined,
  TeamOutlined,
  BarChartOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutAsync } from '@/store/slices/authSlice';
import type { MenuItem, MenuGroup, User, UserRole } from '@/types';
import './AppLayout.css';

const { Header, Sider, Content } = Layout;

// ========== Context ==========
interface LayoutContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  currentUser: User | null;
  currentRoles: UserRole[];
}

const LayoutContext = createContext<LayoutContextType | null>(null);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within AppLayout');
  }
  return context;
};

// ========== Props ==========
export interface AppLayoutProps {
  /** 로고 이미지 URL */
  logoUrl?: string;
  /** 시스템명 */
  systemName?: string;
  /** 시스템 부제 */
  systemSubtitle?: string;
  /** 메뉴 그룹 */
  menuGroups?: MenuGroup[];
  /** 현재 사용자 */
  currentUser?: User | null;
  /** 로그아웃 핸들러 */
  onLogout?: () => void;
  /** 알림 클릭 핸들러 */
  onNotificationClick?: () => void;
  /** 알림 카운트 */
  notificationCount?: number;
  /** 설정 클릭 핸들러 */
  onSettingsClick?: () => void;
}

/**
 * 레이아웃 컴포넌트
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  logoUrl = '/logo.png',
  systemName = 'LGSH',
  systemSubtitle = 'AI 신용평가 시스템',
  menuGroups: propMenuGroups,
  currentUser: propCurrentUser,
  onLogout: propOnLogout,
  onNotificationClick,
  notificationCount = 0,
  onSettingsClick,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux에서 사용자 정보 가져오기
  const authUser = useAppSelector((state) => state.auth.user);
  const currentUser = propCurrentUser || (authUser ? {
    userId: authUser.userId,
    userName: authUser.userName,
    email: authUser.email,
    roleCode: authUser.roleCode as UserRole,
    roleName: authUser.roleName,
    companyId: authUser.companyId,
    companyName: authUser.companyName,
  } : null);

  // 기본 메뉴 그룹
  const defaultMenuGroups: MenuGroup[] = [
    {
      key: 'main',
      title: '메인',
      icon: <DashboardOutlined />,
      items: [
        { key: 'dashboard', label: '대시보드', path: '/dashboard', icon: <DashboardOutlined /> },
      ],
    },
    {
      key: 'credit',
      title: '신용평가',
      icon: <BarChartOutlined />,
      items: [
        { key: 'persons', label: '대상자 등록', path: '/persons/create', icon: <TeamOutlined /> },
        { key: 'evaluate', label: '평가 실행', path: '/credit/run', icon: <BarChartOutlined /> },
        { key: 'distribution', label: '점수 분포', path: '/credit/distribution', icon: <BarChartOutlined /> },
        { key: 'group', label: '관리그룹', path: '/psngrp', icon: <TeamOutlined /> },
      ],
    },
    {
      key: 'analysis',
      title: '분석관리',
      icon: <BarChartOutlined />,
      items: [
        { key: 'eda', label: '데이터 분석', path: '/analysis', icon: <BarChartOutlined /> },
        { key: 'model-select', label: '\uBAA8\uB378 \uC120\uD0DD', path: '/analysis/model-select', icon: <BarChartOutlined /> },
      ],
    },
    {
      key: 'system',
      title: '시스템관리',
      icon: <SettingOutlined />,
      items: [
        { key: 'notices', label: '공지사항', path: '/notices', icon: <FileTextOutlined /> },
      ],
    },
  ];

  const menuGroups = propMenuGroups || defaultMenuGroups;

  // 현재 사용자 역할
  const currentRoles: UserRole[] = currentUser?.roleCode
    ? [currentUser.roleCode]
    : [];

  // 로그아웃 핸들러
  const handleLogout = async () => {
    if (propOnLogout) {
      propOnLogout();
    } else {
      await dispatch(logoutAsync());
      navigate('/login', { replace: true });
    }
  };

  // 메뉴 아이템 변환
  const menuItems: MenuProps['items'] = menuGroups.map((group) => ({
    key: group.key,
    icon: group.icon,
    label: group.title,
    children: group.items.map((item) => ({
      key: item.key,
      icon: item.icon,
      label: item.path ? (
        <NavLink to={item.path}>{item.label}</NavLink>
      ) : (
        item.label
      ),
      disabled: item.disabled,
    })),
  }));

  // 현재 선택된 메뉴
  const selectedKeys = menuGroups.flatMap((group) =>
    group.items
      .filter((item) => item.path === location.pathname)
      .map((item) => item.key)
  );

  // 열린 서브메뉴
  const openKeys = menuGroups
    .filter((group) =>
      group.items.some((item) => item.path === location.pathname)
    )
    .map((group) => group.key);

  // 사용자 드롭다운 메뉴
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '내 정보',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '설정',
      onClick: onSettingsClick,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      onClick: handleLogout,
    },
  ];

  // 테마 토글
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <Layout className={`app-layout ${theme}`}>
      <LayoutContext.Provider value={{ collapsed, setCollapsed, theme, setTheme, currentUser, currentRoles }}>
        <Sider
          width={280}
          collapsed={collapsed}
          collapsible
          trigger={null}
          className="app-sider"
        >
          <div className="sider-logo">
            <img src={logoUrl} alt="logo" />
            {!collapsed && (
              <div className="sider-logo__text">
                <div className="sider-logo__title">{systemName}</div>
                <div className="sider-logo__subtitle">{systemSubtitle}</div>
              </div>
            )}
          </div>

          <Menu
            mode="inline"
            className="sider-menu"
            items={menuItems}
            selectedKeys={selectedKeys}
            defaultOpenKeys={openKeys}
          />
        </Sider>

        <Layout>
          <Header className="app-header">
            <div className="header-left">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
              />
              <div className="header-search">
                <Input prefix={<SearchOutlined />} placeholder="메뉴 검색" />
              </div>
            </div>

            <div className="header-right">
              <Tooltip title="알림">
                <Badge count={notificationCount} offset={[0, 4]}>
                  <Button type="text" icon={<BellOutlined />} onClick={onNotificationClick} />
                </Badge>
              </Tooltip>

              <Tooltip title="테마 전환">
                <Button type="text" icon={theme === 'light' ? <MoonOutlined /> : <SunOutlined />} onClick={toggleTheme} />
              </Tooltip>

              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Button type="text" className="header-user">
                  <Avatar size="small" icon={<UserOutlined />} />
                  {!collapsed && <span>{currentUser?.userName || '사용자'}</span>}
                </Button>
              </Dropdown>
            </div>
          </Header>

          <Content className="app-content">
            <Outlet />
          </Content>
        </Layout>
      </LayoutContext.Provider>
    </Layout>
  );
};

export default AppLayout;
