/**
 * 엑셀 내보내기 Context
 * - 각 페이지에서 전체 데이터 내보내기 함수를 등록
 * - MainLayout의 엑셀 버튼에서 이를 사용하여 전체 데이터 내보내기
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Modal, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { exportToExcel, exportMultiSheetExcel, type ExcelColumn } from '@/utils/excelExport';

// 내보내기 핸들러 타입
export interface ExportHandler {
  /** 시트명 */
  sheetName: string;
  /** 전체 건수 (경고 메시지용) */
  totalCount: number;
  /** 데이터를 가져오는 함수 */
  fetchAllData: () => Promise<any[]>;
  /** 엑셀 컬럼 정의 */
  columns: ExcelColumn[];
}

// Context 타입
interface ExcelExportContextType {
  /** 내보내기 핸들러 등록 */
  registerExportHandler: (id: string, handler: ExportHandler) => void;
  /** 내보내기 핸들러 해제 */
  unregisterExportHandler: (id: string) => void;
  /** 전체 데이터 내보내기 실행 */
  exportAll: (fileName?: string) => Promise<boolean>;
  /** 등록된 핸들러 유무 */
  hasHandlers: boolean;
  /** 내보내기 진행 중 여부 */
  isExporting: boolean;
}

// 경고 표시 기준 건수
const WARNING_THRESHOLD = 5000;
const MAX_EXPORT_LIMIT = 50000;

const ExcelExportContext = createContext<ExcelExportContextType | null>(null);

interface ExcelExportProviderProps {
  children: React.ReactNode;
}

export const ExcelExportProvider: React.FC<ExcelExportProviderProps> = ({ children }) => {
  const handlersRef = useRef<Map<string, ExportHandler>>(new Map());
  const [hasHandlers, setHasHandlers] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 핸들러 등록
  const registerExportHandler = useCallback((id: string, handler: ExportHandler) => {
    handlersRef.current.set(id, handler);
    setHasHandlers(true);
  }, []);

  // 핸들러 해제
  const unregisterExportHandler = useCallback((id: string) => {
    handlersRef.current.delete(id);
    setHasHandlers(handlersRef.current.size > 0);
  }, []);

  // 전체 데이터 내보내기
  const exportAll = useCallback(async (fileName?: string): Promise<boolean> => {
    const handlers = Array.from(handlersRef.current.entries());

    if (handlers.length === 0) {
      return false; // 핸들러 없음 - DOM 방식으로 fallback
    }

    // 전체 건수 계산
    const totalCount = handlers.reduce((sum, [, h]) => sum + h.totalCount, 0);

    // 최대 건수 초과 체크
    if (totalCount > MAX_EXPORT_LIMIT) {
      message.error(`데이터가 너무 많습니다. (${totalCount.toLocaleString()}건) 검색 조건을 추가하여 ${MAX_EXPORT_LIMIT.toLocaleString()}건 이하로 줄여주세요.`);
      return true;
    }

    // 경고 표시 (대량 데이터)
    if (totalCount > WARNING_THRESHOLD) {
      return new Promise((resolve) => {
        Modal.confirm({
          title: '대량 데이터 내보내기',
          icon: <ExclamationCircleOutlined />,
          content: (
            <div>
              <p>총 <strong>{totalCount.toLocaleString()}</strong>건의 데이터를 내보내려고 합니다.</p>
              <p>데이터 양이 많아 다소 시간이 걸릴 수 있습니다.</p>
              <p>계속하시겠습니까?</p>
            </div>
          ),
          okText: '내보내기',
          cancelText: '취소',
          onOk: async () => {
            const result = await performExport(handlers, fileName);
            resolve(result);
          },
          onCancel: () => {
            resolve(true);
          },
        });
      });
    }

    return performExport(handlers, fileName);
  }, []);

  // 실제 내보내기 수행
  const performExport = async (
    handlers: [string, ExportHandler][],
    fileName?: string
  ): Promise<boolean> => {
    setIsExporting(true);

    try {
      if (handlers.length === 1) {
        // 단일 시트
        const [, handler] = handlers[0];
        const data = await handler.fetchAllData();

        if (data.length === 0) {
          message.warning('내보낼 데이터가 없습니다.');
          return true;
        }

        const defaultFileName = `${handler.sheetName}_${new Date().toISOString().slice(0, 10)}`;
        exportToExcel(data, handler.columns, {
          fileName: fileName || defaultFileName,
          sheetName: handler.sheetName,
        });

        message.success(`${data.length.toLocaleString()}건의 데이터를 내보냈습니다.`);
      } else {
        // 다중 시트
        const sheets = await Promise.all(
          handlers.map(async ([, handler]) => ({
            data: await handler.fetchAllData(),
            columns: handler.columns,
            sheetName: handler.sheetName,
          }))
        );

        const totalExported = sheets.reduce((sum, s) => sum + s.data.length, 0);

        if (totalExported === 0) {
          message.warning('내보낼 데이터가 없습니다.');
          return true;
        }

        const defaultFileName = `데이터_${new Date().toISOString().slice(0, 10)}`;
        exportMultiSheetExcel(sheets, fileName || defaultFileName);

        message.success(`총 ${totalExported.toLocaleString()}건의 데이터를 내보냈습니다.`);
      }

      return true;
    } catch (error) {
      console.error('엑셀 내보내기 실패:', error);
      message.error('엑셀 내보내기에 실패했습니다.');
      return true;
    } finally {
      setIsExporting(false);
    }
  };

  const value: ExcelExportContextType = {
    registerExportHandler,
    unregisterExportHandler,
    exportAll,
    hasHandlers,
    isExporting,
  };

  return (
    <ExcelExportContext.Provider value={value}>
      {children}
    </ExcelExportContext.Provider>
  );
};

// Hook
export const useExcelExport = (): ExcelExportContextType => {
  const context = useContext(ExcelExportContext);
  if (!context) {
    throw new Error('useExcelExport must be used within ExcelExportProvider');
  }
  return context;
};

export default ExcelExportContext;
