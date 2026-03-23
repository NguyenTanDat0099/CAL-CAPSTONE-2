import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { FoodScan } from './components/FoodScan';
import { DietGoals } from './components/DietGoals';
import { MealPlans } from './components/MealPlans';
import { Homepage } from './components/Homepage';
import { Dashboard } from './components/Dashboard';
import { Chatbox } from './components/Chatbox';
import { Settings } from './components/Settings';
import { DietItem } from './types';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type Gender = 'male' | 'female';

export interface UserProfile {
  name: string;
  avatar: string;
  goal: Goal;
  activityLevel: ActivityLevel;
  gender: Gender;
  age: number;
  height: number;
  weight: number;
  targetWeight: number;
  startingWeight: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [myDiets, setMyDiets] = useState<DietItem[]>(() => {
    const saved = localStorage.getItem('calai_my_diets');
    return saved ? JSON.parse(saved) : [];
  });
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('calai_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Alex Rivers',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
      goal: 'lose',
      activityLevel: 'active',
      gender: 'male',
      age: 28,
      height: 180,
      weight: 75,
      targetWeight: 65,
      startingWeight: 75,
    };
  });

  const [notifications, setNotifications] = useState<{ id: string; message: string; time: string }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    localStorage.setItem('calai_my_diets', JSON.stringify(myDiets));
  }, [myDiets]);

  useEffect(() => {
    localStorage.setItem('calai_profile', JSON.stringify(profile));
  }, [profile]);

  // Calculate Base Daily Target (without carry-over)
  const baseTarget = useMemo(() => {
    let bmr = 0;
    if (profile.gender === 'male') {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }

    const activityFactors = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725
    };

    const tdee = bmr * activityFactors[profile.activityLevel];
    
    if (profile.goal === 'lose') return Math.round(tdee - 500);
    if (profile.goal === 'gain') return Math.round(tdee + 500);
    return Math.round(tdee);
  }, [profile]);

  // Calculate Calorie Carry-over (Debt from previous days)
  const carryOver = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    
    const dietsByDate: Record<string, number> = {};
    
    myDiets.forEach(diet => {
      const d = new Date(diet.date);
      const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      
      if (dateStr < todayStr) {
        dietsByDate[dateStr] = (dietsByDate[dateStr] || 0) + diet.calories;
      }
    });

    let totalBalance = 0;
    const sortedDates = Object.keys(dietsByDate).sort();
    
    sortedDates.forEach(date => {
      // We calculate the balance relative to the base target
      // If balance is negative, it means user ate more than target
      totalBalance += (baseTarget - dietsByDate[date]);
    });

    // Only carry over if there's a debt (negative balance)
    // This implements the "trừ hao" (offsetting debt) logic requested by the user
    // We cap it at 0 so that eating less doesn't "reward" the user with more calories later,
    // but eating more definitely "punishes" them by reducing future targets.
    return Math.min(0, totalBalance);
  }, [myDiets, baseTarget]);

  // Final Adjusted Daily Target
  const dailyTarget = baseTarget + carryOver;

  // Notification Logic
  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTimeStr = `${hours}:${minutes.toString().padStart(2, '0')}`;

      const schedule = [
        { time: '09:00', message: 'Time to log your Breakfast! 🍳' },
        { time: '12:30', message: 'Time to log your Lunch! 🥗' },
        { time: '19:00', message: 'Time to log your Dinner! 🍽️' },
      ];

      schedule.forEach(item => {
        if (currentTimeStr === item.time) {
          // Check if already notified in the last minute to avoid duplicates
          const alreadyNotified = notifications.some(n => n.time === item.time && n.message === item.message);
          if (!alreadyNotified) {
            setNotifications(prev => [
              { id: Math.random().toString(36).substr(2, 9), ...item },
              ...prev
            ]);
          }
        }
      });
    };

    const interval = setInterval(checkNotifications, 60000); // Check every minute
    checkNotifications(); // Initial check
    return () => clearInterval(interval);
  }, [notifications]);

  const handleAddToMyDiet = (item: Omit<DietItem, 'id' | 'date'>) => {
    const newItem: DietItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
    };
    setMyDiets(prev => [newItem, ...prev]);
  };

  const handleRemoveFromMyDiet = (id: string) => {
    setMyDiets(prev => prev.filter(item => item.id !== id));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-bg-dark">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Global Header with Avatar & Notifications */}
      <div className="fixed top-0 right-0 p-8 z-40 flex items-center gap-4">
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-12 h-12 rounded-2xl bg-surface-dark border border-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors relative"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-orange text-bg-dark text-[10px] font-black rounded-full flex items-center justify-center border-2 border-bg-dark">
                {notifications.length}
              </span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-16 right-0 w-80 bg-surface-dark border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase tracking-widest">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-text-muted hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center text-text-muted">
                      <Bell size={32} className="mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-medium">No new notifications</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-6 border-b border-white/5 hover:bg-white/5 transition-colors relative group">
                        <p className="text-sm font-medium pr-6">{n.message}</p>
                        <p className="text-[10px] text-text-muted mt-2 font-bold uppercase tracking-widest">{n.time}</p>
                        <button 
                          onClick={() => removeNotification(n.id)}
                          className="absolute top-6 right-6 text-text-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl border border-white/10 overflow-hidden shadow-lg shadow-brand-orange/5">
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      <main className="flex-1">
        {activeTab === 'home' && (
          <Homepage 
            myDiets={myDiets} 
            onTabChange={setActiveTab} 
            dailyTarget={dailyTarget}
            baseTarget={baseTarget}
            carryOver={carryOver}
            profile={profile}
          />
        )}
        {activeTab === 'dashboard' && (
          <Dashboard 
            myDiets={myDiets}
            profile={profile}
            dailyTarget={dailyTarget}
          />
        )}
        {activeTab === 'scan' && <FoodScan onAddToMyDiet={handleAddToMyDiet} />}
        {activeTab === 'goals' && (
          <DietGoals 
            myDiets={myDiets} 
            onAddToMyDiet={handleAddToMyDiet} 
            onRemoveFromMyDiet={handleRemoveFromMyDiet}
            profile={profile}
            setProfile={setProfile}
            dailyTarget={dailyTarget}
            baseTarget={baseTarget}
            carryOver={carryOver}
          />
        )}
        {activeTab === 'meals' && <MealPlans onAddToMyDiet={handleAddToMyDiet} />}
        {activeTab === 'chat' && <Chatbox />}
        {activeTab === 'settings' && (
          <Settings 
            profile={profile}
            setProfile={setProfile}
          />
        )}
        {activeTab !== 'home' && activeTab !== 'scan' && activeTab !== 'goals' && activeTab !== 'meals' && activeTab !== 'dashboard' && activeTab !== 'chat' && activeTab !== 'settings' && (
          <div className="flex-1 ml-64 p-10 flex items-center justify-center text-text-muted">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Section "{activeTab}"</h2>
              <p>This feature is currently under development.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
