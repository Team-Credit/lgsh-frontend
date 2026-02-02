CREATE OR REPLACE PROCEDURE SP_PSN_GET_DETAIL
(
    p_person_id IN VARCHAR2,
    o_cursor    OUT SYS_REFCURSOR
)
IS
BEGIN
    OPEN o_cursor FOR
    SELECT 
        -- [Section A] Basic Info
        A.PERSON_NM,
        A.PERSON_NO,
        A.MOBILE_NO,
        A.EMAIL,
        C.PERSON_GRP_NM,
        A.REG_DT,
        
        -- [Section B] Detail Info
        B.MARRIAGE_YN,
        A.JOB_CODE,
        A.ANNUAL_INCOME,
        A.ADDRESS,
        B.NOTES,
        
        -- [Section C] Credit Status (Most Recent 1)
        D.CREDIT_SCORE,
        D.CREDIT_GRADE,
        D.SCORE_DT AS SCORE_DT
        
    FROM TB_PERSON A
    LEFT JOIN TB_PERSON_DETAIL B ON A.PERSON_ID = B.PERSON_ID
    LEFT JOIN TB_PERSON_GRP C ON A.PERSON_GRP = C.PERSON_GRP
    LEFT JOIN (
        SELECT 
            PERSON_ID, 
            CREDIT_SCORE, 
            CREDIT_GRADE, 
            SCORE_DT,
            ROW_NUMBER() OVER(PARTITION BY PERSON_ID ORDER BY SCORE_DT DESC) AS RN
        FROM TB_CREDIT_SCORE_HIST
    ) D ON A.PERSON_ID = D.PERSON_ID AND D.RN = 1
    WHERE A.PERSON_ID = p_person_id;

END SP_PSN_GET_DETAIL;
/
