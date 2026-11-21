import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  /** Функция `componentDidCatch`. */
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Zametnik UI error:', error, info);
  }

  /** Функция `render`. */
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            background: '#161724',
            color: '#e8eaf0',
            fontFamily: 'Segoe UI, system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: 520 }}>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>Не удалось запустить интерфейс</h1>
            <p style={{ color: '#9498b0', marginBottom: 16 }}>
              Перезапустите приложение. Если ошибка повторяется — сообщите текст ниже.
            </p>
            <pre
              style={{
                background: '#1f2030',
                border: '1px solid #2a2b3d',
                borderRadius: 12,
                padding: 16,
                overflow: 'auto',
                fontSize: 12,
                whiteSpace: 'pre-wrap',
              }}
            >
              {this.state.error.message}
            </pre>
            <button
              type="button"
              style={{
                marginTop: 16,
                padding: '10px 18px',
                borderRadius: 10,
                border: 'none',
                background: '#7c9eff',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => window.location.reload()}
            >
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
