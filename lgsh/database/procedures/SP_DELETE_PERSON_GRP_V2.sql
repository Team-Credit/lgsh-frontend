-- ======================================================================
-- SP_DELETE_PERSON_GRP: 관리그룹 삭제
-- 수정일: 2026-01-21
-- 변경내용: 참조 데이터 없으면 물리 삭제, 있으면 논리 삭제
-- ======================================================================

CREATE OR REPLACE PROCEDURE SP_DELETE_PERSON_GRP(
    P_PERSON_GRP  IN VARCHAR2,
    P_USER_ID     IN VARCHAR2,
    P_UPD_USER_ID IN VARCHAR2,
    P_RESULT      OUT NUMBER  -- 1: 물리삭제 성공, 2: 논리삭제 성공, 0: 실패, -2: 존재하지 않음
)
AS
    V_COUNT NUMBER;
    V_REF_COUNT NUMBER;
BEGIN
    -- 존재 여부 확인
    SELECT COUNT(*) INTO V_COUNT
    FROM TB_PERSON_GRP
    WHERE PERSON_GRP = P_PERSON_GRP
      AND USER_ID = P_USER_ID;

    IF V_COUNT = 0 THEN
        P_RESULT := -2;  -- 존재하지 않음
        RETURN;
    END IF;

    -- 참조 데이터 확인 (TB_PERSON 등 관련 테이블에서 참조 여부 체크)
    -- 실제 참조 테이블이 있다면 아래 쿼리를 수정하세요
    -- 예: SELECT COUNT(*) INTO V_REF_COUNT FROM TB_PERSON WHERE PERSON_GRP = P_PERSON_GRP AND USER_ID = P_USER_ID;
    V_REF_COUNT := 0;  -- 현재 참조 테이블이 없으므로 0으로 설정

    -- 참조하는 테이블 예시 (주석 해제하여 사용)

    BEGIN
        SELECT COUNT(*) INTO V_REF_COUNT
        FROM TB_PERSON
        WHERE PERSON_GRP = P_PERSON_GRP;
        
    EXCEPTION
        WHEN OTHERS THEN
            V_REF_COUNT := 0;
    END;


    IF V_REF_COUNT = 0 THEN
        -- 참조 데이터 없음: 물리 삭제
        DELETE FROM TB_PERSON_GRP
        WHERE PERSON_GRP = P_PERSON_GRP
          AND USER_ID = P_USER_ID;

        P_RESULT := 1;  -- 물리삭제 성공
    ELSE
        -- 참조 데이터 있음: 논리 삭제 (USE_YN = 'N')
        UPDATE TB_PERSON_GRP
        SET USE_YN = 'N',
            UPD_USER_ID = P_UPD_USER_ID,
            UPD_DT = SYSDATE
        WHERE PERSON_GRP = P_PERSON_GRP
          AND USER_ID = P_USER_ID;

        P_RESULT := 2;  -- 논리삭제 성공
    END IF;

    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        P_RESULT := 0;  -- 실패
        ROLLBACK;
END SP_DELETE_PERSON_GRP;
/

-- 실행 테스트
-- DECLARE
--     V_RESULT NUMBER;
-- BEGIN
--     SP_DELETE_PERSON_GRP('GRP001', 'user01', 'admin', V_RESULT);
--     DBMS_OUTPUT.PUT_LINE('Result: ' || V_RESULT);
-- END;
-- /
