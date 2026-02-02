-- =============================================
-- 관리그룹 목록 조회 프로시저 (페이징 기능 추가)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_SELECT_PERSON_GRP_LIST(
    P_PERSON_GRP    IN  VARCHAR2 DEFAULT NULL,      -- 관리그룹코드 (LIKE 검색)
    P_PERSON_GRP_NM IN  VARCHAR2 DEFAULT NULL,      -- 관리그룹명 (LIKE 검색)
    P_COMPANY_ID    IN  VARCHAR2 DEFAULT NULL,      -- 원청사ID
    P_USER_ID       IN  VARCHAR2 DEFAULT NULL,      -- 사용자ID
    P_USE_YN        IN  CHAR DEFAULT 'Y',           -- 사용여부
    P_PAGE          IN  NUMBER DEFAULT 0,           -- 페이지 번호 (0-based)
    P_SIZE          IN  NUMBER DEFAULT 20,          -- 페이지 크기
    P_RESULT        OUT SYS_REFCURSOR              -- 결과 커서
)
AS
    V_OFFSET NUMBER;
BEGIN
    -- 페이지 오프셋 계산
    V_OFFSET := P_PAGE * P_SIZE;

    OPEN P_RESULT FOR
        SELECT
            PERSON_GRP,
            USER_ID,
            COMPANY_ID,
            COMPANY_NM,
            PERSON_GRP_NM,
            PERSON_NM_ENG,
            USE_YN,
            REG_USER_ID,
            REG_DT,
            UPD_USER_ID,
            UPD_DT
        FROM (
            SELECT
                PG.PERSON_GRP,
                PG.USER_ID,
                PG.COMPANY_ID,
                CO.COMPANY_NM,
                PG.PERSON_GRP_NM,
                PG.PERSON_NM_ENG,
                PG.USE_YN,
                PG.REG_USER_ID,
                PG.REG_DT,
                PG.UPD_USER_ID,
                PG.UPD_DT,
                ROW_NUMBER() OVER (ORDER BY PG.REG_DT DESC) AS RN
            FROM TB_PERSON_GRP PG
            LEFT JOIN TB_COMPANY CO ON PG.COMPANY_ID = CO.COMPANY_ID
            WHERE 1=1
              AND (P_PERSON_GRP IS NULL OR PG.PERSON_GRP LIKE '%' || P_PERSON_GRP || '%')
              AND (P_PERSON_GRP_NM IS NULL OR PG.PERSON_GRP_NM LIKE '%' || P_PERSON_GRP_NM || '%')
              AND (P_COMPANY_ID IS NULL OR PG.COMPANY_ID = P_COMPANY_ID)
              AND (P_USER_ID IS NULL OR PG.USER_ID = P_USER_ID)
              AND (P_USE_YN IS NULL OR PG.USE_YN = P_USE_YN)
        )
        WHERE RN > V_OFFSET
          AND RN <= V_OFFSET + P_SIZE
        ORDER BY RN;

END SP_SELECT_PERSON_GRP_LIST;
/

-- 권한 부여 (필요시)
-- GRANT EXECUTE ON SP_SELECT_PERSON_GRP_LIST TO YOUR_USER;

-- 테스트 실행 예제
/*
DECLARE
    V_CURSOR SYS_REFCURSOR;
    V_PERSON_GRP VARCHAR2(20);
    V_USER_ID VARCHAR2(50);
    V_COMPANY_ID VARCHAR2(20);
    V_PERSON_GRP_NM VARCHAR2(100);
BEGIN
    -- 전체 조회 (첫 페이지, 20건)
    SP_SELECT_PERSON_GRP_LIST(
        P_PERSON_GRP => NULL,
        P_PERSON_GRP_NM => NULL,
        P_COMPANY_ID => NULL,
        P_USER_ID => NULL,
        P_USE_YN => 'Y',
        P_PAGE => 0,
        P_SIZE => 20,
        P_RESULT => V_CURSOR
    );

    -- 결과 출력 (테스트)
    LOOP
        FETCH V_CURSOR INTO V_PERSON_GRP, V_USER_ID, V_COMPANY_ID, V_PERSON_GRP_NM;
        EXIT WHEN V_CURSOR%NOTFOUND;
        DBMS_OUTPUT.PUT_LINE('PERSON_GRP: ' || V_PERSON_GRP || ', USER_ID: ' || V_USER_ID);
    END LOOP;

    CLOSE V_CURSOR;
END;
/
*/

-- 프로시저 확인
SELECT OBJECT_NAME, STATUS, LAST_DDL_TIME
FROM USER_OBJECTS
WHERE OBJECT_NAME = 'SP_SELECT_PERSON_GRP_LIST'
  AND OBJECT_TYPE = 'PROCEDURE';
