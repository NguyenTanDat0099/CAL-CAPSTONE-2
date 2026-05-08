import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  Settings, 
  LogOut,
  PieChart,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ activeTab, onTabChange, onLogout, isOpen, onClose }: SidebarProps) {
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
    { icon: Users, label: 'User Management', id: 'users' },
    { icon: Database, label: 'Content Manager', id: 'content' },
    { icon: PieChart, label: 'Analytics', id: 'analytics' },
    { icon: ShieldCheck, label: 'Security & Roles', id: 'security' },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed left-0 top-0 h-screen bg-sidebar-dark border-r border-white/5 flex flex-col p-6 z-[70] transition-transform duration-300
        w-64 lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="mb-10 flex items-center justify-between">
          <div className="text-2xl font-black text-brand-orange tracking-tighter italic">
            CalAI Admin
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden p-2 text-text-muted hover:text-white"
            >
              <LogOut size={20} className="rotate-180" />
            </button>
          )}
        </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ x: 4 }}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === item.id 
                ? 'bg-surface-lighter text-brand-orange shadow-lg shadow-brand-orange/5' 
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <item.icon size={20} className={activeTab === item.id ? 'text-brand-orange' : ''} />
            <span className="font-medium text-sm">{item.label}</span>
          </motion.button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5 space-y-2">
        <button 
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            activeTab === 'settings' 
              ? 'bg-surface-lighter text-brand-orange shadow-lg shadow-brand-orange/5' 
              : 'text-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings size={20} className={activeTab === 'settings' ? 'text-brand-orange' : ''} />
          <span className="font-medium text-sm">System Settings</span>
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-text-muted hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
}
