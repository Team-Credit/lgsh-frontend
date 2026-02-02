/**
 * 엑셀 내보내기 버튼 컴포넌트
 */
import { useState } from 'react';
import { Button, message } from 'antd';
import type { ButtonProps } from 'antd';
import { FileExcelOutlined, LoadingOutlined } from '@ant-design/icons';
import { exportToExcel, type ExcelColumn, type ExcelExportOptions } from '@/utils/excelExport';

interface ExcelExportButtonProps<T extends Record<string, any>>
  extends Omit<ButtonProps, 'onClick'> {
  /** 내보낼 데이터 (또는 데이터를 반환하는 함수) */
  data: T[] | (() => T[] | Promise<T[]>);
  /** 엑셀 컬럼 설정 */
  columns: ExcelColumn[];
  /** 파일명 (확장자 제외) */
  fileName: string;
  /** 시트명 (기본값: 'Sheet1') */
  sheetName?: string;
  /** 내보내기 완료 후 콜백 */
  onExportComplete?: () => void;
  /** 내보내기 실패 후 콜백 */
  onExportError?: (error: Error) => void;
}

function ExcelExportButton<T extends Record<string, any>>({
  data,
  columns,
  fileName,
  sheetName = 'Sheet1',
  onExportComplete,
  onExportError,
  children,
  disabled,
  ...buttonProps
}: ExcelExportButtonProps<T>) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);

      // 데이터가 함수인 경우 호출
      let exportData: T[];
      if (typeof data === 'function') {
        exportData = await data();
      } else {
        exportData = data;
      }

      // 데이터 검증
      if (!exportData || exportData.length === 0) {
        message.warning('내보낼 데이터가 없습니다.');
        return;
      }

      // 엑셀 내보내기 실행
      const options: ExcelExportOptions = {
        fileName,
        sheetName,
        formatDate: true,
      };

      exportToExcel(exportData, columns, options);
      message.success(`${exportData.length}건의 데이터를 내보냈습니다.`);
      onExportComplete?.();
    } catch (error) {
      console.error('엑셀 내보내기 실패:', error);
      message.error('엑셀 내보내기에 실패했습니다.');
      onExportError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      icon={loading ? <LoadingOutlined /> : <FileExcelOutlined />}
      onClick={handleExport}
      disabled={disabled || loading}
      {...buttonProps}
    >
      {children || '엑셀'}
    </Button>
  );
}

export default ExcelExportButton;
