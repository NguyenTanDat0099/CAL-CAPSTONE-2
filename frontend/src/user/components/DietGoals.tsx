import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, RotateCcw, ArrowLeft, PlusCircle, Heart, Droplets, Zap, Flag, Info, X, Trash2 } from 'lucide-react';
import { DietItem, MealSchedule, ScheduleItem } from '../types';
import { UserProfile } from '../App';
import { MySchedule } from './MySchedule';

interface DietGoalsProps {
  myDiets: DietItem[];
  onAddToMyDiet: (item: Omit<DietItem, 'id' | 'date'>) => void | Promise<void>;
  onRemoveFromMyDiet: (id: string) => void | Promise<void>;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  dailyTarget: number;
  baseTarget: number;
  carryOver: number;
  schedules: MealSchedule[];
  onUpdateSchedule: (scheduleId: number, patch: Partial<Pick<MealSchedule, 'name' | 'description' | 'startDate' | 'endDate' | 'color' | 'targetCalories' | 'achieved'>> & { items?: ScheduleItem[] }) => Promise<void>;
  onDeleteSchedule: (scheduleId: number) => Promise<void>;
  onCreateSchedule: (payload: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    color?: string;
    targetCalories?: number;
    source: 'manual' | 'chat';
    items?: ScheduleItem[];
  }) => Promise<MealSchedule>;
}

export function DietGoals({
  myDiets,
  onAddToMyDiet,
  onRemoveFromMyDiet,
  profile,
  setProfile,
  dailyTarget,
  baseTarget,
  carryOver,
  schedules,
  onUpdateSchedule,
  onDeleteSchedule,
  onCreateSchedule,
}: DietGoalsProps) {
  const [activeTab, setActiveTab] = useState<'my' | 'schedule'>('my');
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DietItem | null>(null);

  const handleReset = () => {
    setShowResetWarning(false);
    setProfile({
      name: '',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
      goal: 'lose',
      activityLevel: 'moderate',
      gender: 'male',
      age: 0,
      height: 0,
      weight: 0,
      targetWeight: 0,
      startingWeight: 0,
      weightHistory: [],
      hasCompletedSetup: false,
    });
  };

  if (selectedPlan) {
    const macros = {
      protein: selectedPlan.protein,
      fats: selectedPlan.fats,
      carbs: selectedPlan.carbs,
    };
    const description = selectedPlan.description || 'A personalized meal added to your diet log.';
    const about = selectedPlan.about || 'This item was added to your diet log to help you track your nutritional intake. It contributes to your daily energy and macronutrient goals.';

    return (
      <div className="flex-1 lg:ml-64 min-h-screen bg-bg-dark text-white relative overflow-y-auto">
        <div className="h-[280px] sm:h-[360px] lg:h-[450px] relative">
          <img src={selectedPlan.image} alt={selectedPlan.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/40 via-transparent to-bg-dark" />

          <button
            onClick={() => setSelectedPlan(null)}
            className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-full bg-bg-dark/40 backdrop-blur-md border border-white/10 hover:bg-bg-dark/60 transition-colors z-10"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-bold">Back</span>
          </button>

          <div className="absolute bottom-8 left-4 right-4 sm:bottom-12 sm:left-10 sm:right-10">
            <span className="px-3 py-1 rounded-full bg-brand-orange text-bg-dark text-[10px] font-black uppercase tracking-widest mb-3 inline-block">
              Logged Item
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-3 sm:mb-4">{selectedPlan.name}</h1>
            <p className="text-white/80 text-sm sm:text-lg max-w-2xl leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 sm:py-10 lg:p-10 space-y-8 sm:space-y-10 pb-24 sm:pb-32">
          <section className="bg-surface-dark/50 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                <Info size={20} />
              </div>
              <h2 className="text-xl font-bold">About this Meal</h2>
            </div>
            <p className="text-text-muted leading-relaxed text-base sm:text-lg">{about}</p>
          </section>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: 'Energy', value: `${selectedPlan.calories.toLocaleString()} kcal`, sub: 'Daily Target', color: 'bg-brand-orange', icon: <Flame size={20} /> },
              { label: 'Protein', value: `${macros.protein}g`, sub: 'Building Blocks', color: 'bg-green-500', icon: <Zap size={20} /> },
              { label: 'Carbs', value: `${macros.carbs}g`, sub: 'Sustained Energy', color: 'bg-yellow-500', icon: <Droplets size={20} /> },
              { label: 'Fats', value: `${macros.fats}g`, sub: 'Healthy Lipids', color: 'bg-orange-400', icon: <RotateCcw size={20} /> },
            ].map((stat, idx) => (
              <div key={idx} className="bg-surface-dark rounded-[2rem] p-6 border border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-10 h-10 rounded-2xl ${stat.color}/10 flex items-center justify-center text-white`}>
                    {stat.icon}
                  </div>
                  <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">{stat.label}</span>
                </div>
                <p className="text-2xl font-black mb-1">{stat.value}</p>
                <p className="text-[10px] text-text-muted mb-4">{stat.sub}</p>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${stat.color} w-[70%]`} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-surface-dark rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-3xl bg-brand-orange/10 flex items-center justify-center text-brand-orange shrink-0">
                <Heart size={28} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Goal Focus</p>
                <p className="text-lg sm:text-xl font-bold">Heart Health & Weight Maintenance</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onRemoveFromMyDiet(selectedPlan.id);
                setSelectedPlan(null);
              }}
              className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black py-3 sm:py-4 px-6 sm:px-10 rounded-2xl flex items-center justify-center gap-3 transition-all border border-red-500/20 w-full md:w-auto"
            >
              <X size={20} />
              Remove from My Diet
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Label "Daily Target" → so only count meals logged TODAY (local date).
  // Trước đây cộng dồn toàn bộ myDiets nên nhiều ngày log lại trông như vượt
  // target dù chỉ hôm nay ăn dưới mức. Khớp với cách Homepage lọc theo ngày.
  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const totalCalories = myDiets.reduce((sum, item) => {
    const itemDate = new Date(item.date);
    const itemKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
    return itemKey === todayKey ? sum + item.calories : sum;
  }, 0);
  const progressPercentage = Math.min((totalCalories / dailyTarget) * 100, 100);

  return (
    <div className="flex-1 lg:ml-64 px-4 pt-20 pb-10 sm:px-6 sm:pt-24 lg:p-10 min-h-screen bg-bg-dark text-white relative overflow-y-auto">
      <header className="mb-8 lg:pr-44">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">My goal</h1>
        </div>

        <div className="flex gap-5 sm:gap-8 border-b border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('my')}
            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'my' ? 'text-brand-orange' : 'text-text-muted hover:text-white'}`}
          >
            My Diets
            {activeTab === 'my' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange" />}
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'schedule' ? 'text-brand-orange' : 'text-text-muted hover:text-white'}`}
          >
            My schedule
            {activeTab === 'schedule' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange" />}
          </button>
        </div>
      </header>

      {activeTab === 'schedule' ? (
        <div className="pb-32">
          <MySchedule
            schedules={schedules}
            onUpdate={onUpdateSchedule}
            onDelete={onDeleteSchedule}
            onCreate={onCreateSchedule}
          />
        </div>
      ) : (
        <div className="pb-32">
          {myDiets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {myDiets.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedPlan(item)}
                  className="bg-surface-dark rounded-3xl overflow-hidden border border-white/5 group cursor-pointer"
                >
                  <div className="h-48 overflow-hidden relative">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 to-transparent" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Remove "${item.name}" from My Diets?`)) {
                          onRemoveFromMyDiet(item.id);
                        }
                      }}
                      className="absolute top-4 left-4 p-2 rounded-full bg-black/50 hover:bg-red-500/80 backdrop-blur-md border border-white/10 text-white/80 hover:text-white transition-colors"
                      title="Remove from My Diets"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold">
                      {new Date(item.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                    <div className="inline-block px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-bold mb-4">
                      {item.calories} kcal
                    </div>
                    <p className="text-text-muted text-sm leading-relaxed mb-6 h-12 overflow-hidden">
                      {item.description || 'A personalized meal added to your diet log.'}
                    </p>
                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
                      <div className="text-center">
                        <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Protein</p>
                        <p className="font-bold">{item.protein}g</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Fats</p>
                        <p className="font-bold">{item.fats}g</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Carbs</p>
                        <p className="font-bold">{item.carbs}g</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-text-muted bg-surface-dark/30 rounded-[3rem] border border-dashed border-white/10">
              <PlusCircle size={48} className="mb-4 opacity-20" />
              <p className="font-medium">No diets logged yet.</p>
              <p className="text-sm opacity-60">Start scanning your meals or add food from Meal Plans.</p>
            </div>
          )}
        </div>
      )}

      {/* Goal Overview & Reset */}
      <div className="hidden xl:block fixed bottom-10 right-10 z-40">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface-lighter/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl w-80"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-sm">Goal Overview</h4>
            <button
              onClick={() => setShowResetWarning(true)}
              className="p-2 rounded-full bg-white/5 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
              title="Reset Goal"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                <Flag size={20} />
              </div>
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-widest">Current Goal</p>
                <p className="font-bold text-sm capitalize">
                  {profile.goal === 'lose' ? 'Lose Weight' : profile.goal === 'maintain' ? 'Maintain Weight' : 'Gain Weight'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-widest">Activity</p>
                <p className="font-bold text-sm capitalize">{profile.activityLevel}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-text-muted">Daily Target</span>
              <span className="font-bold">{totalCalories.toLocaleString()} / {dailyTarget.toLocaleString()} kcal</span>
            </div>
            {carryOver < 0 && (
              <p className="text-[10px] text-brand-orange font-bold mb-3 opacity-60">
                Includes {Math.abs(carryOver)} kcal carry-over debt
              </p>
            )}
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                className="h-full bg-brand-orange"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Reset Warning Modal */}
      <AnimatePresence>
        {showResetWarning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetWarning(false)}
              className="absolute inset-0 bg-bg-dark/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-surface-dark p-8 rounded-[2.5rem] border border-white/10 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Reset your goals?</h3>
              <p className="text-text-muted leading-relaxed mb-8">
                This will clear your current profile and{' '}
                <span className="text-white font-bold">restart all progress tracking</span>. You will need to complete the profile setup again.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowResetWarning(false)}
                  className="flex-1 py-4 rounded-2xl font-bold bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-4 rounded-2xl font-bold bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  Reset Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Flame({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.5 4 6.5 2 2 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}
