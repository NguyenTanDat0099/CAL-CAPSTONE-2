import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AdminSidebar } from './components/AdminSidebar';
import {
  Bell, X, Search, Users,
  LayoutDashboard, Database,
  PieChart as PieChartIcon,
  ArrowUpRight, ArrowDownRight,
  Target, ShieldCheck, CheckCircle2,
  AlertTriangle, ChevronRight, Eye, Edit, Trash2,
  Download, Filter, Plus, Save, RefreshCw,
  Clock, Shield, Mail, Phone,
  Settings as SettingsIcon, Flag, Zap, Upload, Server, Cpu,
  Ban, ChevronDown, Minus, MessageSquare, ShieldAlert,
  ChevronUp, BellRing, Smartphone, MessageCircle, Image as ImageIcon,
  Loader2, UserPlus, Activity, TrendingDown, Flame, Utensils
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
  PieChart, Pie, Sector
} from 'recharts';
import {
  AdminProfile, AdminStats, User, PaginatedUsers,
  CreateUserPayload, UpdateUserPayload, FoodItem, FoodPayload, AdminAnalytics,
  SecurityOverview, RoleAccount, AuditLog
} from './types';
import {
  fetchAdminProfile, fetchAdminStats,
  fetchUsers, fetchUserById, fetchUserStatistics,
  createUser, updateUser, updateUserStatus, deleteUser,
  fetchFoods, createFood, bulkImportFoods, updateFood, deleteFood, fetchAdminAnalytics,
  fetchSecurityOverview, fetchRoleAccounts, updateAccountRole, fetchAuditLogs
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
      <div className="fixed top-0 right-0 left-64 h-24 px-8 z-40 flex items-center justify-end bg-bg-dark/80 backdrop-blur-md border-b border-white/5">
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
  const [chartData, setChartData] = useState<Array<{ name: string; meals: number; target: number }>>([]);
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
      const weeklyAverage = Math.round(stats.totalMealsLogged / 7);
      const mock = days.map((name) => ({
        name,
        meals: Math.max(0, Math.round(weeklyAverage + (Math.random() - 0.3) * Math.max(weeklyAverage / 2, 1))),
        target: weeklyAverage || 10,
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
              { label: 'Meals Logged Today', value: stats.mealsLoggedToday.toLocaleString(), change: `${Math.round(stats.totalMealsLogged / 7)} avg/day`, icon: Utensils, trend: 'up' },
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
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Meal Logging Volume</h3>
                    <p className="text-text-muted text-xs font-medium">Daily meal logging activity across users</p>
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
                        <Area type="monotone" dataKey="meals" stroke="#ff9060" strokeWidth={4} fillOpacity={1} fill="url(#colorScans)" />
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
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-bg-dark/30 rounded-2xl border border-white/5 shadow-inner shadow-black/20">
                <p className="text-2xl font-black text-white mb-1">{userStats.totalMeals}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Meals Logged</p>
              </div>
              <div className="text-center p-4 bg-bg-dark/30 rounded-2xl border border-white/5 shadow-inner shadow-black/20">
                <p className="text-2xl font-black text-white mb-1">{userStats.todayCalories}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Calories Today</p>
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

// ─── Content Management ───────────────────────
function ContentManagement({ showToast }: ViewProps) {
  const [activeTab, setActiveTab] = useState<'food' | 'logs'>('food');
  const [showAddFood, setShowAddFood] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [foodSearch, setFoodSearch] = useState('');
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [foodForm, setFoodForm] = useState({
    name: '',
    category: 'Breakfast',
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    servingSize: '1 serving',
    imagePath: '',
  });

  const aiLogs: Array<{ user: string; food: string; confidence: number; status: string }> = [];

  const resetFoodForm = () => {
    setFoodForm({
      name: '',
      category: 'Breakfast',
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      servingSize: '1 serving',
      imagePath: '',
    });
    setEditingFood(null);
  };

  const loadFoods = useCallback(async () => {
    setFoodsLoading(true);
    try {
      const res = await fetchFoods({ search: foodSearch, limit: 100 });
      setFoods(res.data.data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load foods', 'error');
    } finally {
      setFoodsLoading(false);
    }
  }, [foodSearch, showToast]);

  useEffect(() => {
    loadFoods();
  }, [loadFoods]);

  const openAddFood = () => {
    resetFoodForm();
    setShowAddFood(true);
  };

  const openEditFood = (food: FoodItem) => {
    setEditingFood(food);
    setFoodForm({
      name: food.name,
      category: food.category || 'General',
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      servingSize: food.servingSize || '1 serving',
      imagePath: food.imagePath || '',
    });
    setShowAddFood(true);
  };

  const handleSaveFood = async () => {
    const payload: FoodPayload = {
      name: foodForm.name.trim(),
      category: foodForm.category.trim(),
      calories: Number(foodForm.calories),
      protein: Number(foodForm.protein),
      carbs: Number(foodForm.carbs),
      fats: Number(foodForm.fats),
      servingSize: foodForm.servingSize.trim(),
      imagePath: foodForm.imagePath.trim(),
    };

    if (!payload.name) {
      showToast('Food name is required', 'error');
      return;
    }

    try {
      if (editingFood) {
        await updateFood(editingFood.id, payload);
        showToast('Food item updated successfully', 'success');
      } else {
        await createFood(payload);
        showToast('Food item added to library', 'success');
      }
      await loadFoods();
      resetFoodForm();
      setShowAddFood(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save food', 'error');
    }
  };

  const handleDeleteFood = async (food: FoodItem) => {
    if (!window.confirm(`Delete ${food.name} from the food library?`)) return;
    try {
      await deleteFood(food.id);
      showToast('Food item deleted successfully', 'success');
      await loadFoods();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete food', 'error');
    }
  };

  const handleCloseFoodModal = () => {
    resetFoodForm();
    setShowAddFood(false);
  };

  return (
    <div className="space-y-8">
      <header>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">CONTENT MANAGER</h1>
            <p className="text-text-muted font-medium font-sans">Curate the food database used by Meal Plans and chatbot nutrition references.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImport(true)}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
            >
              <Upload size={14} />
              IMPORT DATASET
            </button>
            <button
              onClick={openAddFood}
              className="px-6 py-3 bg-brand-orange text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform cursor-pointer shadow-xl shadow-brand-orange/20"
            >
              + ADD FOOD ITEM
            </button>
          </div>
        </div>
      </header>

      <div className="hidden">
        <button
          onClick={() => setActiveTab('food')}
          className={`px-6 py-4 font-black text-xs uppercase tracking-widest border-b-2 transition-colors ${
            activeTab === 'food'
              ? 'border-brand-orange text-brand-orange'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          🍽️ FOOD LIBRARY
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-4 font-black text-xs uppercase tracking-widest border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-brand-orange text-brand-orange'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          LEGACY LOGS
        </button>
      </div>

      {/* Food Library Tab */}
      {activeTab === 'food' && (
        <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] overflow-hidden">
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black italic uppercase text-white">Food Library</h3>
              <p className="text-xs text-text-muted">Foods saved here are available in user Meal Plans search.</p>
            </div>
            <div className="relative w-80">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={foodSearch}
                onChange={(event) => setFoodSearch(event.target.value)}
                placeholder="Search food library..."
                className="w-full bg-bg-dark border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm outline-none focus:border-brand-orange text-white"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-dark/50 border-b border-white/5">
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">FOOD ITEM</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">CATEGORY</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">MACRO PROFILE</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest text-text-muted">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {foodsLoading && (
                  <tr>
                    <td colSpan={4} className="px-8 py-14">
                      <LoadingSpinner size={32} />
                    </td>
                  </tr>
                )}
                {!foodsLoading && foods.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-brand-orange/20 flex items-center justify-center">
                          <span className="text-sm">🍲</span>
                        </div>
                        <div>
                          <p className="font-black text-white">{item.name}</p>
                          <p className="text-xs text-text-muted">{item.calories} KCAL / {item.servingSize || 'serving'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-4 py-2 bg-brand-orange/10 text-brand-orange rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-orange/20">
                        {item.category || 'GENERAL'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex gap-4">
                        <span className="text-green-400 font-black">💪 {item.protein}g</span>
                        <span className="text-blue-400 font-black">🥗 {item.carbs}g</span>
                        <span className="text-yellow-400 font-black">⚡ {item.fats}g</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right space-x-2">
                      <button
                        onClick={() => openEditFood(item)}
                        className="px-4 py-2 text-brand-orange hover:bg-brand-orange/10 rounded-lg transition-colors font-black text-xs"
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleDeleteFood(item)}
                        className="px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors font-black text-xs"
                      >
                        DELETE
                      </button>
                    </td>
                  </tr>
                ))}
                {!foodsLoading && foods.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-14 text-center text-text-muted">
                      No foods found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legacy recognition log view hidden after Scan was removed. */}
      {activeTab === 'logs' && (
        <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-dark/50 border-b border-white/5">
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">USER</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">AI DETECTION</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">SYSTEM CONFIDENCE</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">STATUS</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest text-text-muted">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {aiLogs.map((log, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-black text-white">{log.user}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🍲</span>
                        <span className="font-black text-white">{log.food}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-bg-dark rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${log.confidence >= 85 ? 'bg-green-400' : 'bg-yellow-400'}`}
                            style={{ width: `${log.confidence}%` }}
                          />
                        </div>
                        <span className="font-black text-white min-w-12">{log.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          log.status === 'VERIFIED'
                            ? 'bg-green-400/10 text-green-400 border-green-400/20'
                            : 'bg-red-400/10 text-red-400 border-red-400/20'
                        }`}
                      >
                        {log.status === 'VERIFIED' ? '✓' : '⚠'} {log.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="px-4 py-2 text-brand-orange hover:bg-brand-orange/10 rounded-lg transition-colors font-black text-xs">
                        👁️ REVIEW
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Food Modal */}
      {showAddFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseFoodModal}
            className="absolute inset-0 bg-bg-dark/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-surface-dark border border-white/10 rounded-[2rem] max-w-2xl w-full shadow-2xl overflow-hidden p-12 space-y-8"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                {editingFood ? 'EDIT FOOD ITEM' : 'ADD NEW FOOD ITEM'}
              </h2>
              <button
                onClick={handleCloseFoodModal}
                className="p-3 rounded-2xl bg-white/5 text-text-muted hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveFood(); }} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">ITEM NAME *</label>
                  <input
                    type="text"
                    placeholder="e.g. Greek Salad"
                    value={foodForm.name}
                    onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                    className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white shadow-inner shadow-black/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">CATEGORY</label>
                  <CustomSelect
                    value={foodForm.category}
                    onChange={(val) => setFoodForm({ ...foodForm, category: val })}
                    options={[
                      { value: 'Breakfast', label: 'BREAKFAST' },
                      { value: 'Lunch', label: 'LUNCH' },
                      { value: 'Dinner', label: 'DINNER' },
                      { value: 'Snack', label: 'SNACK' },
                      { value: 'Other', label: 'OTHER' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block mb-4">MACROS (PER 100G)</label>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'CALORIES', key: 'calories', color: 'text-orange-400' },
                    { label: 'PROTEIN', key: 'protein', color: 'text-green-400' },
                    { label: 'CARBS', key: 'carbs', color: 'text-blue-400' },
                    { label: 'FATS', key: 'fats', color: 'text-yellow-400' },
                  ].map((macro) => (
                    <div key={macro.key} className="space-y-2">
                      <label className={`text-[8px] font-black uppercase tracking-widest ${macro.color}`}>{macro.label}</label>
                      <input
                        type="number"
                        value={(foodForm as any)[macro.key]}
                        onChange={(e) => setFoodForm({ ...foodForm, [macro.key]: Number(e.target.value) })}
                        className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 font-bold outline-none focus:border-brand-orange transition-colors text-white text-center shadow-inner shadow-black/20"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">SERVING SIZE</label>
                <input
                  type="text"
                  placeholder="e.g. 1 bowl, 100g, 1 plate"
                  value={foodForm.servingSize}
                  onChange={(e) => setFoodForm({ ...foodForm, servingSize: e.target.value })}
                  className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white shadow-inner shadow-black/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">IMAGE URL</label>
                <input
                  type="text"
                  placeholder="Optional image URL"
                  value={foodForm.imagePath}
                  onChange={(e) => setFoodForm({ ...foodForm, imagePath: e.target.value })}
                  className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white shadow-inner shadow-black/20"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseFoodModal}
                  className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg"
                >
                  DISCARD CHANGES
                </button>
                <button
                  type="submit"
                  className="flex-1 py-5 bg-brand-orange text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-brand-orange/20"
                >
                  {editingFood ? 'SAVE CHANGES' : 'PUBLISH TO LIBRARY'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showImport && (
        <ImportDatasetModal
          onClose={() => setShowImport(false)}
          onImported={() => loadFoods()}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ─── CSV → FoodPayload parser ─────────────────────────────
// Tách dòng CSV xử lý quoted field có dấu phẩy. Trả về mảng cell đã trim.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { buf += '"'; i += 1; }
        else { inQuote = false; }
      } else { buf += ch; }
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { out.push(buf); buf = ''; }
      else buf += ch;
    }
  }
  out.push(buf);
  return out.map((s) => s.trim());
}

// Map alias header → tên cột chuẩn. Admin có thể dán file Food-100k,
// Healthy-Eating, hoặc file tự tạo — đều khớp.
const HEADER_ALIASES: Record<string, keyof FoodPayload | 'skip'> = {
  // name
  name: 'name', food_name: 'name', foodname: 'name',
  dish_name: 'name', meal_name: 'name', tên: 'name', 'tên món': 'name',
  // calories
  calories: 'calories', kcal: 'calories', energy_kcal: 'calories',
  calories_kcal: 'calories', calo: 'calories',
  // protein
  protein: 'protein', protein_g: 'protein', proteins: 'protein',
  // carbs
  carbs: 'carbs', carbohydrate: 'carbs', carbohydrates: 'carbs',
  carbs_g: 'carbs', carbohydrate_g: 'carbs',
  // fats
  fats: 'fats', fat: 'fats', fat_g: 'fats', lipid: 'fats', lipids: 'fats',
  // optional
  category: 'category', meal_type: 'category', meal_slot: 'category', food_type: 'category', loại: 'category',
  serving_size: 'servingSize', servingsize: 'servingSize',
  serving: 'servingSize', portion: 'servingSize', portion_size: 'servingSize',
  'khẩu phần': 'servingSize',
  image_path: 'imagePath', imagepath: 'imagePath', image_url: 'imagePath',
  imageurl: 'imagePath', image_link: 'imagePath', imagelink: 'imagePath', image: 'imagePath',
  fiber: 'fiber', fiber_g: 'fiber', dietary_fiber: 'fiber',
  sugar: 'sugar', sugar_g: 'sugar', sugars: 'sugar',
  sodium: 'sodium', sodium_mg: 'sodium', salt: 'sodium',
};

const REQUIRED_FIELDS: Array<keyof FoodPayload> = ['name', 'calories', 'protein', 'carbs', 'fats'];

interface ParsedRow {
  row: FoodPayload;
  errors: string[];
  lineNumber: number;
}

function parseDatasetCsv(text: string): { rows: ParsedRow[]; missingHeaders: string[] } {
  // Chuẩn hoá: bỏ BOM, normalize line endings.
  const cleaned = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], missingHeaders: REQUIRED_FIELDS };

  const headerCells = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s-]+/g, '_'));
  const colIndex: Record<string, number> = {};
  headerCells.forEach((h, idx) => {
    const target = HEADER_ALIASES[h];
    if (target && target !== 'skip' && colIndex[target] === undefined) {
      colIndex[target] = idx;
    }
  });

  // Báo cột bắt buộc thiếu sớm để admin biết file sai schema từ đầu.
  const missingHeaders = REQUIRED_FIELDS.filter((f) => colIndex[f] === undefined);

  const toNumber = (raw: string): number | null => {
    if (raw === undefined || raw === null) return null;
    const cleaned = String(raw).replace(/,/g, '.').replace(/[^0-9.\-]/g, '').trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    const errors: string[] = [];
    const row: FoodPayload = {};

    const getCell = (field: keyof FoodPayload) => {
      const idx = colIndex[field];
      return idx === undefined ? '' : (cells[idx] ?? '').trim();
    };

    const name = getCell('name');
    if (!name) errors.push('Thiếu tên món');
    row.name = name;

    for (const field of ['calories', 'protein', 'carbs', 'fats'] as Array<keyof FoodPayload>) {
      const raw = getCell(field);
      if (colIndex[field] === undefined) {
        // Cột thiếu hẳn — đã báo ở missingHeaders, không spam thêm vào từng row.
        continue;
      }
      if (!raw) { errors.push(`Thiếu ${field}`); continue; }
      const num = toNumber(raw);
      if (num === null) errors.push(`${field} không phải số: "${raw}"`);
      else if (num < 0) errors.push(`${field} âm: ${num}`);
      else (row as Record<string, unknown>)[field] = num;
    }

    for (const field of ['fiber', 'sugar', 'sodium'] as Array<keyof FoodPayload>) {
      const raw = getCell(field);
      if (!raw) continue;
      const num = toNumber(raw);
      if (num !== null && num >= 0) (row as Record<string, unknown>)[field] = num;
    }

    const category = getCell('category');
    if (category) row.category = category;
    const servingSize = getCell('servingSize');
    if (servingSize) row.servingSize = servingSize;
    const imagePath = getCell('imagePath');
    if (imagePath) row.imagePath = imagePath;

    rows.push({ row, errors, lineNumber: i + 1 });
  }

  return { rows, missingHeaders };
}

// ─── Import Dataset Modal ─────────────────────────────────
function ImportDatasetModal({
  onClose, onImported, showToast,
}: {
  onClose: () => void;
  onImported: () => void;
  showToast: ViewProps['showToast'];
}) {
  const [fileName, setFileName] = useState<string>('');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const validRows = parsed.filter((p) => p.errors.length === 0);
  const errorRows = parsed.filter((p) => p.errors.length > 0);
  const canImport = !submitting && missingHeaders.length === 0 && validRows.length > 0;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onerror = () => showToast('Không đọc được file', 'error');
    reader.onload = () => {
      const text = String(reader.result || '');
      const { rows, missingHeaders } = parseDatasetCsv(text);
      setParsed(rows);
      setMissingHeaders(missingHeaders);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImport = async () => {
    if (!canImport) return;
    setSubmitting(true);
    try {
      const res = await bulkImportFoods(validRows.map((p) => p.row));
      const { inserted, total, failed } = res.data;
      const failPart = failed.length ? `, ${failed.length} lỗi server` : '';
      showToast(`Đã import ${inserted}/${total} món${failPart}`, inserted > 0 ? 'success' : 'error');
      onImported();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-bg-dark/90 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-surface-dark border border-white/10 rounded-[2rem] max-w-3xl w-full shadow-2xl overflow-hidden p-10 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
            IMPORT DATASET
          </h2>
          <button
            onClick={onClose}
            className="p-3 rounded-2xl bg-white/5 text-text-muted hover:text-white transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-sm text-text-muted leading-relaxed">
          Upload file <span className="font-mono text-white">.csv</span> để thêm hàng loạt món vào
          food library. Các cột bắt buộc: <span className="font-mono text-brand-orange">name</span>,{' '}
          <span className="font-mono text-brand-orange">calories</span>,{' '}
          <span className="font-mono text-brand-orange">protein</span>,{' '}
          <span className="font-mono text-brand-orange">carbs</span>,{' '}
          <span className="font-mono text-brand-orange">fats</span>. Cột tuỳ chọn:{' '}
          <span className="font-mono">category</span>, <span className="font-mono">serving_size</span>,{' '}
          <span className="font-mono">image_url</span>, <span className="font-mono">fiber</span>,{' '}
          <span className="font-mono">sugar</span>, <span className="font-mono">sodium</span>.
        </p>

        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted block mb-2">
            CSV FILE
          </span>
          <div className="flex items-center gap-3">
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="hidden"
              />
              <div className="bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 hover:border-brand-orange transition-colors flex items-center gap-3">
                <Upload size={18} className="text-brand-orange" />
                <span className="text-white text-sm font-bold truncate">
                  {fileName || 'Chọn file CSV...'}
                </span>
              </div>
            </label>
          </div>
        </label>

        {missingHeaders.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
            <p className="text-sm text-red-200 font-bold mb-2">
              ⚠️ File thiếu cột bắt buộc:
            </p>
            <p className="font-mono text-xs text-red-100">{missingHeaders.join(', ')}</p>
            <p className="text-xs text-red-100/70 mt-2">
              Không thể import. Sửa file rồi upload lại.
            </p>
          </div>
        )}

        {parsed.length > 0 && missingHeaders.length === 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-text-muted">Tổng</p>
                <p className="text-2xl font-black text-white">{parsed.length}</p>
              </div>
              <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/30">
                <p className="text-[10px] uppercase tracking-widest text-emerald-300">Hợp lệ</p>
                <p className="text-2xl font-black text-emerald-300">{validRows.length}</p>
              </div>
              <div className="bg-red-500/10 rounded-2xl p-4 border border-red-500/30">
                <p className="text-[10px] uppercase tracking-widest text-red-300">Lỗi</p>
                <p className="text-2xl font-black text-red-300">{errorRows.length}</p>
              </div>
            </div>

            {errorRows.length > 0 && (
              <details className="bg-bg-dark/50 border border-white/10 rounded-2xl">
                <summary className="cursor-pointer px-5 py-3 text-sm font-bold text-white">
                  Xem {errorRows.length} dòng lỗi
                </summary>
                <div className="max-h-60 overflow-y-auto px-5 py-3 space-y-2 border-t border-white/10">
                  {errorRows.slice(0, 100).map((r) => (
                    <div key={r.lineNumber} className="text-xs">
                      <span className="font-mono text-text-muted">Dòng {r.lineNumber}</span>
                      {r.row.name && <span className="text-white"> · {r.row.name}</span>}
                      <ul className="ml-6 mt-0.5 text-red-300 list-disc">
                        {r.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  ))}
                  {errorRows.length > 100 && (
                    <p className="text-xs text-text-muted italic">
                      ... và {errorRows.length - 100} dòng lỗi khác
                    </p>
                  )}
                </div>
              </details>
            )}
          </div>
        )}

        <div className="flex gap-4 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors enabled:cursor-pointer disabled:opacity-50"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!canImport}
            className="flex-1 py-4 bg-brand-orange text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-brand-orange/20 enabled:cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {submitting ? 'IMPORTING...' : `IMPORT ${validRows.length} MÓN`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Analytics View ─────────────────────────────────────────
function AnalyticsView() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAdminAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const overview = analytics?.overview;

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">SYSTEM ANALYTICS</h1>
          <p className="text-text-muted font-medium font-sans">Aggregate data insights on user nutrition and system health.</p>
        </div>
        <button
          onClick={loadAnalytics}
          className="flex items-center gap-2 px-6 py-3 bg-brand-orange text-bg-dark rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-brand-orange/20"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20">
          <LoadingSpinner size={40} />
        </div>
      ) : analytics && overview ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[
              { label: 'Total Meals', value: overview.totalMeals.toLocaleString(), icon: Utensils, sub: 'All logged meals' },
              { label: 'Avg Calories', value: overview.averageCalories.toLocaleString(), icon: Flame, sub: 'Per user day' },
              { label: 'Food Library', value: overview.totalFoods.toLocaleString(), icon: Database, sub: 'Available items' },
              { label: 'Setup Rate', value: `${overview.setupCompletionRate}%`, icon: Target, sub: `${overview.totalUsers} total users` },
            ].map((item) => (
              <div key={item.label} className="bg-surface-dark border border-white/5 p-6 rounded-[2rem] shadow-lg">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                    <item.icon size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{item.sub}</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">{item.label}</p>
                <p className="text-3xl font-black text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-surface-dark border border-white/5 rounded-[2.5rem] p-8">
              <h3 className="text-lg font-black italic uppercase text-white mb-8">CONSUMPTION VS. TARGETS (MEAN)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.macroAverages} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="name" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1919', border: '1px solid #ffffff10', borderRadius: '1rem', color: '#fff' }}
                    itemStyle={{ color: '#ff9060', fontWeight: 900 }}
                  />
                  <Bar dataKey="average" fill="#ff9060" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="target" fill="#ffffff20" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] p-8">
              <h3 className="text-lg font-black italic uppercase text-white mb-8">FOODS BY CATEGORY</h3>
              <div className="space-y-4">
                {analytics.foodsByCategory.slice(0, 6).map((category) => {
                  const max = Math.max(...analytics.foodsByCategory.map(item => item.value), 1);
                  return (
                    <div key={category.name}>
                      <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-2">
                        <span className="text-text-muted">{category.name}</span>
                        <span className="text-white">{category.value}</span>
                      </div>
                      <div className="h-2 bg-bg-dark rounded-full overflow-hidden">
                        <div className="h-full bg-brand-orange rounded-full" style={{ width: `${Math.max(6, (category.value / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-surface-dark border border-white/5 rounded-[2.5rem] p-8">
              <h3 className="text-lg font-black italic uppercase text-white mb-8">MEALS LOGGED - LAST 7 DAYS</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={analytics.mealTrend}>
                  <defs>
                    <linearGradient id="analyticsMeals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff9060" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#ff9060" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="label" stroke="#999" />
                  <YAxis stroke="#999" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1919', border: '1px solid #ffffff10', borderRadius: '1rem', color: '#fff' }} />
                  <Area type="monotone" dataKey="meals" stroke="#ff9060" strokeWidth={4} fill="url(#analyticsMeals)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] overflow-hidden">
              <div className="px-8 py-6 border-b border-white/5">
                <h3 className="text-lg font-black italic uppercase text-white">TOP LOGGED FOODS</h3>
              </div>
              <div className="divide-y divide-white/5">
                {analytics.topFoods.length === 0 ? (
                  <div className="p-8 text-center text-text-muted text-sm">No meal logs yet.</div>
                ) : analytics.topFoods.map((food, index) => (
                  <div key={food.id} className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center font-black">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-black text-white">{food.name}</p>
                        <p className="text-xs text-text-muted">{food.calories} kcal</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-brand-orange">{food.count} logs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── Security View ─────────────────────────────────────────
function SecurityView({ showToast }: ViewProps) {
  const [activeSecTab, setActiveSecTab] = useState<'audit' | 'roles' | 'api'>('audit');
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [roles, setRoles] = useState<RoleAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSecurityData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, rolesRes, auditRes] = await Promise.all([
        fetchSecurityOverview(),
        fetchRoleAccounts(),
        fetchAuditLogs(50),
      ]);
      setOverview(overviewRes.data);
      setRoles(rolesRes.data);
      setAuditLogs(auditRes.data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load security data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  const handleRoleChange = async (account: RoleAccount, nextRole: 'admin' | 'user') => {
    if (account.role === nextRole) return;
    try {
      await updateAccountRole(account.accountId, nextRole);
      showToast(`Role changed to ${nextRole}`, 'success');
      await loadSecurityData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update role', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <header>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">SECURITY & ROLES</h1>
          <p className="text-text-muted font-medium">Infrastructure security, moderator permissions, and audit trails.</p>
        </header>
        
        {/* Tabs on Top Right */}
        <div className="flex gap-2">
          {['audit', 'roles', 'api'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSecTab(tab as any)}
              className={`px-4 py-2 font-black text-xs uppercase tracking-widest rounded-xl transition-colors ${
                activeSecTab === tab
                  ? 'bg-brand-orange text-bg-dark'
                  : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab === 'audit' && 'AUDIT'}
              {tab === 'roles' && 'ROLES'}
              {tab === 'api' && 'API'}
            </button>
          ))}
        </div>
      </div>

      {/* System Integrity Card */}
      <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] p-8 flex items-start gap-8">
        <div className="w-20 h-20 rounded-full bg-green-400/20 border-2 border-green-400 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={40} className="text-green-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-black italic uppercase text-white mb-2">SYSTEM INTEGRITY: OPTIMAL</h3>
          <p className="text-text-muted mb-4">
            End-to-end encryption is active for all user meal data. Database backups are synced every 6 hours to AWS S3 cluster.
          </p>
          <div className="flex gap-3">
            <span className="px-4 py-2 bg-green-400/10 text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-400/20">
              ✓ API GATEWAY ONLINE
            </span>
            <span className="px-4 py-2 bg-green-400/10 text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-400/20">
              ✓ AUTHLIB INTEGRATION VALID
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20"><LoadingSpinner size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          {[
            { label: 'Admins', value: overview?.adminAccounts ?? 0, icon: ShieldCheck },
            { label: 'Active Accounts', value: overview?.activeAccounts ?? 0, icon: Users },
            { label: 'Suspended', value: overview?.suspendedAccounts ?? 0, icon: Ban },
            { label: 'Unverified', value: overview?.unverifiedAccounts ?? 0, icon: Mail },
            { label: 'Audit Events', value: overview?.auditEvents ?? 0, icon: Activity },
          ].map((item) => (
            <div key={item.label} className="bg-surface-dark border border-white/5 rounded-[2rem] p-6">
              <div className="w-11 h-11 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center mb-4">
                <item.icon size={20} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">{item.label}</p>
              <p className="text-3xl font-black text-white">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Audit Trail Table */}
      {activeSecTab === 'audit' && (
        <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] overflow-hidden">
          <div className="px-8 py-6 flex items-center justify-between border-b border-white/5">
            <h3 className="text-lg font-black italic uppercase text-white">RECENT AUDIT TRAIL</h3>
            <button onClick={loadSecurityData} className="text-brand-orange text-[10px] font-black uppercase tracking-widest hover:text-orange-300 transition-colors">
              📥 REVEIEW LOGS
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-dark/50 border-b border-white/5">
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">ADMINISTRATOR</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">ACTION PERFORMED</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">ENTITY TARGET</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest text-text-muted">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-black text-white italic">{log.adminEmail}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-white font-bold">{log.action}</p>
                      {log.detail && <p className="text-xs text-text-muted mt-1">{log.detail}</p>}
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-brand-orange/10 text-brand-orange rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-orange/20">
                        {log.targetType}{log.targetId ? ` #${log.targetId}` : ''}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="text-text-muted text-[10px] font-black uppercase tracking-widest">{new Date(log.createdAt).toLocaleString()}</p>
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-14 text-center text-text-muted">No audit events yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles Tab Placeholder */}
      {activeSecTab === 'roles' && (
        <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] overflow-hidden">
          <div className="px-8 py-6 border-b border-white/5">
            <h3 className="text-lg font-black italic uppercase text-white">ROLES MANAGEMENT</h3>
            <p className="text-xs text-text-muted mt-1">Promote users to admin or return admin accounts to user role.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-dark/50 border-b border-white/5">
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">ACCOUNT</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">STATUS</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">CURRENT ROLE</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest text-text-muted">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((account) => (
                  <tr key={account.accountId} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-black text-white">{account.name}</p>
                      <p className="text-xs text-text-muted">{account.email}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 rounded-full bg-white/5 text-text-muted text-[10px] font-black uppercase tracking-widest border border-white/10">
                        {account.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        account.role === 'admin'
                          ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/20'
                          : 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                      }`}>
                        {account.role}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => handleRoleChange(account, account.role === 'admin' ? 'user' : 'admin')}
                        className="px-4 py-2 text-brand-orange hover:bg-brand-orange/10 rounded-lg transition-colors font-black text-xs"
                      >
                        {account.role === 'admin' ? 'MAKE USER' : 'MAKE ADMIN'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API Tab Placeholder */}
      {activeSecTab === 'api' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] p-8">
            <div className="w-16 h-16 rounded-3xl bg-green-400/10 text-green-400 flex items-center justify-center mb-6">
              <Server size={32} />
            </div>
            <h3 className="text-2xl font-black italic uppercase text-white mb-3">Backend API</h3>
            <p className="text-text-muted text-sm mb-6">Admin routes are protected by JWT authentication and role checks.</p>
            <span className="px-4 py-2 rounded-full bg-green-400/10 text-green-400 text-[10px] font-black uppercase tracking-widest border border-green-400/20">
              Running
            </span>
          </div>
          <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] p-8">
            <div className="w-16 h-16 rounded-3xl bg-brand-orange/10 text-brand-orange flex items-center justify-center mb-6">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-2xl font-black italic uppercase text-white mb-3">Access Model</h3>
            <p className="text-text-muted text-sm mb-6">Current supported roles are admin and user. Role changes are logged in the audit trail.</p>
            <div className="flex gap-3">
              <span className="px-4 py-2 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-widest border border-brand-orange/20">admin</span>
              <span className="px-4 py-2 rounded-full bg-blue-400/10 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-400/20">user</span>
            </div>
          </div>
        </div>
      )}
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
