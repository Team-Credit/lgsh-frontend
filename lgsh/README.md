# 🔐 로지신해 Frontend 3단계 - 로그인/인증

> Ant Design + TypeScript 기반 Frontend 로그인/인증 구현

## 📋 개요

| 항목 | 내용 |
|------|------|
| **UI 라이브러리** | Ant Design (antd) 5.22.0 |
| **언어** | TypeScript |
| **상태관리** | Redux Toolkit |
| **라우팅** | React Router v6 |
| **HTTP 클라이언트** | Axios |

## 📁 파일 구조

```
src/
├── App.tsx                          # 메인 앱 (라우팅, 테마 설정)
├── App.css                          # 전역 스타일
├── main.tsx                         # 엔트리 포인트
├── vite-env.d.ts                    # Vite 환경 타입
├── components/
│   └── common/
│       └── ProtectedRoute.tsx       # 인증 보호 라우트
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx            # 로그인 페이지
│   │   └── LoginPage.css            # 로그인 스타일
│   └── dashboard/
│       ├── DashboardPage.tsx        # 대시보드 (임시)
│       └── DashboardPage.css        # 대시보드 스타일
├── services/
│   ├── api.ts                       # Axios 인스턴스 (토큰 갱신)
│   └── authService.ts               # 인증 API 서비스
├── store/
│   ├── index.ts                     # Redux Store
│   ├── hooks.ts                     # 타입 지정 Hooks
│   └── slices/
│       └── authSlice.ts             # 인증 Redux 슬라이스
└── types/
    ├── index.ts                     # 타입 내보내기
    └── auth.types.ts                # 인증 타입 정의
```

## 🔧 설치 방법

### 1. 기존 2단계 프로젝트에 덮어쓰기

```bash
# 기존 프로젝트 디렉토리로 이동
cd lgsh-frontend

# 3단계 파일 복사 (덮어쓰기)
cp -r lgsh-stage3/src/* src/
```

### 2. 환경변수 설정

`.env` 파일 생성 또는 수정:

```env
VITE_API_BASE_URL=http://localhost:8080
```

### 3. 로고 파일 배치

`public/LGSH_LOGO.png` 파일을 프로젝트에 추가하세요.

### 4. 의존성 확인

```bash
npm install
```

### 5. 개발 서버 실행

```bash
npm run dev
```

## 🧪 테스트 계정

| 아이디 | 역할 | 비밀번호 |
|--------|------|----------|
| ADMIN01 | 관리자 | Lgsh1234! |
| MANAGER01 | 매니저 | Lgsh1234! |
| USER01 | 사용자 | Lgsh1234! |
| ANALYST01 | 분석가 | Lgsh1234! |
| VIEWER01 | 뷰어 | Lgsh1234! |

## ✨ 주요 기능

### 1. 로그인 페이지
- 아이디/비밀번호 폼 유효성 검증
- 테스트 계정 클릭 자동 입력
- 로고 애니메이션 (shine + glow)
- 다크모드 지원
- 반응형 디자인

### 2. JWT 토큰 관리
- Access Token / Refresh Token 분리
- 자동 토큰 갱신 (401 에러 시)
- 토큰 블랙리스트 체크
- 중복 갱신 요청 방지

### 3. Redux 상태관리
- 인증 상태 전역 관리
- 비동기 액션 (createAsyncThunk)
- 로컬스토리지 연동

### 4. 보호 라우트
- 미인증 시 로그인 페이지 리다이렉트
- 역할 기반 접근 제어 (선택적)

## 🔌 Backend API 연동

### 로그인 API
```
POST /api/v1/auth/login
Request: { userId, password }
Response: { accessToken, refreshToken, userId, userNm, roleId, ... }
```

### 로그아웃 API
```
POST /api/v1/auth/logout
Request: { refreshToken }
Response: { success: true }
```

### 토큰 갱신 API
```
POST /api/v1/auth/refresh
Request: { refreshToken }
Response: { accessToken, accessTokenExpireTime }
```

## 📝 다음 단계

- [ ] 4단계: 레이아웃 / 대시보드 구현
- [ ] PHASE 1 화면 개발 (대상자 관리, 신용평가 등)

---

*Last Updated: 2026-01-16*
