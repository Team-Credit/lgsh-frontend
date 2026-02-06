/**
 * 로그인 페이지
 * - 원본 디자인 (방패 로고 애니메이션)
 * - userId 기반 로그인
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Modal, message } from 'antd';
import api from '@/services/api';
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

  // 비밀번호 찾기 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotUserId, setForgotUserId] = useState('');
  const [forgotCompanyId, setForgotCompanyId] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetLockUntil, setResetLockUntil] = useState<number | null>(null);
  const [lockRemaining, setLockRemaining] = useState(0);

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

  // ???? ?? ?? ?? ??
  useEffect(() => {
    const saved = localStorage.getItem('lgsh_forgot_lock_until');
    if (saved) {
      const ts = Number(saved);
      if (!Number.isNaN(ts) && ts > Date.now()) {
        setResetLockUntil(ts);
      } else {
        localStorage.removeItem('lgsh_forgot_lock_until');
      }
    }
  }, []);

  // ?? ?? ?? ??
  useEffect(() => {
    if (!resetLockUntil) {
      setLockRemaining(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, resetLockUntil - Date.now());
      setLockRemaining(remaining);
      if (remaining <= 0) {
        setResetLockUntil(null);
        localStorage.removeItem('lgsh_forgot_lock_until');
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resetLockUntil]);

  const formatRemaining = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };


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

  // 비밀번호 재설정 링크 발송
  const handleSendResetLink = async () => {
    if (!forgotUserId || !forgotCompanyId || !forgotEmail) {
      message.error('모든 정보를 입력해주세요.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      message.error('올바른 이메일 형식이 아닙니다.');
      return;
    }

    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', {
        userId: forgotUserId,
        companyId: forgotCompanyId,
        email: forgotEmail
      });
      message.success('정보가 일치하면 비밀번호 재설정 링크가 이메일로 발송됩니다.');
      setIsModalOpen(false);
      setForgotEmail('');
      setForgotUserId('');
      setForgotCompanyId('');
    } catch (err: any) {
      console.error(err);
      const errCode = err?.response?.data?.code;
      if (errCode === 'ERR_USER_017') {
        const lockUntil = Date.now() + 5 * 60 * 1000;
        localStorage.setItem('lgsh_forgot_lock_until', String(lockUntil));
        setResetLockUntil(lockUntil);
        setIsModalOpen(false);
        setForgotEmail('');
        setForgotUserId('');
        setForgotCompanyId('');
        message.error(err?.response?.data?.message || '비밀번호 찾기 요청이 5회 연속으로 실패했습니다. 5분 후 다시 시도해 주세요.');
      } else {
        message.error(err?.response?.data?.message || '요청 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setForgotLoading(false);
    }
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
                <a
                  href="#"
                  className="forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                    if (resetLockUntil) {
                      message.warning("여러 번의 실패로 인해 남은 시간 후에 다시 시도할 수 있습니다. 남은 시간: \u201C" + formatRemaining(lockRemaining) + "\u201D");
                      return;
                    }
                    setIsModalOpen(true);
                  }}
                >
                  비밀번호 찾기
                </a>
                {resetLockUntil && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#c0392b' }}>
                    {"다시 시도 가능한 시간: " + formatRemaining(lockRemaining)}
                  </span>
                )}
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

        </div>
      </div>


      {/* 비밀번호 찾기 모달 */}
      <Modal
        title="비밀번호 찾기"
        open={isModalOpen}
        onOk={handleSendResetLink}
        onCancel={() => setIsModalOpen(false)}
        okText="재설정 링크 발송"
        cancelText="취소"
        confirmLoading={forgotLoading}
      >
        <p>가입 시 등록 정보를 모두 입력해 주세요.</p>
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label className="form-label">아이디</label>
          <input
            type="text"
            className="form-input"
            placeholder="아이디"
            value={forgotUserId}
            onChange={(e) => setForgotUserId(e.target.value)}
            disabled={forgotLoading}
          />
        </div>
        <div className="form-group">
          <label className="form-label">회사 ID</label>
          <input
            type="text"
            className="form-input"
            placeholder="회사 ID (예: CMP001)"
            value={forgotCompanyId}
            onChange={(e) => setForgotCompanyId(e.target.value)}
            disabled={forgotLoading}
          />
        </div>
        <div className="form-group">
          <label className="form-label">이메일</label>
          <input
            type="email"
            className="form-input"
            placeholder="example@email.com"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            disabled={forgotLoading}
          />
        </div>
      </Modal>
    </div >
  );
};

export default LoginPage;
