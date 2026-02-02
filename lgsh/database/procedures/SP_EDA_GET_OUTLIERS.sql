CREATE OR REPLACE PROCEDURE SP_EDA_GET_OUTLIERS (
    p_variable_seq IN VARCHAR2,
    p_method       IN VARCHAR2,
    p_threshold    IN NUMBER,
    o_cursor       OUT SYS_REFCURSOR,
    o_summary      OUT SYS_REFCURSOR,
    o_result_code  OUT VARCHAR2
) AS
    v_col        VARCHAR2(128);
    v_method     VARCHAR2(30);
    v_threshold  NUMBER;
    v_pct        NUMBER;
    v_sql        CLOB;
BEGIN
    v_col := UPPER(TRIM(p_variable_seq));
    IF v_col IS NULL THEN
        o_result_code := 'ERR_EDA_004';
        RAISE_APPLICATION_ERROR(-20001, 'variableSeq is required');
    END IF;

    v_method := UPPER(TRIM(NVL(p_method, 'Z-SCORE')));
    v_threshold := NVL(p_threshold, 3);
    IF v_threshold <= 0 THEN
        v_threshold := 3;
    END IF;
    v_pct := LEAST(GREATEST(v_threshold, 1), 25) / 100;

    v_sql := '
        WITH base AS (
            SELECT r.PERSON_ID AS person_id,
                   p.PERSON_NM AS person_name,
                   r.' || v_col || ' AS value
            FROM TB_CREDIT_RAW_DATA r
            LEFT JOIN TB_PERSON p ON p.PERSON_ID = r.PERSON_ID
            WHERE r.' || v_col || ' IS NOT NULL
        ),
        stats AS (
            SELECT AVG(value) AS avg_val,
                   STDDEV_POP(value) AS std_val,
                   PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY value) AS q1,
                   PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) AS q3,
                   PERCENTILE_CONT(' || v_pct || ') WITHIN GROUP (ORDER BY value) AS w_low,
                   PERCENTILE_CONT(1 - ' || v_pct || ') WITHIN GROUP (ORDER BY value) AS w_high
            FROM base
        ),
        scored AS (
            SELECT b.*,
                   CASE
                       WHEN stats.std_val = 0 OR stats.std_val IS NULL THEN 0
                       ELSE (b.value - stats.avg_val) / stats.std_val
                   END AS z_score,
                   stats.q1,
                   stats.q3,
                   stats.w_low,
                   stats.w_high
            FROM base b CROSS JOIN stats
        )
        SELECT ROW_NUMBER() OVER (ORDER BY ABS(z_score) DESC) AS rownum,
               person_id,
               person_name,
               value AS variable_value,
               z_score,
               CASE
                   WHEN :method = ''IQR'' THEN
                       CASE WHEN value < (q1 - :threshold * (q3 - q1))
                                 OR value > (q3 + :threshold * (q3 - q1))
                            THEN 1 ELSE 0 END
                   WHEN :method = ''WINSORIZING'' THEN
                       CASE WHEN value < w_low OR value > w_high THEN 1 ELSE 0 END
                   ELSE
                       CASE WHEN ABS(z_score) >= :threshold THEN 1 ELSE 0 END
               END AS is_outlier
        FROM scored
    ';

    OPEN o_cursor FOR v_sql USING v_method, v_threshold, v_method, v_threshold;

    OPEN o_summary FOR
        'SELECT COUNT(*) AS total_count,
                SUM(CASE WHEN is_outlier = 1 THEN 1 ELSE 0 END) AS outlier_count,
                :method AS method,
                :threshold AS threshold
         FROM (' || v_sql || ')'
        USING v_method, v_threshold, v_method, v_threshold, v_method, v_threshold;

    o_result_code := 'SUC_EDA_004';
EXCEPTION
    WHEN OTHERS THEN
        o_result_code := 'ERR_EDA_004';
        RAISE;
END;
/
