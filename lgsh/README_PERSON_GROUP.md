# 관리그룹 관리 기능 가이드

## 개요
관리그룹(TB_PERSON_GRP)은 신용평가 대상자를 그룹화하여 관리하는 기능입니다. 이 문서는 관리그룹 관리 기능의 구현 내역과 사용 방법을 설명합니다.

## 작성일
2026-01-20

## 구현 파일

### Frontend

#### 1. 타입 정의
**파일:** [src/types/personGroup.ts](src/types/personGroup.ts)

```typescript
// 관리그룹 엔티티
interface PersonGroup {
  personGrp: string;          // 관리그룹 코드 (PK)
  userId: string;             // 사용자 ID (PK)
  companyId: string;          // 원청사 ID
  companyNm?: string;         // 원청사명 (조회 시 조인)
  personGrpNm: string;        // 관리그룹명
  personNmEng: string | null; // 영문명
  useYn: 'Y' | 'N';          // 사용여부
  regUserId: string;          // 등록자
  regDt: string;              // 등록일시
  updUserId: string | null;   // 수정자
  updDt: string | null;       // 수정일시
}
```

#### 2. API 서비스
**파일:** [src/services/personGroupService.ts](src/services/personGroupService.ts)

**제공 메서드:**
- `list(params)`: 목록 조회 (페이징, 검색 지원)
- `get(personGrp, userId)`: 상세 조회
- `create(data)`: 등록
- `update(personGrp, userId, data)`: 수정
- `delete(personGrp, userId)`: 삭제
- `deleteBatch(items)`: 일괄 삭제

**API 엔드포인트:**
```
GET    /api/v1/person-groups              # 목록 조회
GET    /api/v1/person-groups/:id/:userId  # 상세 조회
POST   /api/v1/person-groups              # 등록
PUT    /api/v1/person-groups/:id/:userId  # 수정
DELETE /api/v1/person-groups/:id/:userId  # 삭제
POST   /api/v1/person-groups/batch-delete # 일괄 삭제
```

#### 3. 페이지 컴포넌트
**파일:** [src/pages/person/PersonGroupPage.tsx](src/pages/person/PersonGroupPage.tsx)

**주요 기능:**
- ✅ 목록 조회 (페이징, 정렬)
- ✅ 검색 필터 (관리그룹코드, 관리그룹명, 원청사, 사용여부)
- ✅ 등록/수정 모달
- ✅ 단건 삭제
- ✅ 일괄 삭제 (다중 선택)
- ✅ 반응형 디자인

**UI 구성:**
```
┌─────────────────────────────────────────────────────────┐
│ [관리그룹 관리]                                          │
│  신용평가 대상자 그룹을 관리합니다.                      │
├─────────────────────────────────────────────────────────┤
│ 검색 영역                                                │
│ [관리그룹코드] [관리그룹명] [원청사] [사용여부] [조회]  │
├─────────────────────────────────────────────────────────┤
│ [등록] [선택 삭제 (0)]                   전체 0건      │
│                                                          │
│ [☑] 그룹코드  사용자ID  그룹명  영문명  원청사  사용여부 │
│ [ ] GRP001   admin    테스트   Test    LG...   [사용]  │
│ [ ] GRP002   user01   샘플     Sample  테스트  [사용]  │
│                                         [수정] [삭제]    │
└─────────────────────────────────────────────────────────┘
```

#### 4. 스타일
**파일:** [src/pages/person/PersonGroupPage.css](src/pages/person/PersonGroupPage.css)

- CSS 변수 사용 (테마 호환)
- 반응형 브레이크포인트 적용
- Ant Design 테이블 커스터마이징

### Backend (Stored Procedures)

#### 1. 목록 조회
**파일:** `SP_PERSON_GRP_SELECT.sql`

**파라미터:**
```sql
IN:
  P_PERSON_GRP      -- 관리그룹코드 (LIKE 검색)
  P_PERSON_GRP_NM   -- 관리그룹명 (LIKE 검색)
  P_COMPANY_ID      -- 원청사ID (완전 일치)
  P_USE_YN          -- 사용여부
  P_PAGE            -- 페이지 번호 (0부터 시작)
  P_SIZE            -- 페이지 크기

OUT:
  P_CURSOR          -- 결과 커서
  P_TOTAL_COUNT     -- 전체 건수
```

**조인:**
- `TB_COMPANY`: 원청사명 조회

#### 2. 상세 조회
**파일:** `SP_PERSON_GRP_GET.sql`

**파라미터:**
```sql
IN:
  P_PERSON_GRP      -- 관리그룹코드 (PK)
  P_USER_ID         -- 사용자ID (PK)

OUT:
  P_CURSOR          -- 결과 커서 (단건)
```

#### 3. 등록
**파일:** `SP_PERSON_GRP_INSERT.sql`

**파라미터:**
```sql
IN:
  P_PERSON_GRP      -- 관리그룹코드 (PK, 필수)
  P_USER_ID         -- 사용자ID (PK, 필수)
  P_COMPANY_ID      -- 원청사ID (필수)
  P_PERSON_GRP_NM   -- 관리그룹명 (필수)
  P_PERSON_NM_ENG   -- 영문명 (선택)
  P_USE_YN          -- 사용여부 (기본값: 'Y')
  P_REG_USER_ID     -- 등록자ID

OUT:
  P_RESULT          -- 'SUCCESS' | 'FAIL' | 'ERROR'
  P_MESSAGE         -- 결과 메시지
```

**검증:**
- ✅ 중복 체크 (PERSON_GRP + USER_ID 복합키)
- ✅ 원청사 존재 확인 (FK 검증)

#### 4. 수정
**파일:** `SP_PERSON_GRP_UPDATE.sql`

**파라미터:**
```sql
IN:
  P_PERSON_GRP      -- 관리그룹코드 (PK, 수정 불가)
  P_USER_ID         -- 사용자ID (PK, 수정 불가)
  P_COMPANY_ID      -- 원청사ID
  P_PERSON_GRP_NM   -- 관리그룹명
  P_PERSON_NM_ENG   -- 영문명
  P_USE_YN          -- 사용여부
  P_UPD_USER_ID     -- 수정자ID

OUT:
  P_RESULT          -- 'SUCCESS' | 'FAIL' | 'ERROR'
  P_MESSAGE         -- 결과 메시지
```

**검증:**
- ✅ 존재 여부 확인
- ✅ 원청사 존재 확인

#### 5. 삭제
**파일:** `SP_PERSON_GRP_DELETE.sql`

**파라미터:**
```sql
IN:
  P_PERSON_GRP      -- 관리그룹코드 (PK)
  P_USER_ID         -- 사용자ID (PK)

OUT:
  P_RESULT          -- 'SUCCESS' | 'FAIL' | 'ERROR'
  P_MESSAGE         -- 결과 메시지
```

**검증:**
- ✅ 존재 여부 확인
- ✅ 대상자 연결 여부 확인 (참조 무결성)
  - TB_PERSON에서 해당 관리그룹을 사용 중인 경우 삭제 불가

#### 6. 일괄 삭제
**파일:** `SP_PERSON_GRP_DELETE_BATCH.sql`

**파라미터:**
```sql
IN:
  P_ITEMS           -- "PERSON_GRP:USER_ID,PERSON_GRP:USER_ID,..." 형식

OUT:
  P_RESULT          -- 'SUCCESS' | 'PARTIAL' | 'FAIL' | 'ERROR'
  P_MESSAGE         -- 결과 메시지 (성공/실패 건수)
```

**처리 로직:**
- 쉼표(`,`)로 구분된 항목 파싱
- 각 항목에 대해 참조 무결성 체크
- 삭제 가능한 항목만 삭제
- 성공/실패 건수 집계

## 프로시저 설치

```bash
# Oracle SQL Developer 또는 SQL*Plus에서 실행
sqlplus username/password@database

@SP_PERSON_GRP_SELECT.sql
@SP_PERSON_GRP_GET.sql
@SP_PERSON_GRP_INSERT.sql
@SP_PERSON_GRP_UPDATE.sql
@SP_PERSON_GRP_DELETE.sql
@SP_PERSON_GRP_DELETE_BATCH.sql
```

## 라우팅 설정

**파일:** `src/App.tsx` (또는 라우터 설정 파일)

```tsx
import PersonGroupPage from '@/pages/person/PersonGroupPage';

// 라우트 추가
<Route path="/person/groups" element={<PersonGroupPage />} />
```

## 메뉴 등록

**SQL 파일:** `04_init_menus_관리그룹.sql`

```sql
-- M0100: 대상자 관리 하위에 추가
INSERT INTO TB_SYS_MENU (
    MENU_ID,
    MENU_NM,
    PARENT_MENU_ID,
    MENU_PATH,
    MENU_ICON,
    MENU_ORDER,
    USE_YN,
    REG_USER_ID,
    REG_DT
) VALUES (
    'M0101',
    '관리그룹 관리',
    'M0100',
    '/person/groups',
    'fa-users-cog',
    1,
    'Y',
    'SYSTEM',
    SYSDATE
);
```

## 사용 예시

### 1. 목록 조회
```typescript
const response = await personGroupService.list({
  page: 0,
  size: 20,
  personGrpNm: '테스트',
  useYn: 'Y'
});

if (response.success && response.data) {
  console.log('전체 건수:', response.data.totalCount);
  console.log('데이터:', response.data.content);
}
```

### 2. 등록
```typescript
const newGroup: PersonGroupRequest = {
  personGrp: 'GRP001',
  userId: 'admin',
  companyId: 'C001',
  personGrpNm: '테스트 그룹',
  personNmEng: 'Test Group',
  useYn: 'Y'
};

const response = await personGroupService.create(newGroup);
if (response.success) {
  message.success('등록되었습니다.');
}
```

### 3. 수정
```typescript
const updatedGroup: PersonGroupRequest = {
  personGrp: 'GRP001',
  userId: 'admin',
  companyId: 'C001',
  personGrpNm: '수정된 그룹명',
  personNmEng: 'Modified Group',
  useYn: 'Y'
};

const response = await personGroupService.update('GRP001', 'admin', updatedGroup);
if (response.success) {
  message.success('수정되었습니다.');
}
```

### 4. 삭제
```typescript
const response = await personGroupService.delete('GRP001', 'admin');
if (response.success) {
  message.success('삭제되었습니다.');
} else {
  message.error(response.message);
}
```

## 테이블 스키마 참조

```sql
CREATE TABLE TB_PERSON_GRP (
    PERSON_GRP      VARCHAR2(20)  NOT NULL,   -- 관리그룹 코드
    USER_ID         VARCHAR2(50)  NOT NULL,   -- 사용자 ID
    COMPANY_ID      VARCHAR2(20)  NOT NULL,   -- 원청사 ID
    PERSON_GRP_NM   VARCHAR2(100) NOT NULL,   -- 관리그룹명
    PERSON_NM_ENG   VARCHAR2(200),            -- 영문명
    USE_YN          CHAR(1)       NOT NULL,   -- 사용여부
    REG_USER_ID     VARCHAR2(50)  NOT NULL,   -- 등록자
    REG_DT          DATE          NOT NULL,   -- 등록일시
    UPD_USER_ID     VARCHAR2(50),             -- 수정자
    UPD_DT          DATE,                     -- 수정일시
    CONSTRAINT PK_PERSON_GRP PRIMARY KEY (PERSON_GRP, USER_ID),
    CONSTRAINT FK_PERSON_GRP_COMPANY FOREIGN KEY (COMPANY_ID)
        REFERENCES TB_COMPANY(COMPANY_ID)
);
```

## 향후 개선 사항

### 1. 메시지 코드 적용
- 현재: 하드코딩된 메시지
- 개선: `로지신해_메시지코드_통합.xlsx` 참조하여 메시지 코드 시스템 적용

### 2. 공통 코드 적용
- 현재: 사용여부 직접 입력
- 개선: `로지신해_종합코드_테이블매핑완료.xlsx` 참조하여 공통 코드 관리

### 3. 원청사 선택
- 현재: 텍스트 입력
- 개선: TB_COMPANY 연동하여 Select Box로 선택

### 4. 권한 체크
- 현재: 미구현
- 개선: 사용자 권한에 따른 등록/수정/삭제 제한

### 5. 엑셀 내보내기
- 목록 데이터 Excel 다운로드 기능 추가

## 문제 해결

### 프로시저 실행 오류
```sql
-- 프로시저 에러 확인
SELECT * FROM USER_ERRORS WHERE NAME LIKE 'SP_PERSON_GRP%';

-- 프로시저 존재 확인
SELECT OBJECT_NAME, STATUS FROM USER_OBJECTS
WHERE OBJECT_TYPE = 'PROCEDURE' AND OBJECT_NAME LIKE 'SP_PERSON_GRP%';
```

### API 연동 실패
1. 개발자 도구 Network 탭 확인
2. Backend 로그 확인
3. 토큰 만료 여부 확인 (401 에러)

### 페이지가 표시되지 않음
1. 라우팅 설정 확인
2. 메뉴 경로(`MENU_PATH`) 확인
3. 권한 설정 확인 (`TB_SYS_ROLE_MENU`)

## 관련 문서

- [프로젝트 컨벤션](../../../개발문서/project/LGSH_PROJECT_CONVENTION.md)
- [데이터베이스 스키마](../../../개발문서/project/DATABASE_SCHEMA.md)
- [API 명세서](../../../개발문서/project/로지신해_REST_API명세서_20260113.xlsx)
- [메시지 코드](../../../개발문서/project/로지신해_메시지코드_통합.xlsx)
- [공통 코드](../../../개발문서/project/로지신해_종합코드_테이블매핑완료.xlsx)

## 버전 정보

- **작성일**: 2026-01-20
- **버전**: 1.0.0
- **작성자**: Claude Code
