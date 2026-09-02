import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import { getApiBaseUrl } from './services/api';

export default function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  const isLoggedIn = Boolean(sessionStorage.getItem('admin_token'));

  useEffect(() => {
    // Keep-alive: wake Render backend and keep it warm
    const cleanBase = getApiBaseUrl().replace(/\/$/, '');

    const pingBackend = async (retries = 3) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      try {
        // Use no-cors: we only need to wake the server, not read the response
        // This eliminates CORS console errors when Render is cold-starting (502)
        await fetch(`${cleanBase}/api/certificates/health/`, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
        });
      } catch {
        // Silently retry on network error
        if (retries > 0) {
          setTimeout(() => pingBackend(retries - 1), 15000);
        }
      }
    };

    // Immediate warm-up ping on page load
    pingBackend();

    // Heartbeat every 4 minutes to prevent Render spin-down (free tier: 15 min timeout)
    const interval = setInterval(() => pingBackend(), 4 * 60 * 1000);

    // Re-ping when browser comes back online
    window.addEventListener('online', () => pingBackend());

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', () => pingBackend());
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {!isLoginPage && <Navbar />}
      <main className={`flex-1 flex flex-col transition-all ${!isLoginPage && isLoggedIn ? 'lg:pl-64' : ''}`}>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </main>
    </div>
  );
}

