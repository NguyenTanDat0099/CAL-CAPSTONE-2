import React, { useEffect, useState, Suspense, lazy } from 'react';
import AuthApp from './auth/AuthApp';
import UserApp from './user/App';
import { buildApiUrl } from './config/api';

const AdminApp = lazy(() => import('./admin/App').then(m => ({ default: m.default })));

const AUTH_TOKEN_KEY = 'calai_token';
const AUTH_ROLE_KEY = 'calai_role';

const clearStoredAuth = () => {
  try {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_ROLE_KEY);
  } catch {}
};

export default function App() {
  const [activeView, setActiveView] = useState<'auth' | 'admin' | 'user' | 'loading'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateSession();
  }, []);

  const validateSession = async () => {
    let savedToken = '';
    let savedRole = '';

    try {
      savedToken = sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
      savedRole = sessionStorage.getItem(AUTH_ROLE_KEY) || '';
    } catch {
      setActiveView('auth');
      return;
    }

    if (!savedToken || !savedRole) {
      setActiveView('auth');
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/auth/validate'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${savedToken}` },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.valid && (savedRole === 'admin' || savedRole === 'user')) {
          setActiveView(savedRole);
          return;
        }
      }

      clearStoredAuth();
      setActiveView('auth');
    } catch {
      clearStoredAuth();
      setError('Backend chưa sẵn sàng.');
      setActiveView('auth');
    }
  };

  const handleLoginSuccess = (role: 'admin' | 'user', token: string) => {
    try {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      sessionStorage.setItem(AUTH_ROLE_KEY, role);
    } catch {}
    setError(null);
    setActiveView(role);
  };

  const handleLogout = () => {
    clearStoredAuth();
    setError(null);
    setActiveView('auth');
  };

  if (activeView === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#050505', color: '#888', fontFamily: 'system-ui' }}>
        Loading...
      </div>
    );
  }

  if (activeView === 'auth') {
    return <AuthApp onLoginSuccess={handleLoginSuccess} />;
  }

  if (activeView === 'admin') {
    return (
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0e0e0e', color: '#ff9060', fontFamily: 'system-ui' }}>
          Loading Admin...
        </div>
      }>
        <AdminApp onLogout={handleLogout} />
      </Suspense>
    );
  }

  return <UserApp onLogout={handleLogout} />;
}
