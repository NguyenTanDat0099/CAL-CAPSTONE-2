import React, { useState, useEffect } from 'react';
import { AdminSidebar } from './components/AdminSidebar';
import { 
  Bell, X, Search, Users, 
  LayoutDashboard, Database, PieChart,
  ArrowUpRight, ArrowDownRight, MoreVertical,
  Camera, Target, ShieldCheck, CheckCircle2, 
  AlertTriangle, ChevronRight, Eye, Edit, Trash2,
  Download, Filter, Plus, Save, RefreshCw,
  Clock, Shield, Globe, Mail, Phone, Lock,
  Settings, Flag, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
  PieChart as RePieChart, Pie
} from 'recharts';
import { AdminProfile, User, Meal, ScanResult } from './types';

// Mock Data
const chartData = [
  { name: 'Mon', users: 400, scans: 240, logs: 2400 },
  { name: 'Tue', users: 300, scans: 139, logs: 1398 },
  { name: 'Wed', users: 500, scans: 980, logs: 9800 },
  { name: 'Thu', users: 278, scans: 390, logs: 3908 },
  { name: 'Fri', users: 489, scans: 480, logs: 4800 },
  { name: 'Sat', users: 239, scans: 380, logs: 3800 },
  { name: 'Sun', users: 649, scans: 430, logs: 4300 },
];

const pieData = [
  { name: 'Lose Weight', value: 45, color: '#ff9060' },
  { name: 'Maintain', value: 30, color: '#D4C3F9' },
  { name: 'Gain Muscle', value: 25, color: '#82F9A1' },
];

export default function App() {
  return <AdminApp />;
}

function AdminApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [profile] = useState<AdminProfile>({
    name: 'Admin User',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
    role: 'Super Admin'
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const notifications = [
    { id: '1', message: 'New user registered: Sarah Connor', time: '5m ago' },
    { id: '2', message: 'System update completed successfully', time: '1h ago' },
    { id: '3', message: 'Low confidence scan detected: Session #842', time: '3h ago', type: 'error' },
  ];

  return (
    <div className="flex min-h-screen bg-bg-dark text-white font-sans antialiased">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400'
            } backdrop-blur-md`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span className="text-sm font-bold uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Header */}
      <div className="fixed top-0 right-0 left-64 h-24 px-8 z-40 flex items-center justify-between bg-bg-dark/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4 bg-surface-dark px-4 py-2 rounded-2xl border border-white/5 w-96">
          <Search size={18} className="text-text-muted" />
          <input 
            type="text" 
            placeholder="Search users, foods, scans..." 
            className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-text-muted"
          />
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
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-orange text-bg-dark text-[10px] font-black rounded-full flex items-center justify-center border-2 border-bg-dark">
                3
              </span>
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
                    <button onClick={() => setShowNotifications(false)} className="text-text-muted hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto bg-surface-dark">
                    {notifications.map(n => (
                      <div key={n.id} className="p-6 border-b border-white/5 hover:bg-white/5 transition-colors relative group">
                        <p className={`text-sm font-medium pr-6 ${n.type === 'error' ? 'text-red-400' : ''}`}>{n.message}</p>
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
              <p className="text-sm font-bold text-white leading-none">{profile.name}</p>
              <p className="text-[10px] text-brand-orange font-black uppercase tracking-tighter mt-1">{profile.role}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl border border-white/10 overflow-hidden shadow-lg">
              <img 
                src={profile.avatar} 
                alt={profile.name} 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 ml-64 pt-24 p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <AdminDashboard />}
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

function AdminDashboard() {
  return (
    <div className="space-y-8 pb-10">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic">DASHBOARD</h1>
          <p className="text-text-muted font-medium">Real-time system monitoring and user analytics.</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 bg-surface-dark border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-colors">
            <Download size={14} />
            Export Stats
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-brand-orange text-bg-dark rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform active:scale-95">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: '1,284', change: '+12%', icon: Users, trend: 'up' },
          { label: 'AI Scans Today', value: '142', change: '+24%', icon: Camera, trend: 'up' },
          { label: 'Meals Logged', value: '8,921', change: '+18%', icon: Database, trend: 'up' },
          { label: 'Avg Confidence', value: '86.4%', change: '+2.1%', icon: ShieldCheck, trend: 'up' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface-dark border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group cursor-pointer hover:border-brand-orange/20 transition-colors">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-brand-orange group-hover:scale-110 transition-transform shadow-lg">
                  <stat.icon size={24} />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${
                  stat.trend === 'up' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                }`}>
                  {stat.trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {stat.change}
                </div>
              </div>
              <p className="text-text-muted text-xs font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black">{stat.value}</h3>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-brand-orange/10 transition-colors" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* User Activity Area Chart */}
          <div className="bg-surface-dark border border-white/5 p-8 rounded-[2.5rem]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter">AI Recognition Volume</h3>
                <p className="text-text-muted text-xs font-medium">Daily scan throughput and accuracy trends</p>
              </div>
              <div className="flex bg-bg-dark/50 p-1 rounded-xl border border-white/5">
                {['Day', 'Week', 'Month'].map(t => (
                  <button key={t} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${t === 'Week' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff9060" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ff9060" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#adaaaa', fontSize: 10, fontWeight: 700}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#adaaaa', fontSize: 10, fontWeight: 700}}
                  />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#1a1919', border: '1px solid #ffffff10', borderRadius: '1rem', color: '#fff'}}
                    itemStyle={{color: '#ff9060', fontWeight: 900}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="scans" 
                    stroke="#ff9060" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorScans)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Goal Distribution Pie Chart */}
          <div className="bg-surface-dark border border-white/5 p-8 rounded-[2.5rem]">
            <h3 className="text-xl font-black mb-6 italic uppercase tracking-tighter">Goal Distribution</h3>
            <div className="h-[200px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-6">
              {pieData.map((goal, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: goal.color }} />
                    <span className="text-xs font-bold text-text-muted">{goal.name}</span>
                  </div>
                  <span className="text-xs font-black">{goal.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-surface-dark border border-white/5 p-8 rounded-[2.5rem]">
            <h3 className="text-xl font-black mb-6 italic uppercase tracking-tighter">Live Activity</h3>
            <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {[
                { user: 'Sarah Connor', action: 'Uploaded food scan', time: '2m ago', color: 'bg-brand-orange' },
                { user: 'John Doe', action: 'Updated target weight', time: '15m ago', color: 'bg-blue-400' },
                { user: 'Alex Rivers', action: 'Subscribed to Premium', time: '1h ago', color: 'bg-yellow-400' },
                { user: 'System', action: 'Daily backup complete', time: '3h ago', color: 'bg-green-400' },
                { user: 'Sarah Miller', action: 'Logged Breakfast', time: '5h ago', color: 'bg-brand-orange' },
              ].map((action, i) => (
                <div key={i} className="flex gap-4 items-start relative pb-6 border-l-2 border-white/5 pl-6 last:pb-0 group cursor-pointer hover:bg-white/2 transition-colors">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-surface-dark border-2 border-white/5 flex items-center justify-center group-hover:scale-125 transition-transform">
                    <div className={`w-1.5 h-1.5 rounded-full ${action.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold group-hover:text-brand-orange transition-colors">{action.user} <span className="text-text-muted font-normal">{action.action}</span></p>
                    <p className="text-[10px] text-text-muted font-black uppercase mt-1 tracking-widest flex items-center gap-1">
                      <Clock size={10} /> {action.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ViewProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

function UserManagement({ showToast }: ViewProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filter, setFilter] = useState('All');
  
  const users: User[] = [
    { 
      id: '1', name: 'Alex Rivers', email: 'alex@example.com', role: 'user', status: 'active', 
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
      lastLogin: '2m ago', weight: 75, targetWeight: 70, goal: 'lose', height: 180, age: 28, gender: 'male'
    },
    { 
      id: '2', name: 'John Doe', email: 'john@example.com', role: 'user', status: 'inactive', 
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      lastLogin: '2d ago', weight: 88, targetWeight: 88, goal: 'maintain', height: 175, age: 34, gender: 'male'
    },
    { 
      id: '3', name: 'Sarah Miller', email: 'sarah@example.com', role: 'premium', status: 'active', 
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      lastLogin: '1h ago', weight: 62, targetWeight: 65, goal: 'gain', height: 168, age: 26, gender: 'female'
    },
    { 
      id: '4', name: 'Mike Ross', email: 'mike@example.com', role: 'user', status: 'active', 
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      lastLogin: '5h ago', weight: 82, targetWeight: 78, goal: 'lose', height: 185, age: 31, gender: 'male'
    },
  ];

  const toggleStatus = (user: User) => {
    showToast(`Account for ${user.name} has been ${user.status === 'active' ? 'suspended' : 'activated'}.`, user.status === 'active' ? 'error' : 'success');
    setSelectedUser(null);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase">USER MANAGEMENT</h1>
          <p className="text-text-muted font-medium">Manage user profiles, subscriptions, and dietary progress.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-surface-dark border border-white/5 p-1 rounded-2xl">
            {['All', 'Premium', 'Inactive'].map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${filter === f ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-brand-orange text-bg-dark font-black rounded-xl hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-brand-orange/20">
            <Plus size={16} /> ADD USER
          </button>
        </div>
      </header>

      <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/2">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">User Profile</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Dietary Goal</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Weight Progress</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Status</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <img src={user.avatar} className="w-12 h-12 rounded-[1.2rem] object-cover border-2 border-white/10 group-hover:border-brand-orange/40 transition-colors" />
                    <div>
                      <p className="font-black text-sm group-hover:text-brand-orange transition-colors">{user.name}</p>
                      <p className="text-[10px] text-text-muted font-bold">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    user.role === 'premium' ? 'bg-brand-orange/10 text-brand-orange' : 'bg-white/5 text-text-muted'
                  }`}>
                    {user.goal} • {user.role}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="w-40 space-y-2">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-text-muted">
                      <span>{user.weight}kg <span className="opacity-40">Current</span></span>
                      <span>{user.targetWeight}kg <span className="opacity-40">Target</span></span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (user.weight! / user.targetWeight!) * 100)}%` }}
                        className="h-full bg-gradient-to-r from-brand-orange to-brand-orange-dark shadow-[0_0_8px_rgba(255,144,96,0.5)]" 
                      />
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-400' : 'bg-red-400'} shadow-[0_0_8px_rgba(74,222,128,0.5)]`} />
                    <span className="text-xs font-black uppercase tracking-widest capitalize">{user.status}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setSelectedUser(user)}
                      className="p-2 rounded-xl bg-white/5 text-text-muted hover:text-white transition-colors"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      className="p-2 rounded-xl bg-white/5 text-text-muted hover:text-brand-orange transition-colors"
                      title="Edit Profile"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => showToast(`User ${user.name} deleted.`, 'error')}
                      className="p-2 rounded-xl bg-red-400/10 text-red-400 hover:bg-red-400 hover:text-white transition-all"
                      title="Delete User"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-bg-dark/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-surface-dark border border-white/10 rounded-[3rem] max-w-3xl w-full shadow-2xl overflow-hidden"
            >
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-8">
                    <div className="relative">
                      <img src={selectedUser.avatar} className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-brand-orange/20" />
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-brand-orange text-bg-dark flex items-center justify-center border-4 border-surface-dark shadow-xl">
                        <Users size={18} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-4xl font-black tracking-tighter">{selectedUser.name}</h2>
                      <p className="text-text-muted font-bold text-lg">{selectedUser.email}</p>
                      <div className="flex gap-3 mt-4">
                        <span className="px-4 py-1.5 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-widest border border-brand-orange/20">
                          {selectedUser.role} Profile
                        </span>
                        <span className="px-4 py-1.5 rounded-full bg-white/5 text-text-muted text-[10px] font-black uppercase tracking-widest border border-white/10">
                          Joined Jan 2026
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="p-3 rounded-2xl bg-white/5 text-text-muted hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Age', value: selectedUser.age, unit: 'yrs', icon: Clock },
                    { label: 'Height', value: selectedUser.height, unit: 'cm', icon: Target },
                    { label: 'Current', value: selectedUser.weight, unit: 'kg', icon: Users },
                    { label: 'Target', value: selectedUser.targetWeight, unit: 'kg', icon: Flag },
                  ].map((stat, i) => (
                    <div key={i} className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5 group hover:border-brand-orange/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2 text-text-muted">
                        <stat.icon size={14} className="group-hover:text-brand-orange transition-colors" />
                        <p className="text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                      </div>
                      <p className="text-2xl font-black">{stat.value} <span className="text-xs font-medium opacity-40">{stat.unit}</span></p>
                    </div>
                  ))}
                </div>

                <div className="bg-surface-lighter/50 rounded-[2rem] p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-xs uppercase tracking-widest italic flex items-center gap-2">
                      <PieChart size={16} className="text-brand-orange" /> Activity Summary (Last 30 Days)
                    </h4>
                    <button className="text-[10px] font-black text-brand-orange uppercase tracking-widest hover:underline">View Detailed Logs</button>
                  </div>
                  <div className="grid grid-cols-3 gap-8">
                    <div className="text-center p-4 bg-bg-dark/30 rounded-2xl border border-white/5">
                      <p className="text-2xl font-black mb-1">42</p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Meals Logged</p>
                    </div>
                    <div className="text-center p-4 bg-bg-dark/30 rounded-2xl border border-white/5">
                      <p className="text-2xl font-black mb-1">12</p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">AI Scans</p>
                    </div>
                    <div className="text-center p-4 bg-bg-dark/30 rounded-2xl border border-white/5">
                      <p className="text-2xl font-black text-green-400 mb-1">85%</p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Goal Consistency</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => toggleStatus(selectedUser)}
                    className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                      selectedUser.status === 'active' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white'
                    }`}
                  >
                    {selectedUser.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                  </button>
                  <button className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors">
                    Send Password Reset
                  </button>
                  <button className="px-8 py-5 bg-brand-orange text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95">
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContentManagement({ showToast }: ViewProps) {
  const [activeTab, setActiveTab] = useState<'foods' | 'scans'>('foods');
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const [selectedFood, setSelectedFood] = useState<Meal | null>(null);

  const foodItems: Meal[] = [
    { id: '1', name: 'Avocado Toast', calories: 350, protein: 8, carbs: 32, fats: 22, fiber: 12, sugar: 4, category: 'Breakfast', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=100&h=100&fit=crop', description: 'Whole grain sourdough topped with mashed avocado, chili flakes, and a poached egg.', about: 'A classic breakfast choice providing healthy fats and complex carbohydrates.' },
    { id: '2', name: 'Grilled Chicken Salad', calories: 420, protein: 45, carbs: 12, fats: 18, fiber: 6, sugar: 2, category: 'Lunch', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop', description: 'Lean grilled chicken breast on a bed of mixed greens with cucumber, tomato, and olive oil.', about: 'High-protein meal designed for muscle maintenance and satiety.' },
    { id: '3', name: 'Salmon with Quinoa', calories: 550, protein: 38, carbs: 45, fats: 24, fiber: 8, sugar: 1, category: 'Dinner', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=100&h=100&fit=crop', description: 'Oven-baked Atlantic salmon served with fluffy quinoa and steamed asparagus.', about: 'Rich in Omega-3 fatty acids and complete plant protein.' },
  ];

  const recentScans: ScanResult[] = [
    { id: 's1', userName: 'Sarah Connor', foodName: 'Tonkotsu Ramen', confidence: 0.94, timestamp: '2m ago', imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop', status: 'verified' },
    { id: 's2', userName: 'John Doe', foodName: 'Apple Pie', confidence: 0.62, timestamp: '15m ago', imageUrl: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=400&h=400&fit=crop', status: 'flagged' },
    { id: 's3', userName: 'Alex Rivers', foodName: 'Chicken Salad', confidence: 0.88, timestamp: '1h ago', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop', status: 'verified' },
  ];

  const verifyScan = (scan: ScanResult, status: 'verified' | 'flagged') => {
    showToast(`Scan ID #${scan.id} has been marked as ${status}.`);
    setSelectedScan(null);
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase">CONTENT MANAGER</h1>
          <p className="text-text-muted font-medium">Curate the food database and validate AI recognition logs.</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 bg-white/5 text-white border border-white/10 font-black rounded-xl hover:bg-white/10 transition-colors uppercase text-[10px] tracking-widest">
            <Download size={14} /> EXPORT DATABASE
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-brand-orange text-bg-dark font-black rounded-xl hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-brand-orange/20 uppercase text-[10px] tracking-widest">
            <Plus size={16} /> ADD FOOD ITEM
          </button>
        </div>
      </header>
      
      <div className="flex gap-10 border-b border-white/10 mb-8">
        {[
          { id: 'foods', label: 'Food Library', icon: Database },
          { id: 'scans', label: 'AI Scan Logs', icon: Camera },
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-4 text-sm font-black uppercase tracking-widest relative flex items-center gap-2 transition-colors ${activeTab === t.id ? 'text-brand-orange' : 'text-text-muted hover:text-white'}`}
          >
            <t.icon size={16} /> {t.label}
            {activeTab === t.id && <motion.div layoutId="content-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange shadow-[0_0_8px_#ff9060]" />}
          </button>
        ))}
      </div>

      <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {activeTab === 'foods' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Food Item</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Category</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Macro Profile</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Micro / Other</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {foodItems.map(item => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <img src={item.image} className="w-12 h-12 rounded-[1.2rem] object-cover border-2 border-white/10 group-hover:border-brand-orange/40 transition-colors" />
                      <div>
                        <p className="font-black text-sm group-hover:text-brand-orange transition-colors uppercase tracking-tight">{item.name}</p>
                        <p className="text-[10px] text-brand-orange font-black uppercase tracking-widest">{item.calories} kcal <span className="text-text-muted opacity-40">Per 100g</span></p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-text-muted">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-3 text-[10px] font-black">
                      <div className="flex flex-col">
                        <span className="text-green-400">P: {item.protein}g</span>
                        <div className="w-8 h-1 bg-white/5 rounded-full mt-1 overflow-hidden"><div className="h-full bg-green-400" style={{width: '60%'}} /></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-blue-400">C: {item.carbs}g</span>
                        <div className="w-8 h-1 bg-white/5 rounded-full mt-1 overflow-hidden"><div className="h-full bg-blue-400" style={{width: '40%'}} /></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-yellow-400">F: {item.fats}g</span>
                        <div className="w-8 h-1 bg-white/5 rounded-full mt-1 overflow-hidden"><div className="h-full bg-yellow-400" style={{width: '30%'}} /></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest">
                    {item.fiber}g Fiber / {item.sugar}g Sugar
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedFood(item)} className="p-2 rounded-xl bg-white/5 text-text-muted hover:text-white transition-colors" title="View Info"><Eye size={18} /></button>
                      <button className="p-2 rounded-xl bg-white/5 text-text-muted hover:text-brand-orange transition-colors" title="Edit Food"><Edit size={18} /></button>
                      <button onClick={() => showToast(`Food "${item.name}" deleted.`, 'error')} className="p-2 rounded-xl bg-red-400/10 text-red-400 hover:bg-red-400 hover:text-white transition-all" title="Delete Food"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">User</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">AI Detection</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">System Confidence</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Status</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentScans.map(scan => (
                <tr key={scan.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6 text-sm font-black uppercase tracking-tighter">{scan.userName}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <img src={scan.imageUrl} className="w-14 h-14 rounded-[1.2rem] object-cover border-2 border-white/10 group-hover:border-brand-orange/40 transition-colors" />
                      <div>
                        <p className="font-black text-sm uppercase tracking-tight">{scan.foodName}</p>
                        <p className="text-[8px] text-text-muted font-black uppercase tracking-widest">{scan.timestamp}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 w-24 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${scan.confidence * 100}%` }}
                          className={`h-full ${scan.confidence > 0.8 ? 'bg-green-400' : scan.confidence > 0.6 ? 'bg-yellow-400' : 'bg-red-400'}`} 
                        />
                      </div>
                      <span className={`text-xs font-black ${scan.confidence > 0.8 ? 'text-green-400' : 'text-red-400'}`}>{Math.round(scan.confidence * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${
                      scan.status === 'verified' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                    }`}>
                      {scan.status === 'verified' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      {scan.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedScan(scan)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">Review</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Scan Detail Modal */}
      <AnimatePresence>
        {selectedScan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedScan(null)} className="absolute inset-0 bg-bg-dark/95 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-surface-dark border border-white/10 rounded-[4rem] max-w-4xl w-full shadow-2xl overflow-hidden">
              <div className="grid grid-cols-2 h-[600px]">
                <div className="relative overflow-hidden">
                  <img src={selectedScan.imageUrl} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent" />
                  <div className="absolute bottom-10 left-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-orange mb-2">Original Scan Image</p>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">{selectedScan.foodName}</h2>
                  </div>
                </div>
                <div className="p-12 space-y-10 flex flex-col">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter mb-1">AI Scan Insight</h3>
                      <p className="text-text-muted text-sm font-bold">Session ID: #{selectedScan.id}</p>
                    </div>
                    <button onClick={() => setSelectedScan(null)} className="p-3 rounded-2xl bg-white/5 text-text-muted hover:text-white transition-colors"><X size={20} /></button>
                  </div>

                  <div className="space-y-6 flex-1 overflow-y-auto pr-4 custom-scrollbar">
                    <div className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Neural Confidence</p>
                        <span className="text-lg font-black text-brand-orange">{Math.round(selectedScan.confidence * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-orange" style={{width: `${selectedScan.confidence * 100}%`}} />
                      </div>
                      <p className="text-[10px] text-text-muted mt-4 leading-relaxed font-bold">
                        The model identified this as <span className="text-white italic">"{selectedScan.foodName}"</span> based on top-k probability clusters in the visual latent space.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Detected By</p>
                        <p className="text-sm font-black">Gemini 2.0 Vision</p>
                      </div>
                      <div className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">User Intent</p>
                        <p className="text-sm font-black uppercase">Manual Scan</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 border-t border-white/5">
                    <button onClick={() => verifyScan(selectedScan, 'flagged')} className="flex-1 py-5 bg-red-400/10 text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-400 hover:text-white transition-all">Flag As Incorrect</button>
                    <button onClick={() => verifyScan(selectedScan, 'verified')} className="flex-1 py-5 bg-brand-orange text-bg-dark rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform">Verify Detection</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Food Detail Modal */}
      <AnimatePresence>
        {selectedFood && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedFood(null)} className="absolute inset-0 bg-bg-dark/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-surface-dark border border-white/10 rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-hidden p-12">
              <div className="flex justify-between items-start mb-10">
                <div className="flex gap-8 items-center">
                  <img src={selectedFood.image} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-brand-orange/20" />
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter uppercase italic">{selectedFood.name}</h2>
                    <p className="text-brand-orange text-sm font-black uppercase tracking-[0.2em] mt-1">{selectedFood.category}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedFood(null)} className="p-3 rounded-2xl bg-white/5 text-text-muted hover:text-white transition-colors"><X size={24} /></button>
              </div>

              <div className="space-y-10">
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { l: 'Calories', v: selectedFood.calories, c: 'text-white' },
                    { l: 'Protein', v: selectedFood.protein + 'g', c: 'text-green-400' },
                    { l: 'Carbs', v: selectedFood.carbs + 'g', c: 'text-blue-400' },
                    { l: 'Fats', v: selectedFood.fats + 'g', c: 'text-yellow-400' },
                  ].map((s, i) => (
                    <div key={i} className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5 text-center">
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-2">{s.l}</p>
                      <p className={`text-2xl font-black ${s.c}`}>{s.v}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Description</h4>
                  <p className="text-sm font-medium leading-relaxed italic text-white/80">{selectedFood.description}</p>
                </div>

                <div className="pt-8 border-t border-white/5 flex gap-4">
                  <button className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors">Edit Parameters</button>
                  <button onClick={() => setSelectedFood(null)} className="px-12 py-5 bg-brand-orange text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95">Confirm</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnalyticsView() {
  const nutrientData = [
    { name: 'Protein', average: 142, target: 160 },
    { name: 'Carbs', average: 210, target: 180 },
    { name: 'Fats', average: 65, target: 70 },
    { name: 'Fiber', average: 28, target: 35 },
  ];

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase">SYSTEM ANALYTICS</h1>
          <p className="text-text-muted font-medium">Aggregate data insights on user nutrition and system health.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-surface-dark border border-white/5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
          <Download size={14} /> Full Analytics Report
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface-dark border border-white/5 p-10 rounded-[2.5rem] shadow-xl">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black italic uppercase tracking-tighter">Consumption vs. Targets (Mean)</h3>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-brand-orange" />
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Average</span>
              <span className="w-3 h-3 rounded-full bg-white/10 ml-2" />
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Target</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nutrientData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#adaaaa', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#adaaaa', fontSize: 10, fontWeight: 700}} />
                <Tooltip cursor={{fill: '#ffffff03'}} contentStyle={{backgroundColor: '#1a1919', border: '1px solid #ffffff10', borderRadius: '1rem', color: '#fff'}} />
                <Bar dataKey="average" fill="#ff9060" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="target" fill="#ffffff10" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-dark border border-white/5 p-10 rounded-[2.5rem] flex flex-col justify-center items-center text-center shadow-xl">
          <div className="w-24 h-24 rounded-[2rem] bg-brand-orange/10 flex items-center justify-center text-brand-orange mb-8 shadow-inner shadow-brand-orange/20">
            <PieChart size={48} />
          </div>
          <h3 className="text-3xl font-black mb-4 italic uppercase tracking-tighter">Retention Analytics</h3>
          <p className="text-text-muted max-w-sm mb-10 font-medium">User engagement has increased by <span className="text-white font-black">15.4%</span> since the new AI Scan features were introduced.</p>
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5">
              <p className="text-2xl font-black">92%</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mt-1">DAU Consistency</p>
            </div>
            <div className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5">
              <p className="text-2xl font-black">4.8m</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mt-1">Avg Session Time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityView({ showToast }: ViewProps) {
  const [activeSubTab, setActiveSubTab] = useState('Audit');

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase">SECURITY & ROLES</h1>
          <p className="text-text-muted font-medium">Infrastructure security, moderator permissions, and audit trails.</p>
        </div>
        <div className="flex bg-surface-dark border border-white/5 p-1 rounded-xl">
          {['Audit', 'Roles', 'API'].map(t => (
            <button key={t} onClick={() => setActiveSubTab(t)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${activeSubTab === t ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="bg-surface-dark border border-white/5 p-10 rounded-[2.5rem] flex items-center gap-10 shadow-2xl">
        <div className="w-24 h-24 rounded-[2rem] bg-green-400/10 flex items-center justify-center text-green-400 shadow-inner shadow-green-400/20">
          <ShieldCheck size={48} />
        </div>
        <div>
          <h3 className="text-3xl font-black mb-2 italic uppercase tracking-tighter">System Integrity: Optimal</h3>
          <p className="text-text-muted font-bold">End-to-end encryption is active for all user meal data. Database backups are synced every 6 hours to AWS S3.</p>
          <div className="flex gap-4 mt-6">
            <span className="flex items-center gap-2 text-[10px] font-black text-green-400 uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> API Gateway Online</span>
            <span className="flex items-center gap-2 text-[10px] font-black text-green-400 uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Auth0 Integration Valid</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2">
          <h3 className="font-black text-xs uppercase tracking-widest italic">Recent Audit Trail</h3>
          <button onClick={() => showToast('Audit logs refreshed.')} className="text-brand-orange text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1"><RefreshCw size={12} /> Refresh Logs</button>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Administrator</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Action Performed</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Entity Target</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {[
              { admin: 'Super Admin', action: 'Modified Food Library', target: 'Avocado Toast', time: '2 mins ago' },
              { admin: 'Moderator #1', action: 'Suspended Account', target: 'User #9283', time: '45 mins ago' },
              { admin: 'System Engine', action: 'DB Schema Backup', target: 'calai_v2_main', time: '2 hours ago' },
              { admin: 'Analyst #3', action: 'Generated Analytics PDF', target: 'Monthly_Report_Feb', time: '5 hours ago' },
            ].map((log, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                <td className="px-8 py-6 text-sm font-black italic">{log.admin}</td>
                <td className="px-8 py-6 text-xs font-bold text-white/80">{log.action}</td>
                <td className="px-8 py-6 text-xs font-bold text-brand-orange">{log.target}</td>
                <td className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminSettings({ showToast }: ViewProps) {
  const [activeSetting, setActiveSetting] = useState('General');

  const saveSettings = () => {
    showToast('System configuration saved successfully!');
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase">SYSTEM SETTINGS</h1>
          <p className="text-text-muted font-medium">Configure global system parameters, API integrations, and branding.</p>
        </div>
        <button onClick={saveSettings} className="flex items-center gap-2 px-8 py-4 bg-brand-orange text-bg-dark font-black rounded-2xl shadow-xl shadow-brand-orange/20 hover:scale-105 transition-transform active:scale-95 uppercase text-[10px] tracking-widest">
          <Save size={18} /> Save Configuration
        </button>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <aside className="col-span-12 lg:col-span-3 space-y-2">
          {[
            { id: 'General', icon: Globe },
            { id: 'Integrations', icon: Zap },
            { id: 'Email/SMTP', icon: Mail },
            { id: 'Communication', icon: Phone },
            { id: 'Advanced', icon: Lock },
          ].map(s => (
            <button 
              key={s.id} 
              onClick={() => setActiveSetting(s.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeSetting === s.id ? 'bg-white/10 text-brand-orange border border-white/10 shadow-lg shadow-brand-orange/5' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
            >
              <s.icon size={16} /> {s.id}
            </button>
          ))}
        </aside>

        <div className="col-span-12 lg:col-span-9 bg-surface-dark border border-white/5 p-12 rounded-[3rem] shadow-2xl space-y-12">
          {activeSetting === 'General' && (
            <>
              <section className="space-y-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-orange mb-10 flex items-center gap-3">
                  <div className="w-10 h-0.5 bg-brand-orange" /> General Instance Configuration
                </h3>
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Project Name</label>
                    <input type="text" defaultValue="CalAI Professional" className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Instance URL</label>
                    <input type="text" defaultValue="https://admin.calai.app" className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors" />
                  </div>
                </div>
              </section>

              <section className="space-y-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-orange mb-10 flex items-center gap-3">
                  <div className="w-10 h-0.5 bg-brand-orange" /> Visual Branding
                </h3>
                <div className="flex gap-6 items-center">
                  <div className="w-20 h-20 rounded-3xl bg-brand-orange shadow-lg ring-4 ring-brand-orange/20 cursor-pointer" />
                  <div className="w-20 h-20 rounded-3xl bg-blue-500 hover:scale-110 transition-transform cursor-pointer" />
                  <div className="w-20 h-20 rounded-3xl bg-green-500 hover:scale-110 transition-transform cursor-pointer" />
                  <div className="w-20 h-20 rounded-3xl bg-purple-500 hover:scale-110 transition-transform cursor-pointer" />
                  <div className="ml-10">
                    <p className="text-xs font-bold text-white mb-2">Accent Color Selection</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-black">Changes system primary UI tokens.</p>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeSetting === 'Integrations' && (
            <section className="space-y-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-orange mb-10 flex items-center gap-3">
                <div className="w-10 h-0.5 bg-brand-orange" /> Third-Party AI Engine Configuration
              </h3>
              <div className="space-y-8">
                <div className="bg-bg-dark/50 p-8 rounded-[2.5rem] border border-white/10 flex justify-between items-center group hover:border-brand-orange/30 transition-colors">
                  <div className="flex gap-6 items-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-brand-orange"><Globe size={28} /></div>
                    <div>
                      <h4 className="text-lg font-black italic uppercase tracking-tighter">Google Gemini 2.0</h4>
                      <p className="text-xs text-text-muted font-bold">API Status: <span className="text-green-400">Connected</span> • Latency: 420ms</p>
                    </div>
                  </div>
                  <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">Configure API Key</button>
                </div>
                
                <div className="bg-bg-dark/50 p-8 rounded-[2.5rem] border border-white/10 flex justify-between items-center group hover:border-brand-orange/30 transition-colors">
                  <div className="flex gap-6 items-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-blue-400"><Shield size={28} /></div>
                    <div>
                      <h4 className="text-lg font-black italic uppercase tracking-tighter">Auth0 Authentication</h4>
                      <p className="text-xs text-text-muted font-bold">Identity Provider: <span className="text-green-400">Healthy</span></p>
                    </div>
                  </div>
                  <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">Manage OIDC</button>
                </div>
              </div>
            </section>
          )}

          {activeSetting !== 'General' && activeSetting !== 'Integrations' && (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <Settings size={48} className="mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">{activeSetting} Settings Under Development</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
