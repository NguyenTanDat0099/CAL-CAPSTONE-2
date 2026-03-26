import React, { useState } from 'react';
import { AdminSidebar } from './components/AdminSidebar';
import { 
  Bell, X, Search, ChevronDown, Users, 
  LayoutDashboard, Database, PieChart, TrendingUp, 
  ArrowUpRight, ArrowDownRight, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { AdminProfile } from './types';

const chartData = [
  { name: 'Mon', users: 400, logs: 2400 },
  { name: 'Tue', users: 300, logs: 1398 },
  { name: 'Wed', users: 500, logs: 9800 },
  { name: 'Thu', users: 278, logs: 3908 },
  { name: 'Fri', users: 489, logs: 4800 },
  { name: 'Sat', users: 239, logs: 3800 },
  { name: 'Sun', users: 649, logs: 4300 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [profile] = useState<AdminProfile>({
    name: 'Admin User',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
    role: 'Super Admin'
  });

  const notifications = [
    { id: '1', message: 'New user registered: Sarah Connor', time: '5m ago' },
    { id: '2', message: 'System update completed successfully', time: '1h ago' },
    { id: '3', message: 'Database backup failed', time: '3h ago', type: 'error' },
  ];

  return (
    <div className="flex min-h-screen bg-bg-dark text-white font-sans antialiased">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Global Header */}
      <div className="fixed top-0 right-0 left-64 h-24 px-8 z-40 flex items-center justify-between bg-bg-dark/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4 bg-surface-dark px-4 py-2 rounded-2xl border border-white/5 w-96">
          <Search size={18} className="text-text-muted" />
          <input 
            type="text" 
            placeholder="Search for users, content, logs..." 
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
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'content' && <ContentManagement />}
            {activeTab === 'analytics' && <div className="p-10 text-center text-text-muted">Analytics View Under Construction</div>}
            {activeTab === 'security' && <div className="p-10 text-center text-text-muted">Security Settings Under Construction</div>}
            {activeTab === 'settings' && <div className="p-10 text-center text-text-muted">Admin Settings Under Construction</div>}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="space-y-8 pb-10">
      <header>
        <h1 className="text-4xl font-black tracking-tighter mb-2 italic">DASHBOARD</h1>
        <p className="text-text-muted font-medium">System overview and real-time performance metrics.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: '1,284', change: '+12%', icon: Users, trend: 'up' },
          { label: 'Active Today', value: '452', change: '+5%', icon: LayoutDashboard, trend: 'up' },
          { label: 'Meals Logged', value: '8,921', change: '+18%', icon: Database, trend: 'up' },
          { label: 'System Load', value: '24%', change: '-2%', icon: PieChart, trend: 'down' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface-dark border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-brand-orange group-hover:scale-110 transition-transform">
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
        <div className="lg:col-span-2 bg-surface-dark border border-white/5 p-8 rounded-[2.5rem]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black italic">USER ACTIVITY</h3>
              <p className="text-text-muted text-xs font-medium">Platform engagement over the last 7 days</p>
            </div>
            <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
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
                  contentStyle={{backgroundColor: '#1a1919', border: '1px solid #ffffff10', borderRadius: '1rem'}}
                  itemStyle={{color: '#ff9060', fontWeight: 900}}
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#ff9060" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-dark border border-white/5 p-8 rounded-[2.5rem]">
          <h3 className="text-xl font-black mb-6 italic">RECENT ACTIONS</h3>
          <div className="space-y-6">
            {[
              { user: 'Sarah Connor', action: 'Uploaded food scan', time: '2m ago', color: 'text-brand-orange' },
              { user: 'System', action: 'Daily backup complete', time: '45m ago', color: 'text-green-400' },
              { user: 'Admin', action: 'Modified calorie targets', time: '1h ago', color: 'text-blue-400' },
              { user: 'Alex Rivers', action: 'New meal plan created', time: '3h ago', color: 'text-brand-orange' },
              { user: 'System', action: 'API key refreshed', time: '5h ago', color: 'text-text-muted' },
            ].map((action, i) => (
              <div key={i} className="flex gap-4 items-start relative pb-6 border-l-2 border-white/5 pl-6 last:pb-0">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-surface-dark border-2 border-white/5 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                </div>
                <div>
                  <p className="text-sm font-bold">{action.user} <span className="text-text-muted font-normal">{action.action}</span></p>
                  <p className="text-[10px] text-text-muted font-black uppercase mt-1 tracking-widest">{action.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserManagement() {
  const users = [
    { id: '1', name: 'Alex Rivers', email: 'alex@example.com', role: 'User', status: 'Active', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
    { id: '2', name: 'John Doe', email: 'john@example.com', role: 'User', status: 'Inactive', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' },
    { id: '3', name: 'Sarah Miller', email: 'sarah@example.com', role: 'Premium', status: 'Active', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
    { id: '4', name: 'Mike Ross', email: 'mike@example.com', role: 'User', status: 'Active', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic">USER MANAGEMENT</h1>
          <p className="text-text-muted font-medium">Manage and monitor application users.</p>
        </div>
        <button className="px-6 py-3 bg-brand-orange text-bg-dark font-black rounded-xl hover:scale-105 transition-transform active:scale-95">
          ADD NEW USER
        </button>
      </header>

      <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/2">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">User</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Role</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Status</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                    <div>
                      <p className="font-bold text-sm group-hover:text-brand-orange transition-colors">{user.name}</p>
                      <p className="text-xs text-text-muted">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                    user.role === 'Premium' ? 'bg-brand-orange/10 text-brand-orange' : 'bg-white/5 text-text-muted'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-green-400' : 'bg-red-400'} shadow-[0_0_8px_rgba(74,222,128,0.5)]`} />
                    <span className="text-sm font-medium">{user.status}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-text-muted">
                  <div className="flex items-center gap-4">
                    <button className="hover:text-white transition-colors font-bold text-xs uppercase tracking-widest">Edit</button>
                    <button className="hover:text-red-400 transition-colors font-bold text-xs uppercase tracking-widest">Delete</button>
                    <button className="text-text-muted/20 hover:text-white transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-6 text-center border-t border-white/5">
          <button className="text-xs font-black uppercase tracking-widest text-text-muted hover:text-white transition-colors">
            Load More Users
          </button>
        </div>
      </div>
    </div>
  );
}

function ContentManagement() {
  const foodItems = [
    { id: '1', name: 'Avocado Toast', calories: 350, protein: 8, carbs: 32, fats: 22, category: 'Breakfast' },
    { id: '2', name: 'Grilled Chicken Salad', calories: 420, protein: 45, carbs: 12, fats: 18, category: 'Lunch' },
    { id: '3', name: 'Salmon with Quinoa', calories: 550, protein: 38, carbs: 45, fats: 24, category: 'Dinner' },
    { id: '4', name: 'Protein Shake', calories: 180, protein: 30, carbs: 5, fats: 3, category: 'Snack' },
  ];

  return (
    <div className="space-y-8 pb-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic">CONTENT MANAGER</h1>
          <p className="text-text-muted font-medium">Manage food database, nutritional info, and meal plans.</p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-3 bg-white/5 text-white border border-white/10 font-black rounded-xl hover:bg-white/10 transition-colors">
            IMPORT CSV
          </button>
          <button className="px-6 py-3 bg-brand-orange text-bg-dark font-black rounded-xl hover:scale-105 transition-transform active:scale-95">
            ADD NEW ITEM
          </button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface-dark border border-white/5 p-8 rounded-[2.5rem] flex items-center justify-between group cursor-pointer hover:border-brand-orange/30 transition-colors">
          <div>
            <h3 className="text-xl font-black mb-1 italic">FOOD DATABASE</h3>
            <p className="text-sm text-text-muted font-medium">12,402 items verified by nutritionists</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-brand-orange group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-brand-orange/20">
            <Database size={24} />
          </div>
        </div>
        <div className="bg-surface-dark border border-white/5 p-8 rounded-[2.5rem] flex items-center justify-between group cursor-pointer hover:border-brand-orange/30 transition-colors">
          <div>
            <h3 className="text-xl font-black mb-1 italic">MEAL PLANS</h3>
            <p className="text-sm text-text-muted font-medium">45 curated plans for various goals</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-brand-orange group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-brand-orange/20">
            <LayoutDashboard size={24} />
          </div>
        </div>
      </div>

      <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2">
          <h3 className="font-black text-sm uppercase tracking-widest italic">Recent Food Items</h3>
          <div className="flex gap-4 items-center">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" placeholder="Filter items..." className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs outline-none" />
            </div>
            <button className="text-brand-orange text-xs font-black uppercase tracking-widest hover:underline">View All</button>
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Item Name</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Category</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Calories</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Macros (P/C/F)</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {foodItems.map(item => (
              <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="px-8 py-6 font-bold text-sm group-hover:text-brand-orange transition-colors">{item.name}</td>
                <td className="px-8 py-6 text-sm text-text-muted">{item.category}</td>
                <td className="px-8 py-6 font-black text-brand-orange tracking-tighter">{item.calories} <span className="text-[10px] font-normal text-text-muted">kcal</span></td>
                <td className="px-8 py-6 text-xs font-medium">
                  <div className="flex gap-2">
                    <span className="text-green-400">{item.protein}g</span>
                    <span className="text-blue-400">{item.carbs}g</span>
                    <span className="text-yellow-400">{item.fats}g</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-text-muted">
                  <button className="hover:text-white transition-colors font-bold text-xs uppercase tracking-widest">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
