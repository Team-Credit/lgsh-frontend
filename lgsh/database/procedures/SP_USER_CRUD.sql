-- =============================================
-- 사용자 관리 Stored Procedures
-- TB_USER 테이블 CRUD
-- =============================================

-- =============================================
-- 1. 사용자 목록 조회 (SP_SELECT_USER_LIST)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_SELECT_USER_LIST(
    P_USER_ID       IN  VARCHAR2 DEFAULT NULL,      -- 사용자ID (LIKE 검색)
    P_USER_NM       IN  VARCHAR2 DEFAULT NULL,      -- 사용자명 (LIKE 검색)
    P_COMPANY_ID    IN  VARCHAR2 DEFAULT NULL,      -- 원청사ID
    P_ROLE_ID       IN  VARCHAR2 DEFAULT NULL,      -- 역할ID
    P_USE_YN        IN  CHAR DEFAULT NULL,          -- 사용여부
    P_ACCOUNT_LOCK_YN IN CHAR DEFAULT NULL,         -- 계정잠금여부
    P_PAGE          IN  NUMBER DEFAULT 0,           -- 페이지 번호 (0-based)
    P_SIZE          IN  NUMBER DEFAULT 20,          -- 페이지 크기
    P_RESULT        OUT SYS_REFCURSOR               -- 결과 커서
)
AS
    V_OFFSET NUMBER;
BEGIN
    -- 페이지 오프셋 계산
    V_OFFSET := P_PAGE * P_SIZE;

    OPEN P_RESULT FOR
        SELECT
            USER_ID,
            USER_NM,
            COMPANY_ID,
            COMPANY_NM,
            ROLE_ID,
            ROLE_NM,
            EMAIL,
            TEL_NO,
            USE_YN,
            ACCOUNT_LOCK_YN,
            FAIL_LOGIN_CNT,
            LAST_LOGIN_DT,
            PWD_CHANGE_DT,
            PWD_EXPIRE_DT,
            REG_USER_ID,
            REG_DT,
            UPD_USER_ID,
            UPD_DT,
            TOTAL_COUNT
        FROM (
            SELECT
                U.USER_ID,
                U.USER_NM,
                U.COMPANY_ID,
                C.COMPANY_NM,
                U.ROLE_ID,
                R.ROLE_NM,
                U.EMAIL,
                U.TEL_NO,
                U.USE_YN,
                U.ACCOUNT_LOCK_YN,
                U.FAIL_LOGIN_CNT,
                U.LAST_LOGIN_DT,
                U.PWD_CHANGE_DT,
                U.PWD_EXPIRE_DT,
                U.REG_USER_ID,
                U.REG_DT,
                U.UPD_USER_ID,
                U.UPD_DT,
                COUNT(*) OVER() AS TOTAL_COUNT,
                ROW_NUMBER() OVER (ORDER BY U.REG_DT DESC) AS RN
            FROM TB_USER U
            LEFT JOIN TB_COMPANY C ON U.COMPANY_ID = C.COMPANY_ID
            LEFT JOIN TB_SYS_ROLE R ON U.ROLE_ID = R.ROLE_ID
            WHERE 1=1
              AND (P_USER_ID IS NULL OR U.USER_ID LIKE '%' || P_USER_ID || '%')
              AND (P_USER_NM IS NULL OR U.USER_NM LIKE '%' || P_USER_NM || '%')
              AND (P_COMPANY_ID IS NULL OR U.COMPANY_ID = P_COMPANY_ID)
              AND (P_ROLE_ID IS NULL OR U.ROLE_ID = P_ROLE_ID)
              AND (P_USE_YN IS NULL OR U.USE_YN = P_USE_YN)
              AND (P_ACCOUNT_LOCK_YN IS NULL OR U.ACCOUNT_LOCK_YN = P_ACCOUNT_LOCK_YN)
        )
        WHERE RN > V_OFFSET
          AND RN <= V_OFFSET + P_SIZE
        ORDER BY RN;

END SP_SELECT_USER_LIST;
/

-- =============================================
-- 2. 사용자 상세 조회 (SP_SELECT_USER_DETAIL)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_SELECT_USER_DETAIL(
    P_USER_ID       IN  VARCHAR2,                   -- 사용자ID
    P_RESULT        OUT SYS_REFCURSOR               -- 결과 커서
)
AS
BEGIN
    OPEN P_RESULT FOR
        SELECT
            U.USER_ID,
            U.USER_NM,
            U.COMPANY_ID,
            C.COMPANY_NM,
            U.ROLE_ID,
            R.ROLE_NM,
            U.EMAIL,
            U.TEL_NO,
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

END SP_SELECT_USER_DETAIL;
/

-- =============================================
-- 3. 사용자 등록 (SP_INSERT_USER)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_INSERT_USER(
    P_USER_ID       IN  VARCHAR2,                   -- 사용자ID
    P_USER_NM       IN  VARCHAR2,                   -- 사용자명
    P_USER_PWD      IN  VARCHAR2,                   -- 비밀번호 (암호화됨)
    P_COMPANY_ID    IN  VARCHAR2,                   -- 원청사ID
    P_ROLE_ID       IN  VARCHAR2,                   -- 역할ID
    P_EMAIL         IN  VARCHAR2 DEFAULT NULL,      -- 이메일
    P_TEL_NO        IN  VARCHAR2 DEFAULT NULL,      -- 전화번호
    P_USE_YN        IN  CHAR DEFAULT 'Y',           -- 사용여부
    P_REG_USER_ID   IN  VARCHAR2,                   -- 등록자ID
    P_RESULT_CODE   OUT NUMBER,                     -- 결과코드 (0: 성공, -1: 중복, -99: 오류)
    P_RESULT_MSG    OUT VARCHAR2                    -- 결과메시지
)
AS
    V_COUNT NUMBER;
BEGIN
    -- 중복 체크
    SELECT COUNT(*) INTO V_COUNT
    FROM TB_USER
    WHERE USER_ID = P_USER_ID;

    IF V_COUNT > 0 THEN
        P_RESULT_CODE := -1;
        P_RESULT_MSG := '이미 존재하는 사용자ID입니다.';
        RETURN;
    END IF;

    -- 이메일 중복 체크 (이메일이 있는 경우)
    IF P_EMAIL IS NOT NULL THEN
        SELECT COUNT(*) INTO V_COUNT
        FROM TB_USER
        WHERE EMAIL = P_EMAIL;

        IF V_COUNT > 0 THEN
            P_RESULT_CODE := -2;
            P_RESULT_MSG := '이미 사용중인 이메일입니다.';
            RETURN;
        END IF;
    END IF;

    -- 등록
    INSERT INTO TB_USER (
        USER_ID,
        USER_NM,
        USER_PWD,
        COMPANY_ID,
        ROLE_ID,
        EMAIL,
        TEL_NO,
        USE_YN,
        ACCOUNT_LOCK_YN,
        FAIL_LOGIN_CNT,
        PWD_CHANGE_DT,
        PWD_EXPIRE_DT,
        REG_USER_ID,
        REG_DT,
        UPD_USER_ID,
        UPD_DT
    ) VALUES (
        P_USER_ID,
        P_USER_NM,
        P_USER_PWD,
        P_COMPANY_ID,
        P_ROLE_ID,
        P_EMAIL,
        P_TEL_NO,
        NVL(P_USE_YN, 'Y'),
        'N',
        0,
        SYSDATE,
        ADD_MONTHS(SYSDATE, 3),  -- 90일 후 비밀번호 만료
        P_REG_USER_ID,
        SYSDATE,
        P_REG_USER_ID,
        SYSDATE
    );

    COMMIT;

    P_RESULT_CODE := 0;
    P_RESULT_MSG := '사용자가 등록되었습니다.';

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := -99;
        P_RESULT_MSG := '사용자 등록 중 오류가 발생했습니다: ' || SQLERRM;
END SP_INSERT_USER;
/

-- =============================================
-- 4. 사용자 수정 (SP_UPDATE_USER)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_UPDATE_USER(
    P_USER_ID       IN  VARCHAR2,                   -- 사용자ID (변경불가)
    P_USER_NM       IN  VARCHAR2,                   -- 사용자명
    P_COMPANY_ID    IN  VARCHAR2,                   -- 원청사ID
    P_ROLE_ID       IN  VARCHAR2,                   -- 역할ID
    P_EMAIL         IN  VARCHAR2 DEFAULT NULL,      -- 이메일
    P_TEL_NO        IN  VARCHAR2 DEFAULT NULL,      -- 전화번호
    P_USE_YN        IN  CHAR DEFAULT 'Y',           -- 사용여부
    P_UPD_USER_ID   IN  VARCHAR2,                   -- 수정자ID
    P_RESULT_CODE   OUT NUMBER,                     -- 결과코드 (0: 성공, -1: 미존재, -99: 오류)
    P_RESULT_MSG    OUT VARCHAR2                    -- 결과메시지
)
AS
    V_COUNT NUMBER;
BEGIN
    -- 존재 체크
    SELECT COUNT(*) INTO V_COUNT
    FROM TB_USER
    WHERE USER_ID = P_USER_ID;

    IF V_COUNT = 0 THEN
        P_RESULT_CODE := -1;
        P_RESULT_MSG := '존재하지 않는 사용자입니다.';
        RETURN;
    END IF;

    -- 이메일 중복 체크 (다른 사용자가 사용중인 경우)
    IF P_EMAIL IS NOT NULL THEN
        SELECT COUNT(*) INTO V_COUNT
        FROM TB_USER
        WHERE EMAIL = P_EMAIL
          AND USER_ID != P_USER_ID;

        IF V_COUNT > 0 THEN
            P_RESULT_CODE := -2;
            P_RESULT_MSG := '이미 사용중인 이메일입니다.';
            RETURN;
        END IF;
    END IF;

    -- 수정
    UPDATE TB_USER
    SET USER_NM = P_USER_NM,
        COMPANY_ID = P_COMPANY_ID,
        ROLE_ID = P_ROLE_ID,
        EMAIL = P_EMAIL,
        TEL_NO = P_TEL_NO,
        USE_YN = NVL(P_USE_YN, 'Y'),
        UPD_USER_ID = P_UPD_USER_ID,
        UPD_DT = SYSDATE
    WHERE USER_ID = P_USER_ID;

    COMMIT;

    P_RESULT_CODE := 0;
    P_RESULT_MSG := '사용자 정보가 수정되었습니다.';

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := -99;
        P_RESULT_MSG := '사용자 수정 중 오류가 발생했습니다: ' || SQLERRM;
END SP_UPDATE_USER;
/

-- =============================================
-- 5. 사용자 삭제 (SP_DELETE_USER)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_DELETE_USER(
    P_USER_ID       IN  VARCHAR2,                   -- 사용자ID
    P_DEL_USER_ID   IN  VARCHAR2,                   -- 삭제자ID
    P_RESULT_CODE   OUT NUMBER,                     -- 결과코드 (0: 성공, -1: 미존재, -99: 오류)
    P_RESULT_MSG    OUT VARCHAR2                    -- 결과메시지
)
AS
    V_COUNT NUMBER;
BEGIN
    -- 존재 체크
    SELECT COUNT(*) INTO V_COUNT
    FROM TB_USER
    WHERE USER_ID = P_USER_ID;

    IF V_COUNT = 0 THEN
        P_RESULT_CODE := -1;
        P_RESULT_MSG := '존재하지 않는 사용자입니다.';
        RETURN;
    END IF;

    -- 삭제 (논리적 삭제 - USE_YN을 'N'으로 변경)
    -- 실제 삭제가 필요하면 DELETE 문으로 변경
    UPDATE TB_USER
    SET USE_YN = 'N',
        UPD_USER_ID = P_DEL_USER_ID,
        UPD_DT = SYSDATE
    WHERE USER_ID = P_USER_ID;

    COMMIT;

    P_RESULT_CODE := 0;
    P_RESULT_MSG := '사용자가 삭제되었습니다.';

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := -99;
        P_RESULT_MSG := '사용자 삭제 중 오류가 발생했습니다: ' || SQLERRM;
END SP_DELETE_USER;
/

-- =============================================
-- 6. 비밀번호 초기화 (SP_RESET_USER_PASSWORD)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_RESET_USER_PASSWORD(
    P_USER_ID       IN  VARCHAR2,                   -- 사용자ID
    P_NEW_PWD       IN  VARCHAR2,                   -- 새 비밀번호 (암호화됨)
    P_UPD_USER_ID   IN  VARCHAR2,                   -- 수정자ID
    P_RESULT_CODE   OUT NUMBER,                     -- 결과코드
    P_RESULT_MSG    OUT VARCHAR2                    -- 결과메시지
)
AS
    V_COUNT NUMBER;
    V_OLD_PWD VARCHAR2(200);
BEGIN
    -- 존재 체크
    SELECT COUNT(*), MAX(USER_PWD) INTO V_COUNT, V_OLD_PWD
    FROM TB_USER
    WHERE USER_ID = P_USER_ID;

    IF V_COUNT = 0 THEN
        P_RESULT_CODE := -1;
        P_RESULT_MSG := '존재하지 않는 사용자입니다.';
        RETURN;
    END IF;

    -- 비밀번호 이력 저장
    INSERT INTO TB_USER_PWD_HIST (
        HIST_SEQ,
        USER_ID,
        PWD_HASH,
        CHANGE_REASON,
        REG_USER_ID,
        REG_DT,
        UPD_USER_ID,
        UPD_DT
    ) VALUES (
        (SELECT NVL(MAX(HIST_SEQ), 0) + 1 FROM TB_USER_PWD_HIST WHERE USER_ID = P_USER_ID),
        P_USER_ID,
        V_OLD_PWD,
        'RESET',
        P_UPD_USER_ID,
        SYSDATE,
        P_UPD_USER_ID,
        SYSDATE
    );

    -- 비밀번호 업데이트
    UPDATE TB_USER
    SET USER_PWD = P_NEW_PWD,
        PWD_CHANGE_DT = SYSDATE,
        PWD_EXPIRE_DT = ADD_MONTHS(SYSDATE, 3),
        FAIL_LOGIN_CNT = 0,
        ACCOUNT_LOCK_YN = 'N',
        UPD_USER_ID = P_UPD_USER_ID,
        UPD_DT = SYSDATE
    WHERE USER_ID = P_USER_ID;

    COMMIT;

    P_RESULT_CODE := 0;
    P_RESULT_MSG := '비밀번호가 초기화되었습니다.';

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := -99;
        P_RESULT_MSG := '비밀번호 초기화 중 오류가 발생했습니다: ' || SQLERRM;
END SP_RESET_USER_PASSWORD;
/

-- =============================================
-- 7. 계정 잠금 해제 (SP_UNLOCK_USER_ACCOUNT)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_UNLOCK_USER_ACCOUNT(
    P_USER_ID       IN  VARCHAR2,                   -- 사용자ID
    P_UPD_USER_ID   IN  VARCHAR2,                   -- 수정자ID
    P_RESULT_CODE   OUT NUMBER,                     -- 결과코드
    P_RESULT_MSG    OUT VARCHAR2                    -- 결과메시지
)
AS
    V_COUNT NUMBER;
BEGIN
    -- 존재 체크
    SELECT COUNT(*) INTO V_COUNT
    FROM TB_USER
    WHERE USER_ID = P_USER_ID;

    IF V_COUNT = 0 THEN
        P_RESULT_CODE := -1;
        P_RESULT_MSG := '존재하지 않는 사용자입니다.';
        RETURN;
    END IF;

    -- 계정 잠금 해제
    UPDATE TB_USER
    SET ACCOUNT_LOCK_YN = 'N',
        FAIL_LOGIN_CNT = 0,
        UPD_USER_ID = P_UPD_USER_ID,
        UPD_DT = SYSDATE
    WHERE USER_ID = P_USER_ID;

    COMMIT;

    P_RESULT_CODE := 0;
    P_RESULT_MSG := '계정 잠금이 해제되었습니다.';

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        P_RESULT_CODE := -99;
        P_RESULT_MSG := '계정 잠금 해제 중 오류가 발생했습니다: ' || SQLERRM;
END SP_UNLOCK_USER_ACCOUNT;
/

-- =============================================
-- 8. 역할 목록 조회 (SP_SELECT_ROLE_LIST)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_SELECT_ROLE_LIST(
    P_ROLE_ID       IN  VARCHAR2 DEFAULT NULL,      -- 역할ID (LIKE 검색)
    P_ROLE_NM       IN  VARCHAR2 DEFAULT NULL,      -- 역할명 (LIKE 검색)
    P_USE_YN        IN  CHAR DEFAULT 'Y',           -- 사용여부
    P_RESULT        OUT SYS_REFCURSOR               -- 결과 커서
)
AS
BEGIN
    OPEN P_RESULT FOR
        SELECT
            ROLE_ID,
            ROLE_NM,
            ROLE_DESC,
            ROLE_LEVEL,
            USE_YN,
            REG_USER_ID,
            REG_DT,
            UPD_USER_ID,
            UPD_DT
        FROM TB_SYS_ROLE
        WHERE 1=1
          AND (P_ROLE_ID IS NULL OR ROLE_ID LIKE '%' || P_ROLE_ID || '%')
          AND (P_ROLE_NM IS NULL OR ROLE_NM LIKE '%' || P_ROLE_NM || '%')
          AND (P_USE_YN IS NULL OR USE_YN = P_USE_YN)
        ORDER BY ROLE_LEVEL, ROLE_ID;

END SP_SELECT_ROLE_LIST;
/


-- =============================================
-- 프로시저 확인
-- =============================================
SELECT OBJECT_NAME, STATUS, LAST_DDL_TIME
FROM USER_OBJECTS
WHERE OBJECT_TYPE = 'PROCEDURE'
  AND OBJECT_NAME LIKE 'SP_%USER%'
ORDER BY OBJECT_NAME;

-- =============================================
-- 테스트 실행 예제
-- =============================================
/*
-- 1. 사용자 목록 조회 테스트
DECLARE
    V_CURSOR SYS_REFCURSOR;
    V_USER_ID VARCHAR2(50);
    V_USER_NM VARCHAR2(100);
    V_COMPANY_ID VARCHAR2(20);
    V_ROLE_ID VARCHAR2(20);
BEGIN
    SP_SELECT_USER_LIST(
        P_USER_ID => NULL,
        P_USER_NM => NULL,
        P_COMPANY_ID => NULL,
        P_ROLE_ID => NULL,
        P_USE_YN => 'Y',
        P_ACCOUNT_LOCK_YN => NULL,
        P_PAGE => 0,
        P_SIZE => 20,
        P_RESULT => V_CURSOR
    );

    LOOP
        FETCH V_CURSOR INTO V_USER_ID, V_USER_NM, V_COMPANY_ID, V_ROLE_ID;
        EXIT WHEN V_CURSOR%NOTFOUND;
        DBMS_OUTPUT.PUT_LINE('USER_ID: ' || V_USER_ID || ', USER_NM: ' || V_USER_NM);
    END LOOP;

    CLOSE V_CURSOR;
END;
/

-- 2. 사용자 등록 테스트
DECLARE
    V_RESULT_CODE NUMBER;
    V_RESULT_MSG VARCHAR2(500);
BEGIN
    SP_INSERT_USER(
        P_USER_ID => 'testuser001',
        P_USER_NM => '테스트사용자',
        P_USER_PWD => 'encrypted_password_here',
        P_COMPANY_ID => 'COMP001',
        P_ROLE_ID => 'USER',
        P_EMAIL => 'test@example.com',
        P_TEL_NO => '010-1234-5678',
        P_USE_YN => 'Y',
        P_REG_USER_ID => 'admin',
        P_RESULT_CODE => V_RESULT_CODE,
        P_RESULT_MSG => V_RESULT_MSG
    );
    DBMS_OUTPUT.PUT_LINE('RESULT: ' || V_RESULT_CODE || ' - ' || V_RESULT_MSG);
END;
/
*/
