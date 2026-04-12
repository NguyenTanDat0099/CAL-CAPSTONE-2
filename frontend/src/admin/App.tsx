import React, { useState, useEffect, useRef } from 'react';
import { AdminSidebar } from './components/AdminSidebar';
import { 
  Bell, X, Search, Users, 
  LayoutDashboard, Database, 
  PieChart as PieChartIcon,
  ArrowUpRight, ArrowDownRight, MoreVertical,
  Camera, Target, ShieldCheck, CheckCircle2, 
  AlertTriangle, ChevronRight, Eye, Edit, Trash2,
  Download, Filter, Plus, Save, RefreshCw,
  Clock, Shield, Globe, Mail, Phone, Lock,
  Settings as SettingsIcon, Flag, Zap, Upload, Server, Cpu,
  Ban, ChevronDown, Minus, MessageSquare, ShieldAlert,
  ChevronUp, BellRing, Smartphone, MessageCircle, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
  PieChart, Pie, Sector
} from 'recharts';
import { AdminProfile, User, Meal, ScanResult } from './types';

// Custom Hooks & Components
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

function CustomSelect({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: { value: string, label: string }[] }) {
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
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
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

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 6}
        outerRadius={innerRadius - 2}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

export default function App() {
  return <AdminApp />;
}

function AdminApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  
  const [profile] = useState<AdminProfile>({
    name: 'Admin User',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
    role: 'Super Admin'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const notifications = [
    { id: '1', message: 'New user registered: Sarah Connor', time: '5m ago' },
    { id: '2', message: 'System update completed successfully', time: '1h ago' },
    { id: '3', message: 'Low confidence scan detected: Session #842', time: '3h ago', type: 'error' },
  ];

  return (
    <div className="flex min-h-screen bg-bg-dark text-white font-sans antialiased selection:bg-brand-orange/30">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Toast Notification */}
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
          {/* Conditional Search Bar: Only for users and content tags */}
          {(activeTab === 'users' || activeTab === 'content') && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 bg-surface-dark px-4 py-2 rounded-2xl border border-white/5 w-96 shadow-inner"
            >
              <Search size={18} className="text-text-muted" />
              <input 
                type="text" 
                placeholder={`Search ${activeTab === 'users' ? 'users...' : 'foods, scans...'}`}
                className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-text-muted"
              />
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
                  <div className="max-h-96 overflow-y-auto bg-surface-dark custom-scrollbar">
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

      <main className="flex-1 ml-64 pt-24 p-8 overflow-y-auto custom-scrollbar">
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
  const [activePieIndex, setActivePieIndex] = useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActivePieIndex(index);
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">DASHBOARD</h1>
          <p className="text-text-muted font-medium font-sans">Real-time system monitoring and user analytics summary.</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 bg-brand-orange text-bg-dark rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-brand-orange/20">
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
          <div key={i} className="bg-surface-dark border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group cursor-pointer hover:border-brand-orange/20 transition-colors shadow-lg">
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
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#adaaaa', fontSize: 10, fontWeight: 700}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#adaaaa', fontSize: 10, fontWeight: 700}} />
                  <Tooltip contentStyle={{backgroundColor: '#1a1919', border: '1px solid #ffffff10', borderRadius: '1rem', color: '#fff'}} itemStyle={{color: '#ff9060', fontWeight: 900}} />
                  <Area type="monotone" dataKey="scans" stroke="#ff9060" strokeWidth={4} fillOpacity={1} fill="url(#colorScans)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Goal Distribution Pie Chart - Improved Aesthetics */}
          <div className="bg-surface-dark border border-white/5 p-8 rounded-[2.5rem] shadow-xl">
            <h3 className="text-xl font-black mb-6 italic uppercase tracking-tighter">Goal Distribution</h3>
            <div className="h-[240px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activePieIndex}
                    activeShape={renderActiveShape}
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    stroke="none"
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
                <p className="text-2xl font-black text-white">100%</p>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {pieData.map((goal, i) => (
                <motion.div 
                  key={i} 
                  onMouseEnter={() => setActivePieIndex(i)}
                  animate={{ 
                    scale: activePieIndex === i ? 1.05 : 1,
                    backgroundColor: activePieIndex === i ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0)'
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-white/5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-transform ${activePieIndex === i ? 'scale-125' : ''}`} style={{ backgroundColor: goal.color }} />
                    <span className={`text-xs font-bold transition-colors ${activePieIndex === i ? 'text-white' : 'text-text-muted'}`}>{goal.name}</span>
                  </div>
                  <span className={`text-xs font-black ${activePieIndex === i ? 'text-brand-orange' : 'text-white'}`}>{goal.value}%</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Activity Feed - Improved Scrollbar */}
          <div className="bg-surface-dark border border-white/5 p-8 rounded-[2.5rem] flex flex-col h-[400px] shadow-xl">
            <h3 className="text-xl font-black mb-6 italic uppercase tracking-tighter">Live Activity</h3>
            <div className="flex-1 overflow-y-auto pr-3 space-y-6 custom-scrollbar">
              {[
                { user: 'Sarah Connor', action: 'Uploaded food scan', time: '2m ago', color: 'bg-brand-orange' },
                { user: 'John Doe', action: 'Updated target weight', time: '15m ago', color: 'bg-blue-400' },
                { user: 'Alex Rivers', action: 'Subscribed to Premium', time: '1h ago', color: 'bg-yellow-400' },
                { user: 'System', action: 'Daily backup complete', time: '3h ago', color: 'bg-green-400' },
                { user: 'Sarah Miller', action: 'Logged Breakfast', time: '5h ago', color: 'bg-brand-orange' },
                { user: 'Mike Ross', action: 'Goal Reached: Weight Loss', time: '6h ago', color: 'bg-green-400' },
                { user: 'System', action: 'API Key Refresh', time: '8h ago', color: 'bg-text-muted' },
              ].map((action, i) => (
                <div key={i} className="flex gap-4 items-start relative pb-6 border-l-2 border-white/5 pl-6 last:pb-0 group cursor-pointer hover:bg-white/2 transition-colors">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-surface-dark border-2 border-white/5 flex items-center justify-center group-hover:scale-125 transition-transform">
                    <div className={`w-1.5 h-1.5 rounded-full ${action.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold group-hover:text-brand-orange transition-colors">{action.user} <span className="text-text-muted font-normal">{action.action}</span></p>
                    <p className="text-[10px] text-text-muted font-black uppercase mt-1 tracking-widest flex items-center gap-1 opacity-60">
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
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

function UserManagement({ showToast }: ViewProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditingUser, setIsEditingUser] = useState<User | null>(null);
  const [showBanConfirm, setShowBanConfirm] = useState<User | null>(null);
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

  const handleBan = (user: User) => {
    showToast(`User ${user.name} has been banned from the system.`, 'warning');
    setShowBanConfirm(null);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">USER MANAGEMENT</h1>
          <p className="text-text-muted font-medium font-sans">Manage user profiles, subscriptions, and dietary progress.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-surface-dark border border-white/5 p-1 rounded-2xl shadow-lg">
            {['All', 'Premium', 'Inactive'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${filter === f ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'}`}>{f}</button>
            ))}
          </div>
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
                    <img src={user.avatar} className="w-12 h-12 rounded-[1.2rem] object-cover border-2 border-white/10 group-hover:border-brand-orange/40 transition-colors shadow-lg" />
                    <div>
                      <p className="font-black text-sm group-hover:text-brand-orange transition-colors text-white">{user.name}</p>
                      <p className="text-[10px] text-text-muted font-bold">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    user.role === 'premium' ? 'bg-brand-orange/10 text-brand-orange border border-brand-orange/20' : 'bg-white/5 text-text-muted border border-white/5'
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
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
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
                    <div className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]'}`} />
                    <span className="text-xs font-black uppercase tracking-widest capitalize">{user.status}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setSelectedUser(user)} className="p-2.5 rounded-xl bg-white/5 text-text-muted hover:text-white transition-colors shadow-lg" title="View Details"><Eye size={18} /></button>
                    <button onClick={() => setIsEditingUser(user)} className="p-2.5 rounded-xl bg-white/5 text-text-muted hover:text-brand-orange transition-colors shadow-lg" title="Edit Profile"><Edit size={18} /></button>
                    <button onClick={() => setShowBanConfirm(user)} className="p-2.5 rounded-xl bg-red-400/10 text-red-400 hover:bg-red-400 hover:text-white transition-all shadow-lg" title="Ban User Account"><Ban size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedUser(null)} className="absolute inset-0 bg-bg-dark/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-surface-dark border border-white/10 rounded-[3rem] max-w-3xl w-full shadow-2xl overflow-hidden p-10 space-y-8 shadow-black/50">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-8">
                  <div className="relative">
                    <img src={selectedUser.avatar} className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-brand-orange/20 shadow-2xl" />
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-brand-orange text-bg-dark flex items-center justify-center border-4 border-surface-dark shadow-xl"><Users size={18} /></div>
                  </div>
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter text-white">{selectedUser.name}</h2>
                    <p className="text-text-muted font-bold text-lg">{selectedUser.email}</p>
                    <div className="flex gap-3 mt-4">
                      <span className="px-4 py-1.5 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-widest border border-brand-orange/20">{selectedUser.role} Profile</span>
                      <span className="px-4 py-1.5 rounded-full bg-white/5 text-text-muted text-[10px] font-black uppercase tracking-widest border border-white/10">Joined Jan 2026</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-3 rounded-2xl bg-white/5 text-text-muted hover:text-white transition-colors"><X size={24} /></button>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Age', value: selectedUser.age, unit: 'yrs', icon: Clock },
                  { label: 'Height', value: selectedUser.height, unit: 'cm', icon: Target },
                  { label: 'Current', value: selectedUser.weight, unit: 'kg', icon: Users },
                  { label: 'Target', value: selectedUser.targetWeight, unit: 'kg', icon: Flag },
                ].map((stat, i) => (
                  <div key={i} className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5 group hover:border-brand-orange/30 transition-colors shadow-inner shadow-black/20">
                    <div className="flex items-center gap-2 mb-2 text-text-muted">
                      <stat.icon size={14} className="group-hover:text-brand-orange transition-colors" />
                      <p className="text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                    </div>
                    <p className="text-2xl font-black text-white">{stat.value} <span className="text-xs font-medium opacity-40">{stat.unit}</span></p>
                  </div>
                ))}
              </div>

              <div className="bg-surface-lighter/50 rounded-[2rem] p-8 space-y-6 shadow-xl border border-white/5">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-xs uppercase tracking-widest italic flex items-center gap-2 text-white"><PieChartIcon size={16} className="text-brand-orange" /> Activity Summary (Last 30 Days)</h4>
                  <button className="text-[10px] font-black text-brand-orange uppercase tracking-widest hover:underline">View Detailed Logs</button>
                </div>
                <div className="grid grid-cols-3 gap-8">
                  <div className="text-center p-4 bg-bg-dark/30 rounded-2xl border border-white/5 shadow-inner shadow-black/20"><p className="text-2xl font-black text-white mb-1">42</p><p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Meals Logged</p></div>
                  <div className="text-center p-4 bg-bg-dark/30 rounded-2xl border border-white/5 shadow-inner shadow-black/20"><p className="text-2xl font-black text-white mb-1">12</p><p className="text-[8px] font-black uppercase tracking-widest text-text-muted">AI Scans</p></div>
                  <div className="text-center p-4 bg-bg-dark/30 rounded-2xl border border-white/5 shadow-inner shadow-black/20"><p className="text-2xl font-black text-green-400 mb-1">85%</p><p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Goal Consistency</p></div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => { setSelectedUser(null); setShowBanConfirm(selectedUser); }} className="flex-1 py-5 bg-red-400/10 text-red-400 border border-red-400/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-400 hover:text-white transition-all shadow-lg">Ban User Account</button>
                <button className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg">Send Password Reset</button>
                <button onClick={() => { setSelectedUser(null); setIsEditingUser(selectedUser); }} className="px-10 py-5 bg-brand-orange text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-brand-orange/20">Edit Profile</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditingUser(null)} className="absolute inset-0 bg-bg-dark/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-surface-dark border border-white/10 rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-hidden p-12 space-y-10 shadow-black/50">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Edit User Profile</h2>
                <button onClick={() => setIsEditingUser(null)} className="p-3 rounded-2xl bg-white/5 text-text-muted hover:text-white transition-colors shadow-lg"><X size={24} /></button>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative group cursor-pointer shadow-2xl">
                    <img src={isEditingUser.avatar} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-brand-orange/20" />
                    <div className="absolute inset-0 bg-black/40 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-inner"><Camera size={24} className="text-white" /></div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Full Name</label><input type="text" defaultValue={isEditingUser.name} className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white shadow-inner shadow-black/20" /></div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Account Role</label>
                      <CustomSelect 
                        value={isEditingUser.role} 
                        onChange={(val) => setIsEditingUser({...isEditingUser, role: val as any})} 
                        options={[
                          { value: 'user', label: 'Standard User' },
                          { value: 'premium', label: 'Premium Subscriber' },
                          { value: 'admin', label: 'System Admin' }
                        ]} 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Target Weight (kg)</label>
                    <div className="relative group">
                      <input 
                        type="number" 
                        defaultValue={isEditingUser.targetWeight} 
                        onChange={(e) => setIsEditingUser({...isEditingUser, targetWeight: parseInt(e.target.value) || 0})}
                        className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white shadow-inner shadow-black/20" 
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronUp onClick={() => setIsEditingUser({...isEditingUser, targetWeight: (isEditingUser.targetWeight || 0) + 1})} size={12} className="text-text-muted cursor-pointer hover:text-brand-orange" />
                        <ChevronDown onClick={() => setIsEditingUser({...isEditingUser, targetWeight: Math.max(0, (isEditingUser.targetWeight || 0) - 1)})} size={12} className="text-text-muted cursor-pointer hover:text-brand-orange" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Dietary Goal</label>
                    <CustomSelect 
                      value={isEditingUser.goal || 'maintain'} 
                      onChange={(val) => setIsEditingUser({...isEditingUser, goal: val as any})} 
                      options={[
                        { value: 'lose', label: 'Lose Weight' },
                        { value: 'maintain', label: 'Maintain' },
                        { value: 'gain', label: 'Gain Muscle' }
                      ]} 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex gap-4">
                <button onClick={() => setIsEditingUser(null)} className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg">Cancel</button>
                <button onClick={() => { showToast(`User ${isEditingUser.name} profile updated!`); setIsEditingUser(null); }} className="flex-1 py-5 bg-brand-orange text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-brand-orange/20">Save Profile</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ban Confirmation Modal */}
      <AnimatePresence>
        {showBanConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBanConfirm(null)} className="absolute inset-0 bg-bg-dark/95 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-surface-dark border border-red-500/20 rounded-[3rem] max-w-md w-full shadow-2xl p-10 text-center space-y-8 shadow-red-500/10 shadow-black/50">
              <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto shadow-inner shadow-red-500/20"><ShieldAlert size={40} /></div>
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Restrict User Account?</h3>
                <p className="text-text-muted font-bold mt-4 leading-relaxed">This will immediately <span className="text-red-400">ban</span> access for <span className="text-white italic">"{showBanConfirm.name}"</span>. You can lift this restriction later from the security panel.</p>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowBanConfirm(null)} className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg">Go Back</button>
                <button onClick={() => handleBan(showBanConfirm)} className="flex-1 py-5 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-colors shadow-2xl shadow-red-500/30 active:scale-95">Yes, Ban User</button>
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
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [isEditingFood, setIsEditingFood] = useState<Meal | null>(null);

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
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">CONTENT MANAGER</h1>
          <p className="text-text-muted font-medium font-sans">Curate the food database and validate AI recognition logs.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsAddingFood(true)} className="flex items-center gap-2 px-6 py-3 bg-brand-orange text-bg-dark font-black rounded-xl hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-brand-orange/20 uppercase text-[10px] tracking-widest"><Plus size={16} /> ADD FOOD ITEM</button>
        </div>
      </header>
      
      <div className="flex gap-10 border-b border-white/10 mb-8">
        {[
          { id: 'foods', label: 'Food Library', icon: Database },
          { id: 'scans', label: 'AI Scan Logs', icon: Camera },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`pb-4 text-sm font-black uppercase tracking-widest relative flex items-center gap-2 transition-colors ${activeTab === t.id ? 'text-brand-orange' : 'text-text-muted hover:text-white'}`}>
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
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {foodItems.map(item => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <img src={item.image} className="w-12 h-12 rounded-[1.2rem] object-cover border-2 border-white/10 group-hover:border-brand-orange/40 transition-colors shadow-lg" />
                      <div>
                        <p className="font-black text-sm group-hover:text-brand-orange transition-colors uppercase tracking-tight text-white">{item.name}</p>
                        <p className="text-[10px] text-brand-orange font-black uppercase tracking-widest">{item.calories} kcal <span className="text-text-muted opacity-40">Per 100g</span></p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6"><span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-text-muted border border-white/5">{item.category}</span></td>
                  <td className="px-8 py-6">
                    <div className="flex gap-3 text-[10px] font-black">
                      <div className="flex flex-col"><span className="text-green-400 uppercase">P: {item.protein}g</span><div className="w-8 h-1 bg-white/5 rounded-full mt-1 overflow-hidden shadow-inner"><div className="h-full bg-green-400" style={{width: '60%'}} /></div></div>
                      <div className="flex flex-col"><span className="text-blue-400 uppercase">C: {item.carbs}g</span><div className="w-8 h-1 bg-white/5 rounded-full mt-1 overflow-hidden shadow-inner"><div className="h-full bg-blue-400" style={{width: '40%'}} /></div></div>
                      <div className="flex flex-col"><span className="text-yellow-400 uppercase">F: {item.fats}g</span><div className="w-8 h-1 bg-white/5 rounded-full mt-1 overflow-hidden shadow-inner"><div className="h-full bg-yellow-400" style={{width: '30%'}} /></div></div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedFood(item)} className="p-2.5 rounded-xl bg-white/5 text-text-muted hover:text-white transition-colors shadow-lg" title="View Info"><Eye size={18} /></button>
                      <button onClick={() => setIsEditingFood(item)} className="p-2.5 rounded-xl bg-white/5 text-text-muted hover:text-brand-orange transition-colors shadow-lg" title="Edit Parameters"><Edit size={18} /></button>
                      <button onClick={() => showToast(`Food "${item.name}" deleted.`, 'error')} className="p-2.5 rounded-xl bg-red-400/10 text-red-400 hover:bg-red-400 hover:text-white transition-all shadow-lg" title="Delete Entry"><Trash2 size={18} /></button>
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
                  <td className="px-8 py-6 text-sm font-black uppercase tracking-tighter text-white">{scan.userName}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <img src={scan.imageUrl} className="w-14 h-14 rounded-[1.2rem] object-cover border-2 border-white/10 group-hover:border-brand-orange/40 transition-colors shadow-lg" />
                      <div><p className="font-black text-sm uppercase tracking-tight text-white">{scan.foodName}</p><p className="text-[8px] text-text-muted font-black uppercase tracking-widest">{scan.timestamp}</p></div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 w-24 bg-white/5 rounded-full overflow-hidden shadow-inner"><motion.div initial={{ width: 0 }} animate={{ width: `${scan.confidence * 100}%` }} className={`h-full ${scan.confidence > 0.8 ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : scan.confidence > 0.6 ? 'bg-yellow-400' : 'bg-red-400 shadow-[0_0_8px_#f87171]'}`} /></div>
                      <span className={`text-xs font-black ${scan.confidence > 0.8 ? 'text-green-400' : 'text-red-400'}`}>{Math.round(scan.confidence * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-8 py-6"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${scan.status === 'verified' ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 'bg-red-400/10 text-red-400 border border-red-400/20'}`}>{scan.status === 'verified' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {scan.status}</span></td>
                  <td className="px-8 py-6 text-right"><div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setSelectedScan(scan)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg border border-white/5">Review</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Food Modal */}
      <AnimatePresence>
        {isAddingFood && (
          <FoodFormModal onClose={() => setIsAddingFood(false)} onSubmit={(data) => { showToast('Food item created!'); setIsAddingFood(false); }} title="Add New Food Item" />
        )}
      </AnimatePresence>

      {/* Edit Food Modal */}
      <AnimatePresence>
        {isEditingFood && (
          <FoodFormModal initialData={isEditingFood} onClose={() => setIsEditingFood(null)} onSubmit={(data) => { showToast(`"${isEditingFood.name}" updated successfully!`); setIsEditingFood(null); }} title="Edit Food Item" />
        )}
      </AnimatePresence>

      {/* Scan Detail Modal */}
      <AnimatePresence>
        {selectedScan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedScan(null)} className="absolute inset-0 bg-bg-dark/95 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-surface-dark border border-white/10 rounded-[4rem] max-w-4xl w-full shadow-2xl overflow-hidden shadow-black/50">
              <div className="grid grid-cols-2 h-[600px]">
                <div className="relative overflow-hidden shadow-inner"><img src={selectedScan.imageUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent" /><div className="absolute bottom-10 left-10"><p className="text-[10px] font-black uppercase tracking-widest text-brand-orange mb-2">Original Scan Image</p><h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">{selectedScan.foodName}</h2></div></div>
                <div className="p-12 space-y-10 flex flex-col"><div className="flex justify-between items-start"><div><h3 className="text-2xl font-black uppercase tracking-tighter mb-1 text-white">AI Scan Insight</h3><p className="text-text-muted text-sm font-bold">Session ID: #{selectedScan.id}</p></div><button onClick={() => setSelectedScan(null)} className="p-3 rounded-2xl bg-white/5 text-text-muted hover:text-white transition-colors shadow-lg"><X size={20} /></button></div><div className="space-y-6 flex-1 overflow-y-auto pr-4 custom-scrollbar"><div className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5 shadow-inner"><div className="flex justify-between items-center mb-4"><p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Neural Confidence</p><span className="text-lg font-black text-brand-orange">{Math.round(selectedScan.confidence * 100)}%</span></div><div className="h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-brand-orange shadow-[0_0_8px_#ff9060]" style={{width: `${selectedScan.confidence * 100}%`}} /></div><p className="text-[10px] text-text-muted mt-4 leading-relaxed font-bold">The model identified this as <span className="text-white italic">"{selectedScan.foodName}"</span> based on top-k probability clusters in the visual latent space.</p></div><div className="grid grid-cols-2 gap-4"><div className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5 shadow-inner"><p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Detected By</p><p className="text-sm font-black text-white">Gemini 2.0 Vision</p></div><div className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5 shadow-inner"><p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">User Intent</p><p className="text-sm font-black uppercase text-white">Manual Scan</p></div></div></div><div className="flex gap-4 pt-6 border-t border-white/5"><button onClick={() => verifyScan(selectedScan, 'flagged')} className="flex-1 py-5 bg-red-400/10 text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-400 hover:text-white transition-all shadow-lg border border-red-400/20">Flag As Incorrect</button><button onClick={() => verifyScan(selectedScan, 'verified')} className="flex-1 py-5 bg-brand-orange text-bg-dark rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-brand-orange/20">Verify Detection</button></div></div>
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
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-surface-dark border border-white/10 rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-hidden p-12 space-y-10 shadow-black/50 shadow-black/50 shadow-black/50">
              <div className="flex justify-between items-start">
                <div className="flex gap-8 items-center"><img src={selectedFood.image} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-brand-orange/20 shadow-xl" /><div><h2 className="text-4xl font-black tracking-tighter uppercase italic text-white">{selectedFood.name}</h2><p className="text-brand-orange text-sm font-black uppercase tracking-[0.2em] mt-1">{selectedFood.category}</p></div></div>
                <button onClick={() => setSelectedFood(null)} className="p-3 rounded-2xl bg-white/5 text-text-muted hover:text-white transition-colors shadow-lg"><X size={24} /></button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[{ l: 'Calories', v: selectedFood.calories, c: 'text-white' }, { l: 'Protein', v: selectedFood.protein + 'g', c: 'text-green-400' }, { l: 'Carbs', v: selectedFood.carbs + 'g', c: 'text-blue-400' }, { l: 'Fats', v: selectedFood.fats + 'g', c: 'text-yellow-400' }].map((s, i) => (
                  <div key={i} className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5 text-center shadow-inner shadow-black/20"><p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-2">{s.l}</p><p className={`text-2xl font-black ${s.c}`}>{s.v}</p></div>
                ))}
              </div>
              <div className="space-y-4"><h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Description</h4><p className="text-sm font-medium leading-relaxed italic text-white/80">{selectedFood.description}</p></div>
              <div className="pt-8 border-t border-white/5 flex gap-4"><button onClick={() => { setSelectedFood(null); setIsEditingFood(selectedFood); }} className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg">Edit Parameters</button><button onClick={() => setSelectedFood(null)} className="px-12 py-5 bg-brand-orange text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-brand-orange/20">Confirm</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Refined Food Form Modal with improved Dropbox and Counter UI
function FoodFormModal({ initialData, onClose, onSubmit, title }: { initialData?: Meal, onClose: () => void, onSubmit: (data: any) => void, title: string }) {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    category: 'Breakfast',
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    description: '',
    image: ''
  });

  const updateMacro = (field: string, delta: number) => {
    setFormData(prev => ({ ...prev, [field]: Math.max(0, (prev as any)[field] + delta) }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-bg-dark/90 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-surface-dark border border-white/10 rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-hidden p-12 space-y-8 shadow-black/50">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">{title}</h2>
          <button onClick={onClose} className="p-3 rounded-2xl bg-white/5 text-text-muted hover:text-white transition-colors shadow-lg"><X size={24} /></button>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Item Name</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Greek Salad" 
              className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors shadow-inner shadow-black/20 text-white" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Category</label>
            <CustomSelect 
              value={formData.category} 
              onChange={(val) => setFormData({...formData, category: val as any})} 
              options={[
                { value: 'Breakfast', label: '🍳 Breakfast' },
                { value: 'Lunch', label: '🥗 Lunch' },
                { value: 'Dinner', label: '🍽️ Dinner' },
                { value: 'Snack', label: '🍏 Snack' }
              ]} 
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { l: 'Calories', f: 'calories', c: 'text-brand-orange' },
            { l: 'Protein', f: 'protein', c: 'text-green-400' },
            { l: 'Carbs', f: 'carbs', c: 'text-blue-400' },
            { l: 'Fats', f: 'fats', c: 'text-yellow-400' }
          ].map((macro, i) => (
            <div key={i} className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block text-center opacity-60">{macro.l}</label>
              <div className="flex flex-col items-center gap-1 bg-bg-dark border border-white/5 rounded-2xl p-2 shadow-inner shadow-black/40 group hover:border-brand-orange/20 transition-all">
                <button onClick={() => updateMacro(macro.f, 5)} className="w-full py-1 hover:bg-white/5 rounded-xl flex justify-center text-text-muted hover:text-brand-orange transition-all"><ChevronUp size={14} /></button>
                <input 
                  type="number" 
                  value={(formData as any)[macro.f]}
                  onChange={(e) => setFormData({...formData, [macro.f]: parseInt(e.target.value) || 0})}
                  className={`w-full bg-transparent text-center text-xl font-black outline-none ${macro.c}`}
                />
                <button onClick={() => updateMacro(macro.f, -5)} className="w-full py-1 hover:bg-white/5 rounded-xl flex justify-center text-text-muted hover:text-red-400 transition-all"><ChevronDown size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Nutritional Narrative</label>
          <textarea 
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={2} 
            className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors shadow-inner shadow-black/20 text-white resize-none" 
            placeholder="Describe the macro balance and health benefits..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Food Representation Image</label>
          <div className="relative group overflow-hidden rounded-[2.5rem] bg-bg-dark border-2 border-dashed border-white/10 hover:border-brand-orange/40 transition-all cursor-pointer h-28 flex flex-col items-center justify-center shadow-inner shadow-black/40">
            {formData.image ? (
              <>
                <img src={formData.image} className="absolute inset-0 w-full h-full object-cover opacity-20" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-brand-orange shadow-lg">
                    <ImageIcon size={24} />
                  </div>
                  <div>
                    <p className="text-white font-black text-xs uppercase tracking-widest italic">Asset Loaded</p>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Click to Replace Reference</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={24} className="text-text-muted group-hover:text-brand-orange group-hover:scale-110 transition-all" />
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted group-hover:text-white">Drop Visual Asset or Browse</p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 flex gap-4">
          <button onClick={onClose} className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg">Discard changes</button>
          <button onClick={() => onSubmit(formData)} className="flex-1 py-5 bg-brand-orange text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-brand-orange/20">
            {initialData ? 'Update Food Profile' : 'Publish to Library'}
          </button>
        </div>
      </motion.div>
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
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">SYSTEM ANALYTICS</h1>
          <p className="text-text-muted font-medium font-sans">Aggregate data insights on user nutrition and system health.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface-dark border border-white/5 p-10 rounded-[2.5rem] shadow-2xl shadow-black/20">
          <div className="flex justify-between items-center mb-10"><h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Consumption vs. Targets (Mean)</h3><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-brand-orange shadow-[0_0_8px_#ff9060]" /><span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Average</span><span className="w-3 h-3 rounded-full bg-white/10 ml-2 shadow-[0_0_8px_rgba(255,255,255,0.1)]" /><span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Target</span></div></div>
          <div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={nutrientData}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#adaaaa', fontSize: 10, fontWeight: 700}} /><YAxis axisLine={false} tickLine={false} tick={{fill: '#adaaaa', fontSize: 10, fontWeight: 700}} /><Tooltip cursor={{fill: '#ffffff03'}} contentStyle={{backgroundColor: '#1a1919', border: '1px solid #ffffff10', borderRadius: '1rem', color: '#fff'}} /><Bar dataKey="average" fill="#ff9060" radius={[4, 4, 0, 0]} barSize={40} /><Bar dataKey="target" fill="#ffffff10" radius={[4, 4, 0, 0]} barSize={40} /></BarChart></ResponsiveContainer></div>
        </div>
        <div className="bg-surface-dark border border-white/5 p-10 rounded-[2.5rem] flex flex-col justify-center items-center text-center shadow-2xl shadow-black/20">
          <div className="w-24 h-24 rounded-[2rem] bg-brand-orange/10 flex items-center justify-center text-brand-orange mb-8 shadow-inner shadow-brand-orange/20 animate-pulse"><PieChartIcon size={48} /></div>
          <h3 className="text-3xl font-black mb-4 italic uppercase tracking-tighter text-white">Retention Analytics</h3>
          <p className="text-text-muted max-w-sm mb-10 font-medium leading-relaxed">User engagement has increased by <span className="text-white font-black">15.4%</span> since the new AI Scan features were introduced.</p>
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5 shadow-inner shadow-black/20"><p className="text-2xl font-black text-white">92%</p><p className="text-[8px] font-black uppercase tracking-widest text-text-muted mt-1">DAU Consistency</p></div>
            <div className="bg-bg-dark/50 p-6 rounded-3xl border border-white/5 shadow-inner shadow-black/20"><p className="text-2xl font-black text-white">4.8m</p><p className="text-[8px] font-black uppercase tracking-widest text-text-muted mt-1">Avg Session Time</p></div>
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
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">SECURITY & ROLES</h1>
          <p className="text-text-muted font-medium">Infrastructure security, moderator permissions, and audit trails.</p>
        </div>
        <div className="flex bg-surface-dark border border-white/5 p-1 rounded-xl shadow-lg shadow-black/20">
          {['Audit', 'Roles', 'API'].map(t => (
            <button key={t} onClick={() => setActiveSubTab(t)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${activeSubTab === t ? 'bg-white/10 text-white shadow-lg' : 'text-text-muted hover:text-white'}`}>{t}</button>
          ))}
        </div>
      </header>

      <div className="bg-surface-dark border border-white/5 p-10 rounded-[2.5rem] flex items-center gap-10 shadow-2xl">
        <div className="w-24 h-24 rounded-[2rem] bg-green-400/10 flex items-center justify-center text-green-400 shadow-inner shadow-green-400/20"><ShieldCheck size={48} /></div>
        <div>
          <h3 className="text-3xl font-black mb-2 italic uppercase tracking-tighter text-white">System Integrity: Optimal</h3>
          <p className="text-text-muted font-bold text-lg leading-relaxed">End-to-end encryption is active for all user meal data. Database backups are synced every 6 hours to AWS S3 cluster.</p>
          <div className="flex gap-6 mt-6">
            <span className="flex items-center gap-2 text-[10px] font-black text-green-400 uppercase tracking-widest shadow-sm"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]" /> API Gateway Online</span>
            <span className="flex items-center gap-2 text-[10px] font-black text-green-400 uppercase tracking-widest shadow-sm"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]" /> Auth0 Integration Valid</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/50">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2"><h3 className="font-black text-xs uppercase tracking-widest italic text-white">Recent Audit Trail</h3><button onClick={() => showToast('Audit logs refreshed.')} className="text-brand-orange text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1"><RefreshCw size={12} /> Refresh Logs</button></div>
        <table className="w-full text-left border-collapse">
          <thead><tr className="border-b border-white/5 bg-white/2"><th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Administrator</th><th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Action Performed</th><th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Entity Target</th><th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Timestamp</th></tr></thead>
          <tbody>
            {[{ admin: 'Super Admin', action: 'Modified Food Library', target: 'Avocado Toast', time: '2 mins ago' }, { admin: 'Moderator #1', action: 'Suspended Account', target: 'User #9283', time: '45 mins ago' }, { admin: 'System Engine', action: 'DB Schema Backup', target: 'calai_v2_main', time: '2 hours ago' }, { admin: 'Analyst #3', action: 'Generated Analytics PDF', target: 'Monthly_Report_Feb', time: '5 hours ago' }].map((log, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors"><td className="px-8 py-6 text-sm font-black italic uppercase tracking-tighter text-white">{log.admin}</td><td className="px-8 py-6 text-xs font-bold text-white/80">{log.action}</td><td className="px-8 py-6 text-xs font-bold text-brand-orange uppercase">{log.target}</td><td className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted text-right opacity-60">{log.time}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminSettings({ showToast }: ViewProps) {
  const [activeSetting, setActiveSetting] = useState('Integrations');

  const saveSettings = () => {
    showToast('System configuration saved successfully!');
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase text-white">SYSTEM SETTINGS</h1>
          <p className="text-text-muted font-medium font-sans">Configure global parameters, server integrations, and security protocols.</p>
        </div>
        <button onClick={saveSettings} className="flex items-center gap-2 px-8 py-4 bg-brand-orange text-bg-dark font-black rounded-2xl shadow-xl shadow-brand-orange/20 hover:scale-105 transition-transform active:scale-95 uppercase text-[10px] tracking-widest"><Save size={18} /> Save Configuration</button>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <aside className="col-span-12 lg:col-span-3 space-y-2">
          {[
            { id: 'Integrations', icon: Zap },
            { id: 'Email/SMTP', icon: Mail },
            { id: 'Communication', icon: Phone },
            { id: 'Advanced', icon: Lock },
          ].map(s => (
            <button key={s.id} onClick={() => setActiveSetting(s.id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeSetting === s.id ? 'bg-white/10 text-brand-orange border border-white/10 shadow-lg shadow-brand-orange/5' : 'text-text-muted hover:text-white hover:bg-white/5 border border-transparent'}`}><s.icon size={16} /> {s.id}</button>
          ))}
        </aside>

        <div className="col-span-12 lg:col-span-9 bg-surface-dark border border-white/5 p-12 rounded-[3rem] shadow-2xl shadow-black/50 space-y-12 h-fit">
          {activeSetting === 'Integrations' && (
            <section className="space-y-10 animate-in fade-in duration-500">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-orange mb-10 flex items-center gap-3"><div className="w-10 h-0.5 bg-brand-orange shadow-[0_0_8px_#ff9060]" /> AI Engine & Identity integrations</h3>
              <div className="space-y-8">
                <div className="bg-bg-dark/50 p-8 rounded-[2.5rem] border border-white/10 flex justify-between items-center group hover:border-brand-orange/30 transition-colors shadow-inner shadow-black/20"><div className="flex gap-6 items-center"><div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-brand-orange shadow-lg group-hover:scale-110 transition-transform"><Globe size={28} /></div><div><h4 className="text-lg font-black italic uppercase tracking-tighter text-white">Google Gemini 2.0</h4><p className="text-xs text-text-muted font-bold">API Status: <span className="text-green-400">Connected</span> • Latency: 420ms</p></div></div><button className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg">Configure API Key</button></div>
                <div className="bg-bg-dark/50 p-8 rounded-[2.5rem] border border-white/10 flex justify-between items-center group hover:border-brand-orange/30 transition-colors shadow-inner shadow-black/20"><div className="flex gap-6 items-center"><div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-blue-400 shadow-lg group-hover:scale-110 transition-transform"><Shield size={28} /></div><div><h4 className="text-lg font-black italic uppercase tracking-tighter text-white">Auth0 Authentication</h4><p className="text-xs text-text-muted font-bold">Identity Provider: <span className="text-green-400">Healthy</span></p></div></div><button className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg">Manage OIDC</button></div>
              </div>
            </section>
          )}

          {activeSetting === 'Email/SMTP' && (
            <section className="space-y-10 animate-in fade-in duration-500">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-orange mb-10 flex items-center gap-3"><div className="w-10 h-0.5 bg-brand-orange shadow-[0_0_8px_#ff9060]" /> SMTP Mail Server Configuration</h3>
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-3"><label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60">SMTP Host</label><input type="text" defaultValue="smtp.sendgrid.net" className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors shadow-inner shadow-black/20 text-white" /></div>
                <div className="space-y-3"><label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60">SMTP Port</label><input type="number" defaultValue="587" className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors shadow-inner shadow-black/20 text-white" /></div>
                <div className="space-y-3"><label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60">Sender Identity</label><input type="email" defaultValue="noreply@calai.app" className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors shadow-inner shadow-black/20 text-white" /></div>
                <div className="space-y-3"><label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60">Auth Password</label><div className="relative"><input type="password" defaultValue="********" className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors shadow-inner shadow-black/20 text-white" /><Lock size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-text-muted" /></div></div>
              </div>
              <div className="bg-bg-dark/30 p-8 rounded-[2rem] border border-white/5 flex items-center justify-between shadow-xl shadow-black/20"><p className="text-xs font-bold text-text-muted italic leading-relaxed">System-wide notification server. Required for goal reach alerts and password resets.</p><button className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg">Run Connection Test</button></div>
            </section>
          )}

          {activeSetting === 'Communication' && (
            <section className="space-y-12 animate-in fade-in duration-500">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-orange mb-10 flex items-center gap-3"><div className="w-10 h-0.5 bg-brand-orange shadow-[0_0_8px_#ff9060]" /> outbound communication logic</h3>
              
              <div className="space-y-12">
                {/* Push Notifications Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange"><BellRing size={24} /></div><h4 className="text-xl font-black uppercase tracking-tighter text-white">Push Notifications</h4></div><div className="flex items-center gap-3"><span className="text-[10px] font-black text-green-400 uppercase tracking-widest bg-green-400/10 px-4 py-2 rounded-full border border-green-400/20">Active</span><div className="w-12 h-6 bg-brand-orange rounded-full relative cursor-pointer shadow-lg shadow-brand-orange/20"><div className="absolute right-1 top-1 w-4 h-4 bg-bg-dark rounded-full" /></div></div></div>
                  <div className="grid grid-cols-2 gap-8 bg-bg-dark/30 p-8 rounded-[2.5rem] border border-white/5 shadow-inner shadow-black/20">
                    <div className="space-y-3"><label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60">Firebase Server Key</label><input type="password" defaultValue="AAAA-redacted-key" className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white" /></div>
                    <div className="space-y-3"><label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60">FCM Project ID</label><input type="text" defaultValue="calai-prod-842" className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white" /></div>
                  </div>
                </div>

                {/* Twilio Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-blue-400/10 flex items-center justify-center text-blue-400"><Smartphone size={24} /></div><h4 className="text-xl font-black uppercase tracking-tighter text-white">SMS Gateway (Twilio)</h4></div><div className="flex items-center gap-3"><span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/10">Disabled</span><div className="w-12 h-6 bg-white/10 rounded-full relative cursor-pointer shadow-lg"><div className="absolute left-1 top-1 w-4 h-4 bg-bg-dark rounded-full" /></div></div></div>
                  <div className="grid grid-cols-3 gap-6 bg-bg-dark/30 p-8 rounded-[2.5rem] border border-white/5 shadow-inner shadow-black/20">
                    <div className="space-y-3"><label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60">Account SID</label><input type="text" defaultValue="AC8293..." className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white" /></div>
                    <div className="space-y-3"><label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60">Auth Token</label><input type="password" defaultValue="redacted" className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white" /></div>
                    <div className="space-y-3"><label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60">Twilio Phone</label><input type="text" defaultValue="+1800-CALAI" className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-brand-orange transition-colors text-white" /></div>
                  </div>
                </div>

                {/* Support Chat Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-green-400/10 flex items-center justify-center text-green-400"><MessageCircle size={24} /></div><h4 className="text-xl font-black uppercase tracking-tighter text-white">Internal Support Chat</h4></div>
                  <div className="bg-bg-dark/50 p-8 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-inner shadow-black/20">
                    <div className="space-y-2">
                      <p className="text-sm font-black text-white italic uppercase tracking-tighter">Support Webhook Connector</p>
                      <p className="text-[10px] text-text-muted font-bold leading-relaxed max-w-sm">Synchronizes admin chat responses with the internal user mobile inbox via secure WebSocket relay.</p>
                    </div>
                    <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors shadow-lg">Configure Endpoints</button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSetting === 'Advanced' && (
            <section className="space-y-10 animate-in fade-in duration-500">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-orange mb-10 flex items-center gap-3"><div className="w-10 h-0.5 bg-brand-orange shadow-[0_0_8px_#ff9060]" /> Infrastructure Controls</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="bg-bg-dark/50 p-10 rounded-[3rem] border border-white/10 space-y-6 shadow-inner shadow-black/20"><div className="flex items-center gap-4 text-brand-orange"><Server size={24} /><h4 className="font-black italic uppercase tracking-tighter text-white">Cluster Maintenance</h4></div><p className="text-xs text-text-muted font-bold leading-relaxed">Cleanup expired user sessions, optimize DB indexes, and prune old audit logs from the main production cluster.</p><button className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/20 transition-all shadow-lg">Force DB Garbage Collection</button></div>
                <div className="bg-bg-dark/50 p-10 rounded-[3rem] border border-white/10 space-y-6 shadow-inner shadow-black/20"><div className="flex items-center gap-4 text-blue-400"><Cpu size={24} /><h4 className="font-black italic uppercase tracking-tighter text-white">Engine Versioning</h4></div><div className="space-y-3"><div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><span className="text-text-muted opacity-60">Runtime Engine</span><span className="text-white">v2.4.8-stable</span></div><div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><span className="text-text-muted opacity-60">Visual Neural Model</span><span className="text-white">v1.0.2-pro</span></div></div><button className="w-full py-5 bg-blue-400 text-bg-dark rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-blue-400/20">Fetch Updates from Master</button></div>
              </div>
              <div className="bg-red-400/5 border border-red-400/10 p-10 rounded-[3rem] flex justify-between items-center shadow-xl shadow-red-400/5 shadow-black/50"><div><h4 className="text-xl font-black text-red-400 italic uppercase tracking-tighter">Emergency Override</h4><p className="text-xs font-bold text-text-muted mt-1 leading-relaxed">Forces immediate system-wide maintenance mode and freezes all write operations.</p></div><button className="px-12 py-5 bg-red-400 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-colors shadow-2xl shadow-red-400/30 active:scale-95">ACTIVATE OVERRIDE</button></div>
            </section>
          )}

          {activeSetting !== 'Integrations' && activeSetting !== 'Email/SMTP' && activeSetting !== 'Communication' && activeSetting !== 'Advanced' && (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <SettingsIcon size={48} className="mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">{activeSetting} Settings Under Development</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
