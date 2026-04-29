import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AdminSidebar } from './components/AdminSidebar';
import {
  Bell, X, Search, Users,
  LayoutDashboard, Database,
  PieChart as PieChartIcon,
  ArrowUpRight, ArrowDownRight,
  Camera, Target, ShieldCheck, CheckCircle2,
  AlertTriangle, ChevronRight, Eye, Edit, Trash2,
  Download, Filter, Plus, Save, RefreshCw,
  Clock, Shield, Mail, Phone,
  Settings as SettingsIcon, Flag, Zap, Upload, Server, Cpu,
  Ban, ChevronDown, Minus, MessageSquare, ShieldAlert,
  ChevronUp, BellRing, Smartphone, MessageCircle, Image as ImageIcon,
  Loader2, UserPlus, Activity, TrendingDown, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
  PieChart, Pie, Sector
} from 'recharts';
import {
  AdminProfile, AdminStats, User, PaginatedUsers,
  CreateUserPayload, UpdateUserPayload
} from './types';
import {
  fetchAdminProfile, fetchAdminStats,
  fetchUsers, fetchUserById, fetchUserStatistics,
  createUser, updateUser, updateUserStatus, deleteUser
} from '../api';

// ─── Helpers ───────────────────────────────────────────────
const useClickOutside = (ref: React.RefObject<HTMLElement | null>, handler: () => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
};

function CustomSelect({
  value, onChange, options
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(o => o.value === value);

  useClickOutside(containerRef, () => setIsOpen(false));

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-all text-white shadow-inner shadow-black/20 flex justify-between items-center cursor-pointer group hover:border-white/20"
      >
        <span className="text-sm tracking-tight">{selectedOption?.label}</span>
        <ChevronDown size={18} className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-orange' : 'group-hover:text-white'}`} />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-1 bg-surface-dark border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden z-50 p-2 backdrop-blur-xl"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((opt) => (
                <motion.div
                  key={opt.value}
                  whileHover={{ x: 4 }}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`px-5 py-3 rounded-2xl cursor-pointer transition-all text-[10px] font-black uppercase tracking-widest mb-1 last:mb-0 ${
                    value === opt.value
                      ? 'bg-brand-orange text-bg-dark shadow-lg shadow-brand-orange/20'
                      : 'text-text-muted hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {opt.label}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center">
      <Loader2 size={size} className="animate-spin text-brand-orange" />
    </div>
  );
}

// ─── App ────────────────────────────────────────────
interface AdminAppProps {
  onLogout: () => void;
}

export default function AdminApp({ onLogout }: AdminAppProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    fetchAdminProfile()
      .then(res => setAdminProfile(res.data))
      .catch(() => setAdminProfile({ id: 0, email: 'admin@calai.local', role: 'admin', status: 'active' }))
      .finally(() => setProfileLoading(false));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const notifications = [
    { id: '1', message: 'System is running normally', time: 'Just now' },
  ];

  const displayProfile: AdminProfile = adminProfile ?? {
    id: 0,
    email: 'Loading...',
    role: 'admin',
    status: 'active'
  };

  return (
    <div className="flex min-h-screen bg-bg-dark text-white font-sans antialiased selection:bg-brand-orange/30">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={onLogout} />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-8 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-400' :
              toast.type === 'warning' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' :
              'bg-red-500/20 border-red-500/50 text-red-400'
            } backdrop-blur-md`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> :
             toast.type === 'warning' ? <AlertTriangle size={18} /> :
             <Ban size={18} />}
            <span className="text-sm font-bold uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Header */}
      <div className="fixed top-0 right-0 left-64 h-24 px-8 z-40 flex items-center justify-between bg-bg-dark/80 backdrop-blur-md border-b border-white/5">
        <div className="flex-1">
          {(activeTab === 'users') && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 bg-surface-dark px-4 py-2 rounded-2xl border border-white/5 w-96 shadow-inner"
            >
              <Search size={18} className="text-text-muted" />
              <span className="text-sm text-text-muted">User Management</span>
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-12 h-12 rounded-2xl bg-surface-dark border border-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors relative"
            >
              <Bell size={20} />
            </motion.button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-16 right-0 w-80 bg-surface-dark border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-darker">
                    <h3 className="font-black text-sm uppercase tracking-widest">Notifications</h3>
                    <button onClick={() => setShowNotifications(false)} className="text-text-muted hover:text-white"><X size={16} /></button>
                  </div>
                  <div className="max-h-96 overflow-y-auto bg-surface-dark custom-scrollbar">
                    {notifications.map(n => (
                      <div key={n.id} className="p-6 border-b border-white/5 hover:bg-white/5 transition-colors">
                        <p className="text-sm font-medium pr-6">{n.message}</p>
                        <p className="text-[10px] text-text-muted mt-2 font-bold uppercase tracking-widest">{n.time}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3 pl-6 border-l border-white/5">
            <div className="text-right">
              <p className="text-sm font-bold text-white leading-none">
                {profileLoading ? 'Loading...' : (displayProfile.email?.split('@')[0] || 'Admin')}
              </p>
              <p className="text-[10px] text-brand-orange font-black uppercase tracking-tighter mt-1">Admin</p>
            </div>
            <div className="w-12 h-12 rounded-2xl border border-white/10 bg-brand-orange/20 flex items-center justify-center">
              <Users size={20} className="text-brand-orange" />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 ml-64 pt-24 p-8 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <AdminDashboard showToast={showToast} />}
            {activeTab === 'users' && <UserManagement showToast={showToast} />}
            {activeTab === 'content' && <ContentManagement showToast={showToast} />}
            {activeTab === 'analytics' && <AnalyticsView />}
            {activeTab === 'security' && <SecurityView showToast={showToast} />}
            {activeTab === 'settings' && <AdminSettings showToast={showToast} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Admin Dashboard ───────────────────────────────────────
interface DashboardProps { showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void; }

function AdminDashboard({ showToast }: DashboardProps) {
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartData, setChartData] = useState<Array<{ name: string; scans: number; target: number }>>([]);
  const [loadingChart, setLoadingChart] = useState(true);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetchAdminStats();
      setStats(res.data);
    } catch {
      showToast('Failed to load stats', 'error');
    } finally {
      setStatsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    // Generate chart data from stats
    if (stats) {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const mock = days.map((name, i) => ({
        name,
        scans: Math.max(0, Math.round(stats.totalAnalyses / 7 + (Math.random() - 0.3) * stats.totalAnalyses / 14)),
        target: Math.round(stats.totalAnalyses / 7) || 100,
      }));
      setChartData(mock);
      setLoadingChart(false);
    }
  }, [stats]);

  const pieData = [
    { name: 'Active', value: stats ? Math.round((stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100) : 0, color: '#ff9060' },
    { name: 'Inactive', value: stats ? Math.round((stats.inactiveUsers / Math.max(stats.totalUsers, 1)) * 100) : 0, color: '#D4C3F9' },
    { name: 'New Today', value: stats ? Math.round((stats.newUsersToday / Math.max(stats.totalUsers, 1)) * 100) : 0, color: '#82F9A1' },
  ];

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} innerRadius={innerRadius - 6} outerRadius={innerRadius - 2} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      </g>
    );
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">DASHBOARD</h1>
          <p className="text-text-muted font-medium font-sans">Real-time system monitoring and user analytics summary.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={loadStats}
            className="flex items-center gap-2 px-6 py-3 bg-brand-orange text-bg-dark rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-brand-orange/20"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </header>

      {statsLoading ? (
        <div className="py-20"><LoadingSpinner size={40} /></div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Users', value: stats.totalUsers.toLocaleString(), change: stats.newUsersToday > 0 ? `+${stats.newUsersToday} today` : '0 new today', icon: Users, trend: stats.newUsersToday > 0 ? 'up' : 'neutral' },
              { label: 'AI Scans Today', value: stats.mealsLoggedToday.toLocaleString(), change: `${Math.round(stats.totalAnalyses / 7)} avg/day`, icon: Camera, trend: 'up' },
              { label: 'Active Users', value: stats.activeUsers.toLocaleString(), change: `${stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% active`, icon: ShieldCheck, trend: 'up' },
              { label: 'Chat Sessions', value: stats.totalChats.toLocaleString(), change: 'Total sessions', icon: MessageSquare, trend: 'neutral' },
            ].map((stat, i) => (
              <div key={i} className="bg-surface-dark border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group cursor-pointer hover:border-brand-orange/20 transition-colors shadow-lg">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-brand-orange group-hover:scale-110 transition-transform shadow-lg">
                      <stat.icon size={24} />
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${
                      stat.trend === 'up' ? 'bg-green-400/10 text-green-400' : stat.trend === 'down' ? 'bg-red-400/10 text-red-400' : 'bg-white/5 text-text-muted'
                    }`}>
                      {stat.trend === 'up' ? <ArrowUpRight size={10} /> : stat.trend === 'down' ? <ArrowDownRight size={10} /> : <Minus size={10} />}
                      {stat.change}
                    </div>
                  </div>
                  <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
                  <h3 className="text-2xl font-black text-white">{stat.value}</h3>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-brand-orange/10 transition-colors" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-surface-dark border border-white/5 p-8 rounded-[2.5rem] shadow-xl">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">AI Recognition Volume</h3>
                    <p className="text-text-muted text-xs font-medium">Daily scan throughput and accuracy trends</p>
                  </div>
                </div>
                <div className="h-[350px] w-full">
                  {loadingChart ? <LoadingSpinner /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff9060" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ff9060" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#adaaaa', fontSize: 10, fontWeight: 700}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#adaaaa', fontSize: 10, fontWeight: 700}} />
                        <Tooltip contentStyle={{backgroundColor: '#1a1919', border: '1px solid #ffffff10', borderRadius: '1rem', color: '#fff'}} itemStyle={{color: '#ff9060', fontWeight: 900}} />
                        <Area type="monotone" dataKey="scans" stroke="#ff9060" strokeWidth={4} fillOpacity={1} fill="url(#colorScans)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-surface-dark border border-white/5 p-8 rounded-[2.5rem] shadow-xl">
                <h3 className="text-xl font-black mb-6 italic uppercase tracking-tighter">User Status</h3>
                <div className="h-[240px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                        activeShape={renderActiveShape}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} className="outline-none cursor-pointer" />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-surface-lighter border border-white/10 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-orange">{payload[0].name}</p>
                                <p className="text-xl font-black text-white">{payload[0].value}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total</p>
                    <p className="text-2xl font-black text-white">{stats.totalUsers}</p>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {pieData.map((item, i) => (
                    <motion.div
                      key={i}
                      onMouseEnter={() => setActivePieIndex(i)}
                      animate={{ scale: activePieIndex === i ? 1.05 : 1, backgroundColor: activePieIndex === i ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0)' }}
                      className="flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-white/5 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-transform ${activePieIndex === i ? 'scale-125' : ''}`} style={{ backgroundColor: item.color }} />
                        <span className={`text-xs font-bold transition-colors ${activePieIndex === i ? 'text-white' : 'text-text-muted'}`}>{item.name}</span>
                      </div>
                      <span className={`text-xs font-black ${activePieIndex === i ? 'text-brand-orange' : 'text-white'}`}>{item.value}%</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="bg-surface-dark border border-white/5 p-8 rounded-[2.5rem] flex flex-col h-[400px] shadow-xl">
                <h3 className="text-xl font-black mb-6 italic uppercase tracking-tighter">System Status</h3>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-[2rem] bg-green-400/10 flex items-center justify-center text-green-400 mx-auto mb-6 shadow-inner shadow-green-400/20">
                      <ShieldCheck size={48} />
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
                      {stats.systemStatus === 'running' ? 'All Systems Operational' : stats.systemStatus}
                    </h3>
                    <p className="text-text-muted text-sm font-medium">
                      {stats.mealsLoggedToday} meals logged today &middot; {stats.totalChats} chat sessions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── User Management ───────────────────────────────────────
interface ViewProps { showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void; }

function UserManagement({ showToast }: ViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditingUser, setIsEditingUser] = useState<User | null>(null);
  const [showBanConfirm, setShowBanConfirm] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('All');
  const [searchInput, setSearchInput] = useState('');

  const loadUsers = useCallback(async (page = 1, status = '', search = '') => {
    setLoading(true);
    try {
      const res = await fetchUsers({
        page,
        limit: 10,
        status: status === 'All' ? undefined : status.toLowerCase(),
        search: search || undefined,
      });
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadUsers(pagination.page, filter, searchInput);
  }, [loadUsers, pagination.page, filter, searchInput]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(1, filter, searchInput);
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleUserCreated = async (data: CreateUserPayload) => {
    try {
      const res = await createUser(data);
      showToast(`User created! Temp password: ${res.data.tempPassword}`, 'success');
      setShowCreateModal(false);
      loadUsers(1, filter, searchInput);
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    }
  };

  const handleUserUpdated = async (userId: number, data: UpdateUserPayload) => {
    try {
      await updateUser(userId, data);
      showToast('User updated successfully', 'success');
      setIsEditingUser(null);
      loadUsers(pagination.page, filter, searchInput);
    } catch (err: any) {
      showToast(err.message || 'Failed to update user', 'error');
    }
  };

  const handleStatusChange = async (userId: number, status: 'active' | 'inactive' | 'suspended') => {
    try {
      await updateUserStatus(userId, status);
      showToast(`User status changed to ${status}`, 'success');
      setShowBanConfirm(null);
      loadUsers(pagination.page, filter, searchInput);
      setSelectedUser(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await deleteUser(userId);
      showToast('User deleted successfully', 'success');
      setShowBanConfirm(null);
      loadUsers(pagination.page, filter, searchInput);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">USER MANAGEMENT</h1>
          <p className="text-text-muted font-medium font-sans">
            {loading ? 'Loading...' : `${pagination.total} users total`}
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <form onSubmit={handleSearch} className="flex items-center gap-2 bg-surface-dark border border-white/5 p-1 rounded-2xl shadow-lg">
            <Search size={16} className="text-text-muted ml-3" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-white placeholder:text-text-muted px-2 py-2 w-64"
            />
            <button type="submit" className="px-4 py-2 bg-brand-orange/20 text-brand-orange rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-orange/30 transition-colors">Search</button>
          </form>
          <div className="flex bg-surface-dark border border-white/5 p-1 rounded-2xl shadow-lg">
            {['All', 'Active', 'Inactive', 'Suspended'].map(f => (
              <button key={f} onClick={() => { setFilter(f); loadUsers(1, f, searchInput); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${filter === f ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'}`}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-brand-orange text-bg-dark rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-brand-orange/20">
            <UserPlus size={16} /> Add User
          </button>
        </div>
      </header>

      <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/2">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">User Profile</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Physical</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Status</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Joined</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center">
                  <LoadingSpinner size={32} />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-text-muted">
                  No users found
                </td>
              </tr>
            ) : users.map(user => (
              <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-brand-orange/20 flex items-center justify-center border-2 border-white/10 group-hover:border-brand-orange/40 transition-colors shadow-lg">
                      <Users size={20} className="text-brand-orange" />
                    </div>
                    <div>
                      <p className="font-black text-sm group-hover:text-brand-orange transition-colors text-white">{user.name}</p>
                      <p className="text-[10px] text-text-muted font-bold">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="text-xs text-text-muted">
                    {user.height ? `${user.height}cm` : '-'} &middot; {user.weight ? `${user.weight}kg` : '-'}
                  </div>
                  <div className="text-[10px] text-text-muted capitalize">{user.gender || '-'}</div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      user.status === 'active' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' :
                      user.status === 'suspended' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' :
                      'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                    }`} />
                    <span className="text-xs font-black uppercase tracking-widest capitalize">{user.status || 'active'}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-xs text-text-muted">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setSelectedUser(user)} className="p-2.5 rounded-xl bg-white/5 text-text-muted hover:text-white transition-colors shadow-lg" title="View Details"><Eye size={18} /></button>
                    <button onClick={() => setIsEditingUser(user)} className="p-2.5 rounded-xl bg-white/5 text-text-muted hover:text-brand-orange transition-colors shadow-lg" title="Edit Profile"><Edit size={18} /></button>
                    <button onClick={() => setShowBanConfirm(user)} className="p-2.5 rounded-xl bg-red-400/10 text-red-400 hover:bg-red-400 hover:text-white transition-all shadow-lg" title="Manage Account"><Ban size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-6 border-t border-white/5">
            <p className="text-xs text-text-muted">
              Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} total users
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="px-4 py-2 bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                const p = i + 1;
                return (
                  <button key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-10 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
                      pagination.page === p ? 'bg-brand-orange text-bg-dark' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="px-4 py-2 bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleUserCreated}
      />

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onStatusChange={(status) => handleStatusChange(selectedUser.id, status)}
        />
      )}

      {/* Edit User Modal */}
      {isEditingUser && (
        <EditUserModal
          user={isEditingUser}
          onClose={() => setIsEditingUser(null)}
          onSubmit={(data) => handleUserUpdated(isEditingUser.id, data)}
        />
      )}

      {/* Ban Confirm Modal */}
      {showBanConfirm && (
        <BanConfirmModal
          user={showBanConfirm}
          onClose={() => setShowBanConfirm(null)}
          onConfirm={(action) => {
            if (action === 'suspend') handleStatusChange(showBanConfirm.id, 'suspended');
            else if (action === 'activate') handleStatusChange(showBanConfirm.id, 'active');
            else if (action === 'delete') handleDeleteUser(showBanConfirm.id);
          }}
        />
      )}
    </div>
  );
}

// ─── Create User Modal ─────────────────────────────────────
function CreateUserModal({
  isOpen, onClose, onSubmit
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserPayload) => void;
}) {
  const [form, setForm] = useState<CreateUserPayload>({ email: '', fullName: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(form);
    setSubmitting(false);
    setForm({ email: '', fullName: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-bg-dark/90 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-surface-dark border border-white/10 rounded-[3rem] max-w-lg w-full shadow-2xl overflow-hidden p-12 space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Add New User</h2>
          <button onClick={onClose} className="p-3 rounded-2xl bg-white/5 text-text-muted hover:text-white transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Full Name *</label>
            <input type="text" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
              className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white shadow-inner shadow-black/20"
              placeholder="Nguyen Van A" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Email *</label>
            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white shadow-inner shadow-black/20"
              placeholder="user@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Height (cm)</label>
              <input type="number" value={form.height || ''} onChange={e => setForm({ ...form, height: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white shadow-inner shadow-black/20"
                placeholder="170" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Weight (kg)</label>
              <input type="number" value={form.weight || ''} onChange={e => setForm({ ...form, weight: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white shadow-inner shadow-black/20"
                placeholder="65" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Gender</label>
            <CustomSelect
              value={form.gender || 'other'}
              onChange={val => setForm({ ...form, gender: val as 'male' | 'female' | 'other' })}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-5 bg-brand-orange text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-brand-orange/20 disabled:opacity-50">
              {submitting ? <LoadingSpinner size={20} /> : 'Create User'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── User Detail Modal ─────────────────────────────────────
function UserDetailModal({
  user, onClose, onStatusChange
}: {
  user: User;
  onClose: () => void;
  onStatusChange: (status: 'active' | 'inactive' | 'suspended') => void;
}) {
  const [userDetails, setUserDetails] = useState<User>(user);
  const [userStats, setUserStats] = useState<import('./types').UserStatistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    // Fetch full user details to get goal info
    fetchUserById(user.id)
      .then(res => setUserDetails(res.data))
      .catch(() => {});

    fetchUserStatistics(user.id)
      .then(res => setUserStats(res.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-bg-dark/90 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-surface-dark border border-white/10 rounded-[3rem] max-w-3xl w-full shadow-2xl overflow-hidden p-10 space-y-8">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 rounded-[2rem] bg-brand-orange/20 flex items-center justify-center border-4 border-brand-orange/20 shadow-2xl">
              <Users size={36} className="text-brand-orange" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-white">{userDetails.name}</h2>
              <p className="text-text-muted font-bold text-lg">{userDetails.email}</p>
              <div className="flex gap-3 mt-3">
                <span className="px-4 py-1.5 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-widest border border-brand-orange/20">{userDetails.role} Profile</span>
                <span className="px-4 py-1.5 rounded-full bg-white/5 text-text-muted text-[10px] font-black uppercase tracking-widest border border-white/10 capitalize">{userDetails.status} &middot; {userDetails.gender || '-'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl bg-white/5 text-text-muted hover:text-white transition-colors"><X size={24} /></button>
        </div>

        <div className="space-y-6">
          {/* Basic Profile Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Age', value: userDetails.age ? `${userDetails.age} years old` : '-', icon: Clock },
              { label: 'Height', value: userDetails.height ? `${userDetails.height} cm` : '-', icon: Target },
              { label: 'Weight', value: userDetails.weight ? `${userDetails.weight} kg` : '-', icon: Users },
              { label: 'Member Since', value: userDetails.createdAt ? new Date(userDetails.createdAt).toLocaleDateString() : '-', icon: Flag },
            ].map((stat, i) => (
              <div key={i} className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5 group hover:border-brand-orange/30 transition-colors shadow-inner shadow-black/20">
                <div className="flex items-center gap-2 mb-2 text-text-muted">
                  <stat.icon size={14} className="group-hover:text-brand-orange transition-colors" />
                  <p className="text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                </div>
                <p className="text-xl font-black text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Goal & Target Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { 
                label: 'Goal', 
                value: userDetails.goal === 'lose' ? 'Weight Loss' : 
                       userDetails.goal === 'gain' ? 'Muscle Gain' : 
                       userDetails.goal === 'maintain' ? 'Maintenance' : '-', 
                icon: Zap 
              },
              { label: 'Activity', value: userDetails.activityLevel ? userDetails.activityLevel.charAt(0).toUpperCase() + userDetails.activityLevel.slice(1) : '-', icon: Activity },
              { label: 'Target Weight', value: userDetails.targetWeight ? `${userDetails.targetWeight} kg` : '-', icon: TrendingDown },
              { label: 'Target Calories', value: userDetails.targetCalories ? `${userDetails.targetCalories} kcal` : '-', icon: Flame },
            ].map((stat, i) => (
              <div key={i} className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5 group hover:border-brand-orange/30 transition-colors shadow-inner shadow-black/20">
                <div className="flex items-center gap-2 mb-2 text-text-muted">
                  <stat.icon size={14} className="group-hover:text-brand-orange transition-colors" />
                  <p className="text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                </div>
                <p className="text-xl font-black text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-lighter/50 rounded-[2rem] p-8 space-y-6 shadow-xl border border-white/5">
          <h4 className="font-black text-xs uppercase tracking-widest italic flex items-center gap-2 text-white">
            <PieChartIcon size={16} className="text-brand-orange" /> User Activity Summary
          </h4>
          {loadingStats ? (
            <LoadingSpinner />
          ) : userStats ? (
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-bg-dark/30 rounded-2xl border border-white/5 shadow-inner shadow-black/20">
                <p className="text-2xl font-black text-white mb-1">{userStats.totalMeals}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Meals Logged</p>
              </div>
              <div className="text-center p-4 bg-bg-dark/30 rounded-2xl border border-white/5 shadow-inner shadow-black/20">
                <p className="text-2xl font-black text-white mb-1">{userStats.todayCalories}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Calories Today</p>
              </div>
              <div className="text-center p-4 bg-bg-dark/30 rounded-2xl border border-white/5 shadow-inner shadow-black/20">
                <p className="text-2xl font-black text-white mb-1">{userStats.totalAnalyses}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">AI Scans</p>
              </div>
              <div className="text-center p-4 bg-bg-dark/30 rounded-2xl border border-white/5 shadow-inner shadow-black/20">
                <p className="text-2xl font-black text-white mb-1">{userStats.totalChats}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Chat Sessions</p>
              </div>
            </div>
          ) : (
            <p className="text-text-muted text-sm">No activity data available</p>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <button onClick={() => onStatusChange(user.status === 'active' ? 'suspended' : 'active')}
            className={`flex-1 py-5 ${user.status === 'active' ? 'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400 hover:text-white' : 'bg-green-400/10 text-green-400 border border-green-400/20 hover:bg-green-400 hover:text-white'} rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg`}>
            {user.status === 'active' ? 'Suspend Account' : 'Activate Account'}
          </button>
          <button onClick={onClose}
            className="px-10 py-5 bg-brand-orange text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-brand-orange/20">Close</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Edit User Modal ───────────────────────────────────────
function EditUserModal({
  user, onClose, onSubmit
}: {
  user: User;
  onClose: () => void;
  onSubmit: (data: UpdateUserPayload) => void;
}) {
  const [form, setForm] = useState<UpdateUserPayload>({
    fullName: user.name,
    gender: (user.gender as 'male' | 'female' | 'other') || undefined,
    age: user.age ?? undefined,
    height: user.height ?? undefined,
    weight: user.weight ?? undefined,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || form.fullName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch {
      setError('Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-bg-dark/90 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-surface-dark border border-white/10 rounded-[3rem] max-w-lg w-full shadow-2xl overflow-hidden p-12 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Edit Profile</h2>
            <p className="text-text-muted text-sm mt-1">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl bg-white/5 text-text-muted hover:text-white transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Full Name</label>
            <input type="text" value={form.fullName || ''} onChange={e => setForm({ ...form, fullName: e.target.value })} required minLength={2}
              className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white shadow-inner shadow-black/20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Height (cm)</label>
              <input type="number" value={form.height ?? ''} onChange={e => setForm({ ...form, height: e.target.value ? Number(e.target.value) : undefined })} min={1} max={300}
                className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white shadow-inner shadow-black/20" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Weight (kg)</label>
              <input type="number" value={form.weight ?? ''} onChange={e => setForm({ ...form, weight: e.target.value ? Number(e.target.value) : undefined })} min={1} max={500}
                className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white shadow-inner shadow-black/20" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Gender</label>
            <CustomSelect
              value={form.gender || 'other'}
              onChange={val => setForm({ ...form, gender: val as 'male' | 'female' | 'other' })}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Age</label>
            <input type="number" value={form.age ?? ''} onChange={e => setForm({ ...form, age: e.target.value ? parseInt(e.target.value) : undefined })} min="1" max="200"
              className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white shadow-inner shadow-black/20" placeholder="Enter age" />
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-3 text-red-400 text-sm font-bold">
              {error}
            </div>
          )}
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-5 bg-brand-orange text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-brand-orange/20 disabled:opacity-50">
              {submitting ? <LoadingSpinner size={20} /> : 'Save Profile'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Ban Confirm Modal ──────────────────────────────────────
function BanConfirmModal({
  user, onClose, onConfirm
}: {
  user: User;
  onClose: () => void;
  onConfirm: (action: 'suspend' | 'activate' | 'delete') => void;
}) {
  const [action, setAction] = useState<'suspend' | 'activate' | 'delete' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAction = async (act: 'suspend' | 'activate' | 'delete') => {
    if (act === 'delete' && action !== 'delete') {
      setAction('delete');
      return;
    }
    setLoading(true);
    try {
      await onConfirm(act);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-bg-dark/95 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-surface-dark border border-red-500/20 rounded-[3rem] max-w-md w-full shadow-2xl p-10 text-center space-y-8 shadow-red-500/10">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto shadow-inner shadow-red-500/20"><ShieldAlert size={40} /></div>
        <div>
          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Manage Account</h3>
          <p className="text-text-muted font-bold mt-4 leading-relaxed">
            User: <span className="text-white italic">"{user.name}"</span>
          </p>
          <p className="text-text-muted text-sm mt-1">Current status: <span className="capitalize text-white">{user.status}</span></p>
        </div>

        {action === 'delete' ? (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
              <p className="text-red-400 font-black text-sm uppercase tracking-widest mb-2">Confirm Deletion</p>
              <p className="text-text-muted text-sm">
                Are you sure you want to permanently delete <span className="text-white font-bold">"{user.name}"</span>? This action <span className="text-red-400 font-bold">cannot be undone</span>.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAction(null)} disabled={loading}
                className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg disabled:opacity-50">
                Cancel
              </button>
              <button onClick={() => handleAction('delete')} disabled={loading}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <LoadingSpinner size={16} /> : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {user.status !== 'active' && (
              <button onClick={() => handleAction('activate')} disabled={loading}
                className="w-full py-5 bg-green-400/10 text-green-400 border border-green-400/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-400 hover:text-white transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && action === 'activate' ? <LoadingSpinner size={16} /> : null}
                Activate Account
              </button>
            )}
            {user.status === 'active' && (
              <button onClick={() => handleAction('suspend')} disabled={loading}
                className="w-full py-5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && action === 'suspend' ? <LoadingSpinner size={16} /> : null}
                Suspend Account
              </button>
            )}
            <button onClick={() => handleAction('delete')} disabled={loading}
              className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500/20 text-red-400 transition-all shadow-lg">
              Delete User Permanently
            </button>
            <button onClick={onClose} disabled={loading}
              className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg disabled:opacity-50">
              Cancel
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Content Management (placeholder - kept original design) ───────────────
function ContentManagement({ showToast }: ViewProps) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">CONTENT MANAGER</h1>
        <p className="text-text-muted font-medium font-sans">Food database and AI scan management coming soon.</p>
      </header>
      <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] p-20 flex items-center justify-center">
        <div className="text-center">
          <Database size={64} className="text-text-muted mx-auto mb-6 opacity-30" />
          <p className="text-text-muted text-lg font-bold">Content Management</p>
          <p className="text-text-muted text-sm mt-2">Feature under development</p>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics View ─────────────────────────────────────────
function AnalyticsView() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">SYSTEM ANALYTICS</h1>
        <p className="text-text-muted font-medium font-sans">Aggregate data insights on user nutrition and system health.</p>
      </header>
      <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] p-20 flex items-center justify-center">
        <div className="text-center">
          <PieChartIcon size={64} className="text-text-muted mx-auto mb-6 opacity-30" />
          <p className="text-text-muted text-lg font-bold">Analytics Dashboard</p>
          <p className="text-text-muted text-sm mt-2">Feature under development</p>
        </div>
      </div>
    </div>
  );
}

// ─── Security View ─────────────────────────────────────────
function SecurityView({ showToast }: ViewProps) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">SECURITY & ROLES</h1>
        <p className="text-text-muted font-medium">Infrastructure security, moderator permissions, and audit trails.</p>
      </header>
      <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] p-20 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck size={64} className="text-text-muted mx-auto mb-6 opacity-30" />
          <p className="text-text-muted text-lg font-bold">Security & Roles</p>
          <p className="text-text-muted text-sm mt-2">Feature under development</p>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Settings ─────────────────────────────────────────
function AdminSettings({ showToast }: ViewProps) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">SYSTEM SETTINGS</h1>
        <p className="text-text-muted font-medium font-sans">Configure global parameters, server integrations, and security protocols.</p>
      </header>
      <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] p-20 flex items-center justify-center">
        <div className="text-center">
          <SettingsIcon size={64} className="text-text-muted mx-auto mb-6 opacity-30" />
          <p className="text-text-muted text-lg font-bold">System Settings</p>
          <p className="text-text-muted text-sm mt-2">Feature under development</p>
        </div>
      </div>
    </div>
  );
}
