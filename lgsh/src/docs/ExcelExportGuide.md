# 엑셀 내보내기 가이드

## 개요

이 문서는 페이지에서 전체 데이터 엑셀 내보내기 기능을 구현하는 방법을 설명합니다.

헤더의 엑셀 다운로드 버튼을 클릭하면:
1. **Context에 등록된 핸들러가 있는 경우**: API를 통해 전체 데이터를 조회하여 엑셀로 내보냅니다.
2. **핸들러가 없는 경우**: 현재 DOM에 표시된 테이블 데이터만 내보냅니다(fallback).

## 적용 방법

### 1. Import 추가

```tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useExcelExport } from '@/contexts';
import type { ExcelColumn } from '@/utils/excelExport';
```

### 2. 엑셀 컬럼 정의

페이지 컴포넌트 내부에서 엑셀에 표시할 컬럼을 정의합니다.

```tsx
// 엑셀 컬럼 정의
const excelColumns: ExcelColumn[] = useMemo(() => [
  { key: 'userId', title: '사용자ID', width: 15 },
  { key: 'userNm', title: '사용자명', width: 15 },
  { key: 'companyNm', title: '원청사', width: 20 },
  { key: 'email', title: '이메일', width: 25 },
  { key: 'useYn', title: '사용여부', width: 10 },
], []);
```

**ExcelColumn 타입:**
```typescript
interface ExcelColumn {
  key: string;      // 데이터 객체의 키
  title: string;    // 엑셀 헤더에 표시될 제목
  width?: number;   // 컬럼 너비 (기본값: 15)
}
```

### 3. 전체 데이터 조회 함수 구현

API를 호출하여 전체 데이터를 가져오는 함수를 구현합니다.

```tsx
// 전체 데이터 조회 함수 (엑셀용)
const fetchAllDataForExcel = useCallback(async (): Promise<YourDataType[]> => {
  const searchValues = searchForm.getFieldsValue();
  const response = await yourService.list({
    page: 0,
    size: 50000,  // 전체 조회 (최대 50,000건)
    ...searchValues,
  });
  if (response.success && response.data) {
    return response.data.content;
  }
  return [];
}, [searchForm]);
```

### 4. 핸들러 등록/해제

useEffect를 사용하여 핸들러를 등록하고, 컴포넌트 언마운트 시 해제합니다.

```tsx
// 엑셀 내보내기 훅
const { registerExportHandler, unregisterExportHandler } = useExcelExport();

// 핸들러 등록/해제
useEffect(() => {
  registerExportHandler('uniqueHandlerId', {
    sheetName: '시트명',           // 엑셀 시트 이름
    totalCount: total,             // 현재 검색 결과 총 건수
    fetchAllData: fetchAllDataForExcel,  // 전체 데이터 조회 함수
    columns: excelColumns,         // 엑셀 컬럼 정의
  });

  return () => {
    unregisterExportHandler('uniqueHandlerId');
  };
}, [registerExportHandler, unregisterExportHandler, total, fetchAllDataForExcel, excelColumns]);
```

## 전체 예제 코드

```tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Table, Form } from 'antd';
import type { User } from '@/types';
import { userService } from '@/services/userService';
import { useExcelExport } from '@/contexts';
import type { ExcelColumn } from '@/utils/excelExport';

const UserPage: React.FC = () => {
  const [searchForm] = Form.useForm();
  const [dataSource, setDataSource] = useState<User[]>([]);
  const [total, setTotal] = useState(0);

  // 엑셀 내보내기 훅
  const { registerExportHandler, unregisterExportHandler } = useExcelExport();

  // 엑셀 컬럼 정의
  const excelColumns: ExcelColumn[] = useMemo(() => [
    { key: 'userId', title: '사용자ID', width: 15 },
    { key: 'userNm', title: '사용자명', width: 15 },
    { key: 'email', title: '이메일', width: 25 },
    { key: 'useYn', title: '사용여부', width: 10 },
  ], []);

  // 전체 데이터 조회 함수 (엑셀용)
  const fetchAllDataForExcel = useCallback(async (): Promise<User[]> => {
    const searchValues = searchForm.getFieldsValue();
    const response = await userService.list({
      page: 0,
      size: 50000,
      ...searchValues,
    });
    if (response.success && response.data) {
      return response.data.content;
    }
    return [];
  }, [searchForm]);

  // 핸들러 등록/해제
  useEffect(() => {
    registerExportHandler('user', {
      sheetName: '사용자목록',
      totalCount: total,
      fetchAllData: fetchAllDataForExcel,
      columns: excelColumns,
    });

    return () => {
      unregisterExportHandler('user');
    };
  }, [registerExportHandler, unregisterExportHandler, total, fetchAllDataForExcel, excelColumns]);

  // ... 나머지 컴포넌트 코드
};

export default UserPage;
```

## 다중 시트 내보내기

한 페이지에서 여러 테이블이 있는 경우, 각 테이블마다 핸들러를 등록하면 자동으로 다중 시트 엑셀 파일이 생성됩니다.

```tsx
// 예: CommonCodePage - 대분류/소분류 테이블

// 대분류 핸들러 등록
registerExportHandler('majorCode', {
  sheetName: '대분류코드',
  totalCount: majorTotal,
  fetchAllData: fetchAllMajorDataForExcel,
  columns: majorExcelColumns,
});

// 소분류 핸들러 등록 (선택된 대분류가 있을 때만)
if (selectedMajorCode) {
  registerExportHandler('minorCode', {
    sheetName: '소분류코드',
    totalCount: minorTotal,
    fetchAllData: fetchAllMinorDataForExcel,
    columns: minorExcelColumns,
  });
}
```

## 경고 및 제한

- **5,000건 초과**: 대량 데이터 내보내기 확인 모달이 표시됩니다.
- **50,000건 초과**: 내보내기가 차단되며, 검색 조건을 추가하라는 메시지가 표시됩니다.

## 주의사항

1. **핸들러 ID는 고유해야 합니다**: 같은 ID로 등록하면 기존 핸들러가 덮어씌워집니다.
2. **useCallback/useMemo 사용**: 불필요한 리렌더링을 방지하기 위해 사용합니다.
3. **의존성 배열 관리**: useEffect의 의존성 배열에 관련 변수들을 포함해야 합니다.
4. **cleanup 함수 필수**: 컴포넌트 언마운트 시 반드시 `unregisterExportHandler`를 호출합니다.

## 적용된 페이지 목록

| 페이지 | 핸들러 ID | 시트명 |
|--------|-----------|--------|
| MessageCodePage | messageCode | 메시지코드 |
| CommonCodePage | majorCode, minorCode | 대분류코드, 소분류코드 |
| PersonPage | person | 대상자목록 |
| PersonGroupPage | personGroup | 관리그룹 |
| UserPage | user | 사용자목록 |
| UserApprovalPage | userApproval | 사용자승인 |
| CompanyPage | company | 원청사목록 |
