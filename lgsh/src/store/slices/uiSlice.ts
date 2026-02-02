/**
 * UI 설정 상태 관리
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  fontSize: number; // 기본 폰트 크기 (12~20px)
  darkMode: boolean; // 다크모드 여부
}

const initialState: UIState = {
  fontSize: 14, // 기본값
  darkMode: false, // 기본값: 라이트모드
};

// localStorage에서 저장된 폰트 크기 불러오기
const getStoredFontSize = (): number => {
  try {
    const stored = localStorage.getItem('appFontSize');
    if (stored) {
      const size = parseInt(stored, 10);
      if (size >= 12 && size <= 20) {
        return size;
      }
    }
  } catch (error) {
    console.error('폰트 크기 불러오기 실패:', error);
  }
  return 14;
};

// localStorage에서 저장된 다크모드 설정 불러오기
const getStoredDarkMode = (): boolean => {
  try {
    const stored = localStorage.getItem('appDarkMode');
    if (stored) {
      return stored === 'true';
    }
    // 시스템 설정 확인
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
  } catch (error) {
    console.error('다크모드 설정 불러오기 실패:', error);
  }
  return false;
};

initialState.fontSize = getStoredFontSize();
initialState.darkMode = getStoredDarkMode();

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setFontSize: (state, action: PayloadAction<number>) => {
      state.fontSize = action.payload;
      // localStorage에 저장
      try {
        localStorage.setItem('appFontSize', action.payload.toString());
        // HTML root에 CSS 변수 설정
        document.documentElement.style.setProperty('--app-font-size', `${action.payload}px`);
      } catch (error) {
        console.error('폰트 크기 저장 실패:', error);
      }
    },
    resetFontSize: (state) => {
      state.fontSize = 14;
      try {
        localStorage.removeItem('appFontSize');
        document.documentElement.style.setProperty('--app-font-size', '14px');
      } catch (error) {
        console.error('폰트 크기 초기화 실패:', error);
      }
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
      try {
        localStorage.setItem('appDarkMode', action.payload.toString());
        // HTML root에 dark 클래스 추가/제거
        if (action.payload) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (error) {
        console.error('다크모드 설정 저장 실패:', error);
      }
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      try {
        localStorage.setItem('appDarkMode', state.darkMode.toString());
        if (state.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (error) {
        console.error('다크모드 토글 실패:', error);
      }
    },
  },
});

export const { setFontSize, resetFontSize, setDarkMode, toggleDarkMode } = uiSlice.actions;
export default uiSlice.reducer;
