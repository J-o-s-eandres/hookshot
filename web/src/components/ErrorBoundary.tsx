import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-ink-950 text-slate-300 px-4">
          <h1 className="text-xl font-bold text-white mb-2">Algo salió mal</h1>
          <p className="text-sm text-slate-500 mb-4 max-w-md text-center">
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm"
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
