/**
 * 메뉴 관련 타입 정의
 */

// 메뉴 항목
export interface MenuItem {
  menuId: string;
  menuNm: string;
  menuLevel: number;
  parentMenuId: string | null;
  menuUrl: string | null;
  menuIcon: string | null;
  menuDesc?: string | null;
  useYn?: string | null;
  sortOrder: number;
  children?: MenuItem[];
}

// 메뉴 권한
export interface MenuPermission {
  menuId: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  exportYn: boolean;
}

// 메뉴 상태
export interface MenuState {
  menus: MenuItem[];
  permissions: Record<string, MenuPermission>;
  selectedKeys: string[];
  openKeys: string[];
  collapsed: boolean;
  loading: boolean;
  error: string | null;
}

// Ant Design 메뉴 아이템 타입
export interface AntMenuItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  children?: AntMenuItem[];
  onClick?: () => void;
}
