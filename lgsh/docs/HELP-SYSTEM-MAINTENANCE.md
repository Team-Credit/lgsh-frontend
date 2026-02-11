# 도움말 시스템 유지보수 가이드

> 로지신해 AI 신용평가 시스템 - 화면별 사용자 도움말 자동 생성 파이프라인

## 1. 시스템 개요

화면별 도움말을 **3단계 파이프라인**으로 자동 생성하고, React 모달로 표시하는 시스템이다.

```
[Puppeteer 캡처] → [Claude API 분석] → [React HelpModal]
  37개 화면 PNG      37개 도움말 JSON      헤더 ? 버튼
```

### 핵심 동작 원리

1. Puppeteer로 로그인 후 각 화면을 1920x1080으로 캡처
2. 스크린샷을 Claude Vision API에 전송하여 도움말 JSON 자동 생성
3. 생성된 JSON을 `src/help/data/`에 저장 → Vite 빌드에 포함
4. 사용자가 헤더 `?` 버튼 클릭 시 현재 라우트에 맞는 JSON을 동적 import하여 모달 표시

---

## 2. 디렉토리 구조

```
lgsh-frontend/lgsh/
├── scripts/                          # 자동화 스크립트 (빌드 미포함)
│   ├── package.json                  # puppeteer, @anthropic-ai/sdk 의존성
│   ├── routes.json                   # 캡처 대상 37개 라우트 목록
│   ├── capture-screens.js            # 1단계: Puppeteer 캡처 스크립트
│   ├── generate-help.js              # 2단계: Claude API 도움말 생성 스크립트
│   └── screenshots/                  # 캡처된 PNG 파일 (37개, ~5.7MB)
│       ├── dashboard.png
│       ├── persons.png
│       └── ...
│
├── src/
│   ├── help/
│   │   └── data/                     # 도움말 JSON (빌드에 포함)
│   │       ├── help-index.json       # 라우트 → menuKey 매핑 인덱스
│   │       ├── dashboard.json        # 대시보드 도움말
│   │       ├── persons.json          # 대상자 목록 도움말
│   │       └── ... (37개)
│   │
│   ├── components/common/
│   │   └── HelpModal.tsx             # 도움말 모달 컴포넌트
│   │
│   └── layouts/
│       └── MainLayout.tsx            # 헤더 ? 버튼 + HelpModal 연동
│
└── docs/
    └── HELP-SYSTEM-MAINTENANCE.md    # 이 문서
```

---

## 3. 라우트 - menuKey 매핑 전체 목록

| 라우트 | menuKey | 메뉴명 |
|--------|---------|--------|
| `/dashboard` | `dashboard` | 대시보드 |
| `/persons` | `persons` | 대상자 목록 |
| `/persons/create` | `persons-create` | 대상자등록 |
| `/persons/detail` | `persons-detail` | 대상자상세 |
| `/credit/run` | `credit-run` | 평가 실행 |
| `/credit/distribution` | `credit-distribution` | 점수 분포 |
| `/simulation` | `simulation` | 시뮬레이션 실행 |
| `/simulation/history` | `simulation-history` | 시뮬레이션 이력 |
| `/models` | `models` | 모델관리 |
| `/analysis/model-select` | `analysis-model-select` | 모델 선택 |
| `/admin/rawdata` | `admin-rawdata` | 기초데이터업로드 |
| `/admin/rawdata-list` | `admin-rawdata-list` | 기초데이터조회 |
| `/analysis` | `analysis` | 데이터 분석 |
| `/analysis/result-visualization` | `analysis-result-visualization` | 결과 시각화 |
| `/analysis/time-series` | `analysis-time-series` | 시계열 분석 |
| `/analysis/spider` | `analysis-spider` | 스파이더웹 분석 |
| `/admin/variables` | `admin-variables` | 변수 메타 관리 |
| `/psngrp` | `psngrp` | 관리그룹 |
| `/admin/codes` | `admin-codes` | 공통코드관리 |
| `/admin/menus` | `admin-menus` | 메뉴관리 |
| `/users` | `users` | 사용자목록 |
| `/users/approval` | `users-approval` | 사용자승인 |
| `/users/detail` | `users-detail` | 사용자상세 |
| `/companies` | `companies` | 원청사목록 |
| `/companies/settings` | `companies-settings` | 원청사설정 |
| `/admin/messages` | `admin-messages` | 메시지코드관리 |
| `/admin/configs` | `admin-configs` | 환경설정 |
| `/notices` | `notices` | 공지사항 |
| `/admin/roles` | `admin-roles` | 역할관리 |
| `/admin/batches` | `admin-batches` | 배치관리 |
| `/admin/files` | `admin-files` | 파일관리 |
| `/ai/chat` | `ai-chat` | AI 어시스턴트 |
| `/ai/chatlogs` | `ai-chatlogs` | AI 채팅 로그 |
| `/report/create` | `report-create` | 레포트 생성 |
| `/report/history` | `report-history` | 레포트 이력 |
| `/report/close` | `report-close` | 마감관리 |
| `/report/items` | `report-items` | 항목관리 |

---

## 4. 도움말 JSON 형식

각 `src/help/data/{menuKey}.json` 파일의 스키마:

```jsonc
{
  "title": "화면 제목",                        // 모달 타이틀에 표시
  "description": "화면 목적 설명 (1-2문장)",    // 상단 설명 영역
  "sections": [                               // 접이식 영역별 설명
    {
      "title": "영역명",                       // 예: 조회 조건, 데이터 목록
      "description": "영역 설명",
      "items": [                              // 항목별 세부 설명
        {
          "label": "항목명",                   // 예: 조회 버튼, 사용자ID 컬럼
          "description": "사용법 설명"
        }
      ]
    }
  ],
  "tips": [                                   // 하단 사용 팁 (Tag로 표시)
    "팁 1",
    "팁 2"
  ]
}
```

---

## 5. 유지보수 시나리오별 작업 가이드

### 5-1. 특정 화면이 변경되었을 때 (도움말 업데이트)

화면 UI가 변경된 경우 해당 화면만 재캡처하고 JSON을 수동 수정한다.

```bash
# 1. 스크린샷 재캡처 (dev 서버 실행 필요)
cd scripts/
node capture-screens.js --only dashboard

# 2. src/help/data/dashboard.json 을 직접 수정
# 또는 Claude API 재생성:
set ANTHROPIC_API_KEY=sk-ant-...
node generate-help.js --only dashboard
```

### 5-2. 새로운 메뉴/페이지가 추가되었을 때

```bash
# 1. routes.json에 새 라우트 추가
{
  "path": "/new-page",
  "menuName": "새 기능",
  "menuKey": "new-page"
}

# 2. help-index.json에 매핑 추가
"/new-page": {
  "menuKey": "new-page",
  "menuName": "새 기능"
}

# 3. 캡처 + 도움말 생성
node capture-screens.js --only new-page
node generate-help.js --only new-page    # 또는 JSON 직접 작성
```

### 5-3. 전체 도움말 일괄 재생성

```bash
cd scripts/

# 1. 전체 캡처 (약 5분, 37개 화면)
node capture-screens.js

# 2. 전체 도움말 생성 (약 10분, API 비용 발생)
set ANTHROPIC_API_KEY=sk-ant-...
node generate-help.js
```

### 5-4. 메뉴가 삭제되었을 때

1. `scripts/routes.json`에서 해당 항목 제거
2. `src/help/data/help-index.json`에서 해당 매핑 제거
3. `src/help/data/{menuKey}.json` 파일 삭제

### 5-5. 도움말 JSON만 수동 편집

`src/help/data/{menuKey}.json`을 직접 수정하면 된다. 위 JSON 형식만 지켜주면 빌드 시 자동 반영된다.

---

## 6. 주요 컴포넌트 설명

### HelpModal.tsx (`src/components/common/HelpModal.tsx`)

| Props | 타입 | 설명 |
|-------|------|------|
| `open` | `boolean` | 모달 표시 여부 |
| `onClose` | `() => void` | 닫기 콜백 |
| `menuKey` | `string \| null` | 현재 화면의 도움말 키 |

**동작 원리:**
- `open`과 `menuKey`가 변경될 때 `import(@/help/data/${menuKey}.json)`으로 동적 로드
- Vite가 빌드 시 각 JSON 파일을 별도 chunk로 분리하므로 필요한 시점에만 로드됨
- 로딩 중에는 Spin, JSON이 없으면 Empty 컴포넌트 표시

### MainLayout.tsx 수정사항

| 변경 위치 | 내용 |
|-----------|------|
| import | `QuestionCircleOutlined`, `HelpModal`, `helpIndex` 추가 |
| state | `helpOpen` (boolean) - 모달 열림/닫힘 |
| computed | `helpMenuKey` - `location.pathname` → `helpIndex`에서 menuKey 조회 |
| 헤더 버튼 | 다크모드 토글과 알림 사이에 `?` 버튼 추가 |
| 모달 렌더링 | ProfileModal 다음에 `<HelpModal>` 추가 |

---

## 7. 스크립트 상세

### capture-screens.js

| 설정 | 값 | 설명 |
|------|-----|------|
| `BASE_URL` | `http://localhost:3000` | React dev 서버 주소 |
| `LOGIN_USER` | `admin` | 기본 로그인 계정 (환경변수 `CAPTURE_USER`로 변경 가능) |
| `LOGIN_PASS` | `password123` | 기본 비밀번호 (환경변수 `CAPTURE_PASS`로 변경 가능) |
| viewport | `1920 x 1080` | 캡처 해상도 |
| 렌더링 대기 | 2초 + 스피너 감지 | 동적 컴포넌트 로딩 대기 |

**로그인 흐름:**
1. `/login` 페이지 접속
2. `input.form-input` 셀렉터로 아이디/비밀번호 입력
3. `button.login-button` 클릭
4. URL이 `/login`에서 벗어날 때까지 대기 (SPA 라우팅)

### generate-help.js

| 설정 | 값 |
|------|-----|
| 모델 | `claude-sonnet-4-5-20250929` |
| max_tokens | `4096` |
| API Rate Limit 대기 | 1초/건 |

**API 키 설정 방법:**
```bash
# Windows
set ANTHROPIC_API_KEY=sk-ant-api03-...

# Linux/Mac
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## 8. 트러블슈팅

### 로그인 실패 시

- 백엔드 API 서버(`localhost:8080`)가 실행 중인지 확인
- 테스트 계정 비밀번호가 변경되었는지 확인
- 환경변수로 계정 지정: `set CAPTURE_USER=admin && set CAPTURE_PASS=newpass`

### 캡처 타임아웃 시

- 해당 화면이 대량 데이터를 조회하면서 30초 이상 걸릴 수 있음
- `--only {menuKey}` 옵션으로 개별 재시도
- `capture-screens.js`의 `timeout` 값 조정 (기본 30000ms)

### 도움말 버튼이 비활성화 상태일 때

- `help-index.json`에 해당 라우트 매핑이 있는지 확인
- `src/help/data/{menuKey}.json` 파일이 존재하는지 확인
- 라우트 경로가 `location.pathname`과 정확히 일치하는지 확인 (파라미터 포함 경로는 매칭 안 됨)

### Claude API 도움말 생성 실패 시

- `ANTHROPIC_API_KEY` 환경변수 설정 확인
- 스크린샷 파일 존재 여부 확인 (`screenshots/{menuKey}.png`)
- API 키 잔액/한도 확인
- 대안: JSON 파일을 수동으로 작성하거나, Claude Code에서 스크린샷을 직접 분석하여 생성

### Vite 빌드 시 JSON import 에러

- `tsconfig.json`에 `"resolveJsonModule": true` 설정 확인
- `@/help/data/` 경로가 `@` alias (`src/`)와 일치하는지 확인

---

## 9. 의존성 정보

### scripts/ 디렉토리 (자동화 전용)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `puppeteer` | latest | 화면 캡처 |
| `@anthropic-ai/sdk` | latest | Claude API 도움말 생성 |

### src/ (프론트엔드 빌드)

추가 의존성 없음. Ant Design의 `Modal`, `Collapse`, `Tag`, `Empty`, `Spin` 등 기존 컴포넌트만 사용.

---

## 10. 변경 이력

| 날짜 | 작업 | 비고 |
|------|------|------|
| 2025-02-11 | 도움말 시스템 초기 구축 | 37개 화면 전체 캡처 + JSON 생성 |
| | `scripts/` 디렉토리 생성 | Puppeteer, Claude API 스크립트 |
| | `src/help/data/` 디렉토리 생성 | 37개 도움말 JSON + 인덱스 |
| | `HelpModal.tsx` 컴포넌트 생성 | Ant Design 기반 모달 |
| | `MainLayout.tsx` 수정 | 헤더 ? 버튼 + HelpModal 연동 |
