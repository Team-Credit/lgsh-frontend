/**
 * 메뉴 권한 가드
 * - menuId가 지정된 라우트에 대해 사용자의 메뉴 권한을 체크
 * - 권한이 없으면 대시보드로 리다이렉트 + 경고 메시지 표시
 */
import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { message } from 'antd';
import { useAppSelector } from '@/store/hooks';

interface MenuGuardProps {
  menuId?: string;
  children: React.ReactNode;
}

const MenuGuard: React.FC<MenuGuardProps> = ({ menuId, children }) => {
  const { permissions, loading } = useAppSelector((state) => state.menu);
  const messageShown = useRef(false);

  // menuId가 없는 라우트 (상세 페이지 등)는 권한 체크 스킵
  if (!menuId) {
    return <>{children}</>;
  }

  // 메뉴 로딩 중일 때는 children 그대로 표시 (깜빡임 방지)
  if (loading) {
    return <>{children}</>;
  }

  // permissions가 아직 비어있으면 (최초 로드 전) 허용
  if (Object.keys(permissions).length === 0) {
    return <>{children}</>;
  }

  // 해당 메뉴에 대한 권한이 있는지 체크
  const hasPermission = !!permissions[menuId];

  if (!hasPermission) {
    // 메시지 중복 방지
    if (!messageShown.current) {
      messageShown.current = true;
      message.warning('접근 권한이 없는 페이지입니다.');
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default MenuGuard;
