/**
 * 로지신해 앱 엔트리 포인트
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 저장된 폰트 크기를 앱 시작 시 CSS 변수로 설정
const initFontSize = () => {
  try {
    const stored = localStorage.getItem('appFontSize');
    if (stored) {
      const size = parseInt(stored, 10);
      if (size >= 12 && size <= 20) {
        document.documentElement.style.setProperty('--app-font-size', `${size}px`);
      }
    }
  } catch (error) {
    console.error('폰트 크기 초기화 실패:', error);
  }
};

initFontSize();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
