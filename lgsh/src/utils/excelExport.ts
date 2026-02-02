/**
 * 공통 엑셀 다운로드 유틸리티
 */
import * as XLSX from 'xlsx';

/**
 * 엑셀 컬럼 설정 인터페이스
 */
export interface ExcelColumn {
  /** 데이터 필드 키 */
  key: string;
  /** 엑셀 헤더 제목 */
  title: string;
  /** 컬럼 너비 (기본값: 15) */
  width?: number;
  /** 값 변환 함수 (선택) */
  render?: (value: any, record: any) => string | number;
}

/**
 * 엑셀 다운로드 옵션 인터페이스
 */
export interface ExcelExportOptions {
  /** 파일명 (확장자 제외) */
  fileName: string;
  /** 시트명 (기본값: 'Sheet1') */
  sheetName?: string;
  /** 날짜/시간 포맷 자동 적용 여부 */
  formatDate?: boolean;
}

/**
 * 데이터를 엑셀 파일로 다운로드
 * @param data 내보낼 데이터 배열
 * @param columns 컬럼 설정 배열
 * @param options 다운로드 옵션
 */
export const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  columns: ExcelColumn[],
  options: ExcelExportOptions
): void => {
  const { fileName, sheetName = 'Sheet1', formatDate = true } = options;

  // 데이터가 없는 경우 빈 시트 생성
  if (!data || data.length === 0) {
    const emptyWs = XLSX.utils.aoa_to_sheet([columns.map((col) => col.title)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, emptyWs, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    return;
  }

  // 헤더 행 생성
  const headers = columns.map((col) => col.title);

  // 데이터 행 생성
  const rows = data.map((record) =>
    columns.map((col) => {
      const value = record[col.key];

      // 커스텀 렌더 함수가 있는 경우 사용
      if (col.render) {
        return col.render(value, record);
      }

      // 날짜 포맷팅
      if (formatDate && typeof value === 'string' && isDateString(value)) {
        return formatDateString(value);
      }

      // null/undefined 처리
      if (value === null || value === undefined) {
        return '';
      }

      return value;
    })
  );

  // AOA (Array of Arrays) 형식으로 변환
  const aoa = [headers, ...rows];

  // 워크시트 생성
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // 컬럼 너비 설정
  ws['!cols'] = columns.map((col) => ({
    wch: col.width || 15,
  }));

  // 워크북 생성 및 시트 추가
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // 파일 다운로드
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

/**
 * ISO 날짜 문자열인지 확인
 */
const isDateString = (value: string): boolean => {
  // ISO 8601 형식 체크 (예: 2024-01-15T10:30:00)
  const isoPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
  return isoPattern.test(value);
};

/**
 * 날짜 문자열 포맷팅 (YYYY-MM-DD HH:mm)
 */
const formatDateString = (value: string): string => {
  if (!value) return '';
  // T를 공백으로 변경하고 초 이후 제거
  return value.substring(0, 16).replace('T', ' ');
};

/**
 * 여러 시트를 포함한 엑셀 파일 다운로드
 * @param sheets 시트 정보 배열
 * @param fileName 파일명
 */
export const exportMultiSheetExcel = <T extends Record<string, any>>(
  sheets: Array<{
    data: T[];
    columns: ExcelColumn[];
    sheetName: string;
  }>,
  fileName: string
): void => {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ data, columns, sheetName }) => {
    const headers = columns.map((col) => col.title);

    const rows = data.map((record) =>
      columns.map((col) => {
        const value = record[col.key];
        if (col.render) {
          return col.render(value, record);
        }
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string' && isDateString(value)) {
          return formatDateString(value);
        }
        return value;
      })
    );

    const aoa = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = columns.map((col) => ({
      wch: col.width || 15,
    }));

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

/**
 * Ant Design Table 컬럼을 ExcelColumn으로 변환하는 헬퍼
 * @param columns Ant Design 테이블 컬럼
 * @param excludeKeys 제외할 컬럼 키 (예: 'action')
 */
export const convertAntdColumnsToExcel = (
  columns: Array<{ title?: React.ReactNode; dataIndex?: string; key?: string; width?: number }>,
  excludeKeys: string[] = ['action']
): ExcelColumn[] => {
  return columns
    .filter((col) => {
      const key = (col.key || col.dataIndex) as string;
      return key && !excludeKeys.includes(key);
    })
    .map((col) => ({
      key: (col.dataIndex || col.key) as string,
      title: typeof col.title === 'string' ? col.title : String(col.title || ''),
      width: col.width ? Math.floor(Number(col.width) / 8) : 15,
    }));
};

/**
 * DOM에서 Ant Design 테이블 데이터를 추출하여 엑셀로 내보내기
 * @param fileName 파일명 (확장자 제외)
 * @param tableIndex 페이지에 여러 테이블이 있을 경우 인덱스 (기본: 0)
 * @returns 성공 여부
 */
export const exportTableFromDOM = (fileName?: string, tableIndex: number = 0): boolean => {
  try {
    // Ant Design 테이블 찾기
    const tables = document.querySelectorAll('.ant-table-wrapper');
    if (tables.length === 0) {
      console.warn('테이블을 찾을 수 없습니다.');
      return false;
    }

    const tableWrapper = tables[tableIndex] || tables[0];
    const table = tableWrapper.querySelector('table');
    if (!table) {
      console.warn('테이블 요소를 찾을 수 없습니다.');
      return false;
    }

    // 헤더 추출
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) {
      console.warn('테이블 헤더를 찾을 수 없습니다.');
      return false;
    }

    const headers: string[] = [];
    const headerCells = headerRow.querySelectorAll('th');
    headerCells.forEach((th) => {
      const text = th.textContent?.trim() || '';
      // '관리', '작업' 등 액션 컬럼 제외
      if (!['관리', '작업', 'Action', 'Actions'].includes(text)) {
        headers.push(text);
      }
    });

    // 데이터 행 추출
    const bodyRows = table.querySelectorAll('tbody tr.ant-table-row');
    const rows: string[][] = [];

    bodyRows.forEach((tr) => {
      const row: string[] = [];
      const cells = tr.querySelectorAll('td');

      cells.forEach((td, index) => {
        // 액션 컬럼 제외 (헤더 수와 맞추기)
        if (index < headers.length) {
          // 태그, 버튼 등 제외하고 텍스트만 추출
          let text = '';

          // ant-tag 내용 추출
          const tag = td.querySelector('.ant-tag');
          if (tag) {
            text = tag.textContent?.trim() || '';
          } else {
            // 일반 텍스트 추출 (버튼 제외)
            const buttons = td.querySelectorAll('button, .ant-btn');
            if (buttons.length === 0) {
              text = td.textContent?.trim() || '';
            } else {
              // 버튼이 있으면 버튼 외의 텍스트만 추출
              const clone = td.cloneNode(true) as HTMLElement;
              clone.querySelectorAll('button, .ant-btn, .ant-space').forEach((el) => el.remove());
              text = clone.textContent?.trim() || '';
            }
          }

          row.push(text);
        }
      });

      if (row.length > 0) {
        rows.push(row);
      }
    });

    if (rows.length === 0) {
      console.warn('테이블에 데이터가 없습니다.');
      return false;
    }

    // AOA 형식으로 변환
    const aoa = [headers, ...rows];

    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // 컬럼 너비 자동 설정
    ws['!cols'] = headers.map((header) => ({
      wch: Math.max(header.length * 2, 10),
    }));

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // 파일명 생성
    const defaultFileName = `데이터_${new Date().toISOString().slice(0, 10)}`;
    XLSX.writeFile(wb, `${fileName || defaultFileName}.xlsx`);

    return true;
  } catch (error) {
    console.error('DOM 테이블 엑셀 내보내기 실패:', error);
    return false;
  }
};

/**
 * 페이지의 모든 테이블을 하나의 엑셀 파일로 내보내기 (여러 시트)
 * @param fileName 파일명 (확장자 제외)
 * @returns 성공 여부
 */
export const exportAllTablesFromDOM = (fileName?: string): boolean => {
  try {
    // ant-table-wrapper 단위로 찾기 (헤더/바디 테이블이 분리되어 있어도 하나의 wrapper 안에 있음)
    const tableWrappers = document.querySelectorAll('.ant-table-wrapper');
    console.log('[Excel Export] ant-table-wrapper 수:', tableWrappers.length);

    if (tableWrappers.length === 0) {
      console.warn('테이블을 찾을 수 없습니다.');
      return false;
    }

    const wb = XLSX.utils.book_new();
    let sheetCount = 0;

    tableWrappers.forEach((wrapper, wrapperIdx) => {
      console.log(`[Excel Export] Wrapper ${wrapperIdx + 1} 처리 시작`);

      // 헤더 테이블 찾기 (ant-table-header 내부 또는 일반 thead)
      let headerTable = wrapper.querySelector('.ant-table-header table');
      let bodyTable = wrapper.querySelector('.ant-table-body table');

      // scroll이 없는 경우 하나의 테이블에 헤더와 바디가 함께 있음
      if (!headerTable && !bodyTable) {
        const singleTable = wrapper.querySelector('.ant-table-content table');
        if (singleTable) {
          headerTable = singleTable;
          bodyTable = singleTable;
        }
      }

      // 그래도 없으면 직접 table 찾기
      if (!headerTable) {
        headerTable = wrapper.querySelector('table');
      }
      if (!bodyTable) {
        bodyTable = wrapper.querySelector('table');
      }

      console.log(`[Excel Export] headerTable:`, !!headerTable, `bodyTable:`, !!bodyTable);

      if (!headerTable) {
        console.log(`[Excel Export] 헤더 테이블 없음, 스킵`);
        return;
      }

      // 헤더 추출
      const headerRows = headerTable.querySelectorAll('thead tr');
      const headerRow = headerRows[headerRows.length - 1];
      if (!headerRow) {
        console.log(`[Excel Export] 헤더 row 없음, 스킵`);
        return;
      }

      const headers: string[] = [];
      const excludeColumns: number[] = [];
      const headerCells = headerRow.querySelectorAll('th');

      headerCells.forEach((th, idx) => {
        const text = th.textContent?.trim() || '';
        // '관리', '작업' 등 액션 컬럼 제외
        if (['관리', '작업', 'Action', 'Actions', ''].includes(text)) {
          excludeColumns.push(idx);
        } else {
          headers.push(text);
        }
      });

      console.log(`[Excel Export] 추출된 헤더:`, headers);

      if (headers.length === 0) {
        console.log(`[Excel Export] 헤더가 비어있음, 스킵`);
        return;
      }

      // 바디 테이블에서 데이터 추출
      if (!bodyTable) {
        console.log(`[Excel Export] 바디 테이블 없음, 스킵`);
        return;
      }

      const tbody = bodyTable.querySelector('tbody');
      if (!tbody) {
        console.log(`[Excel Export] tbody 없음, 스킵`);
        return;
      }

      // 데이터 행 찾기
      let bodyRows = tbody.querySelectorAll('tr.ant-table-row');
      if (bodyRows.length === 0) {
        bodyRows = tbody.querySelectorAll('tr[data-row-key]');
      }
      if (bodyRows.length === 0) {
        bodyRows = tbody.querySelectorAll('tr:not(.ant-table-placeholder):not(.ant-table-expanded-row):not(.ant-table-measure-row)');
      }

      console.log(`[Excel Export] 데이터 행 수:`, bodyRows.length);

      const rows: string[][] = [];

      bodyRows.forEach((tr) => {
        const row: string[] = [];
        const cells = tr.querySelectorAll('td');
        let headerIdx = 0;

        cells.forEach((td, cellIndex) => {
          // 제외 컬럼 건너뛰기
          if (excludeColumns.includes(cellIndex)) return;
          if (headerIdx >= headers.length) return;

          // 셀 내용 추출
          let text = '';

          // ant-tag 내용 추출 (여러 태그가 있을 수 있음)
          const tags = td.querySelectorAll('.ant-tag');
          if (tags.length > 0) {
            const tagTexts: string[] = [];
            tags.forEach((tag) => {
              const tagText = tag.textContent?.trim();
              if (tagText) tagTexts.push(tagText);
            });
            text = tagTexts.join(', ');
          } else {
            // 버튼, 아이콘 등 제외하고 텍스트만 추출
            const clone = td.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('button, .ant-btn, .ant-space, .anticon, svg').forEach((el) => el.remove());
            text = clone.textContent?.trim() || '';
          }

          row.push(text);
          headerIdx++;
        });

        if (row.length > 0 && row.some((cell) => cell !== '')) {
          rows.push(row);
        }
      });

      if (rows.length > 0) {
        const aoa = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = headers.map((header) => ({
          wch: Math.max(header.length * 2, 12),
        }));

        // 시트 이름 결정 (카드 타이틀에서 추출 시도)
        let sheetName = `Sheet${sheetCount + 1}`;
        const card = wrapper.closest('.ant-card');
        if (card) {
          const cardTitle = card.querySelector('.ant-card-head-title');
          if (cardTitle) {
            // 태그 제외하고 텍스트만 추출
            const clone = cardTitle.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.ant-tag').forEach((el) => el.remove());
            const titleText = clone.textContent?.trim().substring(0, 31) || '';
            if (titleText) {
              sheetName = titleText.replace(/[\\/*?[\]:]/g, '').trim();
            }
          }
        }

        // 중복 시트명 방지
        let finalSheetName = sheetName;
        let suffix = 1;
        while (wb.SheetNames.includes(finalSheetName)) {
          finalSheetName = `${sheetName}_${suffix}`;
          suffix++;
        }

        XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
        sheetCount++;
      }
    });

    if (sheetCount === 0) {
      console.warn('내보낼 데이터가 없습니다.');
      return false;
    }

    const defaultFileName = `데이터_${new Date().toISOString().slice(0, 10)}`;
    XLSX.writeFile(wb, `${fileName || defaultFileName}.xlsx`);

    return true;
  } catch (error) {
    console.error('DOM 테이블 엑셀 내보내기 실패:', error);
    return false;
  }
};
