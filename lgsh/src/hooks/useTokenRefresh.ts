/**
 * 토큰 자동 갱신 훅
 * - 활동 중: 만료 5분 전 자동 갱신
 * - 미활동 10분 이상: 경고 모달 표시
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services';
import { useAppDispatch } from '@/store/hooks';
import { logout as logoutAction } from '@/store/slices/authSlice';
import {
  getTokenTimeRemaining,
  getTokenMinutesRemaining,
  isTokenExpired,
  formatTimeRemaining,
} from '@/utils/tokenUtils';

// 설정값 (밀리초)
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 만료 5분 전 갱신
const IDLE_TIMEOUT = 10 * 60 * 1000; // 10분 미활동 시 경고
const CHECK_INTERVAL = 10 * 1000; // 10초마다 체크 (토큰 만료 감지 빠르게)
const WARNING_DURATION = 60 * 1000; // 경고 모달 60초 카운트다운

interface UseTokenRefreshReturn {
  // 세션 경고 모달 표시 여부
  showWarning: boolean;
  // 남은 시간 (포맷팅된 문자열)
  timeRemaining: string;
  // 세션 연장
  extendSession: () => Promise<void>;
  // 로그아웃
  handleLogout: () => void;
  // 마지막 활동 시간 업데이트
  updateActivity: () => void;
}

export function useTokenRefresh(): UseTokenRefreshReturn {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('05:00');

  // 마지막 활동 시간
  const lastActivityRef = useRef<number>(Date.now());
  // 체크 타이머
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 카운트다운 타이머
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 갱신 중 플래그
  const isRefreshingRef = useRef(false);

  // 로그아웃 처리
  const handleLogout = useCallback(() => {
    // Redux store 상태 초기화 (localStorage 정리는 logoutAction 내부에서 처리됨)
    dispatch(logoutAction());
    setShowWarning(false);
    navigate('/login');
  }, [dispatch, navigate]);

  // 활동 시간 업데이트
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    // 경고 모달이 떠있으면 닫기 (활동이 감지되었으므로)
    if (showWarning) {
      setShowWarning(false);
    }
  }, [showWarning]);

  // 토큰 갱신
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) return false;

    const currentRefreshToken = localStorage.getItem('refreshToken');
    if (!currentRefreshToken) {
      handleLogout();
      return false;
    }

    isRefreshingRef.current = true;

    try {
      const response = await authService.refresh(currentRefreshToken);

      if (response.success && response.data) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        console.log('[TokenRefresh] 토큰 갱신 성공');
        return true;
      } else {
        console.error('[TokenRefresh] 토큰 갱신 실패:', response.message);
        handleLogout();
        return false;
      }
    } catch (error) {
      console.error('[TokenRefresh] 토큰 갱신 에러:', error);
      handleLogout();
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [handleLogout]);

  // 세션 연장 (경고 모달에서 호출)
  const extendSession = useCallback(async () => {
    const success = await refreshToken();
    if (success) {
      setShowWarning(false);
      updateActivity();
      // 카운트다운 타이머 정리
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
  }, [refreshToken, updateActivity]);

  // 경고 모달 카운트다운 시작
  const startWarningCountdown = useCallback(() => {
    let remaining = WARNING_DURATION;
    setTimeRemaining(formatTimeRemaining(remaining));
    setShowWarning(true);

    countdownRef.current = setInterval(() => {
      remaining -= 1000;

      if (remaining <= 0) {
        // 시간 초과 - 로그아웃
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        handleLogout();
      } else {
        setTimeRemaining(formatTimeRemaining(remaining));
      }
    }, 1000);
  }, [handleLogout]);

  // 토큰 상태 체크
  const checkTokenStatus = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken');

    // 토큰이 없으면 로그아웃
    if (!accessToken) {
      console.log('[TokenRefresh] 토큰 없음 - 로그아웃 처리');
      handleLogout();
      return;
    }

    // 토큰이 이미 만료되었으면 즉시 로그아웃
    if (isTokenExpired(accessToken)) {
      console.log('[TokenRefresh] 토큰 만료됨 - 즉시 로그아웃 처리');
      handleLogout();
      return;
    }

    const now = Date.now();
    const idleTime = now - lastActivityRef.current;
    const tokenRemaining = getTokenTimeRemaining(accessToken);

    // 미활동 시간이 IDLE_TIMEOUT 이상이고 토큰 만료 임박
    if (idleTime >= IDLE_TIMEOUT && tokenRemaining <= REFRESH_THRESHOLD && !showWarning) {
      console.log('[TokenRefresh] 미활동 감지 - 경고 모달 표시');
      startWarningCountdown();
      return;
    }

    // 활동 중이고 토큰 만료 임박 - 자동 갱신
    if (idleTime < IDLE_TIMEOUT && tokenRemaining <= REFRESH_THRESHOLD && !isRefreshingRef.current) {
      console.log('[TokenRefresh] 활동 중 - 자동 갱신 (남은 시간:', getTokenMinutesRemaining(accessToken), '분)');
      await refreshToken();
    }
  }, [handleLogout, refreshToken, showWarning, startWarningCountdown]);

  // 사용자 활동 이벤트 리스너 설정
  useEffect(() => {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      updateActivity();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [updateActivity]);

  // 토큰 체크 인터벌 설정
  useEffect(() => {
    // 로그인 상태일 때만 체크
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    // 초기 체크
    checkTokenStatus();

    // 주기적 체크
    checkIntervalRef.current = setInterval(checkTokenStatus, CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [checkTokenStatus]);

  // API 인터셉터에서 발생한 로그아웃 이벤트 리스닝
  useEffect(() => {
    const handleAuthLogout = (event: CustomEvent<{ reason: string }>) => {
      console.log('[TokenRefresh] 로그아웃 이벤트 수신:', event.detail.reason);
      // 타이머 정리
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setShowWarning(false);
      navigate('/login');
    };

    window.addEventListener('auth:logout', handleAuthLogout as EventListener);

    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout as EventListener);
    };
  }, [navigate]);

  return {
    showWarning,
    timeRemaining,
    extendSession,
    handleLogout,
    updateActivity,
  };
}

export default useTokenRefresh;
