-- ==========================================================
-- [2026-01-25] 공지사항 기능 통합 배포 스크립트 (DEPLOY_NOTICE_FULL.sql)
-- 실행 순서:
-- 1. 스키마 변경 (컬럼 삭제, ID 타입 변경, 시퀀스 재생성)
-- 2. 시스템 메시지 데이터 병합 (MERGE)
-- 3. Stored Procedure 생성/갱신
-- 
-- 주의: TB_NOTICE 테이블이 TRUNCATE(데이터 초기화) 됩니다.
-- ==========================================================

SET DEFINE OFF;
SET SERVEROUTPUT ON;

PROMPT ======================================================
PROMPT 1. Schema Migration Start
PROMPT ======================================================

DECLARE
    v_count NUMBER;
BEGIN
    -- 1-1. DEL_YN 컬럼 존재 여부 확인 후 삭제
    SELECT COUNT(*) INTO v_count 
    FROM USER_TAB_COLUMNS 
    WHERE TABLE_NAME = 'TB_NOTICE' AND COLUMN_NAME = 'DEL_YN';

    IF v_count > 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE TB_NOTICE DROP COLUMN DEL_YN';
        DBMS_OUTPUT.PUT_LINE('Column DEL_YN dropped.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('Column DEL_YN does not exist. Skipping.');
    END IF;

    -- 1-2. 데이터 초기화 (ID 타입 변경을 위해 필수)
    EXECUTE IMMEDIATE 'TRUNCATE TABLE TB_NOTICE';
    DBMS_OUTPUT.PUT_LINE('Table TB_NOTICE truncated.');

    -- 1-3. ID 컬럼 타입 변경 (VARCHAR2 -> NUMBER)
    -- 이미 NUMBER인지 체크하지 않고 수행 (TRUNCATE 후라 안전)
    EXECUTE IMMEDIATE 'ALTER TABLE TB_NOTICE MODIFY NOTICE_ID NUMBER';
    DBMS_OUTPUT.PUT_LINE('Column NOTICE_ID modified to NUMBER.');

EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Schema Migration Error: ' || SQLERRM);
        RAISE;
END;
/

-- 1-4. 시퀀스 재생성
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM USER_SEQUENCES 
    WHERE SEQUENCE_NAME = 'SEQ_NOTICE_ID';

    IF v_count > 0 THEN
        EXECUTE IMMEDIATE 'DROP SEQUENCE SEQ_NOTICE_ID';
        DBMS_OUTPUT.PUT_LINE('Existing Sequence SEQ_NOTICE_ID dropped.');
    END IF;

    EXECUTE IMMEDIATE 'CREATE SEQUENCE SEQ_NOTICE_ID START WITH 1 INCREMENT BY 1 NOCACHE';
    DBMS_OUTPUT.PUT_LINE('Sequence SEQ_NOTICE_ID created.');
END;
/

PROMPT ======================================================
PROMPT 2. System Message Data Merge
PROMPT ======================================================

MERGE INTO TB_SYS_MESSAGE T
USING (
    -- 1. 공통 (CMN)
    SELECT 'ERR_CMN_000' AS MSG_CODE, 'KO' AS LANG_CODE, 'ERROR' AS MSG_TYPE, 'COMMON' AS MSG_CATEGORY, '서버 오류' AS MSG_TITLE, '서버 내부 오류가 발생했습니다.' AS MSG_DESC, 'Y' AS USE_YN FROM DUAL UNION ALL
    SELECT 'ERR_CMN_001', 'KO', 'ERROR', 'COMMON', '입력값 오류', '올바르지 않은 입력값입니다.', 'Y' FROM DUAL UNION ALL
    
    -- 7. 원청사 (COMPANY)
    SELECT 'ERR_COMPANY_001', 'KO', 'ERROR', 'COMPANY', '원청사 오류', '원청사를 찾을 수 없습니다.', 'Y' FROM DUAL UNION ALL
    -- ... (중략) ... 
    
    -- 9. 공지사항 (NOTICE) - NEW
    SELECT 'ERR_NOT_001', 'KO', 'ERROR', 'NOTICE', '공지사항 오류', '공지사항 등록에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_NOT_002', 'KO', 'ERROR', 'NOTICE', '공지사항 오류', '공지사항 수정에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_NOT_003', 'KO', 'ERROR', 'NOTICE', '공지사항 오류', '공지사항 삭제에 실패했습니다.', 'Y' FROM DUAL
) S
ON (T.MSG_CODE = S.MSG_CODE)
WHEN MATCHED THEN
    UPDATE SET 
        T.MSG_TEXT = S.MSG_DESC,
        T.MSG_DESC = S.MSG_DESC,
        T.MSG_TITLE = S.MSG_TITLE,
        T.MSG_CATEGORY = S.MSG_CATEGORY,
        T.UPD_DT = SYSDATE,
        T.UPD_USER_ID = 'SYSTEM'
WHEN NOT MATCHED THEN
    INSERT (MSG_CODE, LANG_CODE, MSG_TYPE, MSG_CATEGORY, MSG_TITLE, MSG_DESC, USE_YN, REG_USER_ID, REG_DT, UPD_USER_ID, UPD_DT, MSG_TEXT)
    VALUES (S.MSG_CODE, S.LANG_CODE, S.MSG_TYPE, S.MSG_CATEGORY, S.MSG_TITLE, S.MSG_DESC, S.USE_YN, 'SYSTEM', SYSDATE, 'SYSTEM', SYSDATE, S.MSG_DESC);

COMMIT;

PROMPT Data Merge Completed.

PROMPT ======================================================
PROMPT 3. Stored Procedures
PROMPT ======================================================

-- 1. SP_NOTICE_GET_LIST
CREATE OR REPLACE PROCEDURE SP_NOTICE_GET_LIST(
    P_KEYWORD       IN  VARCHAR2 DEFAULT NULL,
    P_LEVEL         IN  VARCHAR2 DEFAULT NULL,
    P_PAGE          IN  NUMBER DEFAULT 1,
    P_SIZE          IN  NUMBER DEFAULT 10,
    P_RESULT        OUT SYS_REFCURSOR,
    P_TOTAL_COUNT   OUT NUMBER
)
AS
    V_OFFSET NUMBER;
BEGIN
    V_OFFSET := (P_PAGE - 1) * P_SIZE;
    
    SELECT COUNT(*)
    INTO P_TOTAL_COUNT
    FROM TB_NOTICE
    WHERE USE_YN = 'Y'
      AND (P_KEYWORD IS NULL OR TITLE LIKE '%' || P_KEYWORD || '%' OR CONTENT LIKE '%' || P_KEYWORD || '%')
      AND (P_LEVEL IS NULL OR LVL = P_LEVEL);
    
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

-- 2. SP_NOTICE_GET_DETAIL
CREATE OR REPLACE PROCEDURE SP_NOTICE_GET_DETAIL(
    P_NOTICE_ID     IN  NUMBER,
    P_RESULT        OUT SYS_REFCURSOR
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

-- 3. SP_NOTICE_INCREMENT_VIEW
CREATE OR REPLACE PROCEDURE SP_NOTICE_INCREMENT_VIEW(
    P_NOTICE_ID     IN  NUMBER
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

-- 4. SP_NOTICE_CREATE
CREATE OR REPLACE PROCEDURE SP_NOTICE_CREATE(
    P_TITLE         IN  VARCHAR2,
    P_CONTENT       IN  CLOB,
    P_LVL           IN  VARCHAR2,
    P_PIN_YN        IN  CHAR,
    P_USE_YN        IN  CHAR,
    P_START_DT      IN  VARCHAR2,
    P_END_DT        IN  VARCHAR2,
    P_REG_USER_ID   IN  VARCHAR2,
    P_NOTICE_ID     OUT NUMBER,
    P_RESULT_CODE   OUT VARCHAR2,
    P_RESULT_MSG    OUT VARCHAR2
)
AS
    V_NOTICE_ID NUMBER;
BEGIN
    SELECT SEQ_NOTICE_ID.NEXTVAL INTO V_NOTICE_ID FROM DUAL;
    
    INSERT INTO TB_NOTICE (
        NOTICE_ID, TITLE, CONTENT, LVL, PIN_YN, USE_YN, START_DT, END_DT, VIEW_CNT, REG_USER_ID, REG_DT, UPD_USER_ID, UPD_DT
    ) VALUES (
        V_NOTICE_ID, P_TITLE, P_CONTENT, P_LVL, 
        NVL(P_PIN_YN, 'N'), NVL(P_USE_YN, 'Y'), 
        TO_DATE(P_START_DT, 'YYYYMMDD'), TO_DATE(P_END_DT, 'YYYYMMDD'), 0, 
        P_REG_USER_ID, SYSDATE, P_REG_USER_ID, SYSDATE
    );
    COMMIT;
    
    P_NOTICE_ID := V_NOTICE_ID;
    P_RESULT_CODE := 'SUCCESS';
    P_RESULT_MSG := '공지사항이 등록되었습니다.';
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := 'ERROR';
        P_RESULT_MSG := '등록 오류: ' || SQLERRM;
END SP_NOTICE_CREATE;
/

-- 5. SP_NOTICE_UPDATE
CREATE OR REPLACE PROCEDURE SP_NOTICE_UPDATE(
    P_NOTICE_ID     IN  NUMBER,
    P_TITLE         IN  VARCHAR2,
    P_CONTENT       IN  CLOB,
    P_LVL           IN  VARCHAR2,
    P_PIN_YN        IN  CHAR,
    P_USE_YN        IN  CHAR,
    P_START_DT      IN  VARCHAR2,
    P_END_DT        IN  VARCHAR2,
    P_UPD_USER_ID   IN  VARCHAR2,
    P_RESULT_CODE   OUT VARCHAR2,
    P_RESULT_MSG    OUT VARCHAR2
)
AS
    V_COUNT NUMBER;
BEGIN
    SELECT COUNT(*) INTO V_COUNT FROM TB_NOTICE WHERE NOTICE_ID = P_NOTICE_ID;
    IF V_COUNT = 0 THEN
        P_RESULT_CODE := 'ERROR';
        P_RESULT_MSG := '존재하지 않는 공지사항입니다.';
        RETURN;
    END IF;
    
    UPDATE TB_NOTICE
    SET TITLE = P_TITLE, CONTENT = P_CONTENT, LVL = P_LVL, PIN_YN = P_PIN_YN, USE_YN = P_USE_YN,
        START_DT = TO_DATE(P_START_DT, 'YYYYMMDD'), END_DT = TO_DATE(P_END_DT, 'YYYYMMDD'),
        UPD_USER_ID = P_UPD_USER_ID, UPD_DT = SYSDATE
    WHERE NOTICE_ID = P_NOTICE_ID;
    COMMIT;
    
    P_RESULT_CODE := 'SUCCESS';
    P_RESULT_MSG := '수정되었습니다.';
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := 'ERROR';
        P_RESULT_MSG := '수정 오류: ' || SQLERRM;
END SP_NOTICE_UPDATE;
/

-- 6. SP_NOTICE_DELETE
CREATE OR REPLACE PROCEDURE SP_NOTICE_DELETE(
    P_NOTICE_ID     IN  NUMBER,
    P_RESULT_CODE   OUT VARCHAR2,
    P_RESULT_MSG    OUT VARCHAR2
)
AS
    V_COUNT NUMBER;
BEGIN
    SELECT COUNT(*) INTO V_COUNT FROM TB_NOTICE WHERE NOTICE_ID = P_NOTICE_ID;
    IF V_COUNT = 0 THEN
        P_RESULT_CODE := 'ERROR';
        P_RESULT_MSG := '존재하지 않는 공지사항입니다.';
        RETURN;
    END IF;
    
    DELETE FROM TB_NOTICE WHERE NOTICE_ID = P_NOTICE_ID;
    COMMIT;
    
    P_RESULT_CODE := 'SUCCESS';
    P_RESULT_MSG := '삭제되었습니다.';
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := 'ERROR';
        P_RESULT_MSG := '삭제 오류: ' || SQLERRM;
END SP_NOTICE_DELETE;
/

PROMPT All Deployment Steps Completed.
