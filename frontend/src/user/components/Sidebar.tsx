import React, { useEffect } from 'react';
import {
  Home,
  LayoutDashboard,
  UtensilsCrossed,
  Target,
  MessageSquare,
  Settings,
  LogOut,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  chatSummaries?: { id: string; title: string; lastMessage: string; timestamp: string }[];
  onSelectChat?: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onNewChat?: () => void;
  activeChatId?: string | null;
}

export function Sidebar({ activeTab, onTabChange, onLogout, mobileOpen, onMobileClose, chatSummaries = [], onSelectChat, onDeleteChat, onNewChat, activeChatId }: SidebarProps) {
  const navItems = [
    { icon: Home, label: 'Homepage', id: 'home' },
    { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
    { icon: UtensilsCrossed, label: 'Meal plans', id: 'meals' },
    { icon: Target, label: 'Diet goals', id: 'goals' },
    { icon: MessageSquare, label: 'AI Chatbox', id: 'chat' },
  ];

  const handleTab = (id: string) => {
    onTabChange(id);
    onMobileClose();
  };

  // Prevent background scroll while the mobile drawer is open.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  const panel = (
    <>
      <div className="mb-10 flex items-center justify-between gap-2">
        <div className="text-2xl font-black text-brand-orange tracking-tighter italic">
          CalAI
        </div>
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <React.Fragment key={item.id}>
            <motion.button
              whileHover={{ x: 4 }}
              onClick={() => handleTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-surface-lighter text-brand-orange shadow-lg shadow-brand-orange/5'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-brand-orange' : ''} />
              <span className="font-medium text-sm">{item.label}</span>
            </motion.button>

            {item.id === 'chat' && (
              <div className="ml-2 mt-1 mb-1">
                <button
                  onClick={() => { onNewChat?.(); onMobileClose(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Plus size={12} className="shrink-0 text-brand-orange" />
                  <span className="text-xs font-bold">New Chat</span>
                </button>

                {chatSummaries.length > 0 && (
                  <div className="mt-1 space-y-0.5 max-h-52 overflow-y-auto pr-0.5">
                    {chatSummaries.map(chat => {
                      const isActive = chat.id === activeChatId;
                      return (
                        <div key={chat.id} className="relative group">
                          <button
                            onClick={() => { onSelectChat?.(chat.id); onMobileClose(); }}
                            className={`w-full flex flex-col gap-0.5 px-3 py-2 rounded-lg text-left transition-colors pr-7 ${
                              isActive
                                ? 'bg-surface-lighter text-white'
                                : 'text-text-muted hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span className="text-xs font-semibold truncate">
                              {chat.title || 'New Conversation'}
                            </span>
                            {chat.lastMessage && (
                              <span className="text-[10px] truncate opacity-50 leading-snug">
                                {chat.lastMessage}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteChat?.(chat.id); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-red-400 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                            aria-label="Delete chat"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5 space-y-2">
        <button
          onClick={() => handleTab('settings')}
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
          onClick={() => { onLogout(); onMobileClose(); }}
          className="w-full flex items-center gap-3 px-4 py-3 text-text-muted hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop / large-screen sidebar — always visible. */}
      <aside className="hidden lg:flex w-64 h-screen bg-sidebar-dark border-r border-white/5 flex-col p-6 fixed left-0 top-0 z-50">
        {panel}
      </aside>

      {/* Mobile drawer — overlay + slide-in panel. */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="lg:hidden fixed inset-0 z-[60] bg-bg-dark/70 backdrop-blur-sm"
            />
            <motion.aside
              key="sidebar-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
              className="lg:hidden fixed left-0 top-0 z-[70] w-72 max-w-[85vw] h-screen bg-sidebar-dark border-r border-white/5 flex flex-col p-6"
            >
              {panel}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
