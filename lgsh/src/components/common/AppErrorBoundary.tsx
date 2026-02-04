import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[APP-ERROR-BOUNDARY]', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <h2>화면 렌더링 오류가 발생했습니다.</h2>
          <p>브라우저 새로고침 후 다시 시도해 주세요.</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.errorMessage}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
