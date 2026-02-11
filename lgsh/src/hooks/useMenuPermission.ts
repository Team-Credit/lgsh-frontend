/**
 * 메뉴 권한 확인 훅
 * TB_SYS_ROLE의 canRead, canWrite, canDelete, exportYn 권한을 확인
 */
import { useMemo } from 'react';
import { useAppSelector } from './redux';
import type { MenuPermission } from '@/types/menu';

export interface UseMenuPermissionResult {
  /** 조회 권한 */
  canRead: boolean;
  /** 저장/수정 권한 */
  canWrite: boolean;
  /** 삭제 권한 */
  canDelete: boolean;
  /** 엑셀 내보내기 권한 */
  canExport: boolean;
  /** 권한 로딩 완료 여부 */
  loaded: boolean;
  /** 원본 권한 객체 */
  permission: MenuPermission | null;
}

const DEFAULT_PERMISSION: UseMenuPermissionResult = {
  canRead: false,
  canWrite: false,
  canDelete: false,
  canExport: false,
  loaded: false,
  permission: null,
};

/**
 * menuId로 해당 메뉴의 권한을 조회하는 훅
 * @param menuId 메뉴 ID (예: 'M0501')
 */
export function useMenuPermission(menuId?: string): UseMenuPermissionResult {
  const { permissions, loading } = useAppSelector((state) => state.menu);

  return useMemo(() => {
    if (!menuId) {
      return { ...DEFAULT_PERMISSION, loaded: !loading };
    }

    const loaded = !loading && Object.keys(permissions).length > 0;
    const perm = permissions[menuId];

    if (!perm) {
      return { ...DEFAULT_PERMISSION, loaded };
    }

    return {
      canRead: perm.canRead,
      canWrite: perm.canWrite,
      canDelete: perm.canDelete,
      canExport: perm.exportYn,
      loaded,
      permission: perm,
    };
  }, [menuId, permissions, loading]);
}
