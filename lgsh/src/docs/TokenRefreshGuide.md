# 토큰 자동 갱신 및 만료 처리 가이드

## 개요

이 문서는 JWT 토큰 기반 인증에서 토큰 자동 갱신 및 만료 시 자동 로그아웃 처리 방식을 설명합니다.

## 동작 방식

### 1. 토큰 자동 갱신 (활동 중)

사용자가 활발하게 시스템을 사용 중일 때:
- 토큰 만료 **5분 전**에 자동으로 갱신
- 사용자는 갱신 과정을 인지하지 못함 (끊김 없음)

### 2. 세션 경고 모달 (미활동 시)

사용자가 **10분 이상 미활동** 상태이고 토큰 만료가 임박한 경우:
- 경고 모달이 표시됨
- **60초 카운트다운** 후 자동 로그아웃
- 사용자가 "세션 연장" 버튼 클릭 시 토큰 갱신 및 계속 사용

### 3. 토큰 만료 시 즉시 로그아웃

토큰이 이미 만료된 경우:
- **10초마다** 토큰 상태 체크
- 만료 감지 시 즉시 로그인 페이지로 이동

### 4. API 401 응답 시 처리

API 호출 중 401 (Unauthorized) 응답을 받은 경우:
1. 토큰 갱신 시도
2. 갱신 성공 → 원래 요청 재시도
3. 갱신 실패 → 자동 로그아웃

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        MainLayout                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              useTokenRefresh Hook                    │   │
│  │  - 10초마다 토큰 상태 체크                           │   │
│  │  - 사용자 활동 감지 (mouse, keyboard, scroll)       │   │
│  │  - 경고 모달 표시/카운트다운                         │   │
│  │  - auth:logout 이벤트 리스닝                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           SessionTimeoutModal                        │   │
│  │  - 세션 만료 경고 표시                               │   │
│  │  - 60초 카운트다운                                   │   │
│  │  - 세션 연장 / 로그아웃 버튼                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      api.ts (Axios)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              응답 인터셉터                            │   │
│  │  - 401 응답 시 토큰 갱신 시도                        │   │
│  │  - 갱신 실패 시 auth:logout 이벤트 발생              │   │
│  │  - 대기 큐로 동시 요청 처리                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 설정값

| 설정 | 값 | 설명 |
|------|-----|------|
| REFRESH_THRESHOLD | 5분 | 토큰 만료 N분 전 갱신 시작 |
| IDLE_TIMEOUT | 10분 | N분 미활동 시 경고 모달 표시 |
| CHECK_INTERVAL | 10초 | 토큰 상태 체크 주기 |
| WARNING_DURATION | 60초 | 경고 모달 카운트다운 시간 |

## 파일 구조

```
src/
├── hooks/
│   └── useTokenRefresh.ts      # 토큰 갱신 훅
├── services/
│   └── api.ts                  # Axios 인터셉터 (401 처리)
├── utils/
│   └── tokenUtils.ts           # JWT 디코딩, 만료 체크 유틸
├── components/common/
│   └── SessionTimeoutModal.tsx # 세션 만료 경고 모달
└── layouts/
    └── MainLayout.tsx          # useTokenRefresh 사용
```

## 핵심 코드

### 1. useTokenRefresh Hook

```tsx
import { useTokenRefresh } from '@/hooks';

const MainLayout: React.FC = () => {
  const {
    showWarning,      // 경고 모달 표시 여부
    timeRemaining,    // 남은 시간 (MM:SS)
    extendSession,    // 세션 연장 함수
    handleLogout,     // 로그아웃 함수
    updateActivity    // 활동 시간 업데이트
  } = useTokenRefresh();

  return (
    <>
      {/* 레이아웃 내용 */}
      <SessionTimeoutModal
        open={showWarning}
        timeRemaining={timeRemaining}
        onExtend={extendSession}
        onLogout={handleLogout}
      />
    </>
  );
};
```

### 2. API 인터셉터 (토큰 갱신 실패 시)

```tsx
// src/services/api.ts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !originalRequest._retry) {
      try {
        // 토큰 갱신 시도
        const response = await axios.post('/auth/refresh', { refreshToken });
        // 성공 시 원래 요청 재시도
        return api(originalRequest);
      } catch (refreshError) {
        // 갱신 실패 - 커스텀 이벤트로 로그아웃 알림
        localStorage.clear();
        window.dispatchEvent(new CustomEvent('auth:logout', {
          detail: { reason: 'token_refresh_failed' }
        }));
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
```

### 3. 커스텀 이벤트 리스닝

```tsx
// useTokenRefresh.ts 내부
useEffect(() => {
  const handleAuthLogout = (event: CustomEvent<{ reason: string }>) => {
    console.log('[TokenRefresh] 로그아웃 이벤트 수신:', event.detail.reason);
    // 타이머 정리
    clearInterval(checkIntervalRef.current);
    clearInterval(countdownRef.current);
    // 로그인 페이지로 이동
    navigate('/login');
  };

  window.addEventListener('auth:logout', handleAuthLogout);
  return () => window.removeEventListener('auth:logout', handleAuthLogout);
}, [navigate]);
```

## 토큰 유틸리티 함수

```tsx
// src/utils/tokenUtils.ts

// JWT 토큰 디코딩
export const decodeToken = (token: string): JwtPayload | null => { ... };

// 토큰 만료 여부 확인
export const isTokenExpired = (token: string | null): boolean => { ... };

// 토큰 만료까지 남은 시간 (밀리초)
export const getTokenTimeRemaining = (token: string | null): number => { ... };

// 토큰 만료까지 남은 시간 (분)
export const getTokenMinutesRemaining = (token: string | null): number => { ... };

// 토큰 갱신 필요 여부 (만료 N분 전)
export const shouldRefreshToken = (token: string | null, thresholdMinutes: number): boolean => { ... };

// 남은 시간 포맷팅 (MM:SS)
export const formatTimeRemaining = (milliseconds: number): string => { ... };
```

## 주의사항

1. **React Router 호환**: `window.location.href` 대신 `navigate()` 사용
2. **타이머 정리**: 컴포넌트 언마운트 시 반드시 `clearInterval` 호출
3. **중복 갱신 방지**: `isRefreshingRef` 플래그로 동시 갱신 요청 방지
4. **대기 큐 처리**: 토큰 갱신 중 들어온 요청은 큐에 저장 후 갱신 완료 시 재시도

## 디버깅

브라우저 콘솔에서 다음 로그를 확인할 수 있습니다:

```
[TokenRefresh] 토큰 없음 - 로그아웃 처리
[TokenRefresh] 토큰 만료됨 - 즉시 로그아웃 처리
[TokenRefresh] 미활동 감지 - 경고 모달 표시
[TokenRefresh] 활동 중 - 자동 갱신 (남은 시간: 4 분)
[TokenRefresh] 토큰 갱신 성공
[TokenRefresh] 토큰 갱신 실패: ...
[TokenRefresh] 로그아웃 이벤트 수신: token_refresh_failed
```
