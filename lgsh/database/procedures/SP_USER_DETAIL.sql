-- =============================================
-- 사용자 상세 정보 조회 Stored Procedures
-- TB_USER, TB_USER_LOGIN_HIST 테이블
-- =============================================
-- TB_USER_LOGIN_HIST 테이블 구조:
--   LOGIN_SEQ (PK), USER_ID, LOGIN_DT, LOGIN_IP, LOGIN_RESULT (SUCCESS/FAILED),
--   FAIL_REASON, USER_AGENT, SESSION_ID, REG_USER_ID, REG_DT, UPD_USER_ID, UPD_DT
-- =============================================

-- =============================================
-- 1. 사용자 상세 정보 조회 (SP_USER_GET_DETAIL)
--    - 기본 정보 + 회사/역할 JOIN
-- =============================================
CREATE OR REPLACE PROCEDURE SP_USER_GET_DETAIL(
    P_USER_ID       IN  VARCHAR2,                   -- 사용자ID
    P_USER_INFO     OUT SYS_REFCURSOR,              -- 사용자 정보
    P_ACTIVITY_LOG  OUT SYS_REFCURSOR,              -- 활동 로그 (최근 50건)
    P_RESULT_CODE   OUT VARCHAR2                    -- 결과 코드
)
AS
    V_COUNT NUMBER;
BEGIN
    -- 존재 체크
    SELECT COUNT(*) INTO V_COUNT
    FROM TB_USER
    WHERE USER_ID = P_USER_ID;

    IF V_COUNT = 0 THEN
        P_RESULT_CODE := 'ERR_USER_005';  -- 존재하지 않는 사용자
        RETURN;
    END IF;

    -- 사용자 기본 정보 조회 (날짜는 DATE 타입 그대로 반환)
    OPEN P_USER_INFO FOR
        SELECT
            U.USER_ID,
            U.USER_NM,
            U.EMAIL,
            U.TEL_NO,
            U.COMPANY_ID,
            C.COMPANY_NM,
            U.ROLE_ID,
            R.ROLE_NM,
            U.USE_YN,
            U.ACCOUNT_LOCK_YN,
            U.FAIL_LOGIN_CNT,
            U.LAST_LOGIN_DT,
            U.PWD_CHANGE_DT,
            U.PWD_EXPIRE_DT,
            U.REG_USER_ID,
            U.REG_DT,
            U.UPD_USER_ID,
            U.UPD_DT
        FROM TB_USER U
        LEFT JOIN TB_COMPANY C ON U.COMPANY_ID = C.COMPANY_ID
        LEFT JOIN TB_SYS_ROLE R ON U.ROLE_ID = R.ROLE_ID
        WHERE U.USER_ID = P_USER_ID;

    -- 활동 로그 조회 (최근 50건)
    OPEN P_ACTIVITY_LOG FOR
        SELECT *
        FROM (
            SELECT
                LOGIN_SEQ,
                USER_ID,
                TO_CHAR(LOGIN_DT, 'YYYY-MM-DD HH24:MI:SS') AS LOGIN_DT,
                LOGIN_IP,
                LOGIN_RESULT,
                FAIL_REASON,
                USER_AGENT,
                SESSION_ID
            FROM TB_USER_LOGIN_HIST
            WHERE USER_ID = P_USER_ID
            ORDER BY LOGIN_DT DESC
        )
        WHERE ROWNUM <= 50;

    P_RESULT_CODE := 'SUCCESS';

EXCEPTION
    WHEN OTHERS THEN
        P_RESULT_CODE := 'ERR_SYSTEM';
END SP_USER_GET_DETAIL;
/


-- =============================================
-- 2. 로그인 이력 조회 (SP_SELECT_USER_LOGIN_HIST)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_SELECT_USER_LOGIN_HIST(
    P_USER_ID       IN  VARCHAR2,                   -- 사용자ID
    P_LIMIT         IN  NUMBER DEFAULT 50,          -- 조회 건수
    P_RESULT        OUT SYS_REFCURSOR               -- 결과 커서
)
AS
BEGIN
    OPEN P_RESULT FOR
        SELECT *
        FROM (
            SELECT
                LOGIN_SEQ,
                USER_ID,
                TO_CHAR(LOGIN_DT, 'YYYY-MM-DD HH24:MI:SS') AS LOGIN_DT,
                LOGIN_IP,
                LOGIN_RESULT,
                FAIL_REASON,
                USER_AGENT,
                SESSION_ID
            FROM TB_USER_LOGIN_HIST
            WHERE USER_ID = P_USER_ID
            ORDER BY LOGIN_DT DESC
        )
        WHERE ROWNUM <= P_LIMIT;

END SP_SELECT_USER_LOGIN_HIST;
/


-- =============================================
-- 3. 로그인 이력 등록 (SP_INSERT_USER_LOGIN_HIST)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_INSERT_USER_LOGIN_HIST(
    P_USER_ID       IN  VARCHAR2,                   -- 사용자ID
    P_LOGIN_RESULT  IN  VARCHAR2,                   -- 로그인 결과 (SUCCESS/FAILED)
    P_FAIL_REASON   IN  VARCHAR2 DEFAULT NULL,      -- 실패 사유
    P_LOGIN_IP      IN  VARCHAR2 DEFAULT NULL,      -- 접속 IP
    P_USER_AGENT    IN  VARCHAR2 DEFAULT NULL,      -- User-Agent
    P_SESSION_ID    IN  VARCHAR2 DEFAULT NULL,      -- 세션 ID
    P_RESULT_CODE   OUT NUMBER                      -- 결과 코드 (0: 성공)
)
AS
BEGIN
    INSERT INTO TB_USER_LOGIN_HIST (
        LOGIN_SEQ,
        USER_ID,
        LOGIN_DT,
        LOGIN_IP,
        LOGIN_RESULT,
        FAIL_REASON,
        USER_AGENT,
        SESSION_ID,
        REG_USER_ID,
        REG_DT,
        UPD_USER_ID,
        UPD_DT
    ) VALUES (
        SEQ_USER_LOGIN_HIST.NEXTVAL,
        P_USER_ID,
        SYSDATE,
        P_LOGIN_IP,
        P_LOGIN_RESULT,
        P_FAIL_REASON,
        P_USER_AGENT,
        P_SESSION_ID,
        P_USER_ID,
        SYSDATE,
        P_USER_ID,
        SYSDATE
    );

    -- 로그인 성공 시 최종 로그인 일시 업데이트
    IF P_LOGIN_RESULT = 'SUCCESS' THEN
        UPDATE TB_USER
        SET LAST_LOGIN_DT = SYSDATE,
            FAIL_LOGIN_CNT = 0
        WHERE USER_ID = P_USER_ID;
    ELSE
        -- 로그인 실패 시 실패 횟수 증가
        UPDATE TB_USER
        SET FAIL_LOGIN_CNT = NVL(FAIL_LOGIN_CNT, 0) + 1,
            -- 5회 이상 실패 시 계정 잠금
            ACCOUNT_LOCK_YN = CASE WHEN NVL(FAIL_LOGIN_CNT, 0) + 1 >= 5 THEN 'Y' ELSE ACCOUNT_LOCK_YN END
        WHERE USER_ID = P_USER_ID;
    END IF;

    COMMIT;
    P_RESULT_CODE := 0;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := -99;
END SP_INSERT_USER_LOGIN_HIST;
/


-- =============================================
-- 4. 계정 잠금 해제 (SP_USER_UNLOCK) - 설계서 명세
-- =============================================
CREATE OR REPLACE PROCEDURE SP_USER_UNLOCK(
    P_USER_ID       IN  VARCHAR2,                   -- 사용자ID
    P_ADMIN_ID      IN  VARCHAR2,                   -- 관리자ID
    P_RESULT_CODE   OUT VARCHAR2                    -- 결과 코드
)
AS
    V_COUNT NUMBER;
BEGIN
    -- 존재 체크
    SELECT COUNT(*) INTO V_COUNT
    FROM TB_USER
    WHERE USER_ID = P_USER_ID;

    IF V_COUNT = 0 THEN
        P_RESULT_CODE := 'ERR_USER_005';
        RETURN;
    END IF;

    -- 계정 잠금 해제
    UPDATE TB_USER
    SET ACCOUNT_LOCK_YN = 'N',
        FAIL_LOGIN_CNT = 0,
        UPD_USER_ID = P_ADMIN_ID,
        UPD_DT = SYSDATE
    WHERE USER_ID = P_USER_ID;

    COMMIT;
    P_RESULT_CODE := 'SUC_USER_004';  -- 잠금 해제 성공

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := 'ERR_SYSTEM';
END SP_USER_UNLOCK;
/


-- =============================================
-- 5. 사용자 삭제 (SP_USER_DELETE) - 설계서 명세
-- =============================================
CREATE OR REPLACE PROCEDURE SP_USER_DELETE(
    P_USER_ID       IN  VARCHAR2,                   -- 사용자ID
    P_ADMIN_ID      IN  VARCHAR2,                   -- 관리자ID
    P_RESULT_CODE   OUT VARCHAR2                    -- 결과 코드
)
AS
    V_COUNT NUMBER;
BEGIN
    -- 존재 체크
    SELECT COUNT(*) INTO V_COUNT
    FROM TB_USER
    WHERE USER_ID = P_USER_ID;

    IF V_COUNT = 0 THEN
        P_RESULT_CODE := 'ERR_USER_005';
        RETURN;
    END IF;

    -- 논리적 삭제 (USE_YN = 'N')
    UPDATE TB_USER
    SET USE_YN = 'N',
        UPD_USER_ID = P_ADMIN_ID,
        UPD_DT = SYSDATE
    WHERE USER_ID = P_USER_ID;

    COMMIT;
    P_RESULT_CODE := 'SUC_USER_003';  -- 삭제 성공

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := 'ERR_SYSTEM';
END SP_USER_DELETE;
/


-- =============================================
-- TB_USER_LOGIN_HIST 테이블 (이미 존재)
-- =============================================
/*
CREATE TABLE TB_USER_LOGIN_HIST (
    LOGIN_SEQ       NUMBER PRIMARY KEY,             -- 로그인 SEQ (PK)
    USER_ID         VARCHAR2(50) NOT NULL,          -- 사용자 ID
    LOGIN_DT        DATE DEFAULT SYSDATE NOT NULL,  -- 로그인 일시
    LOGIN_IP        VARCHAR2(50),                   -- 접속 IP
    LOGIN_RESULT    VARCHAR2(20) NOT NULL,          -- 로그인 결과 (SUCCESS/FAILED)
    FAIL_REASON     VARCHAR2(200),                  -- 실패 사유
    USER_AGENT      VARCHAR2(500),                  -- User Agent (브라우저 정보)
    SESSION_ID      VARCHAR2(100),                  -- 세션 ID
    REG_USER_ID     VARCHAR2(50) NOT NULL,          -- 등록자 ID
    REG_DT          DATE DEFAULT SYSDATE NOT NULL,  -- 등록일시
    UPD_USER_ID     VARCHAR2(50) NOT NULL,          -- 수정자 ID
    UPD_DT          DATE DEFAULT SYSDATE NOT NULL,  -- 수정일시
    CONSTRAINT PK_TB_USER_LOGIN_HIST PRIMARY KEY (LOGIN_SEQ),
    CONSTRAINT CK_LOGIN_RESULT CHECK (LOGIN_RESULT IN ('SUCCESS', 'FAILED')),
    CONSTRAINT FK_LOGIN_HIST_USER FOREIGN KEY (USER_ID) REFERENCES TB_USER(USER_ID)
);

-- 시퀀스 생성
CREATE SEQUENCE SEQ_USER_LOGIN_HIST START WITH 1 INCREMENT BY 1;

-- 인덱스 생성
CREATE INDEX IDX_USER_LOGIN_HIST_01 ON TB_USER_LOGIN_HIST(USER_ID);
CREATE INDEX IDX_USER_LOGIN_HIST_02 ON TB_USER_LOGIN_HIST(LOGIN_DT);
*/


-- =============================================
-- 프로시저 확인
-- =============================================
SELECT OBJECT_NAME, STATUS, LAST_DDL_TIME
FROM USER_OBJECTS
WHERE OBJECT_TYPE = 'PROCEDURE'
  AND OBJECT_NAME IN ('SP_USER_GET_DETAIL', 'SP_SELECT_USER_LOGIN_HIST', 'SP_INSERT_USER_LOGIN_HIST', 'SP_USER_UNLOCK', 'SP_USER_DELETE')
ORDER BY OBJECT_NAME;
