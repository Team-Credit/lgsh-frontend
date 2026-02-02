/**
 * 로지신해 - 커스텀 훅 모음
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { codeService } from '@/services/codeService';
import type { MinorCode } from '@/types';

// Redux 훅 re-export
export { useAppDispatch, useAppSelector } from './redux';

// 토큰 자동 갱신 훅
export { useTokenRefresh } from './useTokenRefresh';

/**
 * 공통코드 옵션 타입
 */
export interface CodeOption {
  value: string;
  label: string;
  data?: MinorCode;
}

/**
 * 공통코드 캐시 (세션 동안 유지)
 */
const codeCache: Record<string, CodeOption[]> = {};

/**
 * 공통코드 조회 훅
 * @param majorCode 대분류 코드
 * @param useCache 캐시 사용 여부 (기본: true)
 */
export function useCommonCode(majorCode: string, useCache: boolean = true) {
  const [options, setOptions] = useState<CodeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!majorCode) {
      setOptions([]);
      return;
    }

    // 캐시에서 조회
    if (useCache && codeCache[majorCode]) {
      setOptions(codeCache[majorCode]);
      return;
    }

    const fetchCodes = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await codeService.getCodeListByMajorCode(majorCode);
        const codeOptions: CodeOption[] = data
          .filter((item) => item.useYn === 'Y')
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((item) => ({
            value: item.minorCode,
            label: item.minorCodeNm || item.minorCode,
            data: item,
          }));

        // 캐시에 저장
        if (useCache) {
          codeCache[majorCode] = codeOptions;
        }
        setOptions(codeOptions);
      } catch (err) {
        console.error(`공통코드 조회 실패 (${majorCode}):`, err);
        setError(err instanceof Error ? err.message : '공통코드 조회 실패');
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCodes();
  }, [majorCode, useCache]);

  // 코드값으로 라벨 찾기
  const getLabel = useCallback(
    (value: string | undefined | null): string => {
      if (!value) return '-';
      const found = options.find((opt) => opt.value === value);
      return found ? found.label : value;
    },
    [options]
  );

  // 캐시 초기화
  const clearCache = useCallback(() => {
    if (majorCode && codeCache[majorCode]) {
      delete codeCache[majorCode];
    }
  }, [majorCode]);

  return { options, loading, error, getLabel, clearCache };
}

/**
 * 여러 공통코드 한번에 조회하는 훅
 * @param majorCodes 대분류 코드 배열
 */
export function useCommonCodes(majorCodes: string[]) {
  const [codeMap, setCodeMap] = useState<Record<string, CodeOption[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!majorCodes || majorCodes.length === 0) {
      setCodeMap({});
      return;
    }

    const fetchAllCodes = async () => {
      setLoading(true);
      setError(null);
      try {
        const newCodeMap: Record<string, CodeOption[]> = {};

        await Promise.all(
          majorCodes.map(async (majorCode) => {
            // 캐시에서 조회
            if (codeCache[majorCode]) {
              newCodeMap[majorCode] = codeCache[majorCode];
              return;
            }

            const data = await codeService.getCodeListByMajorCode(majorCode);
            const codeOptions: CodeOption[] = data
              .filter((item) => item.useYn === 'Y')
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .map((item) => ({
                value: item.minorCode,
                label: item.minorCodeNm || item.minorCode,
                data: item,
              }));

            // 캐시에 저장
            codeCache[majorCode] = codeOptions;
            newCodeMap[majorCode] = codeOptions;
          })
        );

        setCodeMap(newCodeMap);
      } catch (err) {
        console.error('공통코드 조회 실패:', err);
        setError(err instanceof Error ? err.message : '공통코드 조회 실패');
      } finally {
        setLoading(false);
      }
    };

    fetchAllCodes();
  }, [majorCodes.join(',')]);

  // 코드값으로 라벨 찾기
  const getLabel = useCallback(
    (majorCode: string, value: string | undefined | null): string => {
      if (!value) return '-';
      const options = codeMap[majorCode] || [];
      const found = options.find((opt) => opt.value === value);
      return found ? found.label : value;
    },
    [codeMap]
  );

  return { codeMap, loading, error, getLabel };
}

/**
 * 디바운스 훅
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 로컬스토리지 훅
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error('localStorage 저장 실패:', error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

/**
 * 이전 값 추적 훅
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

/**
 * 마운트 상태 확인 훅
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

/**
 * 토글 훅
 */
export function useToggle(
  initialValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => setValue((prev) => !prev), []);
  const set = useCallback((newValue: boolean) => setValue(newValue), []);
  
  return [value, toggle, set];
}

/**
 * 폼 상태 관리 훅
 */
export function useForm<T extends Record<string, unknown>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
      
      setValues((prev) => ({
        ...prev,
        [name]: newValue,
      }));
    },
    []
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
  }, [initialValues]);

  const setValue = useCallback((name: keyof T, value: T[keyof T]) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  return { values, handleChange, resetForm, setValue, setValues };
}

/**
 * 페이지네이션 훅
 */
export function usePagination(initialPage: number = 1, initialSize: number = 20) {
  const [page, setPage] = useState(initialPage);
  const [size, setSize] = useState(initialSize);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / size);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages || 1)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNext) setPage((prev) => prev + 1);
  }, [hasNext]);

  const prevPage = useCallback(() => {
    if (hasPrev) setPage((prev) => prev - 1);
  }, [hasPrev]);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    size,
    total,
    totalPages,
    hasNext,
    hasPrev,
    setPage: goToPage,
    setSize,
    setTotal,
    nextPage,
    prevPage,
    reset,
  };
}

/**
 * API 호출 훅
 */
export function useApi<T, P extends unknown[]>(
  apiFunction: (...args: P) => Promise<{ data: { success: boolean; data: T; message?: string } }>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const execute = useCallback(
    async (...args: P) => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await apiFunction(...args);
        
        if (isMounted()) {
          if (response.data.success) {
            setData(response.data.data);
            return response.data.data;
          } else {
            setError(response.data.message || '요청 실패');
            return null;
          }
        }
        return null;
      } catch (err) {
        if (isMounted()) {
          const message = err instanceof Error ? err.message : '알 수 없는 오류';
          setError(message);
        }
        return null;
      } finally {
        if (isMounted()) {
          setLoading(false);
        }
      }
    },
    [apiFunction, isMounted]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}
