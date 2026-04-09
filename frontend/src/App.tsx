import React, { useState } from 'react';
import AdminApp from './admin/App';
import UserApp from './user/App';

export default function App() {
  const [activeView, setActiveView] = useState<'admin' | 'user'>('admin');

  return (
    <>
      <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 rounded-2xl border border-white/10 bg-surface-dark/90 p-2 backdrop-blur-md">
        <button
          onClick={() => setActiveView('admin')}
          className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
            activeView === 'admin'
              ? 'bg-brand-orange text-bg-dark'
              : 'bg-white/5 text-text-muted hover:text-white'
          }`}
        >
          Admin
        </button>
        <button
          onClick={() => setActiveView('user')}
          className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
            activeView === 'user'
              ? 'bg-brand-orange text-bg-dark'
              : 'bg-white/5 text-text-muted hover:text-white'
          }`}
        >
          User
        </button>
      </div>

      {activeView === 'admin' ? <AdminApp /> : <UserApp />}
    </>
  );
}
