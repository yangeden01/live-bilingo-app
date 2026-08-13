import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  sessionStorage.removeItem('bilingo_reload_attempted');
} catch (e) {}

window.addEventListener('error', (event) => {
  console.error('[Global JS Error]:', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.warn('[Global Promise Rejection]:', event.reason);
});

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in App component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0b0f19',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '24px',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            border: '1px solid #334155',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171', marginBottom: '12px' }}>
              ⚠️ 雙語電台載入遇到異常
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px', lineHeight: '1.5' }}>
              {this.state.error?.message || '初始化渲染時發生未預期的系統錯誤'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔄 重新載入畫面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function mountApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountApp);
    } else {
      setTimeout(mountApp, 50);
    }
    return;
  }

  try {
    createRoot(rootElement).render(
      <StrictMode>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </StrictMode>,
    );

    if (typeof window !== 'undefined' && (window as any).AndroidBridge && (window as any).AndroidBridge.onPageReady) {
      try {
        (window as any).AndroidBridge.onPageReady();
      } catch (e) {
        console.warn('Failed to call AndroidBridge.onPageReady:', e);
      }
    }
  } catch (err) {
    console.error('Failed to mount React app:', err);
  }
}

mountApp();


