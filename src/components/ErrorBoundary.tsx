import React from 'react';

interface Props {
  children?: any;
  fallback?: any;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
  }

  static getDerivedStateFromError(error: any) {
    return {
      hasError: true,
      errorMessage: error?.message || String(error)
    };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Captured React rendering error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('fu_active_user_session');
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center text-3xl">
              ⚠️
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Something went wrong</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                The application encountered an unexpected runtime issue. Your session data is safely stored locally.
              </p>
            </div>

            {this.state.errorMessage && (
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-left overflow-auto max-h-32 text-[11px] font-mono text-red-400">
                {this.state.errorMessage}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg active:scale-95"
              >
                Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
