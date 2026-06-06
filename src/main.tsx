import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 30, background: '#180202', color: '#fca5a5', fontFamily: 'monospace', zIndex: 999999, position: 'fixed', inset: 0, overflow: 'auto', border: '5px solid #dc2626' }}>
          <h2 style={{ color: '#ef4444', borderBottom: '1px solid #ef4444', paddingBottom: 10 }}>⚠️ React Render Exception Captured</h2>
          <pre style={{ background: '#000', padding: 20, borderRadius: 8, whiteSpace: 'pre-wrap', color: '#fff' }}>
            {this.state.error?.message}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ background: '#ef4444', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
