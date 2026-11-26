import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home, LogIn } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global ErrorBoundary to prevent unhandled React exceptions
 * from unmounting the component tree into a blank/black screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught application exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleGoLogin = () => {
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-6 font-space selection:bg-red-500 selection:text-white">
          <div className="max-w-lg w-full bg-zinc-950 border-2 border-red-500/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-archivo text-xl uppercase tracking-tight text-white">
                  {this.props.fallbackTitle || 'OPERATIONAL SYSTEM FAULT'}
                </h1>
                <p className="text-xs text-zinc-400">
                  An unhandled rendering exception was intercepted.
                </p>
              </div>
            </div>

            <div className="my-4 p-3 bg-red-950/40 border border-red-500/30 rounded text-red-300 text-xs font-mono break-all max-h-36 overflow-y-auto">
              {this.state.error?.message || 'Unknown runtime error occurred.'}
            </div>

            <p className="text-xs text-zinc-400 mb-6">
              The application runtime encountered a fault. Your session remains secure. You can reload the application or return to a safe operational screen.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-3 py-2 bg-[#FF4D00] hover:bg-white text-black font-bold text-xs uppercase rounded transition flex items-center justify-center gap-1.5 shadow"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload
              </button>
              <button
                type="button"
                onClick={this.handleGoLogin}
                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs uppercase rounded transition flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" /> Login
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs uppercase rounded transition flex items-center justify-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" /> Overview
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
