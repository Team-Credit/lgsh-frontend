-- =============================================
-- 관리그룹 목록 조회 프로시저 (FIXED - RN 제외)
-- =============================================
CREATE OR REPLACE PROCEDURE SP_SELECT_PERSON_GRP_LIST(
    P_PERSON_GRP    IN  VARCHAR2 DEFAULT NULL,
    P_PERSON_GRP_NM IN  VARCHAR2 DEFAULT NULL,
    P_COMPANY_ID    IN  VARCHAR2 DEFAULT NULL,
    P_USER_ID       IN  VARCHAR2 DEFAULT NULL,
    P_USE_YN        IN  CHAR DEFAULT NULL,
    P_PAGE          IN  NUMBER DEFAULT 0,
    P_SIZE          IN  NUMBER DEFAULT 20,
    P_RESULT        OUT SYS_REFCURSOR
)
AS
    V_OFFSET NUMBER;
BEGIN
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
            WHERE (P_PERSON_GRP IS NULL OR PG.PERSON_GRP LIKE '%' || P_PERSON_GRP || '%')
              AND (P_PERSON_GRP_NM IS NULL OR PG.PERSON_GRP_NM LIKE '%' || P_PERSON_GRP_NM || '%')
              AND (P_COMPANY_ID IS NULL OR PG.COMPANY_ID = P_COMPANY_ID)
              AND (P_USER_ID IS NULL OR PG.USER_ID = P_USER_ID)
              AND (P_USE_YN IS NULL OR PG.USE_YN = P_USE_YN)
        )
        WHERE RN > V_OFFSET AND RN <= V_OFFSET + P_SIZE;
END SP_SELECT_PERSON_GRP_LIST;
/
