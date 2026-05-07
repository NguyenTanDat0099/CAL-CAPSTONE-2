import React, { useEffect, useState } from 'react';
import AdminApp from './admin/App';
import AuthApp from './auth/AuthApp';
import { buildApiUrl } from './config/api';
import UserApp from './user/App';

const AUTH_TOKEN_KEY = 'calai_token';
const AUTH_ROLE_KEY = 'calai_role';

const clearStoredAuth = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ROLE_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_ROLE_KEY);
};

export default function App() {
  const [activeView, setActiveView] = useState<'auth' | 'admin' | 'user' | 'loading'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateSession();
  }, []);

  const validateSession = async () => {
    const legacyToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const legacyRole = localStorage.getItem(AUTH_ROLE_KEY);

    if (legacyToken || legacyRole) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_ROLE_KEY);
    }

    const savedToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
    const savedRole = sessionStorage.getItem(AUTH_ROLE_KEY);

    if (!savedToken || !savedRole) {
      setActiveView('auth');
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/auth/validate'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
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
      setError('Backend is not ready. Please sign in again after the server is running.');
      setActiveView('auth');
    }
  };

  const handleLoginSuccess = (role: 'admin' | 'user', token: string) => {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    sessionStorage.setItem(AUTH_ROLE_KEY, role);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_ROLE_KEY);
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
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  if (activeView === 'auth') {
    return <AuthApp onLoginSuccess={handleLoginSuccess} />;
  }

  if (activeView === 'admin') {
    return <AdminApp onLogout={handleLogout} />;
  }

  return <UserApp onLogout={handleLogout} />;
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '16px',
    color: '#666',
    fontFamily: 'system-ui, sans-serif',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e0e0e0',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};
