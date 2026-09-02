import React, { useState, useEffect, useRef } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

export default function PdfPreviewFrame({ src, title = 'Document Preview', className = 'w-full h-[400px]', certName = '' }) {
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef(null);

  const cleanSrc = src ? src.trim() : '';

  useEffect(() => {
    if (!cleanSrc || cleanSrc === 'about:blank') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasError(false);

    // Keep loading spinner until iframe renders or auto-recovers
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [cleanSrc, retryKey]);

  const handleIframeLoad = () => {
    setLoading(false);
    setHasError(false);
  };

  const handleAutoRetry = () => {
    setLoading(true);
    setHasError(false);
    setRetryKey(prev => prev + 1);
  };

  if (!cleanSrc || cleanSrc === 'about:blank') {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-xl ${className}`}>
        <p className="text-sm text-slate-400">No document to preview.</p>
      </div>
    );
  }

  const iframeSrc = retryKey > 0 
    ? `${cleanSrc}${cleanSrc.includes('?') ? '&' : '?'}_t=${retryKey}` 
    : cleanSrc;

  return (
    <div className={`relative bg-slate-950 rounded-xl overflow-hidden ${className}`}>
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 text-center select-none transition-all">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-200">
            Generating Live Preview...
          </p>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Rendering high-definition document vectors...
          </p>
        </div>
      )}

      {/* Auto-Recovery Shield Overlay if server was sleeping */}
      {hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 p-4 text-center">
          <p className="text-sm font-bold text-slate-300 mb-2">Connecting to preview service...</p>
          <button
            type="button"
            onClick={handleAutoRetry}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Preview</span>
          </button>
        </div>
      )}

      {/* Actual Iframe Document Viewer */}
      <iframe
        ref={iframeRef}
        key={`${cleanSrc}_${retryKey}`}
        src={iframeSrc}
        title={title}
        onLoad={handleIframeLoad}
        onError={() => setHasError(true)}
        className="w-full h-full bg-white border-0"
        loading="eager"
      />
    </div>
  );
}
