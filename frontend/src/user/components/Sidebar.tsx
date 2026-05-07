import React from 'react';
import {
  Home,
  LayoutDashboard,
  UtensilsCrossed,
  Target,
  MessageSquare,
  Settings,
  LogOut
} from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  onLogout: () => void;
}

export function Sidebar({ activeTab, onTabChange, onLogout }: SidebarProps) {
  const navItems = [
    { icon: Home, label: 'Homepage', id: 'home' },
    { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
    { icon: UtensilsCrossed, label: 'Meal plans', id: 'meals' },
    { icon: Target, label: 'Diet goals', id: 'goals' },
    { icon: MessageSquare, label: 'AI Chatbox', id: 'chat' },
  ];

  return (
    <aside className="w-64 h-screen bg-sidebar-dark border-r border-white/5 flex flex-col p-6 fixed left-0 top-0 z-50">
      <div className="mb-10 flex items-center gap-2">
        <div className="text-2xl font-black text-brand-orange tracking-tighter italic">
          CalAI
        </div>
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
          <span className="font-medium text-sm">Settings</span>
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
  );
}
