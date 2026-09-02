import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    // If a new build was deployed and browser tried loading an old deleted chunk, auto-refresh once
    const msg = error?.message || '';
    if (msg.includes('dynamically imported module') || msg.includes('Failed to fetch dynamically imported module')) {
      const hasReloaded = sessionStorage.getItem('chunk_reload_attempt');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload_attempt', 'true');
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50">
          <div className="bg-white border-2 border-red-200 rounded-3xl p-8 max-w-lg w-full shadow-xl text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Something went wrong</h2>
            <p className="text-xs text-gray-500 font-medium">
              An unexpected UI rendering error occurred. {this.state.error?.message && `(${this.state.error.message})`}
            </p>
            <div className="pt-2">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
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
