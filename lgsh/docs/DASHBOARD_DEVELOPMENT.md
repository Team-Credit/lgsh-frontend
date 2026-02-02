# 대시보드 개발 가이드

> 작성일: 2026-02-02
> 버전: 1.0.0

## 개요

사용자별 커스터마이징 가능한 대시보드 프로그램입니다. 드래그 앤 드롭으로 위젯을 배치하고, 크기를 조절할 수 있습니다.

### 주요 기능
- 사용자별 대시보드 레이아웃 저장
- 드래그 앤 드롭으로 위젯 배치
- 위젯 크기 조절 (리사이즈)
- 최소 4개 ~ 최대 8개 위젯 선택
- 60초 간격 자동 새로고침
- 역할별 기본 레이아웃 제공
- 설정 초기화 기능

---

## 1. 데이터베이스 (Oracle)

### 파일 위치
```
C:\LGSH_DEV_V2\lgsh-backend-api\lgsh\database\dashboard\
├── 01_dashboard_tables.sql      -- 테이블 및 시퀀스
├── 02_dashboard_init_data.sql   -- 초기 데이터
├── 03_dashboard_procedures.sql  -- 저장 프로시저
└── 04_dashboard_messages_codes.sql -- 메시지/종합코드
```

### 테이블 구조

#### TB_DASHBOARD_WIDGET (위젯 마스터)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| WIDGET_ID | VARCHAR2(20) | 위젯 ID (PK) |
| WIDGET_NM | VARCHAR2(100) | 위젯명 |
| WIDGET_NM_EN | VARCHAR2(100) | 위젯명(영문) |
| WIDGET_TYPE | VARCHAR2(20) | 위젯 유형 (STAT_CARD/CHART/LIST/INFO) |
| WIDGET_DESC | VARCHAR2(500) | 위젯 설명 |
| DATA_API_URL | VARCHAR2(200) | 데이터 조회 API URL |
| DEFAULT_WIDTH | NUMBER(2) | 기본 너비 |
| DEFAULT_HEIGHT | NUMBER(2) | 기본 높이 |
| MIN_WIDTH | NUMBER(2) | 최소 너비 |
| MIN_HEIGHT | NUMBER(2) | 최소 높이 |
| MAX_WIDTH | NUMBER(2) | 최대 너비 |
| MAX_HEIGHT | NUMBER(2) | 최대 높이 |
| REFRESH_INTERVAL | NUMBER(5) | 갱신 주기(초) |
| ICON_NM | VARCHAR2(50) | 아이콘명 |
| SORT_ORDER | NUMBER(3) | 정렬 순서 |
| USE_YN | CHAR(1) | 사용 여부 |

#### TB_DASHBOARD_ROLE_DEFAULT (역할별 기본 레이아웃)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| ROLE_ID | VARCHAR2(20) | 역할 ID (PK) |
| WIDGET_ID | VARCHAR2(20) | 위젯 ID (PK, FK) |
| X_POS | NUMBER(2) | X 위치 |
| Y_POS | NUMBER(2) | Y 위치 |
| WIDTH | NUMBER(2) | 너비 |
| HEIGHT | NUMBER(2) | 높이 |
| VISIBLE_YN | CHAR(1) | 표시 여부 |

#### TB_DASHBOARD_USER_CONFIG (사용자별 설정)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| CONFIG_ID | NUMBER | 설정 ID (PK) |
| USER_ID | VARCHAR2(50) | 사용자 ID |
| WIDGET_ID | VARCHAR2(20) | 위젯 ID (FK) |
| X_POS | NUMBER(2) | X 위치 |
| Y_POS | NUMBER(2) | Y 위치 |
| WIDTH | NUMBER(2) | 너비 |
| HEIGHT | NUMBER(2) | 높이 |
| VISIBLE_YN | CHAR(1) | 표시 여부 |

### 저장 프로시저

| 프로시저명 | 설명 |
|------------|------|
| SP_DASHBOARD_WIDGET_SELECT | 위젯 목록 조회 |
| SP_DASHBOARD_CONFIG_GET | 사용자 설정 조회 |
| SP_DASHBOARD_CONFIG_SAVE | 사용자 설정 저장 (단건) |
| SP_DASHBOARD_CONFIG_SAVE_BATCH | 사용자 설정 저장 (배치) |
| SP_DASHBOARD_CONFIG_DELETE | 사용자 설정 삭제 (초기화) |
| SP_DASHBOARD_ROLE_DEFAULT_SELECT | 역할별 기본 레이아웃 조회 |
| SP_DASHBOARD_WIDGET_DATA_EVAL_COUNT | 이번 달 평가 건수 조회 |
| SP_DASHBOARD_WIDGET_DATA_PERSON_COUNT | 총 대상자 수 조회 |
| SP_DASHBOARD_WIDGET_DATA_GRADE_DIST | 등급별 분포 조회 |
| SP_DASHBOARD_WIDGET_DATA_MONTHLY_TREND | 월별 평가 추이 조회 |
| SP_DASHBOARD_WIDGET_DATA_RECENT_EVAL | 최근 평가 내역 조회 |
| SP_DASHBOARD_WIDGET_DATA_ALERT_PERSON | 주의 대상자 조회 |
| SP_DASHBOARD_WIDGET_DATA_NOTICE | 공지사항 조회 |

### 실행 순서
```sql
-- 1. 테이블 생성
@01_dashboard_tables.sql

-- 2. 초기 데이터 입력
@02_dashboard_init_data.sql

-- 3. 저장 프로시저 생성
@03_dashboard_procedures.sql

-- 4. 메시지/종합코드 등록
@04_dashboard_messages_codes.sql
```

---

## 2. 백엔드 (Spring Boot)

### 파일 위치
```
C:\LGSH_DEV_V2\lgsh-backend-api\lgsh\src\main\java\com\lgsh\credit\dashboard\
├── controller/
│   └── DashboardController.java
├── service/
│   └── DashboardService.java
├── mapper/
│   └── DashboardMapper.java
├── vo/
│   ├── DashboardWidgetVO.java
│   ├── DashboardUserConfigVO.java
│   └── DashboardRoleDefaultVO.java
└── dto/
    ├── DashboardWidgetResponse.java
    ├── DashboardLayoutItemResponse.java
    ├── DashboardConfigResponse.java
    ├── DashboardConfigRequest.java
    └── WidgetDataResponse.java

resources/mapper/dashboard/
└── DashboardMapper.xml
```

### REST API 명세

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/v1/dashboard/widgets` | 위젯 목록 조회 |
| GET | `/api/v1/dashboard/config` | 사용자 대시보드 설정 조회 |
| PUT | `/api/v1/dashboard/config` | 사용자 대시보드 설정 저장 |
| DELETE | `/api/v1/dashboard/config` | 사용자 대시보드 설정 초기화 |
| GET | `/api/v1/dashboard/widgets/{widgetId}/data` | 위젯 데이터 조회 |

### API 상세

#### 위젯 목록 조회
```http
GET /api/v1/dashboard/widgets?widgetType=STAT_CARD&useYn=Y
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "widgetId": "STAT_TOTAL_PERSON",
      "widgetNm": "총 대상자 수",
      "widgetType": "STAT_CARD",
      "defaultWidth": 3,
      "defaultHeight": 1,
      ...
    }
  ]
}
```

#### 사용자 설정 조회
```http
GET /api/v1/dashboard/config
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isCustomized": true,
    "layout": [
      {
        "widgetId": "STAT_TOTAL_PERSON",
        "widgetNm": "총 대상자 수",
        "widgetType": "STAT_CARD",
        "x": 0,
        "y": 0,
        "w": 3,
        "h": 1,
        "minW": 2,
        "minH": 1,
        "maxW": 6,
        "maxH": 2,
        "visible": true,
        ...
      }
    ],
    "refreshInterval": 60
  }
}
```

#### 사용자 설정 저장
```http
PUT /api/v1/dashboard/config
Content-Type: application/json

{
  "layout": [
    {
      "widgetId": "STAT_TOTAL_PERSON",
      "x": 0,
      "y": 0,
      "w": 3,
      "h": 1,
      "visible": true
    },
    ...
  ]
}
```

#### 위젯 데이터 조회
```http
GET /api/v1/dashboard/widgets/STAT_TOTAL_PERSON/data
```

**Response (STAT_CARD):**
```json
{
  "success": true,
  "data": {
    "widgetId": "STAT_TOTAL_PERSON",
    "data": {
      "value": 1234,
      "unit": "명",
      "comparison": {
        "type": "MOM",
        "value": 5.2,
        "direction": "UP"
      }
    },
    "updatedAt": "2026-02-02T10:30:00"
  }
}
```

---

## 3. 프론트엔드 (React + TypeScript)

### 파일 위치
```
C:\LGSH_DEV_V2\lgsh-frontend\lgsh\src\
├── types/
│   ├── dashboard.ts              -- 타입 정의
│   └── react-grid-layout.d.ts    -- react-grid-layout 타입 선언
├── services/
│   └── dashboardService.ts       -- API 서비스
├── stores/
│   └── dashboardStore.ts         -- Zustand 상태 관리
└── pages/dashboard/
    ├── DashboardPage.tsx         -- 메인 페이지
    ├── DashboardPage.css
    └── components/
        ├── DashboardToolbar.tsx  -- 도구 모음
        ├── DashboardToolbar.css
        ├── WidgetContainer.tsx   -- 위젯 컨테이너
        ├── WidgetContainer.css
        ├── WidgetSelector.tsx    -- 위젯 선택 모달
        ├── WidgetSelector.css
        └── widgets/
            ├── index.ts
            ├── StatCardWidget.tsx    -- 통계 카드
            ├── StatCardWidget.css
            ├── ChartWidget.tsx       -- 차트
            ├── ChartWidget.css
            ├── ListWidget.tsx        -- 목록
            ├── ListWidget.css
            ├── InfoWidget.tsx        -- 정보
            └── InfoWidget.css
```

### 의존성 패키지

```bash
npm install react-grid-layout @types/react-grid-layout recharts zustand --save
```

| 패키지 | 버전 | 용도 |
|--------|------|------|
| react-grid-layout | ^1.x | 드래그/리사이즈 그리드 |
| recharts | ^2.x | 차트 라이브러리 |
| zustand | ^4.x | 상태 관리 |

### 라우트 설정

라우트는 이미 등록되어 있습니다:
```typescript
// src/routes/index.tsx
{
  path: 'dashboard',
  element: DashboardPage,
  title: '대시보드',
  menuId: 'M01',
}
```

### 위젯 유형

| 유형 | 컴포넌트 | 설명 |
|------|----------|------|
| STAT_CARD | StatCardWidget | 통계 카드 (숫자 + 비교) |
| CHART | ChartWidget | 차트 (PIE/BAR/LINE/AREA) |
| LIST | ListWidget | 목록 (평가내역/주의대상자/공지) |
| INFO | InfoWidget | 정보 (모델 정보) |

### 상태 관리 (Zustand)

```typescript
interface DashboardState {
  // 상태
  config: DashboardConfig | null;
  widgetDataCache: WidgetDataCache;
  isEditMode: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;

  // Actions
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  resetConfig: () => Promise<void>;
  setEditMode: (mode: boolean) => void;
  updateLayout: (layout: LayoutItem[]) => void;
  toggleWidget: (widgetId: string, visible: boolean) => void;
  loadWidgetData: (widgetId: string) => Promise<void>;
  refreshAllWidgets: () => Promise<void>;
  cancelEdit: () => void;
}
```

### 사용 예시

```tsx
import { useDashboardStore } from '@/stores/dashboardStore';

const MyComponent = () => {
  const { config, isEditMode, loadConfig } = useDashboardStore();

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <div>
      {config?.layout.map(widget => (
        <WidgetContainer key={widget.widgetId} widget={widget} />
      ))}
    </div>
  );
};
```

---

## 4. 위젯 추가 방법

### 1) 데이터베이스
```sql
-- 1. 위젯 마스터 등록
INSERT INTO TB_DASHBOARD_WIDGET (
  WIDGET_ID, WIDGET_NM, WIDGET_TYPE, DATA_API_URL,
  DEFAULT_WIDTH, DEFAULT_HEIGHT, MIN_WIDTH, MIN_HEIGHT, MAX_WIDTH, MAX_HEIGHT,
  REFRESH_INTERVAL, ICON_NM, SORT_ORDER, USE_YN
) VALUES (
  'NEW_WIDGET', '새 위젯', 'STAT_CARD', '/api/v1/dashboard/widgets/NEW_WIDGET/data',
  3, 1, 2, 1, 6, 2,
  60, 'DashboardOutlined', 13, 'Y'
);

-- 2. 역할별 기본 레이아웃 등록
INSERT INTO TB_DASHBOARD_ROLE_DEFAULT (ROLE_ID, WIDGET_ID, X_POS, Y_POS, WIDTH, HEIGHT, VISIBLE_YN)
VALUES ('ADMIN', 'NEW_WIDGET', 0, 0, 3, 1, 'Y');

-- 3. 데이터 조회 SP 생성
CREATE OR REPLACE PROCEDURE SP_DASHBOARD_NEW_WIDGET (
  P_USER_ID IN VARCHAR2,
  P_RESULT OUT SYS_REFCURSOR
) AS
BEGIN
  OPEN P_RESULT FOR
    SELECT ...
    FROM ...;
END;
```

### 2) 백엔드
```java
// DashboardService.java에 메서드 추가
public WidgetDataResponse getNewWidgetData(String userId) {
    Map<String, Object> params = new HashMap<>();
    params.put("userId", userId);
    params.put("result", null);

    dashboardMapper.getNewWidgetData(params);
    // ... 처리 로직
}
```

### 3) 프론트엔드 (새 위젯 유형인 경우)
```tsx
// 1. types/dashboard.ts에 데이터 타입 추가
export interface NewWidgetData {
  // ...
}

// 2. widgets 폴더에 새 컴포넌트 생성
// NewWidget.tsx, NewWidget.css

// 3. WidgetContainer.tsx의 switch문에 케이스 추가
case 'NEW_TYPE':
  return <NewWidget data={data as NewWidgetData} />;
```

---

## 5. 트러블슈팅

### API URL 중복 오류 (api/v1/api/v1/...)
`dashboardService.ts`에서 `BASE_URL = '/api/v1/dashboard'`로 설정하면 axios 인스턴스의 baseURL과 중복됩니다.

**원인:**
- `api.ts`의 axios 인스턴스가 이미 `baseURL: '/api/v1'`을 가지고 있음
- 서비스에서 `/api/v1/dashboard`를 사용하면 최종 URL이 `/api/v1/api/v1/dashboard`가 됨

**해결:**
```typescript
// dashboardService.ts
const BASE_URL = '/dashboard';  // ✅ '/api/v1/dashboard'가 아님
```

### react-grid-layout 타입 오류
`@types/react-grid-layout`의 타입 정의가 불완전할 수 있습니다. 커스텀 타입 선언 파일을 사용합니다:
```
src/types/react-grid-layout.d.ts
```

### 위젯 데이터 캐싱
위젯 데이터는 Zustand store의 `widgetDataCache`에 캐싱됩니다. 새로고침 버튼을 누르거나 60초마다 자동 갱신됩니다.

### 레이아웃 저장 실패
- 최소 4개, 최대 8개 위젯을 선택해야 합니다.
- 편집 모드에서만 레이아웃 변경이 가능합니다.

### 위젯 데이터 조회 500 에러 (ORA-00904)
TB_PERSON 테이블에는 CREDIT_SCORE, CREDIT_GRADE 컬럼이 없습니다. 신용점수 데이터는 TB_CREDIT_SCORE_HIST 테이블에서 조회해야 합니다.

**잘못된 쿼리:**
```sql
SELECT CREDIT_SCORE, CREDIT_GRADE FROM TB_PERSON  -- ❌ 컬럼 없음
```

**올바른 쿼리:**
```sql
-- 최신 신용점수만 필요한 경우
SELECT h.CREDIT_SCORE, h.CREDIT_GRADE
FROM (
    SELECT PERSON_ID, CREDIT_SCORE, CREDIT_GRADE,
           ROW_NUMBER() OVER(PARTITION BY PERSON_ID ORDER BY SCORE_DT DESC) AS RN
    FROM TB_CREDIT_SCORE_HIST
) h
INNER JOIN TB_PERSON p ON h.PERSON_ID = p.PERSON_ID AND h.RN = 1
WHERE p.USE_YN = 'Y'
```

### TB_NOTICE NOTICE_LEVEL 컬럼 없음
TB_NOTICE 테이블은 `NOTICE_LEVEL`이 아닌 `LVL` 컬럼을 사용합니다.

**올바른 쿼리:**
```sql
SELECT NOTICE_ID, TITLE, LVL AS NOTICE_LEVEL, REG_DT FROM TB_NOTICE
```

---

## 6. 참고 문서

- [DASHBOARD_CUSTOMIZATION_DESIGN.md](../../개발문서/대시보드/DASHBOARD_CUSTOMIZATION_DESIGN.md) - 설계 문서
- [LGSH_PROJECT_CONVENTION.md](../../개발문서/대시보드/LGSH_PROJECT_CONVENTION.md) - 프로젝트 컨벤션
- [react-grid-layout 문서](https://github.com/react-grid-layout/react-grid-layout)
- [Recharts 문서](https://recharts.org/)
- [Zustand 문서](https://zustand-demo.pmnd.rs/)
