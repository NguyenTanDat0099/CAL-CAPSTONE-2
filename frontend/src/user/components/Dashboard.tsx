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
  Area,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  Info,
  ChevronRight,
} from 'lucide-react';
import { DietItem } from '../types';
import { UserProfile } from '../App';

interface DashboardProps {
  myDiets: DietItem[];
  profile: UserProfile;
  dailyTarget: number;
}

type TimeRange = 'daily' | 'weekly' | 'monthly';

interface ChartPoint {
  name: string;
  consumed: number | null;
  target: number;
  hasData: boolean;
}

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const WEEKDAY_VI = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const formatDateLabelVi = (key: string): string => {
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  const weekday = WEEKDAY_VI[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${weekday}, ${dd}/${mm}/${d.getFullYear()}`;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

const sumCalories = (items: DietItem[]) => items.reduce((sum, item) => sum + item.calories, 0);

const getMealsForDate = (items: DietItem[], date: Date) => {
  const key = dateKey(date);
  return items.filter(item => dateKey(new Date(item.date)) === key);
};

const getLoggedDayAverage = (items: DietItem[], start: Date, days: number) => {
  const totals = Array.from({ length: days }, (_, idx) => {
    const meals = getMealsForDate(items, addDays(start, idx));
    return meals.length > 0 ? sumCalories(meals) : null;
  }).filter((value): value is number => value !== null);

  if (totals.length === 0) return null;
  return Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length);
};

export function Dashboard({ myDiets, profile, dailyTarget }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const safeDailyTarget = Math.max(0, dailyTarget);

  // Meal-history date range — default to last 7 days (incl. today).
  const today = startOfDay(new Date());
  const sevenAgo = addDays(today, -6);
  const [historyFrom, setHistoryFrom] = useState<string>(dateKey(sevenAgo));
  const [historyTo, setHistoryTo] = useState<string>(dateKey(today));

  // Group myDiets within [historyFrom, historyTo] by date, newest first.
  const historyGroups = useMemo(() => {
    if (!historyFrom || !historyTo) return [] as Array<{ key: string; total: number; items: DietItem[] }>;
    const fromKey = historyFrom;
    const toKey = historyTo;
    const groups = new Map<string, DietItem[]>();
    for (const item of myDiets) {
      const key = dateKey(new Date(item.date));
      if (key < fromKey || key > toKey) continue;
      const arr = groups.get(key) ?? [];
      arr.push(item);
      groups.set(key, arr);
    }
    return Array.from(groups.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // newest first
      .map(([key, items]) => ({ key, total: sumCalories(items), items }));
  }, [myDiets, historyFrom, historyTo]);

  const macroTargets = useMemo(() => {
    if (safeDailyTarget <= 0) return { protein: 0, carbs: 0, fats: 0 };
    return {
      protein: Math.round((safeDailyTarget * 0.3) / 4),
      carbs: Math.round((safeDailyTarget * 0.4) / 4),
      fats: Math.round((safeDailyTarget * 0.3) / 9),
    };
  }, [safeDailyTarget]);

  const todayMacros = useMemo(() => {
    const today = dateKey(new Date());
    const todayDiets = myDiets.filter(d => dateKey(new Date(d.date)) === today);

    return {
      protein: todayDiets.reduce((sum, d) => sum + (d.protein || 0), 0),
      carbs: todayDiets.reduce((sum, d) => sum + (d.carbs || 0), 0),
      fats: todayDiets.reduce((sum, d) => sum + (d.fats || 0), 0),
      calories: todayDiets.reduce((sum, d) => sum + d.calories, 0),
      mealCount: todayDiets.length,
    };
  }, [myDiets]);

  const macroWarnings = useMemo(() => {
    if (todayMacros.mealCount === 0 || safeDailyTarget <= 0) return [];

    const warnings: string[] = [];
    if (macroTargets.protein > 0 && todayMacros.protein < macroTargets.protein * 0.5) {
      warnings.push("Today's logged protein is below half of the estimated daily target.");
    }
    if (macroTargets.carbs > 0 && todayMacros.carbs < macroTargets.carbs * 0.5) {
      warnings.push("Today's logged carbohydrates are below half of the estimated daily target.");
    }
    if (macroTargets.fats > 0 && todayMacros.fats < macroTargets.fats * 0.5) {
      warnings.push("Today's logged fats are below half of the estimated daily target.");
    }
    return warnings;
  }, [todayMacros, macroTargets, safeDailyTarget]);

  const chartData = useMemo<ChartPoint[]>(() => {
    const now = new Date();

    if (timeRange === 'daily') {
      const todayMeals = getMealsForDate(myDiets, now);
      if (todayMeals.length === 0) {
        return Array.from({ length: 24 }, (_, hour) => ({
          name: `${hour}:00`,
          consumed: null,
          target: Math.round((safeDailyTarget * (hour + 1)) / 24),
          hasData: false,
        }));
      }

      let cumulative = 0;
      return Array.from({ length: 24 }, (_, hour) => {
        cumulative += todayMeals
          .filter(meal => new Date(meal.date).getHours() === hour)
          .reduce((sum, meal) => sum + meal.calories, 0);

        return {
          name: `${hour}:00`,
          consumed: cumulative,
          target: Math.round((safeDailyTarget * (hour + 1)) / 24),
          hasData: true,
        };
      });
    }

    if (timeRange === 'weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const startOfWeek = startOfDay(addDays(now, -now.getDay()));

      return days.map((day, idx) => {
        const targetDate = addDays(startOfWeek, idx);
        const dayDiets = getMealsForDate(myDiets, targetDate);
        const hasData = dayDiets.length > 0;

        return {
          name: day,
          consumed: hasData ? Math.round(sumCalories(dayDiets)) : null,
          target: safeDailyTarget,
          hasData,
        };
      });
    }

    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, idx) => {
      const targetDate = new Date(year, month, idx + 1);
      const dayDiets = getMealsForDate(myDiets, targetDate);
      const hasData = dayDiets.length > 0;

      return {
        name: String(idx + 1),
        consumed: hasData ? Math.round(sumCalories(dayDiets)) : null,
        target: safeDailyTarget,
        hasData,
      };
    });
  }, [myDiets, safeDailyTarget, timeRange]);

  const chartHasData = chartData.some(point => point.hasData);

  const intakeSummary = useMemo(() => {
    const now = new Date();
    if (timeRange === 'daily') {
      return {
        label: 'Logged Today',
        value: todayMacros.calories,
        note: todayMacros.mealCount > 0 ? `${todayMacros.mealCount} meal${todayMacros.mealCount === 1 ? '' : 's'} logged` : 'No logged meals today',
      };
    }

    const currentLogged = chartData
      .filter(point => point.hasData && point.consumed !== null)
      .map(point => point.consumed as number);
    const currentAverage = currentLogged.length > 0
      ? Math.round(currentLogged.reduce((sum, value) => sum + value, 0) / currentLogged.length)
      : null;

    if (timeRange === 'weekly') {
      const startOfWeek = startOfDay(addDays(now, -now.getDay()));
      const previousAverage = getLoggedDayAverage(myDiets, addDays(startOfWeek, -7), 7);
      const comparison = currentAverage !== null && previousAverage && previousAverage > 0
        ? `${currentAverage - previousAverage >= 0 ? '+' : ''}${Math.round(((currentAverage - previousAverage) / previousAverage) * 100)}% vs previous week`
        : 'Previous week unavailable';

      return {
        label: 'Logged Daily Average',
        value: currentAverage,
        note: comparison,
      };
    }

    const year = now.getFullYear();
    const month = now.getMonth();
    const previousMonth = new Date(year, month - 1, 1);
    const previousDays = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0).getDate();
    const previousAverage = getLoggedDayAverage(myDiets, previousMonth, previousDays);
    const comparison = currentAverage !== null && previousAverage && previousAverage > 0
      ? `${currentAverage - previousAverage >= 0 ? '+' : ''}${Math.round(((currentAverage - previousAverage) / previousAverage) * 100)}% vs previous month`
      : 'Previous month unavailable';

    return {
      label: 'Logged Daily Average',
      value: currentAverage,
      note: comparison,
    };
  }, [chartData, myDiets, timeRange, todayMacros]);

  const weightProgress = useMemo(() => {
    const hasWeightGoal = profile.weight > 0
      && profile.targetWeight > 0
      && profile.startingWeight > 0
      && profile.startingWeight !== profile.targetWeight;

    if (!hasWeightGoal) {
      return {
        progress: 0,
        awayFromGoal: profile.targetWeight > 0 && profile.weight > 0
          ? Math.abs(profile.weight - profile.targetWeight).toFixed(1)
          : '0.0',
        changeLabel: 'No weight history yet',
      };
    }

    const totalDistance = Math.abs(profile.startingWeight - profile.targetWeight);
    const remainingDistance = Math.abs(profile.weight - profile.targetWeight);
    const progress = clampPercentage(((totalDistance - remainingDistance) / totalDistance) * 100);
    const change = profile.weight - profile.startingWeight;

    return {
      progress: Math.round(progress),
      awayFromGoal: remainingDistance.toFixed(1),
      changeLabel: `${change >= 0 ? '+' : ''}${change.toFixed(1)}kg since setup`,
    };
  }, [profile]);

  const goalHitPercentage = safeDailyTarget > 0
    ? clampPercentage(Math.round((todayMacros.calories / safeDailyTarget) * 100))
    : 0;

  const summaryValue = intakeSummary.value === null
    ? '--'
    : intakeSummary.value.toLocaleString();

  return (
    <div className="flex-1 lg:ml-64 px-4 pt-20 pb-10 sm:px-6 sm:pt-24 lg:p-10 min-h-screen bg-bg-dark text-white relative overflow-y-auto">
      <header className="mb-8 sm:mb-10 lg:pr-44">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Dashboard</h1>
      </header>

      <section className="mb-10 sm:mb-12">
        <div className="nutrition-review-banner rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 border border-white/5 relative overflow-hidden flex items-center justify-between gap-6">
          <div className="relative z-10 max-w-xl">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-3 sm:mb-4">Nutrition Log Review</h2>
            <p className="text-text-muted text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 leading-relaxed">
              These estimates are based only on meals you have logged. Missing meals are treated as missing data, not as zero intake.
            </p>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-text-muted">
              <Info size={16} className="text-brand-orange" />
              Estimated targets, not medical advice
            </div>
          </div>
          <div className="hidden lg:block relative w-64 h-48 bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <TrendingUp size={80} className="text-brand-orange opacity-20" />
            </div>
            <div className="absolute bottom-4 left-4 right-4 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goalHitPercentage}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-brand-orange"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-6 sm:gap-8 mb-10 sm:mb-12">
        <div className="col-span-12 lg:col-span-8 bg-surface-dark/50 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 border border-white/5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 sm:mb-10">
            <div>
              <h3 className="text-xl sm:text-2xl font-black mb-2">Logged Intake</h3>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="text-text-muted text-xs sm:text-sm uppercase tracking-widest font-bold">{intakeSummary.label}</div>
                <div className="text-2xl sm:text-3xl font-black">{summaryValue} <span className="text-sm font-medium opacity-40">kcal</span></div>
                <div className="bg-white/5 text-text-muted text-[10px] font-black px-2 py-1 rounded-lg border border-white/10">
                  {intakeSummary.note}
                </div>
              </div>
            </div>
            <div className="flex bg-bg-dark/50 p-1 rounded-2xl border border-white/5 self-start">
              {(['daily', 'weekly', 'monthly'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                    timeRange === range ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white/60'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[350px] w-full relative">
            {!chartHasData && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="rounded-2xl bg-bg-dark/80 border border-white/10 px-5 py-3 text-sm font-bold text-text-muted">
                  No logged meals for this range yet.
                </div>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorConsumed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6321" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF6321" stopOpacity={0} />
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
                  formatter={(value: unknown, name: unknown) => {
                    if (value === null || value === undefined) return ['No logged meals', 'Logged kcal'];
                    const label = name === 'target' ? 'Estimated target' : 'Logged kcal';
                    return [`${Math.round(Number(value)).toLocaleString()} kcal`, label];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="consumed"
                  stroke="#FF6321"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorConsumed)"
                  connectNulls={false}
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

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-brand-orange shrink-0" />
              <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Logged calorie intake</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white/20 shrink-0" />
              <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Estimated target ({safeDailyTarget} kcal)</span>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-surface-dark/50 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 border border-white/5 flex flex-col">
          <div className="flex justify-between items-center mb-6 sm:mb-10">
            <h3 className="text-xl sm:text-2xl font-black">Macros</h3>
            <Info size={20} className="text-text-muted" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center mb-6 sm:mb-10">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-white/5" />
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
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="text-brand-orange"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black">{goalHitPercentage}%</span>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Today Logged</span>
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

          {macroWarnings.length > 0 ? (
            <div className="space-y-3">
              {macroWarnings.map((warning, idx) => (
                <div key={idx} className="bg-brand-orange/10 border border-brand-orange/20 rounded-2xl p-4 flex gap-3">
                  <AlertTriangle size={18} className="text-brand-orange shrink-0" />
                  <p className="text-xs font-bold text-brand-orange leading-relaxed">{warning}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-text-muted leading-relaxed">
              Macro review updates after meals are logged today.
            </div>
          )}
        </div>
      </div>

      <section className="bg-surface-dark/50 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 border border-white/5">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6 sm:mb-10">
          <h3 className="text-xl sm:text-2xl font-black">Weight Progress</h3>
          <div className="flex items-center gap-2 text-text-muted text-xs font-bold uppercase tracking-widest">
            Target: {profile.targetWeight || '--'}kg
            <button className="p-1 hover:text-white transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-12 mb-8">
          <div>
            <div className="text-4xl sm:text-5xl font-black mb-2">{profile.weight || '--'} <span className="text-xl font-medium opacity-40">kg</span></div>
            <div className="flex items-center gap-2 text-text-muted text-sm font-bold">
              <TrendingUp size={16} />
              {weightProgress.changeLabel}
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
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-brand-orange to-[#FF8A50]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 pt-8 border-t border-white/5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Starting Weight</p>
            <p className="text-xl font-black">{profile.startingWeight || '--'} kg</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Target Weight</p>
            <p className="text-xl font-black">{profile.targetWeight || '--'} kg</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm font-medium text-text-muted">
            Currently <span className="text-white font-bold">{weightProgress.awayFromGoal}kg</span> away from your goal
          </p>
        </div>
      </section>

      <section className="mt-10 sm:mt-12 bg-surface-dark/50 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 border border-white/5">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
          <div>
            <p className="text-[10px] text-brand-orange uppercase tracking-widest font-black mb-2">Lịch sử</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Bữa ăn theo ngày</h2>
            <p className="text-text-muted text-sm mt-2">Chọn khoảng ngày để xem các bữa đã log.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="history-from" className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Từ ngày</label>
              <input
                id="history-from"
                type="date"
                value={historyFrom}
                max={historyTo || undefined}
                onChange={(e) => setHistoryFrom(e.target.value)}
                className="bg-bg-dark border border-white/10 rounded-2xl py-2.5 px-4 text-sm font-bold text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="history-to" className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Đến ngày</label>
              <input
                id="history-to"
                type="date"
                value={historyTo}
                min={historyFrom || undefined}
                onChange={(e) => setHistoryTo(e.target.value)}
                className="bg-bg-dark border border-white/10 rounded-2xl py-2.5 px-4 text-sm font-bold text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>
        </header>

        {historyGroups.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <p className="text-sm font-medium">Không có bữa ăn nào trong khoảng này.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {historyGroups.map(({ key, total, items }) => (
              <div key={key} className="bg-bg-dark/40 rounded-2xl border border-white/5 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                  <span className="text-sm font-bold">{formatDateLabelVi(key)}</span>
                  <span className="text-xs font-black text-brand-orange">{total.toLocaleString()} kcal</span>
                </div>
                <ul className="divide-y divide-white/5">
                  {items.map((m) => (
                    <li key={m.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span className="font-medium truncate pr-3">{m.name}</span>
                      <span className="text-text-muted font-bold shrink-0">{m.calories.toLocaleString()} kcal</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
