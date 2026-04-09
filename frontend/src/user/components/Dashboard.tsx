import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  ChevronRight, 
  Scale, 
  Target, 
  History 
} from 'lucide-react';
import { DietItem } from '../types';
import { UserProfile } from '../App';

interface DashboardProps {
  myDiets: DietItem[];
  profile: UserProfile;
  dailyTarget: number;
}

export function Dashboard({ myDiets, profile, dailyTarget }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Calculate macro targets
  const macroTargets = useMemo(() => {
    return {
      protein: Math.round((dailyTarget * 0.3) / 4), // 30% protein
      carbs: Math.round((dailyTarget * 0.4) / 4),   // 40% carbs
      fats: Math.round((dailyTarget * 0.3) / 9),    // 30% fats
    };
  }, [dailyTarget]);

  // Calculate today's macros
  const todayMacros = useMemo(() => {
    const today = new Date().toDateString();
    const todayDiets = myDiets.filter(d => new Date(d.date).toDateString() === today);
    
    return {
      protein: todayDiets.reduce((sum, d) => sum + (d.protein || 0), 0),
      carbs: todayDiets.reduce((sum, d) => sum + (d.carbs || 0), 0),
      fats: todayDiets.reduce((sum, d) => sum + (d.fats || 0), 0),
      calories: todayDiets.reduce((sum, d) => sum + d.calories, 0),
    };
  }, [myDiets]);

  // Macro warnings
  const macroWarnings = useMemo(() => {
    const warnings = [];
    if (todayMacros.protein < macroTargets.protein * 0.8) warnings.push("You're consistently low on protein this week.");
    if (todayMacros.carbs < macroTargets.carbs * 0.8) warnings.push("Your carbohydrate intake is lower than recommended.");
    if (todayMacros.fats < macroTargets.fats * 0.8) warnings.push("Consider adding more healthy fats to your diet.");
    return warnings;
  }, [todayMacros, macroTargets]);

  // Chart data generation
  const chartData = useMemo(() => {
    const now = new Date();
    
    if (timeRange === 'daily') {
      // 24 hours
      return Array.from({ length: 24 }, (_, i) => {
        const hour = i;
        const today = now.toDateString();
        const hourDiets = myDiets.filter(d => {
          const date = new Date(d.date);
          return date.toDateString() === today && date.getHours() === hour;
        });
        
        const consumed = hourDiets.reduce((sum, d) => sum + d.calories, 0);
        
        return {
          name: `${hour}:00`,
          consumed: consumed,
          target: dailyTarget / 24 // Average target per hour
        };
      });
    } else if (timeRange === 'weekly') {
      // 7 days of the week
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      
      return days.map((day, idx) => {
        const targetDate = new Date(startOfWeek);
        targetDate.setDate(startOfWeek.getDate() + idx);
        const dateStr = targetDate.toDateString();
        
        const dayDiets = myDiets.filter(d => new Date(d.date).toDateString() === dateStr);
        const consumed = dayDiets.reduce((sum, d) => sum + d.calories, 0);
        
        // Mock data if no diets and not today/future
        const isFuture = targetDate > now;
        const finalConsumed = consumed > 0 || isFuture 
          ? consumed 
          : dailyTarget * (0.7 + Math.random() * 0.3);

        return {
          name: day,
          consumed: Math.round(finalConsumed),
          target: dailyTarget
        };
      });
    } else {
      // Monthly: Days in current month
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const targetDate = new Date(year, month, day);
        const dateStr = targetDate.toDateString();
        
        const dayDiets = myDiets.filter(d => new Date(d.date).toDateString() === dateStr);
        const consumed = dayDiets.reduce((sum, d) => sum + d.calories, 0);
        
        const isFuture = targetDate > now;
        const finalConsumed = consumed > 0 || isFuture 
          ? consumed 
          : dailyTarget * (0.6 + Math.random() * 0.5);

        return {
          name: day.toString(),
          consumed: Math.round(finalConsumed),
          target: dailyTarget
        };
      });
    }
  }, [myDiets, dailyTarget, timeRange]);

  // Weight progress calculations
  const weightProgress = useMemo(() => {
    const totalToLose = Math.abs(profile.startingWeight - profile.targetWeight);
    const currentlyLost = Math.abs(profile.startingWeight - profile.weight);
    const progress = totalToLose === 0 ? 100 : Math.min(100, (currentlyLost / totalToLose) * 100);
    const awayFromGoal = Math.abs(profile.weight - profile.targetWeight);
    
    return {
      progress: Math.round(progress),
      awayFromGoal: awayFromGoal.toFixed(1),
      isLosing: profile.goal === 'lose'
    };
  }, [profile]);

  const goalHitPercentage = Math.min(100, Math.round((todayMacros.calories / dailyTarget) * 100));

  return (
    <div className="flex-1 ml-64 p-10 min-h-screen bg-bg-dark text-white relative overflow-y-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
      </header>

      {/* Analysis Banner */}
      <section className="mb-12">
        <div className="bg-gradient-to-r from-[#3D2B1F] to-[#1A1A1A] rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden flex items-center justify-between">
          <div className="relative z-10 max-w-xl">
            <h2 className="text-4xl font-black mb-4">Your Nutrition Analysis</h2>
            <p className="text-text-muted text-lg mb-8 leading-relaxed">
              Track trends. Spot patterns. Crush your goals. Your average intake is optimized for your {profile.goal === 'lose' ? 'weight-loss' : profile.goal === 'gain' ? 'muscle-gain' : 'maintenance'} phase.
            </p>
            <button className="bg-brand-orange text-bg-dark font-black py-4 px-8 rounded-2xl hover:bg-brand-orange-dark transition-colors">
              View Detailed Insights
            </button>
          </div>
          <div className="hidden lg:block relative w-64 h-48 bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
             <div className="absolute inset-0 flex items-center justify-center">
                <TrendingUp size={80} className="text-brand-orange opacity-20" />
             </div>
             <div className="absolute bottom-4 left-4 right-4 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${goalHitPercentage}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-brand-orange"
                />
             </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8 mb-12">
        {/* Daily Statistics */}
        <div className="col-span-12 lg:col-span-8 bg-surface-dark/50 rounded-[2.5rem] p-10 border border-white/5">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-black mb-2">Daily Statistics</h3>
              <div className="flex items-center gap-4">
                <div className="text-text-muted text-sm uppercase tracking-widest font-bold">Weekly Average</div>
                <div className="text-3xl font-black">1,850 <span className="text-sm font-medium opacity-40">kcal</span></div>
                <div className="bg-green-500/10 text-green-500 text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1">
                  <TrendingUp size={10} />
                  +5% vs last week
                </div>
              </div>
            </div>
            <div className="flex bg-bg-dark/50 p-1 rounded-2xl border border-white/5">
              {(['daily', 'weekly', 'monthly'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    timeRange === range ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white/60'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorConsumed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6321" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FF6321" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#8E9299', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                  interval={timeRange === 'daily' ? 3 : timeRange === 'monthly' ? 4 : 0}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#151619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff', fontWeight: 700 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="consumed" 
                  stroke="#FF6321" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorConsumed)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#ffffff20" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex items-center gap-8 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-brand-orange" />
              <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Calorie Intake</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white/20" />
              <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Target ({dailyTarget} kcal)</span>
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="col-span-12 lg:col-span-4 bg-surface-dark/50 rounded-[2.5rem] p-10 border border-white/5 flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-black">Macros</h3>
            <button className="text-text-muted hover:text-white transition-colors">
              <Info size={20} />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center mb-10">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="16"
                  fill="transparent"
                  className="text-white/5"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray={502.6}
                  initial={{ strokeDashoffset: 502.6 }}
                  animate={{ strokeDashoffset: 502.6 - (502.6 * goalHitPercentage) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="text-brand-orange"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black">{goalHitPercentage}%</span>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Goal Hit</span>
              </div>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-sm bg-brand-orange" />
                <span className="text-sm font-bold text-text-muted uppercase tracking-widest">Protein</span>
              </div>
              <div className="text-sm font-black">{todayMacros.protein}g <span className="opacity-40">/ {macroTargets.protein}g</span></div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-sm bg-[#D4C3F9]" />
                <span className="text-sm font-bold text-text-muted uppercase tracking-widest">Carbs</span>
              </div>
              <div className="text-sm font-black">{todayMacros.carbs}g <span className="opacity-40">/ {macroTargets.carbs}g</span></div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-sm bg-[#E9F994]" />
                <span className="text-sm font-bold text-text-muted uppercase tracking-widest">Fats</span>
              </div>
              <div className="text-sm font-black">{todayMacros.fats}g <span className="opacity-40">/ {macroTargets.fats}g</span></div>
            </div>
          </div>

          {macroWarnings.length > 0 && (
            <div className="space-y-3">
              {macroWarnings.map((warning, idx) => (
                <div key={idx} className="bg-brand-orange/10 border border-brand-orange/20 rounded-2xl p-4 flex gap-3">
                  <AlertTriangle size={18} className="text-brand-orange shrink-0" />
                  <p className="text-xs font-bold text-brand-orange leading-relaxed">
                    {warning}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weight Progress */}
      <section className="bg-surface-dark/50 rounded-[2.5rem] p-10 border border-white/5">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-2xl font-black">Weight Progress</h3>
          <div className="flex items-center gap-2 text-text-muted text-xs font-bold uppercase tracking-widest">
            Target: {profile.targetWeight}kg
            <button className="p-1 hover:text-white transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-end gap-12 mb-8">
          <div>
            <div className="text-5xl font-black mb-2">{profile.weight} <span className="text-xl font-medium opacity-40">kg</span></div>
            <div className="flex items-center gap-2 text-green-500 text-sm font-bold">
              <TrendingUp size={16} />
              -1.2kg this month
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-end mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange">Goal Progress</span>
              <span className="text-3xl font-black">{weightProgress.progress}%</span>
            </div>
            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${weightProgress.progress}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-brand-orange to-[#FF8A50] relative"
              >
                {/* Shimmer effect */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                />
              </motion.div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Starting Weight</p>
            <p className="text-xl font-black">{profile.startingWeight} kg</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Target Weight</p>
            <p className="text-xl font-black">{profile.targetWeight} kg</p>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm font-medium text-text-muted">
            Currently <span className="text-white font-bold">{weightProgress.awayFromGoal}kg</span> away from your goal
          </p>
        </div>
      </section>
    </div>
  );
}
