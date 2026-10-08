import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

/** Keeps a render failure in one section from blanking the whole panel. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error en el panel:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="shell__body">
        <div className="empty">
          <strong>Algo salió mal en esta sección</strong>
          <p className="muted">{this.state.error.message}</p>
          <button className="btn btn--primary" onClick={() => this.setState({ error: null })} type="button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }
}