/**
 * 로그인 페이지
 * - 원본 디자인 (방패 로고 애니메이션)
 * - userId 기반 로그인
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginAsync, clearError } from '@/store/slices/authSlice';
import './LoginPage.css';

// 테스트 계정 목록
const TEST_ACCOUNTS = [
  { userId: 'admin', role: '관리자', password: 'password123!' },
  { userId: 'manager', role: '매니저', password: 'password123!' },
  { userId: 'user01', role: '일반사용자', password: 'password123!' },
  { userId: 'analyst', role: '분석가', password: 'password123!' },
];

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading, error } = useAppSelector((state) => state.auth);

  // 폼 상태
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [formErrors, setFormErrors] = useState<{ userId?: string; password?: string }>({});

  // 이미 로그인 상태면 대시보드로 이동
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 컴포넌트 마운트 시 에러 초기화
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // 저장된 아이디 불러오기
  useEffect(() => {
    const savedUserId = localStorage.getItem('lgsh_remember_userId');
    if (savedUserId) {
      setUserId(savedUserId);
      setRememberMe(true);
    }
  }, []);

  // 폼 유효성 검사
  const validateForm = (): boolean => {
    const errors: { userId?: string; password?: string } = {};

    if (!userId.trim()) {
      errors.userId = '아이디를 입력해주세요.';
    }

    if (!password) {
      errors.password = '비밀번호를 입력해주세요.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 로그인 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // 아이디 저장
    if (rememberMe) {
      localStorage.setItem('lgsh_remember_userId', userId);
    } else {
      localStorage.removeItem('lgsh_remember_userId');
    }

    // 로그인 요청
    const result = await dispatch(loginAsync({ userId, password }));
    
    if (loginAsync.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true });
    }
  };

  // 테스트 계정 자동 입력
  const handleTestAccountClick = (account: typeof TEST_ACCOUNTS[0]) => {
    setUserId(account.userId);
    setPassword(account.password);
    setFormErrors({});
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* 헤더 */}
          <div className="login-header">
            <div className="login-logo-wrapper">
              <img src="/logo.png" alt="LGSH Logo" className="login-logo" />
            </div>
            <h1 className="login-title">LGSH</h1>
            <p className="login-subtitle">AI 신용평가 시스템</p>
          </div>

          {/* 바디 */}
          <div className="login-body">
            <form className="login-form" onSubmit={handleSubmit}>
              {/* 에러 메시지 */}
              {error && (
                <div className="login-error-alert">
                  {error}
                </div>
              )}

              {/* 아이디 */}
              <div className="form-group">
                <label className="form-label">아이디</label>
                <input
                  type="text"
                  className={`form-input ${formErrors.userId ? 'error' : ''}`}
                  placeholder="아이디를 입력하세요"
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    setFormErrors((prev) => ({ ...prev, userId: undefined }));
                  }}
                  disabled={loading}
                  autoComplete="username"
                />
                {formErrors.userId && (
                  <span className="form-error">{formErrors.userId}</span>
                )}
              </div>

              {/* 비밀번호 */}
              <div className="form-group">
                <label className="form-label">비밀번호</label>
                <input
                  type="password"
                  className={`form-input ${formErrors.password ? 'error' : ''}`}
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  disabled={loading}
                  autoComplete="current-password"
                />
                {formErrors.password && (
                  <span className="form-error">{formErrors.password}</span>
                )}
              </div>

              {/* 옵션 */}
              <div className="login-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  아이디 저장
                </label>
                <a href="#" className="forgot-password">
                  비밀번호 찾기
                </a>
              </div>

              {/* 로그인 버튼 */}
              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? <Spin size="small" /> : '로그인'}
              </button>

              {/* 회원가입 링크 */}
              <div className="signup-link">
                계정이 없으신가요?{' '}
                <a href="/register" onClick={(e) => {
                  e.preventDefault();
                  navigate('/register');
                }}>
                  회원가입
                </a>
              </div>
            </form>

            {/* 테스트 계정 */}
            <div className="test-accounts">
              <div className="test-accounts-title">테스트 계정</div>
              {TEST_ACCOUNTS.map((account) => (
                <div
                  key={account.userId}
                  className="test-account-item"
                  onClick={() => handleTestAccountClick(account)}
                >
                  <span>{account.role}</span>
                  <span>{account.userId}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 푸터 */}
          <div className="login-footer">
            <p className="login-footer-text">
              © 2026 LGSH. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
