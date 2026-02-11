/**
 * 로지신해 메인 앱 컴포넌트
 */
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ConfigProvider, Spin, App as AntApp } from 'antd';
import { message } from 'antd';
import koKR from 'antd/locale/ko_KR';

// message 전역 설정 - 중복 방지
message.config({
  maxCount: 1, // 동시에 표시되는 최대 메시지 수
  top: 80, // 상단으로부터 위치
  duration: 3, // 기본 표시 시간 (초)
});
import { store } from '@/store';
import { antdTheme } from '@/styles/theme';
import { AppErrorBoundary, ProtectedRoute, MenuGuard } from '@/components/common';
import { MainLayout } from '@/layouts';
import { ExcelExportProvider } from '@/contexts';
import LoginPage from '@/pages/auth/LoginPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import { routes } from '@/routes';
import '@/styles/global.css';

// 로딩 컴포넌트
const PageLoading: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    minHeight: 200
  }}>
    <Spin size="large" tip="로딩 중..." />
  </div>
);

// 라우트 설정
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 로그인 */}
      <Route path="/login" element={<LoginPage />} />

      {/* 비밀번호 재설정 */}
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      {/* 회원가입 */}
      <Route path="/register" element={<RegisterPage />} />

      {/* 보호된 라우트 */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* 동적 라우트 생성 (메뉴 권한 가드 적용) */}
        {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <MenuGuard menuId={route.menuId}>
                <Suspense fallback={<PageLoading />}>
                  <route.element />
                </Suspense>
              </MenuGuard>
            }
          />
        ))}

        {/* 404 -> 대시보드 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* 기본 리다이렉트 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

// 메인 앱
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ConfigProvider locale={koKR} theme={antdTheme}>
        <AntApp>
          <ExcelExportProvider>
            <AppErrorBoundary>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </AppErrorBoundary>
          </ExcelExportProvider>
        </AntApp>
      </ConfigProvider>
    </Provider>
  );
};

export default App;
