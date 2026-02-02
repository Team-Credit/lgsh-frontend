-- MERGE INTO 스크립트 (메시지 코드)
MERGE INTO TB_SYS_MESSAGE T
USING (
    -- 1. 공통 (CMN)
    SELECT 'ERR_CMN_000' AS MSG_CODE, 'KO' AS LANG_CODE, 'ERROR' AS MSG_TYPE, 'COMMON' AS MSG_CATEGORY, '서버 오류' AS MSG_TITLE, '서버 내부 오류가 발생했습니다.' AS MSG_DESC, 'Y' AS USE_YN FROM DUAL UNION ALL
    SELECT 'ERR_CMN_001', 'KO', 'ERROR', 'COMMON', '입력값 오류', '올바르지 않은 입력값입니다.', 'Y' FROM DUAL UNION ALL
    
    -- 2. 인증 (AUTH)
    SELECT 'ERR_AUTH_001', 'KO', 'ERROR', 'AUTH', '로그인 형식 오류', '이메일 또는 비밀번호 형식이 올바르지 않습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_AUTH_002', 'KO', 'ERROR', 'AUTH', '인증 실패', '아이디 또는 비밀번호가 일치하지 않습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_AUTH_003', 'KO', 'ERROR', 'AUTH', '계정 잠김', '계정이 잠겨있습니다. 관리자에게 문의하세요.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_AUTH_004', 'KO', 'ERROR', 'AUTH', '토큰 만료', '토큰이 만료되었습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_AUTH_005', 'KO', 'ERROR', 'AUTH', '토큰 무효', '유효하지 않은 토큰입니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_AUTH_006', 'KO', 'ERROR', 'AUTH', '접근 거부', '접근 권한이 없습니다.', 'Y' FROM DUAL UNION ALL

    -- 3. 사용자 (USER)
    SELECT 'ERR_USER_001', 'KO', 'ERROR', 'USER', '사용자 없음', '사용자를 찾을 수 없습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_USER_002', 'KO', 'ERROR', 'USER', '아이디 중복', '이미 존재하는 아이디입니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_USER_003', 'KO', 'ERROR', 'USER', '이메일 중복', '이미 사용 중인 이메일입니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_USER_011', 'KO', 'ERROR', 'USER', '사용자 등록 실패', '사용자 등록에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_USER_012', 'KO', 'ERROR', 'USER', '사용자 수정 실패', '사용자 수정에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_USER_013', 'KO', 'ERROR', 'USER', '사용자 삭제 실패', '사용자 삭제에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_USER_014', 'KO', 'ERROR', 'USER', '비밀번호 초기화 실패', '비밀번호 초기화에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_USER_015', 'KO', 'ERROR', 'USER', '계정 잠금해제 실패', '계정 잠금 해제에 실패했습니다.', 'Y' FROM DUAL UNION ALL

    -- 4. 메뉴 (MENU)
    SELECT 'ERR_MENU_001', 'KO', 'ERROR', 'MENU', '메뉴 없음', '메뉴를 찾을 수 없습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_MENU_002', 'KO', 'ERROR', 'MENU', '메뉴ID 중복', '이미 존재하는 메뉴 ID입니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_MENU_003', 'KO', 'ERROR', 'MENU', '하위메뉴 존재', '하위 메뉴가 존재하여 삭제할 수 없습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_MENU_004', 'KO', 'ERROR', 'MENU', '권한 정보 없음', '권한 정보가 없습니다.', 'Y' FROM DUAL UNION ALL

    -- 5. 관리그룹 (PSN_GRP)
    SELECT 'ERR_PSN_GRP_001', 'KO', 'ERROR', 'PERSON_GRP', '관리그룹 없음', '관리그룹을 찾을 수 없습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_PSN_GRP_002', 'KO', 'ERROR', 'PERSON_GRP', '관리그룹 중복', '이미 존재하는 관리그룹입니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_PSN_GRP_003', 'KO', 'ERROR', 'PERSON_GRP', '관리그룹 등록 실패', '관리그룹 등록에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_PSN_GRP_004', 'KO', 'ERROR', 'PERSON_GRP', '관리그룹 수정 실패', '관리그룹 수정에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_PSN_GRP_005', 'KO', 'ERROR', 'PERSON_GRP', '관리그룹 삭제 실패', '관리그룹 삭제에 실패했습니다.', 'Y' FROM DUAL UNION ALL

    -- 6. 공통코드 (CODE)
    SELECT 'ERR_CODE_001', 'KO', 'ERROR', 'CODE', '대분류 코드 없음', '대분류 코드를 찾을 수 없습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_CODE_002', 'KO', 'ERROR', 'CODE', '대분류 코드 중복', '이미 존재하는 대분류 코드입니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_CODE_003', 'KO', 'ERROR', 'CODE', '대분류 등록 실패', '대분류 코드 등록에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_CODE_004', 'KO', 'ERROR', 'CODE', '대분류 수정 실패', '대분류 코드 수정에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_CODE_005', 'KO', 'ERROR', 'CODE', '대분류 삭제 실패', '대분류 코드 삭제에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_CODE_006', 'KO', 'ERROR', 'CODE', '소분류 존재', '하위 소분류 코드가 존재하여 삭제할 수 없습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_CODE_011', 'KO', 'ERROR', 'CODE', '소분류 코드 없음', '소분류 코드를 찾을 수 없습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_CODE_012', 'KO', 'ERROR', 'CODE', '소분류 코드 중복', '이미 존재하는 소분류 코드입니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_CODE_013', 'KO', 'ERROR', 'CODE', '소분류 등록 실패', '소분류 코드 등록에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_CODE_014', 'KO', 'ERROR', 'CODE', '소분류 수정 실패', '소분류 코드 수정에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_CODE_015', 'KO', 'ERROR', 'CODE', '소분류 삭제 실패', '소분류 코드 삭제에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_CODE_021', 'KO', 'ERROR', 'CODE', '시스템코드 수정불가', '시스템 코드는 수정할 수 없습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_CODE_022', 'KO', 'ERROR', 'CODE', '시스템코드 삭제불가', '시스템 코드는 삭제할 수 없습니다.', 'Y' FROM DUAL UNION ALL

    -- 7. 원청사 (COMPANY)
    SELECT 'ERR_COMPANY_001', 'KO', 'ERROR', 'COMPANY', '원청사 오류', '원청사를 찾을 수 없습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_COMPANY_002', 'KO', 'ERROR', 'COMPANY', '원청사 오류', '이미 존재하는 원청사 코드입니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_COMPANY_003', 'KO', 'ERROR', 'COMPANY', '원청사 오류', '이미 존재하는 원청사 ID입니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_COMPANY_004', 'KO', 'ERROR', 'COMPANY', '원청사 오류', '이미 등록된 사업자번호입니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_COMPANY_005', 'KO', 'ERROR', 'COMPANY', '원청사 오류', '원청사 등록에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_COMPANY_006', 'KO', 'ERROR', 'COMPANY', '원청사 오류', '원청사 수정에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_COMPANY_007', 'KO', 'ERROR', 'COMPANY', '원청사 오류', '원청사 삭제에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_COMPANY_008', 'KO', 'ERROR', 'COMPANY', '원청사 오류', '소속된 사용자가 있어 삭제할 수 없습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'SUC_COMPANY_001', 'KO', 'SUCCESS', 'COMPANY', '원청사', '원청사가 등록되었습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'SUC_COMPANY_002', 'KO', 'SUCCESS', 'COMPANY', '원청사', '원청사 정보가 수정되었습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'SUC_COMPANY_003', 'KO', 'SUCCESS', 'COMPANY', '원청사', '원청사가 삭제되었습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'CFM_COMPANY_001', 'KO', 'WARNING', 'COMPANY', '원청사 등록', '원청사를 등록하시겠습니까?', 'Y' FROM DUAL UNION ALL
    SELECT 'CFM_COMPANY_002', 'KO', 'WARNING', 'COMPANY', '원청사 수정', '원청사 정보를 수정하시겠습니까?', 'Y' FROM DUAL UNION ALL
    SELECT 'CFM_COMPANY_003', 'KO', 'WARNING', 'COMPANY', '원청사 삭제', '원청사를 삭제하시겠습니까?', 'Y' FROM DUAL UNION ALL
    SELECT 'INF_COMPANY_001', 'KO', 'INFO', 'COMPANY', '원청사', '원청사 정보를 조회합니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'INF_COMPANY_002', 'KO', 'INFO', 'COMPANY', '원청사', '조회된 원청사가 없습니다.', 'Y' FROM DUAL UNION ALL

    -- 8. 역할 (ROLE)
    SELECT 'ERR_ROLE_001', 'KO', 'ERROR', 'ROLE', '역할 없음', '역할을 찾을 수 없습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'SUC_ROLE_001', 'KO', 'SUCCESS', 'ROLE', '역할 목록 조회 성공', '역할 목록 조회 성공', 'Y' FROM DUAL UNION ALL
    SELECT 'SUC_ROLE_002', 'KO', 'SUCCESS', 'ROLE', '역할 조회 성공', '역할 조회 성공', 'Y' FROM DUAL UNION ALL

    -- 9. 공지사항 (NOTICE) - NEW
    SELECT 'ERR_NOT_001', 'KO', 'ERROR', 'NOTICE', '공지사항 오류', '공지사항 등록에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_NOT_002', 'KO', 'ERROR', 'NOTICE', '공지사항 오류', '공지사항 수정에 실패했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'ERR_NOT_003', 'KO', 'ERROR', 'NOTICE', '공지사항 오류', '공지사항 삭제에 실패했습니다.', 'Y' FROM DUAL UNION ALL

    -- 10. 성공 메시지 (USER/AUTH/ETC)
    SELECT 'SUC_USER_001', 'KO', 'SUCCESS', 'USER', '사용자 등록 성공', '사용자가 성공적으로 등록되었습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'SUC_USER_002', 'KO', 'SUCCESS', 'USER', '사용자 수정 성공', '사용자 정보가 수정되었습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'SUC_USER_003', 'KO', 'SUCCESS', 'USER', '사용자 삭제 성공', '사용자가 삭제되었습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'SUC_USER_004', 'KO', 'SUCCESS', 'USER', '비밀번호 초기화 성공', '비밀번호가 초기화되었습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'SUC_USER_005', 'KO', 'SUCCESS', 'USER', '계정 잠금해제 성공', '계정 잠금이 해제되었습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'SUC_AUTH_001', 'KO', 'SUCCESS', 'AUTH', '로그인 성공', '로그인에 성공했습니다.', 'Y' FROM DUAL UNION ALL
    SELECT 'SUC_AUTH_002', 'KO', 'SUCCESS', 'AUTH', '로그아웃 성공', '로그아웃에 성공했습니다.', 'Y' FROM DUAL
) S
ON (T.MSG_CODE = S.MSG_CODE)
WHEN MATCHED THEN
    UPDATE SET 
        T.MSG_TEXT = S.MSG_DESC, -- Legacy field mapping
        T.MSG_DESC = S.MSG_DESC,
        T.MSG_TITLE = S.MSG_TITLE,
        T.MSG_CATEGORY = S.MSG_CATEGORY,
        T.UPD_DT = SYSDATE,
        T.UPD_USER_ID = 'SYSTEM'
WHEN NOT MATCHED THEN
    INSERT (MSG_CODE, LANG_CODE, MSG_TYPE, MSG_CATEGORY, MSG_TITLE, MSG_DESC, USE_YN, REG_USER_ID, REG_DT, UPD_USER_ID, UPD_DT, MSG_TEXT)
    VALUES (S.MSG_CODE, S.LANG_CODE, S.MSG_TYPE, S.MSG_CATEGORY, S.MSG_TITLE, S.MSG_DESC, S.USE_YN, 'SYSTEM', SYSDATE, 'SYSTEM', SYSDATE, S.MSG_DESC);

COMMIT;
