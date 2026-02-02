CREATE OR REPLACE PROCEDURE SP_EDA_GET_MISSING (
    p_variable_seq IN VARCHAR2,
    p_start_date   IN DATE,
    p_end_date     IN DATE,
    o_cursor       OUT SYS_REFCURSOR,
    o_result_code  OUT VARCHAR2
) AS
    v_date_col VARCHAR2(30);
    v_where    VARCHAR2(2000);
    v_sql      CLOB;
BEGIN
    BEGIN
        SELECT column_name
          INTO v_date_col
          FROM (
                SELECT column_name,
                       CASE column_name
                           WHEN 'BASE_DT' THEN 1
                           WHEN 'EVAL_DT' THEN 2
                           WHEN 'REG_DT' THEN 3
                           WHEN 'CREATE_DT' THEN 4
                           WHEN 'CREATED_DT' THEN 5
                           WHEN 'CREATED_AT' THEN 6
                           WHEN 'UPDATED_DT' THEN 7
                           WHEN 'UPDATED_AT' THEN 8
                           ELSE 99
                       END AS ord
                  FROM user_tab_columns
                 WHERE table_name = 'TB_CREDIT_RAW_DATA'
                   AND column_name IN (
                        'BASE_DT','EVAL_DT','REG_DT','CREATE_DT',
                        'CREATED_DT','CREATED_AT','UPDATED_DT','UPDATED_AT'
                   )
                 ORDER BY ord
               )
         WHERE ROWNUM = 1;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            v_date_col := NULL;
    END;

    v_where := '';
    IF v_date_col IS NOT NULL THEN
        IF p_start_date IS NOT NULL THEN
            v_where := v_where || ' AND ' || v_date_col || ' >= :start_date';
        END IF;
        IF p_end_date IS NOT NULL THEN
            v_where := v_where || ' AND ' || v_date_col || ' <= :end_date';
        END IF;
    END IF;

    v_sql := 'SELECT ROWNUM AS rownum, variable_name, total_count, missing_count, missing_rate, missing_status ' ||
             'FROM (' ||
             'SELECT variable_name, total_count, missing_count, ' ||
             'CASE WHEN total_count = 0 THEN 0 ELSE ROUND(missing_count / total_count, 6) END AS missing_rate, ' ||
             'CASE WHEN total_count = 0 THEN ''정상'' ' ||
             '     WHEN missing_count / total_count >= 0.20 THEN ''위험'' ' ||
             '     WHEN missing_count / total_count >= 0.10 THEN ''경고'' ' ||
             '     WHEN missing_count / total_count >= 0.05 THEN ''주의'' ' ||
             '     ELSE ''정상'' END AS missing_status ' ||
             'FROM (';

    FOR col IN (
        SELECT column_name
          FROM user_tab_columns
         WHERE table_name = 'TB_CREDIT_RAW_DATA'
           AND column_name NOT IN ('RAW_DATA_ID','MODEL_ID','PERSON_ID','COMPANY_ID','BUDO')
         ORDER BY column_id
    ) LOOP
        IF p_variable_seq IS NULL OR UPPER(p_variable_seq) IN ('0','ALL') THEN
            v_sql := v_sql ||
                     'SELECT ''' || col.column_name || ''' AS variable_name, ' ||
                     'COUNT(*) AS total_count, ' ||
                     'SUM(CASE WHEN ' || col.column_name || ' IS NULL THEN 1 ELSE 0 END) AS missing_count ' ||
                     'FROM TB_CREDIT_RAW_DATA WHERE 1=1' || v_where || ' UNION ALL ';
        ELSIF UPPER(p_variable_seq) = col.column_name THEN
            v_sql := v_sql ||
                     'SELECT ''' || col.column_name || ''' AS variable_name, ' ||
                     'COUNT(*) AS total_count, ' ||
                     'SUM(CASE WHEN ' || col.column_name || ' IS NULL THEN 1 ELSE 0 END) AS missing_count ' ||
                     'FROM TB_CREDIT_RAW_DATA WHERE 1=1' || v_where || ' UNION ALL ';
        END IF;
    END LOOP;

    v_sql := RTRIM(v_sql, ' UNION ALL ');
    v_sql := v_sql || '))';

    IF v_date_col IS NOT NULL AND (p_start_date IS NOT NULL OR p_end_date IS NOT NULL) THEN
        OPEN o_cursor FOR v_sql
            USING p_start_date, p_end_date;
    ELSE
        OPEN o_cursor FOR v_sql;
    END IF;

    o_result_code := 'SUC_EDA_003';
EXCEPTION
    WHEN OTHERS THEN
        o_result_code := 'ERR_EDA_003';
        RAISE;
END;
/
