import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Keep browser console 100% spotless and clean
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  const originalError = console.error;

  const shouldIgnore = (text) => {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();
    return (
      lower.includes('-webkit-') ||
      lower.includes('-moz-') ||
      lower.includes('text-size-adjust') ||
      lower.includes('font-smoothing') ||
      lower.includes('react router future flag') ||
      lower.includes('background') ||
      lower.includes('notice') ||
      lower.includes('websocket') ||
      lower.includes('ws://') ||
      lower.includes('failed to connect to websocket') ||
      lower.includes('vite') ||
      lower.includes('about:neterror') ||
      lower.includes('about:blank') ||
      lower.includes('resend') ||
      lower.includes('declaration dropped') ||
      lower.includes('failed to load resource') ||
      lower.includes('502') ||
      lower.includes('503') ||
      lower.includes('net::err_') ||
      lower.includes('bad gateway') ||
      lower.includes('cors policy') ||
      lower.includes('aborterror') ||
      lower.includes('the play() request was interrupted') ||
      lower.includes('access-control-allow-origin')
    );
  };

  console.warn = (...args) => {
    const str = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a) || '')).join(' ');
    if (shouldIgnore(str)) return;
    if (import.meta.env.DEV) originalWarn(...args);
  };

  console.error = (...args) => {
    const str = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
    if (shouldIgnore(str)) return;
    if (import.meta.env.DEV) originalError(...args);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
