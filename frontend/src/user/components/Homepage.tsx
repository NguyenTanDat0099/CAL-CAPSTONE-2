import React, { useMemo } from 'react';
import { Bell, ChevronRight, Flame, Zap, Droplets, Utensils } from 'lucide-react';
import { motion } from 'motion/react';
import { DietItem } from '../types';
import { UserProfile } from '../App';

interface HomepageProps {
  myDiets: DietItem[];
  onTabChange: (id: string) => void;
  dailyTarget: number;
  baseTarget: number;
  carryOver: number;
  profile: UserProfile;
}

export function Homepage({ myDiets, onTabChange, dailyTarget, baseTarget, carryOver, profile }: HomepageProps) {
  const today = new Date();
  
  // Weekly Calendar Data
  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start from Monday

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push({
        name: day.toLocaleDateString('en-US', { weekday: 'short' }),
        date: day.getDate().toString().padStart(2, '0'),
        isToday: day.toDateString() === today.toDateString(),
        fullDate: day.toDateString()
      });
    }
    return days;
  }, []);

  // Daily Stats Calculation
  const stats = useMemo(() => {
    const todayStr = today.toDateString();
    const todayDiets = myDiets.filter(item => new Date(item.date).toDateString() === todayStr);
    
    const consumed = {
      calories: todayDiets.reduce((sum, item) => sum + item.calories, 0),
      protein: todayDiets.reduce((sum, item) => sum + (item.protein || 0), 0),
      carbs: todayDiets.reduce((sum, item) => sum + (item.carbs || 0), 0),
    };

    // Calculate macro targets based on profile and dailyTarget
    // Default ratios: Protein 30%, Carbs 40%, Fats 30%
    const targets = {
      calories: dailyTarget,
      protein: Math.round((dailyTarget * 0.3) / 4), // 4 kcal per gram
      carbs: Math.round((dailyTarget * 0.4) / 4),   // 4 kcal per gram
    };

    return { consumed, targets };
  }, [myDiets, dailyTarget]);

  const calorieLeft = stats.targets.calories - stats.consumed.calories;
  const calorieProgress = useMemo(() => {
    if (stats.targets.calories <= 0) return 100;
    return Math.max(0, Math.min((stats.consumed.calories / stats.targets.calories) * 100, 100));
  }, [stats.consumed.calories, stats.targets.calories]);

  return (
    <div className="flex-1 ml-64 p-10 min-h-screen bg-bg-dark text-white relative overflow-y-auto">
      {/* Header Section */}
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl border border-white/10 overflow-hidden shadow-xl shadow-brand-orange/10">
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Hello, {(profile.name || 'Alex').split(' ')[0]}</h1>
            <p className="text-text-muted font-medium">Stay on track today!</p>
          </div>
        </div>
      </header>

      {/* Weekly Calendar */}
      <section className="bg-surface-dark/50 rounded-[2.5rem] p-8 border border-white/5 mb-10">
        <div className="flex justify-between items-center">
          {weekDays.map((day, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col items-center gap-4 p-4 rounded-3xl transition-all min-w-[80px] ${
                day.isToday ? 'bg-white text-bg-dark shadow-xl scale-110' : 'text-text-muted hover:bg-white/5'
              }`}
            >
              <span className={`text-[10px] font-black uppercase tracking-widest ${day.isToday ? 'text-bg-dark/60' : 'text-text-muted'}`}>
                {day.name}
              </span>
              <span className="text-2xl font-black">{day.date}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Daily Counters */}
      <section className="mb-12">
        <h2 className="text-2xl font-black mb-8">Count Your Daily Calories</h2>
        <div className="grid grid-cols-12 gap-6">
          {/* Calories Large Card */}
          <div className="col-span-12 lg:col-span-6 bg-[#D4C3F9] rounded-[3rem] p-10 text-bg-dark relative overflow-hidden h-[400px] flex flex-col">
            <h3 className="text-3xl font-black mb-8">Calories</h3>
            
            <div className="flex-1 flex flex-col items-center justify-center relative">
              {/* Semi-circle Gauge */}
              <div className="relative w-64 h-32 overflow-hidden">
                {/* Background Gauge (Track - Light Purple tint) */}
                <div className="absolute top-0 left-0 w-64 h-64 border-[24px] border-white/20 rounded-full" />
                
                {/* Progress Gauge (Black) */}
                <motion.div 
                  initial={{ rotate: -180 }}
                  animate={{ rotate: -180 + (calorieProgress * 1.8) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="absolute top-0 left-0 w-64 h-64 border-[24px] border-bg-dark rounded-full border-t-transparent border-r-transparent"
                  style={{ transformOrigin: 'center center' }}
                />
              </div>
              
              <div className="text-center mt-4">
                <div className="text-6xl font-black leading-none">{calorieLeft.toLocaleString()}</div>
                <div className="text-sm font-bold opacity-60 uppercase tracking-widest mt-2">Left</div>
                {carryOver < 0 && (
                  <div className="mt-4 px-4 py-1 bg-bg-dark/10 rounded-full inline-block">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Debt: {Math.abs(carryOver)} kcal
                    </p>
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 w-full flex justify-between px-4 text-[10px] font-black opacity-40">
                <span>0</span>
                <span>100</span>
              </div>
            </div>
          </div>

          {/* Carbs Card */}
          <div className="col-span-12 lg:col-span-3 bg-[#E9F994] rounded-[3rem] p-10 text-bg-dark flex flex-col justify-between h-[400px]">
            <h3 className="text-2xl font-black">Carbs</h3>
            
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-bg-dark/5 flex items-center justify-center mb-8">
                <Utensils size={48} className="opacity-80" />
              </div>
              
              <div className="w-full space-y-4">
                <div className="h-2 w-full bg-bg-dark/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((stats.consumed.carbs / stats.targets.carbs) * 100, 100)}%` }}
                    className="h-full bg-bg-dark"
                  />
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black">{stats.consumed.carbs}g</span>
                  <span className="text-xs font-bold opacity-40">{stats.targets.carbs}g</span>
                </div>
              </div>
            </div>
          </div>

          {/* Protein Card */}
          <div className="col-span-12 lg:col-span-3 bg-[#82F9A1] rounded-[3rem] p-10 text-bg-dark flex flex-col justify-between h-[400px]">
            <h3 className="text-2xl font-black">Protein</h3>
            
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-bg-dark/5 flex items-center justify-center mb-8">
                <Flame size={48} className="opacity-80" />
              </div>
              
              <div className="w-full space-y-4">
                <div className="h-2 w-full bg-bg-dark/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((stats.consumed.protein / stats.targets.protein) * 100, 100)}%` }}
                    className="h-full bg-bg-dark"
                  />
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black">{stats.consumed.protein}g</span>
                  <span className="text-xs font-bold opacity-40">{stats.targets.protein}g</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diet Plan Section */}
      <section className="pb-32">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black">Diet Plan</h2>
          <button 
            onClick={() => onTabChange('goals')}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-orange hover:opacity-80 transition-opacity flex items-center gap-2"
          >
            View All
            <ChevronRight size={14} />
          </button>
        </div>

        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="relative h-64 rounded-[3rem] overflow-hidden group cursor-pointer"
          onClick={() => onTabChange('goals')}
        >
          <img 
            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=400&fit=crop" 
            alt="Featured Diet" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/20 to-transparent" />
          <div className="absolute bottom-10 left-10">
            <h3 className="text-3xl font-black mb-2">Mediterranean Salad</h3>
            <p className="text-white/60 text-sm font-medium">450 kcal • 15g Protein • 10 min prep</p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
