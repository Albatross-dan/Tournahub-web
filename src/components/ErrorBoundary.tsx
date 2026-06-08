import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public props: Props;
  public state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught React exception detected:', error, errorInfo);
  }

  private handleReload = () => {
    console.log('[ErrorBoundary] User triggered application reload...');
    window.location.reload();
  };

  private handleGoHome = () => {
    console.log('[ErrorBoundary] User returning to dashboard...');
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'Unknown runtime error';
      // Detect common dynamic import / chunk load failures (crucial for PWA updates)
      const isChunkLoadError = errorMessage.toLowerCase().includes('chunk') || 
                              errorMessage.toLowerCase().includes('loading') ||
                              errorMessage.toLowerCase().includes('dynamically imported');

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0b1e] text-slate-205 select-none">
          <div className="w-full max-w-lg bg-[#0d0f26] border-2 border-red-500/10 rounded-3xl p-10 text-center shadow-2xl relative">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-400 animate-pulse">
                <AlertTriangle className="w-8 h-8" />
              </div>
            </div>

            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 leading-none">
              Platform Error
            </h3>

            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-6">
              Diagnostics Recovery Panel
            </p>

            <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl text-left space-y-2 mb-8">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">
                System Exception Signature:
              </span>
              <p className="text-xs font-mono font-bold text-red-400 leading-relaxed break-all">
                "{errorMessage}"
              </p>
              {isChunkLoadError && (
                <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider italic mt-2">
                  Tip: A new version of the app might be available. Reloading will sync the latest files.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={this.handleReload}
                className="flex-1 py-4 bg-primary hover:bg-white text-slate-950 font-black uppercase italic tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 duration-200 cursor-pointer"
              >
                <RotateCw className="w-4 h-4 text-slate-950 stroke-[3px]" />
                Reload Application
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-black uppercase italic tracking-widest rounded-2xl transition-all border border-slate-700/50 flex items-center justify-center gap-2 shadow-lg active:scale-95 duration-200 cursor-pointer"
              >
                <Home className="w-4 h-4 stroke-[3px]" />
                Main Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
