-- =============================================
-- 공지사항 관리 Stored Procedures
-- TB_NOTICE 테이블 CRUD
-- [2026-01-23] NOTICE_ID TYPE 변경 (VARCHAR2 -> NUMBER)
-- =============================================

-- =============================================
-- 1. 공지사항 목록 조회 (SP_NOTICE_GET_LIST)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_NOTICE_GET_LIST(
    P_KEYWORD       IN  VARCHAR2 DEFAULT NULL,      -- 검색어 (제목/내용 LIKE 검색)
    P_LEVEL         IN  VARCHAR2 DEFAULT NULL,      -- 중요도 ('1','2','3')
    P_PAGE          IN  NUMBER DEFAULT 1,           -- 페이지 번호 (1-based)
    P_SIZE          IN  NUMBER DEFAULT 10,          -- 페이지 크기
    P_RESULT        OUT SYS_REFCURSOR,              -- 결과 커서
    P_TOTAL_COUNT   OUT NUMBER                      -- 전체 개수
)
AS
    V_OFFSET NUMBER;
BEGIN
    -- 페이지 오프셋 계산 (1-based to 0-based)
    V_OFFSET := (P_PAGE - 1) * P_SIZE;
    
    -- 전체 개수 조회
    SELECT COUNT(*)
    INTO P_TOTAL_COUNT
    FROM TB_NOTICE
    WHERE USE_YN = 'Y'
      AND (P_KEYWORD IS NULL OR TITLE LIKE '%' || P_KEYWORD || '%' OR CONTENT LIKE '%' || P_KEYWORD || '%')
      AND (P_LEVEL IS NULL OR LVL = P_LEVEL);
    
    -- 목록 조회
    OPEN P_RESULT FOR
        SELECT
            NOTICE_ID,
            TITLE,
            CONTENT,
            LVL,
            PIN_YN,
            USE_YN,
            TO_CHAR(START_DT, 'YYYYMMDD') AS START_DT,
            TO_CHAR(END_DT, 'YYYYMMDD') AS END_DT,
            VIEW_CNT,
            REG_USER_ID,
            TO_CHAR(REG_DT, 'YYYY-MM-DD HH24:MI:SS') AS REG_DT,
            UPD_USER_ID,
            TO_CHAR(UPD_DT, 'YYYY-MM-DD HH24:MI:SS') AS UPD_DT
        FROM (
            SELECT
                NOTICE_ID,
                TITLE,
                CONTENT,
                LVL,
                PIN_YN,
                USE_YN,
                START_DT,
                END_DT,
                VIEW_CNT,
                REG_USER_ID,
                REG_DT,
                UPD_USER_ID,
                UPD_DT,
                ROW_NUMBER() OVER (ORDER BY PIN_YN DESC, NOTICE_ID DESC) AS RN
            FROM TB_NOTICE
            WHERE USE_YN = 'Y'
              AND (P_KEYWORD IS NULL OR TITLE LIKE '%' || P_KEYWORD || '%' OR CONTENT LIKE '%' || P_KEYWORD || '%')
              AND (P_LEVEL IS NULL OR LVL = P_LEVEL)
        )
        WHERE RN > V_OFFSET
          AND RN <= V_OFFSET + P_SIZE
        ORDER BY RN;
        
END SP_NOTICE_GET_LIST;
/

-- =============================================
-- 2. 공지사항 상세 조회 (SP_NOTICE_GET_DETAIL)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_NOTICE_GET_DETAIL(
    P_NOTICE_ID     IN  NUMBER,                     -- 공지사항ID (NUMBER)
    P_RESULT        OUT SYS_REFCURSOR               -- 결과 커서
)
AS
BEGIN
    OPEN P_RESULT FOR
        SELECT
            NOTICE_ID,
            TITLE,
            CONTENT,
            LVL,
            PIN_YN,
            USE_YN,
            TO_CHAR(START_DT, 'YYYYMMDD') AS START_DT,
            TO_CHAR(END_DT, 'YYYYMMDD') AS END_DT,
            VIEW_CNT,
            REG_USER_ID,
            TO_CHAR(REG_DT, 'YYYY-MM-DD HH24:MI:SS') AS REG_DT,
            UPD_USER_ID,
            TO_CHAR(UPD_DT, 'YYYY-MM-DD HH24:MI:SS') AS UPD_DT
        FROM TB_NOTICE
        WHERE NOTICE_ID = P_NOTICE_ID;
          
END SP_NOTICE_GET_DETAIL;
/

-- =============================================
-- 3. 조회수 증가 (SP_NOTICE_INCREMENT_VIEW)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_NOTICE_INCREMENT_VIEW(
    P_NOTICE_ID     IN  NUMBER                      -- 공지사항ID (NUMBER)
)
AS
BEGIN
    UPDATE TB_NOTICE
    SET VIEW_CNT = NVL(VIEW_CNT, 0) + 1,
        UPD_DT = SYSDATE
    WHERE NOTICE_ID = P_NOTICE_ID;
      
    COMMIT;
    
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
END SP_NOTICE_INCREMENT_VIEW;
/

-- =============================================
-- 4. 공지사항 등록 (SP_NOTICE_CREATE)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_NOTICE_CREATE(
    P_TITLE         IN  VARCHAR2,                   -- 제목
    P_CONTENT       IN  CLOB,                       -- 내용
    P_LVL           IN  VARCHAR2,                   -- 중요도 ('1','2','3')
    P_PIN_YN        IN  CHAR,                       -- 상단고정 여부
    P_USE_YN        IN  CHAR,                       -- 사용 여부
    P_START_DT      IN  VARCHAR2,                   -- 시작일 (YYYYMMDD)
    P_END_DT        IN  VARCHAR2,                   -- 종료일 (YYYYMMDD)
    P_REG_USER_ID   IN  VARCHAR2,                   -- 등록자ID
    P_NOTICE_ID     OUT NUMBER,                     -- 생성된 공지사항ID (NUMBER)
    P_RESULT_CODE   OUT VARCHAR2,                   -- 결과코드 ('SUCCESS', 'ERROR')
    P_RESULT_MSG    OUT VARCHAR2                    -- 결과메시지
)
AS
    V_NOTICE_ID NUMBER;
BEGIN
    -- 공지사항ID 생성 (시퀀스 사용 - 단순 숫자)
    SELECT SEQ_NOTICE_ID.NEXTVAL
    INTO V_NOTICE_ID
    FROM DUAL;
    
    -- 등록
    INSERT INTO TB_NOTICE (
        NOTICE_ID,
        TITLE,
        CONTENT,
        LVL,
        PIN_YN,
        USE_YN,
        START_DT,
        END_DT,
        VIEW_CNT,
        REG_USER_ID,
        REG_DT,
        UPD_USER_ID,
        UPD_DT
    ) VALUES (
        V_NOTICE_ID,
        P_TITLE,
        P_CONTENT,
        P_LVL,
        NVL(P_PIN_YN, 'N'),
        NVL(P_USE_YN, 'Y'),
        TO_DATE(P_START_DT, 'YYYYMMDD'),
        TO_DATE(P_END_DT, 'YYYYMMDD'),
        0,
        P_REG_USER_ID,
        SYSDATE,
        P_REG_USER_ID,
        SYSDATE
    );
    
    COMMIT;
    
    P_NOTICE_ID := V_NOTICE_ID;
    P_RESULT_CODE := 'SUCCESS';
    P_RESULT_MSG := '공지사항이 등록되었습니다.';
    
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := 'ERROR';
        P_RESULT_MSG := '공지사항 등록 중 오류가 발생했습니다: ' || SQLERRM;
END SP_NOTICE_CREATE;
/

-- =============================================
-- 5. 공지사항 수정 (SP_NOTICE_UPDATE)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_NOTICE_UPDATE(
    P_NOTICE_ID     IN  NUMBER,                     -- 공지사항ID (NUMBER)
    P_TITLE         IN  VARCHAR2,                   -- 제목
    P_CONTENT       IN  CLOB,                       -- 내용
    P_LVL           IN  VARCHAR2,                   -- 중요도
    P_PIN_YN        IN  CHAR,                       -- 상단고정 여부
    P_USE_YN        IN  CHAR,                       -- 사용 여부
    P_START_DT      IN  VARCHAR2,                   -- 시작일 (YYYYMMDD)
    P_END_DT        IN  VARCHAR2,                   -- 종료일 (YYYYMMDD)
    P_UPD_USER_ID   IN  VARCHAR2,                   -- 수정자ID
    P_RESULT_CODE   OUT VARCHAR2,                   -- 결과코드
    P_RESULT_MSG    OUT VARCHAR2                    -- 결과메시지
)
AS
    V_COUNT NUMBER;
BEGIN
    -- 존재 체크
    SELECT COUNT(*) INTO V_COUNT
    FROM TB_NOTICE
    WHERE NOTICE_ID = P_NOTICE_ID;
      
    IF V_COUNT = 0 THEN
        P_RESULT_CODE := 'ERROR';
        P_RESULT_MSG := '존재하지 않는 공지사항입니다.';
        RETURN;
    END IF;
    
    -- 수정
    UPDATE TB_NOTICE
    SET TITLE = P_TITLE,
        CONTENT = P_CONTENT,
        LVL = P_LVL,
        PIN_YN = P_PIN_YN,
        USE_YN = P_USE_YN,
        START_DT = TO_DATE(P_START_DT, 'YYYYMMDD'),
        END_DT = TO_DATE(P_END_DT, 'YYYYMMDD'),
        UPD_USER_ID = P_UPD_USER_ID,
        UPD_DT = SYSDATE
    WHERE NOTICE_ID = P_NOTICE_ID;
      
    COMMIT;
    
    P_RESULT_CODE := 'SUCCESS';
    P_RESULT_MSG := '공지사항이 수정되었습니다.';
    
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := 'ERROR';
        P_RESULT_MSG := '공지사항 수정 중 오류가 발생했습니다: ' || SQLERRM;
END SP_NOTICE_UPDATE;
/

-- =============================================
-- 6. 공지사항 삭제 (SP_NOTICE_DELETE)
-- - 물리적 삭제 (DELETE FROM ...)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_NOTICE_DELETE(
    P_NOTICE_ID     IN  NUMBER,                     -- 공지사항ID (NUMBER)
    P_RESULT_CODE   OUT VARCHAR2,                   -- 결과코드
    P_RESULT_MSG    OUT VARCHAR2                    -- 결과메시지
)
AS
    V_COUNT NUMBER;
BEGIN
    -- 존재 체크
    SELECT COUNT(*) INTO V_COUNT
    FROM TB_NOTICE
    WHERE NOTICE_ID = P_NOTICE_ID;
      
    IF V_COUNT = 0 THEN
        P_RESULT_CODE := 'ERROR';
        P_RESULT_MSG := '존재하지 않는 공지사항입니다.';
        RETURN;
    END IF;
    
    -- 물리적 삭제
    DELETE FROM TB_NOTICE
    WHERE NOTICE_ID = P_NOTICE_ID;
    
    COMMIT;
    
    P_RESULT_CODE := 'SUCCESS';
    P_RESULT_MSG := '공지사항이 삭제되었습니다.';
    
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := 'ERROR';
        P_RESULT_MSG := '공지사항 삭제 중 오류가 발생했습니다: ' || SQLERRM;
END SP_NOTICE_DELETE;
/
