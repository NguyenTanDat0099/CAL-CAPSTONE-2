import React, { useState } from 'react';
import AdminApp from './admin/App';
import AuthApp from './auth/AuthApp';
import UserApp from './user/App';

export default function App() {
  const [activeView, setActiveView] = useState<'auth' | 'admin' | 'user'>(() => {
    const savedToken = localStorage.getItem('calai_token');
    const savedRole = localStorage.getItem('calai_role');
    return savedToken && (savedRole === 'admin' || savedRole === 'user') ? savedRole : 'auth';
  });

  const handleLoginSuccess = (role: 'admin' | 'user', token: string) => {
    localStorage.setItem('calai_token', token);
    localStorage.setItem('calai_role', role);
    setActiveView(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('calai_token');
    localStorage.removeItem('calai_role');
    setActiveView('auth');
  };

  return (
    <>
      {activeView === 'auth' && <AuthApp onLoginSuccess={handleLoginSuccess} />}
      {activeView === 'admin' && <AdminApp onLogout={handleLogout} />}
      {activeView === 'user' && <UserApp onLogout={handleLogout} />}
    </>
  );
}
