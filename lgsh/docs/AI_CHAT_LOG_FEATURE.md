# AI 채팅 로그 조회 기능

## 개요
사용자가 자신의 AI 챗봇 질문/답변 기록을 조회할 수 있는 기능입니다.

- **메뉴 위치**: AI 어시스턴트 > AI 채팅 로그
- **메뉴 ID**: M0902
- **URL**: `/ai/chatlogs`

## 화면 구성

```
┌─────────────────────────────────────────────────────────────────┐
│  AI 채팅 로그                                                    │
│  내가 질문한 AI 채팅 기록을 조회합니다.                           │
├─────────────────────────────────────────────────────────────────┤
│  [대화ID] [유형 ▼] [상태 ▼] [기간 📅] [조회] [초기화]            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │ 채팅 로그 (목록)         │  │ 대화 내용 (상세)             │   │
│  ├─────────────────────────┤  ├─────────────────────────────┤   │
│  │ 질문내용 | 유형 | 상태   │  │ 👤 나                        │   │
│  │─────────────────────────│  │ ┌─────────────────────────┐ │   │
│  │ 신용점수가... | 신용평가 │  │ │ 신용점수가 낮은 이유?   │ │   │
│  │ 대상자 정보... | 대상자  │  │ └─────────────────────────┘ │   │
│  │ ...                     │  │                              │   │
│  │                         │  │ 🤖 AI 어시스턴트             │   │
│  │                         │  │ ┌─────────────────────────┐ │   │
│  │                         │  │ │ 신용점수가 낮은 주요... │ │   │
│  │                         │  │ └─────────────────────────┘ │   │
│  └─────────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 파일 구조

### Frontend

| 파일 경로 | 설명 |
|----------|------|
| `src/types/aiChatLog.ts` | 타입 정의 (AiChatLog, AiChatLogDetail, AiChatLogSearchParams) |
| `src/services/aiChatLogService.ts` | API 서비스 (list, get, getConversation, delete) |
| `src/pages/ai/AiChatLogPage.tsx` | 메인 페이지 컴포넌트 |
| `src/pages/ai/AiChatLogPage.css` | 스타일시트 |
| `src/routes/index.tsx` | 라우트 등록 (path: 'ai/chatlogs', menuId: 'M0902') |
| `src/services/index.ts` | 서비스 export 추가 |
| `src/types/index.ts` | 타입 export 추가 |

### Backend

| 파일 경로 | 설명 |
|----------|------|
| `src/main/java/.../aichat/mapper/AiChatMapper.java` | Mapper 인터페이스 (메서드 추가) |
| `src/main/resources/mapper/aichat/AiChatMapper.xml` | Mapper XML (SP 호출 정의) |
| `src/main/java/.../aichat/service/AiChatService.java` | 서비스 (메서드 추가) |
| `src/main/java/.../aichat/controller/AiChatLogController.java` | REST 컨트롤러 (신규) |

### SQL 스크립트

| 파일 경로 | 설명 |
|----------|------|
| `sql/ai/01_SP_AI_CHAT_LOG.sql` | 저장 프로시저 3개 |
| `sql/ai/02_MENU_AI_CHAT_LOG.sql` | 메뉴 및 권한 등록 |

## API 엔드포인트

### 채팅 로그 목록 조회
```
GET /api/v1/ai/chatlogs
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| conversationId | string | N | 대화 ID |
| questionType | string | N | 질문 유형 (CREDIT, PERSON, GENERAL) |
| status | string | N | 상태 (SUCCESS, ERROR) |
| startDate | string | N | 시작일 (YYYY-MM-DD) |
| endDate | string | N | 종료일 (YYYY-MM-DD) |
| page | number | N | 페이지 번호 (기본값: 0) |
| size | number | N | 페이지 크기 (기본값: 20) |

**Response:**
```json
{
  "success": true,
  "code": "SUC_AI_LOG_001",
  "message": "채팅 로그를 조회했습니다.",
  "data": {
    "content": [
      {
        "messageId": "MSG_xxx",
        "conversationId": "CONV_xxx",
        "userId": "user01",
        "question": "신용점수가 낮은 이유가 무엇인가요?",
        "answer": "신용점수가 낮은 주요 원인은...",
        "questionType": "CREDIT",
        "status": "SUCCESS",
        "responseTimeMs": 1234,
        "regDt": "2026-02-06T10:30:00"
      }
    ],
    "totalCount": 100
  }
}
```

### 채팅 로그 상세 조회
```
GET /api/v1/ai/chatlogs/{messageId}
```

### 대화 메시지 조회
```
GET /api/v1/ai/chatlogs/conversation/{conversationId}
```

### 대화 삭제
```
DELETE /api/v1/ai/chatlogs/conversation/{conversationId}
```

## 저장 프로시저

### SP_AI_GET_CHAT_LOGS
채팅 로그 목록을 페이징하여 조회합니다.

```sql
SP_AI_GET_CHAT_LOGS(
    p_user_id         IN  VARCHAR2,
    p_conversation_id IN  VARCHAR2 DEFAULT NULL,
    p_question_type   IN  VARCHAR2 DEFAULT NULL,
    p_status          IN  VARCHAR2 DEFAULT NULL,
    p_start_date      IN  VARCHAR2 DEFAULT NULL,
    p_end_date        IN  VARCHAR2 DEFAULT NULL,
    p_page            IN  NUMBER DEFAULT 0,
    p_page_size       IN  NUMBER DEFAULT 20,
    p_result          OUT SYS_REFCURSOR,
    p_total_count     OUT NUMBER,
    p_result_code     OUT VARCHAR2,
    p_result_msg      OUT VARCHAR2
)
```

### SP_AI_GET_CHAT_LOG_DETAIL
특정 메시지의 상세 정보를 조회합니다.

### SP_AI_GET_CONVERSATION_MESSAGES
대화 내 모든 메시지를 시간순으로 조회합니다.

## 테이블 구조

**TB_AI_CHAT_LOG**

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| MESSAGE_ID | VARCHAR2(36) | NOT NULL | 메시지 ID (PK) |
| CONVERSATION_ID | VARCHAR2(36) | NOT NULL | 대화 세션 ID |
| USER_ID | VARCHAR2(50) | NOT NULL | 사용자 ID |
| COMPANY_ID | VARCHAR2(50) | | 회사 ID |
| PERSON_ID | VARCHAR2(50) | | 대상자 ID |
| QUESTION | CLOB | NOT NULL | 질문 내용 |
| ANSWER | CLOB | | 답변 내용 |
| QUESTION_TYPE | VARCHAR2(20) | | 질문 유형 |
| RESPONSE_TIME_MS | NUMBER(10) | | 응답 시간 (ms) |
| TOKEN_COUNT | NUMBER(10) | | 토큰 사용량 |
| MODEL_ID | VARCHAR2(50) | | AI 모델 ID |
| STATUS | VARCHAR2(20) | | 상태 |
| ERROR_CODE | VARCHAR2(20) | | 에러 코드 |
| ERROR_MESSAGE | VARCHAR2(500) | | 에러 메시지 |
| CONTEXT_DATA | CLOB | | 컨텍스트 데이터 (JSON) |
| REG_USER_ID | VARCHAR2(50) | | 등록자 ID |
| REG_DT | TIMESTAMP(6) | | 등록일시 |
| UPD_USER_ID | VARCHAR2(50) | | 수정자 ID |
| UPD_DT | TIMESTAMP(6) | | 수정일시 |

## 배포 순서

### 1. SQL 실행 (Oracle DB)
```sql
-- 저장 프로시저 생성
@lgsh-backend-api/lgsh/sql/ai/01_SP_AI_CHAT_LOG.sql

-- 메뉴 등록
@lgsh-backend-api/lgsh/sql/ai/02_MENU_AI_CHAT_LOG.sql
```

### 2. 백엔드 재시작
```bash
cd lgsh-backend-api/lgsh
./gradlew bootRun
```

### 3. 프론트엔드 빌드
```bash
cd lgsh-frontend/lgsh
npm run build
# 또는 개발 모드
npm run dev
```

## 권한

모든 역할(ADMIN, MANAGER, ANALYST, USER, VIEWER)에게 읽기 권한이 부여됩니다.
사용자는 자신의 채팅 로그만 조회할 수 있습니다.

| 역할 | 읽기 | 쓰기 | 삭제 |
|------|------|------|------|
| ADMIN | O | O | O |
| MANAGER | O | O | X |
| ANALYST | O | X | X |
| USER | O | X | X |
| VIEWER | O | X | X |

## 디자인 참조

사용자목록 페이지(`UserPage.tsx`)의 디자인 패턴을 참조하여 구현:
- 페이지 헤더 스타일
- 검색 카드 레이아웃
- 테이블 스타일
- 다크모드 지원
