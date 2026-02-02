# 토큰 자동 갱신 기능

## 개요

관공서/금융권 스타일의 세션 관리 기능으로, 사용자 활동 상태에 따라 토큰을 자동 갱신하거나 세션 만료 경고를 표시합니다.

## 동작 방식

```
┌─────────────────────────────────────────────────────────────────┐
│                      토큰 자동 갱신 흐름도                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [사용자 활동 감지]                                             │
│   - 마우스 클릭 (mousedown)                                      │
│   - 키보드 입력 (keydown)                                        │
│   - 스크롤 (scroll)                                              │
│   - 터치 (touchstart)                                            │
│          ↓                                                       │
│   [30초마다 토큰 상태 체크]                                       │
│          ↓                                                       │
│   ┌──────────────────────┐    ┌────────────────────────┐        │
│   │  활동 중 (10분 이내)  │    │  미활동 (10분 이상)     │        │
│   └──────────┬───────────┘    └───────────┬────────────┘        │
│              ↓                            ↓                      │
│   [토큰 만료 5분 전]              [토큰 만료 5분 전]              │
│              ↓                            ↓                      │
│   ┌──────────────────┐           ┌──────────────────┐           │
│   │  Silent Refresh  │           │   경고 모달 표시  │           │
│   │  (자동 갱신)      │           │   (60초 카운트)   │           │
│   └──────────────────┘           └────────┬─────────┘           │
│                                           ↓                      │
│                              ┌────────────┴────────────┐        │
│                              ↓                         ↓        │
│                       [세션 연장 클릭]          [60초 경과]      │
│                              ↓                         ↓        │
│                         토큰 갱신               자동 로그아웃    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 설정값

`src/hooks/useTokenRefresh.ts` 상단에서 설정값 조정 가능:

```typescript
// 만료 5분 전 갱신 시작
const REFRESH_THRESHOLD = 5 * 60 * 1000;   // 5분

// 미활동 판단 기준
const IDLE_TIMEOUT = 10 * 60 * 1000;       // 10분

// 토큰 상태 체크 주기
const CHECK_INTERVAL = 30 * 1000;          // 30초

// 경고 모달 카운트다운
const WARNING_DURATION = 60 * 1000;        // 60초
```

## 파일 구조

```
src/
├── utils/
│   └── tokenUtils.ts          # JWT 토큰 파싱 유틸리티
├── hooks/
│   └── useTokenRefresh.ts     # 토큰 자동 갱신 훅
├── components/
│   └── common/
│       └── SessionTimeoutModal.tsx  # 세션 만료 경고 모달
└── layouts/
    └── MainLayout.tsx         # 훅 적용 위치
```

## 상세 구현

### 1. tokenUtils.ts - JWT 토큰 유틸리티

```typescript
// JWT 토큰 디코딩 (payload 추출)
decodeToken(token: string): JwtPayload | null

// 토큰 만료 여부 확인
isTokenExpired(token: string | null): boolean

// 토큰 만료까지 남은 시간 (밀리초)
getTokenTimeRemaining(token: string | null): number

// 토큰 만료까지 남은 시간 (분)
getTokenMinutesRemaining(token: string | null): number

// 토큰 갱신 필요 여부 (만료 N분 전)
shouldRefreshToken(token: string | null, thresholdMinutes?: number): boolean

// 남은 시간 포맷팅 (MM:SS)
formatTimeRemaining(milliseconds: number): string
```

### 2. useTokenRefresh.ts - 토큰 자동 갱신 훅

```typescript
interface UseTokenRefreshReturn {
  showWarning: boolean;           // 경고 모달 표시 여부
  timeRemaining: string;          // 남은 시간 (MM:SS)
  extendSession: () => Promise<void>;  // 세션 연장
  handleLogout: () => void;       // 로그아웃
  updateActivity: () => void;     // 활동 시간 업데이트
}

// 사용 예시
const { showWarning, timeRemaining, extendSession, handleLogout } = useTokenRefresh();
```

### 3. SessionTimeoutModal.tsx - 세션 만료 경고 모달

```typescript
interface SessionTimeoutModalProps {
  open: boolean;                  // 모달 표시 여부
  timeRemaining: string;          // 남은 시간 (MM:SS)
  onExtend: () => Promise<void>;  // 세션 연장 콜백
  onLogout: () => void;           // 로그아웃 콜백
}
```

## 사용 방법

### MainLayout.tsx에서 적용

```tsx
import { useTokenRefresh } from '@/hooks';
import SessionTimeoutModal from '@/components/common/SessionTimeoutModal';

const MainLayout: React.FC = () => {
  // 토큰 자동 갱신 훅
  const {
    showWarning,
    timeRemaining,
    extendSession,
    handleLogout: tokenLogout
  } = useTokenRefresh();

  return (
    <Layout>
      {/* ... 레이아웃 컨텐츠 ... */}

      {/* 세션 만료 경고 모달 */}
      <SessionTimeoutModal
        open={showWarning}
        timeRemaining={timeRemaining}
        onExtend={extendSession}
        onLogout={tokenLogout}
      />
    </Layout>
  );
};
```

## 백엔드 요구사항

### 1. JWT 토큰 구조

토큰 payload에 `exp` (만료 시간) 필드 필수:

```json
{
  "sub": "user123",
  "exp": 1706000000,
  "iat": 1705996400
}
```

### 2. 토큰 갱신 API

```
POST /api/v1/auth/refresh
Content-Type: application/json

Request:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "new-access-token...",
    "refreshToken": "new-refresh-token..."
  }
}
```

### 3. application.properties 설정

```properties
# JWT 토큰 만료 시간
jwt.expiration=3600000           # Access Token: 1시간
jwt.refresh-expiration=604800000  # Refresh Token: 7일
```

## 테스트 방법

### 빠른 테스트를 위한 설정값 조정

`useTokenRefresh.ts`에서 시간을 짧게 설정:

```typescript
// 테스트용 (실제 운영 시 원래 값으로 복원)
const REFRESH_THRESHOLD = 30 * 1000;   // 30초 전 갱신
const IDLE_TIMEOUT = 60 * 1000;        // 1분 미활동
const CHECK_INTERVAL = 5 * 1000;       // 5초마다 체크
const WARNING_DURATION = 30 * 1000;    // 30초 카운트다운
```

### 테스트 시나리오

1. **Silent Refresh 테스트**
   - 로그인 후 페이지에서 활동 유지
   - 토큰 만료 5분 전에 콘솔에 `[TokenRefresh] 활동 중 - 자동 갱신` 로그 확인

2. **경고 모달 테스트**
   - 로그인 후 10분간 미활동
   - 토큰 만료 5분 전에 경고 모달 표시 확인
   - "세션 연장" 버튼 클릭 시 토큰 갱신 확인

3. **자동 로그아웃 테스트**
   - 경고 모달에서 60초간 아무 동작 안함
   - 자동으로 로그인 페이지로 이동 확인

## 브라우저 콘솔 로그

```
[TokenRefresh] 활동 중 - 자동 갱신 (남은 시간: 4 분)
[TokenRefresh] 토큰 갱신 성공
[TokenRefresh] 미활동 감지 - 경고 모달 표시
```

## 주의사항

1. **다중 탭 환경**
   - 현재 구현은 탭별로 독립적으로 동작
   - 한 탭에서 로그아웃 시 다른 탭은 다음 체크 시 자동 로그아웃

2. **네트워크 오류**
   - 토큰 갱신 실패 시 자동 로그아웃 처리
   - 네트워크 불안정 환경에서는 재시도 로직 추가 고려

3. **localStorage 의존**
   - 토큰은 localStorage에 저장
   - 시크릿 모드에서는 탭 종료 시 토큰 삭제됨

## 관련 파일

| 파일 | 설명 |
|------|------|
| `src/utils/tokenUtils.ts` | JWT 파싱, 만료 확인 |
| `src/hooks/useTokenRefresh.ts` | 자동 갱신 로직 |
| `src/components/common/SessionTimeoutModal.tsx` | 경고 모달 UI |
| `src/layouts/MainLayout.tsx` | 훅 적용 |
| `src/services/authService.ts` | 토큰 갱신 API 호출 |
| `src/services/api.ts` | 401 에러 시 갱신 처리 |
