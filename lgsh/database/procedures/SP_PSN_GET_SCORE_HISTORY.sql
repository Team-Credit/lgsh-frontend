CREATE OR REPLACE PROCEDURE SP_PSN_GET_SCORE_HISTORY
(
    p_person_id   IN VARCHAR2,
    p_page        IN NUMBER,  -- 1-based page index
    p_size        IN NUMBER,  -- Page size
    o_cursor      OUT SYS_REFCURSOR,
    o_total_count OUT NUMBER
)
IS
    v_offset NUMBER;
BEGIN
    -- Calculate offset (0-based)
    v_offset := (p_page - 1) * p_size;

    -- Get Total Count
    SELECT COUNT(*)
    INTO o_total_count
    FROM TB_CREDIT_SCORE_HIST
    WHERE PERSON_ID = p_person_id;

    -- Get Paged Data
    OPEN o_cursor FOR
    SELECT
        SCORE_SEQ,
        SCORE_DT,
        CREDIT_SCORE,
        CREDIT_GRADE,
        SCORE_REASON
    FROM TB_CREDIT_SCORE_HIST
    WHERE PERSON_ID = p_person_id
    ORDER BY SCORE_DT DESC
    OFFSET v_offset ROWS FETCH NEXT p_size ROWS ONLY;

END SP_PSN_GET_SCORE_HISTORY;
/
