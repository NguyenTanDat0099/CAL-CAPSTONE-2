'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  AlertTriangle, 
  Settings, 
  X, 
  LogOut 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen: boolean;
  closeMobile: () => void;
}

const Sidebar = ({ activeTab, setActiveTab, isMobileOpen, closeMobile }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'database', label: 'Food Database', icon: Database },
    { id: 'incidents', label: 'AI Incident Reports', icon: AlertTriangle },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 bg-calai-sidebar border-r border-gray-800 transform transition-transform duration-300 md:relative md:translate-x-0",
      isMobileOpen ? 'translate-x-0' : '-translate-x-full'
    )}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-calai-orange rounded-lg flex items-center justify-center font-bold text-white">C</div>
            <span className="text-xl font-bold tracking-tight text-white">CalAI</span>
          </div>
          <button onClick={closeMobile} className="md:hidden text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Platform</p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); closeMobile(); }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 w-full",
                  isActive 
                    ? "text-white bg-calai-orange shadow-lg shadow-orange-900/20" 
                    : "text-calai-textMuted hover:text-white hover:bg-calai-card"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? 'text-white' : 'text-gray-400')} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-400 to-red-500 flex items-center justify-center text-xs font-bold text-white">AD</div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">Admin User</p>
              <p className="text-xs text-gray-500 truncate">admin@calai.com</p>
            </div>
            <button className="text-gray-400 hover:text-white">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
