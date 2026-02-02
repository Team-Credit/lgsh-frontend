CREATE OR REPLACE PROCEDURE SP_ROLE_SAVE_MENU_PERM
(
    P_ROLE_ID     IN VARCHAR2,
    P_MENU_ID     IN VARCHAR2,
    P_CAN_READ    IN VARCHAR2,
    P_CAN_WRITE   IN VARCHAR2,
    P_CAN_DELETE  IN VARCHAR2,
    P_EXPORT_YN   IN VARCHAR2,
    P_USER_ID     IN VARCHAR2,
    P_RESULT_CODE OUT NUMBER,
    P_RESULT_MSG  OUT VARCHAR2
)
IS
BEGIN
    MERGE INTO TB_SYS_ROLE_MENU T
    USING DUAL ON (T.ROLE_ID = P_ROLE_ID AND T.MENU_ID = P_MENU_ID)
    WHEN MATCHED THEN
        UPDATE SET
            CAN_READ = P_CAN_READ,
            CAN_WRITE = P_CAN_WRITE,
            CAN_DELETE = P_CAN_DELETE,
            EXPORT_YN = P_EXPORT_YN,
            UPD_USER_ID = P_USER_ID,
            UPD_DT = SYSDATE
    WHEN NOT MATCHED THEN
        INSERT (ROLE_ID, MENU_ID, CAN_READ, CAN_WRITE, CAN_DELETE, EXPORT_YN, REG_USER_ID, REG_DT, UPD_USER_ID, UPD_DT)
        VALUES (P_ROLE_ID, P_MENU_ID, P_CAN_READ, P_CAN_WRITE, P_CAN_DELETE, P_EXPORT_YN, P_USER_ID, SYSDATE, P_USER_ID, SYSDATE);

    /* COMMIT은 자바 서비스 레벨에서 루프 종료 후 일괄 처리 권장, 
       하지만 여기서는 SP 단위 트랜잭션을 가정하거나, 
       자바에서 @Transactional 사용 시 SP 내부 COMMIT은 무시될 수 있음(JDBC 드라이버 및 설정에 따라 다름).
       보통 자바 LOOP 호출 시, 자바에서 Commit 하려면 SP 내부 COMMIT을 빼야 함.
       하지만 기존 SP들이 내부 COMMIT을 하고 있으므로 패턴을 맞춤. */
    -- COMMIT; 
    -- 기존 코드들이 COMMIT을 하고 있다면 맞추겠지만, 
    -- 루프 호출 성능을 위해 빼는 것이 BEST PRACTICE.
    -- 그러나 SP_USER_CRUD 등을 보면 COMMIT을 하고 있음.
    -- 일단 유지하되, 자바 서비스에서 루프 돌 때마다 커밋되면 느릴 수 있음.
    -- 요구사항: "Java에서 Loop를 돌며 호출하거나"
    
    COMMIT;

    P_RESULT_CODE := 0;
    P_RESULT_MSG := 'SUCCESS';

EXCEPTION WHEN OTHERS THEN
    ROLLBACK;
    P_RESULT_CODE := -99;
    P_RESULT_MSG := '권한 저장 중 오류: ' || SQLERRM;
END SP_ROLE_SAVE_MENU_PERM;
/
