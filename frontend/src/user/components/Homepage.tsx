import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Flame, Utensils, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

export function Homepage({ myDiets, onTabChange, dailyTarget, baseTarget, carryOver, profile }: HomepageProps) {
  const [today] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  const todayKey = toDateKey(today);
  const selectedKey = toDateKey(selectedDate);
  const isViewingToday = selectedKey === todayKey;

  // Map of date-key → total calories logged (for all days)
  const caloriesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    myDiets.forEach(item => {
      const key = toDateKey(new Date(item.date));
      map[key] = (map[key] || 0) + item.calories;
    });
    return map;
  }, [myDiets]);

  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const key = toDateKey(day);
      days.push({
        name: day.toLocaleDateString('en-US', { weekday: 'short' }),
        date: day.getDate().toString().padStart(2, '0'),
        fullDate: day,
        key,
        isToday: key === todayKey,
        isSelected: key === selectedKey,
        calories: caloriesByDay[key] || 0,
        hasMeals: !!caloriesByDay[key],
      });
    }
    return days;
  }, [weekOffset, selectedKey, todayKey, caloriesByDay, today]);

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === -1) return 'Last Week';
    return `${Math.abs(weekOffset)} weeks ago`;
  }, [weekOffset]);

  const handleWeekChange = (delta: number) => {
    const newOffset = weekOffset + delta;
    if (newOffset > 0) return;
    setWeekOffset(newOffset);
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + delta * 7);
    setSelectedDate(newDate);
  };

  const handleBackToToday = () => {
    setWeekOffset(0);
    setSelectedDate(new Date(today));
  };

  const selectedDateLabel = useMemo(() => {
    if (isViewingToday) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (selectedKey === toDateKey(yesterday)) return 'Yesterday';
    return selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, [selectedKey, isViewingToday, today, selectedDate]);

  const effectiveTarget = isViewingToday
    ? Math.max(0, dailyTarget)
    : Math.max(0, baseTarget);

  const stats = useMemo(() => {
    const dayDiets = myDiets.filter(item => toDateKey(new Date(item.date)) === selectedKey);
    const consumed = {
      calories: dayDiets.reduce((sum, item) => sum + item.calories, 0),
      protein: dayDiets.reduce((sum, item) => sum + (item.protein || 0), 0),
      carbs: dayDiets.reduce((sum, item) => sum + (item.carbs || 0), 0),
    };
    const targets = {
      calories: effectiveTarget,
      protein: effectiveTarget > 0 ? Math.round((effectiveTarget * 0.3) / 4) : 0,
      carbs: effectiveTarget > 0 ? Math.round((effectiveTarget * 0.4) / 4) : 0,
    };
    return { consumed, targets, dayDiets };
  }, [myDiets, selectedKey, effectiveTarget]);

  const calorieLeft = stats.targets.calories - stats.consumed.calories;
  const calorieStatusLabel = calorieLeft >= 0 ? 'Left' : 'Over target';
  const calorieProgress = stats.targets.calories > 0
    ? Math.max(0, Math.min((stats.consumed.calories / stats.targets.calories) * 100, 100))
    : 0;
  const carbProgress = stats.targets.carbs > 0
    ? Math.min((stats.consumed.carbs / stats.targets.carbs) * 100, 100)
    : 0;
  const proteinProgress = stats.targets.protein > 0
    ? Math.min((stats.consumed.protein / stats.targets.protein) * 100, 100)
    : 0;

  const selectedDayMeals = stats.dayDiets;

  return (
    <div className="flex-1 lg:ml-64 px-4 pt-20 pb-10 sm:px-6 sm:pt-24 lg:p-10 min-h-screen bg-bg-dark text-white relative overflow-y-auto">

      {/* Header
          On large screens reserve room (`lg:pr-44`) for the fixed Bell + Avatar
          bar in the top right; on small screens those controls live closer to
          the edge and the page header doesn't need the same gutter. */}
      <header className="mb-10 lg:pr-44 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="hidden sm:block w-14 h-14 rounded-2xl border border-white/10 overflow-hidden shadow-xl shadow-brand-orange/10 shrink-0">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight truncate">Hello, {(profile.name || 'there').split(' ')[0]}</h1>
            <p className="text-text-muted font-medium text-xs sm:text-sm">Track and review your daily nutrition.</p>
          </div>
        </div>

        <AnimatePresence>
          {!isViewingToday && (
            <motion.button
              key="back-to-today-header"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
              onClick={handleBackToToday}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-orange/10 border border-brand-orange/25 text-brand-orange text-sm font-bold hover:bg-brand-orange/20 transition-colors whitespace-nowrap"
            >
              <CalendarDays size={16} />
              Back to Today
            </motion.button>
          )}
        </AnimatePresence>
      </header>

      {/* Week Calendar */}
      <section className="bg-surface-dark/50 rounded-[2.5rem] p-6 border border-white/5 mb-10">
        {/* Week nav row */}
        <div className="flex items-center justify-between mb-5 px-2">
          <button
            onClick={() => handleWeekChange(-1)}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-muted hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-text-muted">{weekLabel}</span>
            <AnimatePresence>
              {weekOffset < 0 && (
                <motion.button
                  key="back-to-today"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleBackToToday}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-orange/10 border border-brand-orange/25 text-brand-orange text-[10px] font-black uppercase tracking-wider hover:bg-brand-orange/20 transition-colors"
                >
                  <CalendarDays size={11} />
                  Today
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => handleWeekChange(1)}
            disabled={weekOffset >= 0}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              weekOffset >= 0
                ? 'opacity-20 cursor-not-allowed text-text-muted'
                : 'bg-white/5 hover:bg-white/10 text-text-muted hover:text-white'
            }`}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day tiles */}
        <div className="flex justify-between items-stretch gap-1 sm:gap-2">
          {weekDays.map((day) => (
            <button
              key={day.key}
              onClick={() => setSelectedDate(new Date(day.fullDate))}
              className={`flex flex-col items-center gap-1 sm:gap-2 py-3 px-1 sm:py-4 sm:px-3 rounded-2xl sm:rounded-3xl transition-all flex-1 min-w-0 ${
                day.isSelected && day.isToday
                  ? 'bg-white text-bg-dark shadow-xl scale-105'
                  : day.isSelected
                    ? 'bg-brand-orange text-bg-dark shadow-lg shadow-brand-orange/30 scale-105'
                    : day.isToday
                      ? 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15'
                      : 'text-text-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-tight sm:tracking-widest ${
                day.isSelected || day.isToday ? 'opacity-60' : 'opacity-50'
              }`}>
                {day.name}
              </span>
              <span className="text-sm sm:text-xl font-black">{day.date}</span>
              {/* Calorie dot indicator */}
              <div className="h-4 flex flex-col items-center justify-center">
                {day.hasMeals ? (
                  <div className={`flex flex-col items-center gap-0.5 ${day.isSelected ? 'opacity-70' : ''}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      day.isSelected ? 'bg-current' : 'bg-brand-orange'
                    }`} />
                    <span className={`text-[8px] font-black leading-none ${
                      day.isSelected ? 'opacity-60' : 'text-brand-orange'
                    }`}>
                      {day.calories >= 1000
                        ? `${(day.calories / 1000).toFixed(1)}k`
                        : day.calories}
                    </span>
                  </div>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full opacity-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Nutrition Stats */}
      <section className="mb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8 flex-wrap">
              <h2 className="text-lg sm:text-2xl font-black">
                Logged Nutrition
                <span className="ml-2 sm:ml-3 text-brand-orange font-black">{selectedDateLabel}</span>
              </h2>
              {stats.consumed.calories === 0 && (
                <span className="text-xs font-bold text-text-muted px-3 py-1.5 rounded-full bg-white/5 shrink-0">
                  No meals logged
                </span>
              )}
            </div>

            <div className="grid grid-cols-12 gap-4 sm:gap-6">
              {/* Calories card */}
              <div className="col-span-12 lg:col-span-6 bg-[#D4C3F9] rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 text-bg-dark relative overflow-hidden h-[300px] sm:h-[400px] flex flex-col">
                <h3 className="text-2xl sm:text-3xl font-black mb-4 sm:mb-8">Calories</h3>
                <div className="flex-1 flex flex-col items-center justify-center relative">
                  <div className="relative w-48 h-24 sm:w-64 sm:h-32 overflow-hidden">
                    <div className="absolute top-0 left-0 w-48 h-48 sm:w-64 sm:h-64 border-[18px] sm:border-[24px] border-white/20 rounded-full" />
                    <motion.div
                      key={selectedKey + '-cal'}
                      initial={{ rotate: -180 }}
                      animate={{ rotate: -180 + (calorieProgress * 1.8) }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="absolute top-0 left-0 w-48 h-48 sm:w-64 sm:h-64 border-[18px] sm:border-[24px] border-bg-dark rounded-full border-t-transparent border-r-transparent"
                      style={{ transformOrigin: 'center center' }}
                    />
                  </div>
                  <div className="text-center mt-3 sm:mt-4">
                    <div className="text-4xl sm:text-6xl font-black leading-none">{Math.abs(calorieLeft).toLocaleString()}</div>
                    <div className="text-sm font-bold opacity-60 uppercase tracking-widest mt-2">{calorieStatusLabel}</div>
                    {isViewingToday && carryOver < 0 && (
                      <div className="mt-4 px-4 py-1 bg-bg-dark/10 rounded-full inline-block">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                          Debt cap applied: {Math.abs(carryOver)} kcal
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 w-full flex justify-between px-4 text-[10px] font-black opacity-40">
                    <span>0</span>
                    <span>{stats.targets.calories.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Carbs card */}
              <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-[#E9F994] rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 text-bg-dark flex flex-col justify-between h-[320px] sm:h-[400px]">
                <h3 className="text-2xl font-black">Carbs</h3>
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full bg-bg-dark/5 flex items-center justify-center mb-8">
                    <Utensils size={48} className="opacity-80" />
                  </div>
                  <div className="w-full space-y-4">
                    <div className="h-2 w-full bg-bg-dark/10 rounded-full overflow-hidden">
                      <motion.div
                        key={selectedKey + '-carb'}
                        initial={{ width: 0 }}
                        animate={{ width: `${carbProgress}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
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

              {/* Protein card */}
              <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-[#82F9A1] rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 text-bg-dark flex flex-col justify-between h-[320px] sm:h-[400px]">
                <h3 className="text-2xl font-black">Protein</h3>
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full bg-bg-dark/5 flex items-center justify-center mb-8">
                    <Flame size={48} className="opacity-80" />
                  </div>
                  <div className="w-full space-y-4">
                    <div className="h-2 w-full bg-bg-dark/10 rounded-full overflow-hidden">
                      <motion.div
                        key={selectedKey + '-prot'}
                        initial={{ width: 0 }}
                        animate={{ width: `${proteinProgress}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
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
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Meals of Selected Day */}
      <section className="pb-32">
        <div className="flex justify-between items-center mb-6 sm:mb-8 gap-3">
          <h2 className="text-xl sm:text-2xl font-black truncate">
            {isViewingToday ? 'Diet Plan' : `Meals — ${selectedDateLabel}`}
          </h2>
          <button
            onClick={() => onTabChange('goals')}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-orange hover:opacity-80 transition-opacity flex items-center gap-2"
          >
            View All
            <ChevronRight size={14} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedKey + '-meals'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {selectedDayMeals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {selectedDayMeals.slice(0, 6).map((meal, idx) => (
                  <motion.div
                    key={meal.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onTabChange('goals')}
                    className="relative rounded-3xl overflow-hidden border border-white/5 group cursor-pointer h-40"
                  >
                    <img
                      src={meal.image}
                      alt={meal.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/90 via-bg-dark/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="font-black text-sm truncate">{meal.name}</p>
                      <p className="text-[10px] text-white/60 font-bold mt-0.5">
                        {meal.calories} kcal · {meal.protein}g P · {meal.carbs}g C · {meal.fats}g F
                      </p>
                    </div>
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md text-[9px] font-black text-white/70">
                      {new Date(meal.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </motion.div>
                ))}
                {selectedDayMeals.length > 6 && (
                  <button
                    onClick={() => onTabChange('goals')}
                    className="rounded-3xl border border-dashed border-white/10 h-40 flex flex-col items-center justify-center text-text-muted hover:border-brand-orange/40 hover:text-white transition-colors"
                  >
                    <span className="text-2xl font-black">+{selectedDayMeals.length - 6}</span>
                    <span className="text-xs font-bold mt-1">more meals</span>
                  </button>
                )}
              </div>
            ) : (
              <div
                onClick={() => onTabChange('goals')}
                className="relative h-48 rounded-[3rem] overflow-hidden group cursor-pointer bg-surface-dark border border-dashed border-white/10 flex flex-col items-center justify-center text-center px-8"
              >
                <Utensils size={40} className="text-brand-orange/40 mb-3" />
                <h3 className="text-xl font-black mb-1">No meals logged</h3>
                <p className="text-text-muted text-sm">
                  {isViewingToday
                    ? 'Add meals from Meal Plans or Food Scan to get started.'
                    : 'No nutrition was logged on this day.'}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
