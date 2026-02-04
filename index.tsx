
import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- ERROR BOUNDARY (CRÍTICO PARA DEBUGGING) ---
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("CRITICAL APP ERROR:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          backgroundColor: '#050505', 
          color: '#ef4444', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem',
          fontFamily: 'monospace'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            System Malfunction
          </h1>
          <div style={{ 
            backgroundColor: '#111', 
            border: '1px solid #333', 
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            maxWidth: '800px', 
            width: '100%',
            overflow: 'auto'
          }}>
            <p style={{ fontWeight: 'bold', marginBottom: '1rem', color: '#fff' }}>
              Error Trace:
            </p>
            <pre style={{ color: '#ef4444', whiteSpace: 'pre-wrap' }}>
              {this.state.error?.toString()}
            </pre>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666' }}>
              Revisa la consola del navegador (F12) para más detalles técnicos.
            </p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            style={{ 
              marginTop: '2rem', 
              padding: '1rem 2rem', 
              backgroundColor: '#fff', 
              color: '#000', 
              border: 'none', 
              fontWeight: '900', 
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}
          >
            Reiniciar Sistema
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
