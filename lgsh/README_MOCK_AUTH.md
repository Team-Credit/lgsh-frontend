# Mock 인증 사용 가이드

## 개요
백엔드 서버 없이 프론트엔드 개발 및 테스트를 할 수 있도록 Mock 인증 기능을 제공합니다.

## 설정 방법

### 1. 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하거나 수정합니다:

```bash
# .env 파일 생성
cp .env.example .env
```

`.env` 파일에서 다음 설정을 확인/수정합니다:

```env
# Mock 인증 사용 (백엔드 없이 개발 시 true)
VITE_USE_MOCK_AUTH=true

# 또는 VITE_API_BASE_URL을 비워두면 자동으로 Mock 모드 활성화
# VITE_API_BASE_URL=
```

### 2. 개발 서버 재시작
환경 변수 변경 후 개발 서버를 재시작합니다:

```bash
npm run dev
```

## 사용 가능한 테스트 계정

Mock 인증은 다음 테스트 계정을 제공합니다:

| 아이디 | 비밀번호 | 이름 | 역할 | 권한 |
|--------|----------|------|------|------|
| `admin` | `password123!` | 홍길동 | 관리자 | 전체 시스템 관리 |
| `manager` | `password123!` | 김매니저 | 매니저 | 사용자/원청사 관리 |
| `user01` | `password123!` | 이사용자 | 일반사용자 | 대상자 관리, 평가 실행 |
| `analyst` | `password123!` | 박분석가 | 분석가 | 모델 관리, 데이터 분석 |

## 로그인 화면에서 사용하기

### 방법 1: 테스트 계정 클릭
로그인 화면 하단의 "테스트 계정" 섹션에서 원하는 계정을 클릭하면 자동으로 아이디와 비밀번호가 입력됩니다.

### 방법 2: 직접 입력
위 표의 아이디와 비밀번호를 직접 입력합니다.

## Mock 동작 방식

### 로그인 성공 시
```javascript
{
  success: true,
  data: {
    user: {
      userId: "admin",
      userNm: "홍길동",
      roleId: "ADMIN",
      roleNm: "관리자",
      companyId: "C001",
      companyNm: "LG신용해상"
    },
    accessToken: "mock-access-token-1234567890",
    refreshToken: "mock-refresh-token-1234567890"
  },
  message: "로그인 성공",
  errorCode: null
}
```

### 로그인 실패 시
잘못된 아이디 또는 비밀번호 입력 시:
```javascript
{
  success: false,
  data: null,
  message: "아이디 또는 비밀번호가 일치하지 않습니다.",
  errorCode: "AUTH_FAILED"
}
```

### 네트워크 지연 시뮬레이션
실제 API와 유사한 경험을 위해 다음 지연 시간을 적용합니다:
- 로그인: 500ms
- 로그아웃: 300ms

## 상단 헤더 사용자 정보 표시

로그인 성공 후 상단 헤더 우측에 다음 정보가 표시됩니다:

```
┌─────────────────────┐
│ 👤 홍길동           │  ← 사용자 이름 (userNm)
│    관리자           │  ← 사용자 역할 (roleNm)
└─────────────────────┘
```

## 실제 백엔드로 전환

프로덕션 배포 또는 실제 백엔드 API를 사용할 때는:

```env
# Mock 비활성화
VITE_USE_MOCK_AUTH=false

# 실제 백엔드 URL 설정
VITE_API_BASE_URL=http://your-backend-api.com/api/v1
```

## 코드 구조

### Mock 인증 서비스
[src/services/mockAuth.ts](src/services/mockAuth.ts)
- `mockLogin()`: Mock 로그인 처리
- `mockLogout()`: Mock 로그아웃 처리
- `MOCK_USERS`: 테스트 계정 데이터

### 인증 서비스
[src/services/authService.ts](src/services/authService.ts)
```typescript
// 환경 변수에 따라 Mock 또는 실제 API 사용
const USE_MOCK = import.meta.env.VITE_USE_MOCK_AUTH === 'true'
              || !import.meta.env.VITE_API_BASE_URL;

login: async (data: LoginRequest) => {
  if (USE_MOCK) {
    return mockLogin(data);  // Mock 사용
  }
  return api.post('/auth/login', data);  // 실제 API 사용
}
```

## 개발자 콘솔 로그

Mock 모드가 활성화되면 브라우저 콘솔에 다음과 같은 메시지가 표시됩니다:

```
🔧 Mock 로그인 사용 중
```

## 문제 해결

### 로그인 후에도 사용자 정보가 표시되지 않는 경우

1. **localStorage 확인**
   - 브라우저 개발자 도구 → Application → Local Storage
   - `user` 키에 사용자 정보가 저장되어 있는지 확인

2. **Redux State 확인**
   - Redux DevTools로 `auth.user` 상태 확인

3. **localStorage 초기화**
   ```javascript
   localStorage.clear();
   // 또는
   localStorage.removeItem('user');
   localStorage.removeItem('accessToken');
   localStorage.removeItem('refreshToken');
   ```

4. **브라우저 새로고침**
   - `Ctrl + F5` (Windows) 또는 `Cmd + Shift + R` (Mac)

### Mock이 작동하지 않는 경우

1. `.env` 파일 위치 확인 (프로젝트 루트)
2. 개발 서버 재시작
3. 환경 변수 확인:
   ```bash
   # 브라우저 콘솔에서
   console.log(import.meta.env.VITE_USE_MOCK_AUTH);
   ```

## 추가 테스트 계정 추가

새로운 테스트 계정이 필요한 경우 [src/services/mockAuth.ts](src/services/mockAuth.ts)의 `MOCK_USERS`에 추가:

```typescript
const MOCK_USERS = {
  // ... 기존 계정들

  // 새 계정 추가
  viewer: {
    userId: 'viewer',
    password: 'password123!',
    userNm: '최뷰어',
    roleId: 'VIEWER',
    roleNm: '조회 전용',
    companyId: 'C003',
    companyNm: '테스트회사',
  },
};
```

## 버전 정보
- **작성일**: 2025-01-20
- **버전**: 1.0.0
- **관리**: 프론트엔드 개발팀
