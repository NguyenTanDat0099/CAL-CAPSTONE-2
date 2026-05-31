import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { DietGoals } from './components/DietGoals';
import { MealPlans } from './components/MealPlans';
import { Homepage } from './components/Homepage';
import { Dashboard } from './components/Dashboard';
import { Chatbox } from './components/Chatbox';
import { FoodScan } from './components/FoodScan';
import { Settings } from './components/Settings';
import { ProfileSetup } from './components/ProfileSetup';
import { DietItem, MealSchedule, ScheduleItem } from './types';
import { AlertTriangle, ArrowRight, Bell, CheckCircle2, Menu, Moon, Sun, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { buildApiUrl } from '../config/api';

export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type Gender = 'male' | 'female';

export interface WeightHistoryEntry {
  id: number;
  weight: number;
  recordedAt: string;
  source: string;
  note?: string | null;
}

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
  targetDate: string;
  startingWeight: number;
  weightHistory: WeightHistoryEntry[];
  hasCompletedSetup: boolean;
}

interface UserAppProps {
  onLogout: () => void;
}

export interface BellNotification {
  id: number;
  type: 'meal_reminder' | 'daily_summary' | 'goal_achievement' | 'system';
  title: string;
  message: string;
  data: unknown;
  isRead: boolean;
  sentAt: string;
}

const isWeightCheckinNotification = (value: unknown): boolean => (
  Boolean(value && typeof value === 'object' && (value as { action?: unknown }).action === 'weight_checkin')
);

type AddToDietOptions = {
  alreadyPersisted?: boolean;
  mealType?: string;
  // Portion multiplier — defaults to 1. Backend stores this in
  // mealitems.quantity and totals are computed as f.calories * mi.quantity.
  quantity?: number;
};

type DietToastKind = 'success' | 'error';

interface DietToast {
  id: string;
  kind: DietToastKind;
  title: string;
  message: string;
  itemName?: string;
  calories?: number;
  count: number;
}

const AUTH_TOKEN_KEY = 'calai_token';
const AVATAR_STORAGE_KEY = 'calai_profile_avatar';
const THEME_STORAGE_KEY = 'calai_theme';

type Theme = 'dark' | 'light';

const getStoredTheme = (): Theme => {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' ? 'light' : 'dark';
  } catch { return 'dark'; }
};
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop';
const DIET_TOAST_LIMIT = 3;
const DIET_TOAST_DURATION = 3200;
const MEAL_HISTORY_LIMIT = 400;
const MAX_CARRY_OVER_DEBT = 300;

const getMinimumDailyTarget = (gender: Gender) => (gender === 'female' ? 1200 : 1500);

const formatNotificationTime = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ trước`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return d.toLocaleDateString('vi-VN');
};

const getAuthHeaders = (includeJson = false) => {
  let token = '';
  try { token = sessionStorage.getItem(AUTH_TOKEN_KEY) || ''; } catch {}
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const getStoredAvatar = (): string => {
  try { return localStorage.getItem(AVATAR_STORAGE_KEY) || DEFAULT_AVATAR; } catch { return DEFAULT_AVATAR; }
};

const setStoredAvatar = (avatar: string) => {
  try { localStorage.setItem(AVATAR_STORAGE_KEY, avatar); } catch {}
};

const createDefaultProfile = (): UserProfile => ({
  name: '',
  avatar: getStoredAvatar(),
  goal: 'lose',
  activityLevel: 'moderate',
  gender: 'male',
  age: 0,
  height: 0,
  weight: 0,
  targetWeight: 0,
  targetDate: '',
  startingWeight: 0,
  weightHistory: [],
  hasCompletedSetup: false,
});

const getMealImage = (mealTime?: string) => {
  const normalized = (mealTime || '').toLowerCase();
  if (normalized === 'breakfast') {
    return 'https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=800&h=600&fit=crop';
  }
  if (normalized === 'lunch') {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop';
  }
  if (normalized === 'snack') {
    return 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&h=600&fit=crop';
  }
  return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop';
};

const normalizeMealType = (value?: string) => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'breakfast' || normalized === 'lunch' || normalized === 'dinner' || normalized === 'snack') {
    return normalized;
  }
  return 'dinner';
};

export default function App({ onLogout }: UserAppProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());
  const [myDiets, setMyDiets] = useState<DietItem[]>([]);
  const [schedules, setSchedules] = useState<MealSchedule[]>([]);
  const [profile, setProfileState] = useState<UserProfile>(createDefaultProfile);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [notifications, setNotifications] = useState<BellNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadNotificationCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications]
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [chatSummaries, setChatSummaries] = useState<{ id: string; title: string; lastMessage: string; timestamp: string }[]>([]);
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);
  const [activeSidebarChatId, setActiveSidebarChatId] = useState<string | null>(null);
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState<string | null>(null);
  const [pendingNewChat, setPendingNewChat] = useState(0);
  const [dietToasts, setDietToasts] = useState<DietToast[]>([]);
  const profileSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dietToastsRef = useRef<DietToast[]>([]);
  const dietToastTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Calculate Base Daily Target (without carry-over)
  const baseTarget = useMemo(() => {
    if (profile.age <= 0 || profile.height <= 0 || profile.weight <= 0) return 0;

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
    const targetDate = profile.targetDate ? new Date(`${profile.targetDate}T00:00:00`) : null;
    const daysToTarget = targetDate && !Number.isNaN(targetDate.getTime())
      ? Math.ceil((targetDate.getTime() - Date.now()) / 86_400_000)
      : 0;
    const weightDelta = profile.targetWeight > 0 ? profile.targetWeight - profile.weight : 0;
    const timelineAdjustment = daysToTarget > 0 && Math.abs(weightDelta) > 0.05
      ? Math.round((weightDelta * 7700) / daysToTarget)
      : 0;
    const boundedTimelineAdjustment = profile.goal === 'lose'
      ? Math.max(-1000, Math.min(-250, timelineAdjustment))
      : profile.goal === 'gain'
        ? Math.min(500, Math.max(150, timelineAdjustment))
        : 0;

    const estimatedTarget = boundedTimelineAdjustment !== 0
      ? tdee + boundedTimelineAdjustment
      : profile.goal === 'lose'
        ? tdee - 500
        : profile.goal === 'gain'
          ? tdee + 300
          : tdee;

    return Math.max(getMinimumDailyTarget(profile.gender), Math.round(estimatedTarget));
  }, [profile]);

  // Calculate Calorie Carry-over (Debt from previous days)
  const carryOver = useMemo(() => {
    if (baseTarget <= 0) return 0;

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
    return Math.max(-MAX_CARRY_OVER_DEBT, Math.min(0, totalBalance));
  }, [myDiets, baseTarget]);

  // Final Adjusted Daily Target
  const dailyTarget = baseTarget > 0
    ? Math.max(getMinimumDailyTarget(profile.gender), baseTarget + carryOver)
    : 0;

  const handleProfileChange: React.Dispatch<React.SetStateAction<UserProfile>> = (updater) => {
    setProfileState(prev => (typeof updater === 'function' ? updater(prev) : updater));
  };

  const mapMealToDietItem = (meal: {
    id: number | string;
    mealName: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    mealTime?: string;
    imagePath?: string | null;
    createdAt: string;
  }): DietItem => ({
    id: String(meal.id),
    name: meal.mealName,
    calories: meal.calories,
    protein: meal.protein ?? 0,
    carbs: meal.carbs ?? 0,
    fats: meal.fats ?? 0,
    date: meal.createdAt,
    // Prefer the real food image stored in the DB; fall back to a meal-time
    // placeholder only when the food row has no image.
    image: meal.imagePath?.trim() || getMealImage(meal.mealTime),
    description: `${meal.mealTime || 'Meal'} entry saved from your nutrition log.`,
    about: 'This meal is loaded from your backend meal history and contributes to your diet tracking progress.',
  });

  const syncDietToasts = (nextToasts: DietToast[]) => {
    dietToastsRef.current = nextToasts;
    setDietToasts(nextToasts);
  };

  const clearDietToastTimer = (id: string) => {
    const timer = dietToastTimersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete dietToastTimersRef.current[id];
    }
  };

  const dismissDietToast = (id: string) => {
    clearDietToastTimer(id);
    syncDietToasts(dietToastsRef.current.filter(toast => toast.id !== id));
  };

  const scheduleDietToastDismiss = (id: string) => {
    clearDietToastTimer(id);
    dietToastTimersRef.current[id] = setTimeout(() => {
      syncDietToasts(dietToastsRef.current.filter(toast => toast.id !== id));
      delete dietToastTimersRef.current[id];
    }, DIET_TOAST_DURATION);
  };

  const showDietToast = (toast: Omit<DietToast, 'id' | 'count'>) => {
    const existing = toast.kind === 'success' && toast.itemName
      ? dietToastsRef.current.find(item => item.kind === 'success' && item.itemName === toast.itemName)
      : undefined;

    const nextToast: DietToast = existing
      ? { ...existing, ...toast, count: existing.count + 1 }
      : { ...toast, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, count: 1 };

    const withoutCurrent = dietToastsRef.current.filter(item => item.id !== nextToast.id);
    const nextToasts = [nextToast, ...withoutCurrent].slice(0, DIET_TOAST_LIMIT);
    dietToastsRef.current
      .filter(item => !nextToasts.some(next => next.id === item.id))
      .forEach(item => clearDietToastTimer(item.id));

    syncDietToasts(nextToasts);
    scheduleDietToastDismiss(nextToast.id);
  };

  const loadMeals = async () => {
    const response = await fetch(buildApiUrl(`/users/meals/history?limit=${MEAL_HISTORY_LIMIT}`), {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to load meal history');
    }

    setMyDiets((result.data ?? []).map(mapMealToDietItem));
  };

  const loadSchedules = async () => {
    const response = await fetch(buildApiUrl('/users/schedules'), {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to load schedules');
    }
    setSchedules((result.data ?? []) as MealSchedule[]);
  };

  const createScheduleFromPlan = async (payload: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    color?: string;
    targetCalories?: number;
    source: 'manual' | 'chat';
    planPayload?: unknown;
    items?: ScheduleItem[];
  }) => {
    const response = await fetch(buildApiUrl('/users/schedules'), {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create schedule');
    }
    setSchedules(prev => {
      const next = [...prev, result.data as MealSchedule];
      return next.sort((a, b) => a.startDate.localeCompare(b.startDate));
    });
    return result.data as MealSchedule;
  };

  const updateScheduleHandler = async (
    scheduleId: number,
    patch: Partial<Pick<MealSchedule, 'name' | 'description' | 'startDate' | 'endDate' | 'color' | 'targetCalories' | 'achieved'>> & { items?: ScheduleItem[] }
  ) => {
    const response = await fetch(buildApiUrl(`/users/schedules/${scheduleId}`), {
      method: 'PATCH',
      headers: getAuthHeaders(true),
      body: JSON.stringify(patch),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update schedule');
    }
    setSchedules(prev => prev.map(s => s.scheduleId === scheduleId ? result.data as MealSchedule : s));
  };

  const deleteScheduleHandler = async (scheduleId: number) => {
    const response = await fetch(buildApiUrl(`/users/schedules/${scheduleId}`), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || 'Failed to delete schedule');
    }
    setSchedules(prev => prev.filter(s => s.scheduleId !== scheduleId));
  };

  useEffect(() => {
    const bootstrapUserData = async () => {
      try {
        const [profileResponse, goalsResponse, mealsResponse] = await Promise.all([
          fetch(buildApiUrl('/users/profile'), { headers: getAuthHeaders() }),
          fetch(buildApiUrl('/users/goals'), { headers: getAuthHeaders() }),
          fetch(buildApiUrl(`/users/meals/history?limit=${MEAL_HISTORY_LIMIT}`), { headers: getAuthHeaders() }),
        ]);

        const [profileResult, goalsResult, mealsResult] = await Promise.all([
          profileResponse.json(),
          goalsResponse.json(),
          mealsResponse.json(),
        ]);

        if (!profileResponse.ok) {
          throw new Error(profileResult.message || 'Failed to load profile');
        }
        if (!goalsResponse.ok) {
          throw new Error(goalsResult.message || 'Failed to load goals');
        }
        if (!mealsResponse.ok) {
          throw new Error(mealsResult.message || 'Failed to load meals');
        }

        const avatar = getStoredAvatar();
        const weightHistory = Array.isArray(profileResult.data?.weightHistory)
          ? profileResult.data.weightHistory as WeightHistoryEntry[]
          : [];
        const currentWeight = Number(profileResult.data?.weight || goalsResult.data?.currentWeight || 0);

        setProfileState({
          name: profileResult.data?.name || '',
          avatar,
          goal: (goalsResult.data?.goal && ['lose', 'maintain', 'gain'].includes(goalsResult.data.goal))
            ? goalsResult.data.goal
            : 'lose',
          activityLevel: goalsResult.data?.activityLevel || 'moderate',
          gender: profileResult.data?.gender || 'male',
          age: profileResult.data?.age || 0,
          height: Number(profileResult.data?.height || 0),
          weight: currentWeight,
          targetWeight: Number(goalsResult.data?.targetWeight || 0),
          targetDate: typeof goalsResult.data?.targetDate === 'string' ? goalsResult.data.targetDate.slice(0, 10) : '',
          startingWeight: Number(profileResult.data?.startingWeight || weightHistory[0]?.weight || currentWeight),
          weightHistory,
          hasCompletedSetup: Boolean(profileResult.data?.hasCompletedSetup),
        });

        setMyDiets((mealsResult.data ?? []).map(mapMealToDietItem));
        loadSchedules().catch(err => console.error('schedules load failed:', err));
      } catch (error) {
        console.error(error);
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrapUserData();
  }, []);

  useEffect(() => {
    setStoredAvatar(profile.avatar);
  }, [profile.avatar]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {}
  }, [theme]);

  useEffect(() => {
    return () => {
      Object.values(dietToastTimersRef.current).forEach(timer => clearTimeout(timer));
      dietToastTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!profile.hasCompletedSetup) return;
    if (profile.age <= 0 || profile.height <= 0 || profile.weight <= 0) return;

    if (profileSyncTimeoutRef.current) {
      clearTimeout(profileSyncTimeoutRef.current);
    }

    profileSyncTimeoutRef.current = setTimeout(async () => {
      try {
        await Promise.all([
          fetch(buildApiUrl('/users/profile'), {
            method: 'PATCH',
            headers: getAuthHeaders(true),
            body: JSON.stringify({
              name: profile.name,
              gender: profile.gender,
              age: profile.age,
              height: profile.height,
              weight: profile.weight,
            }),
          }),
          fetch(buildApiUrl('/users/goals'), {
            method: 'PATCH',
            headers: getAuthHeaders(true),
            body: JSON.stringify({
              dailyCalories: baseTarget,
              targetWeight: profile.targetWeight,
              targetDate: profile.targetDate || null,
              goal: profile.goal,
              activityLevel: profile.activityLevel,
            }),
          }),
        ]);

        setProfileState(prev => prev.hasCompletedSetup ? prev : { ...prev, hasCompletedSetup: true });
      } catch (error) {
        console.error(error);
      }
    }, 400);

    return () => {
      if (profileSyncTimeoutRef.current) {
        clearTimeout(profileSyncTimeoutRef.current);
      }
    };
  }, [profile, baseTarget, isBootstrapping, profile.hasCompletedSetup]);

  // Poll backend notifications every 30s. Backend cron jobs (meal_reminder,
  // daily_summary, goal_achievement) write to the notifications table with a
  // unique dedupe_key, so we just render whatever the server hands back. New
  // unread items also trigger an OS-level browser notification on first sight.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch { /* ignore */ }

    const seenIds = new Set<number>();

    const fetchNotifications = async () => {
      try {
        const res = await fetch(buildApiUrl('/users/notifications?limit=50'), {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        const items: BellNotification[] = Array.isArray(data?.notifications)
          ? data.notifications
          : [];

        // Fire OS notification + in-app toast for items we haven't seen yet.
        for (const n of items) {
          if (seenIds.has(n.id)) continue;
          seenIds.add(n.id);
          if (n.isRead) continue; // already read — don't re-notify
          try {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(n.title, { body: n.message, tag: `notif-${n.id}` });
            }
          } catch { /* ignore */ }
          showDietToast({ kind: 'success', title: n.title, message: n.message });
        }

        setNotifications(items);
      } catch { /* network error, ignore — next tick will retry */ }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleAddToMyDiet = async (item: Omit<DietItem, 'id' | 'date'>, options?: AddToDietOptions) => {
    try {
      if (options?.alreadyPersisted) {
        await loadMeals();
        showDietToast({
          kind: 'success',
          title: 'Added to Diet Goals',
          itemName: item.name,
          calories: item.calories,
          message: `${Math.round(item.calories).toLocaleString()} kcal | Saved in your diet log`,
        });
        return;
      }

      const response = await fetch(buildApiUrl('/users/meals'), {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          foodId: item.foodId,
          foodName: item.name,
          calories: item.calories,
          mealType: normalizeMealType(options?.mealType),
          protein: item.protein,
          carbs: item.carbs,
          fats: item.fats,
          quantity: options?.quantity,
        }),
      });
      const result = await response.json().catch(() => ({ message: 'Failed to save meal' }));
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save meal');
      }

      const savedItem = mapMealToDietItem(result.data);
      setMyDiets(prev => [savedItem, ...prev]);
      showDietToast({
        kind: 'success',
        title: 'Added to Diet Goals',
        itemName: savedItem.name,
        calories: savedItem.calories,
        message: `${savedItem.calories.toLocaleString()} kcal | P ${savedItem.protein}g | C ${savedItem.carbs}g | F ${savedItem.fats}g`,
      });
    } catch (error) {
      console.error(error);
      showDietToast({
        kind: 'error',
        title: 'Could not add meal',
        message: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const handleRemoveFromMyDiet = async (id: string) => {
    try {
      const response = await fetch(buildApiUrl(`/users/meals/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to delete meal');
      }
      setMyDiets(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  // Optimistic UI: drop the row locally first, then hard-delete on the
  // backend. We must DELETE (not mark-read) because the poll fetches read +
  // unread items, so a mark-read row would reappear on the next tick.
  const removeNotification = async (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await fetch(buildApiUrl(`/users/notifications/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch { /* ignore — next poll will reconcile */ }
  };

  const markAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await fetch(buildApiUrl('/users/notifications/mark-all-read'), {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch { /* ignore */ }
  };

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen bg-bg-dark items-center justify-center text-white">
        <div className="text-sm font-bold uppercase tracking-widest text-text-muted">Loading profile...</div>
      </div>
    );
  }

  if (!profile.hasCompletedSetup) {
    return (
      <ProfileSetup
        profile={profile}
        setProfile={handleProfileChange}
        onLogout={onLogout}
      />
    );
  }

  const handleSelectChat = (chatId: string) => {
    setPendingChatId(chatId);
    setActiveTab('chat');
  };

  const handleDeleteChat = (chatId: string) => {
    setPendingDeleteChatId(chatId);
  };

  const handleNewChat = () => {
    setActiveTab('chat');
    setPendingNewChat(prev => prev + 1);
  };

  return (
    <div className="flex min-h-screen bg-bg-dark">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={onLogout}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        chatSummaries={chatSummaries}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onNewChat={handleNewChat}
        activeChatId={activeSidebarChatId}
      />

      {/* Mobile hamburger — only shown when sidebar is collapsed (< lg). */}
      <button
        onClick={() => setMobileNavOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-11 h-11 rounded-2xl bg-surface-dark border border-white/10 flex items-center justify-center text-white shadow-lg"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Global Header with Avatar & Notifications */}
      <div className="fixed top-0 right-0 p-4 sm:p-6 lg:p-8 z-40 flex items-center gap-3 sm:gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
          className="w-12 h-12 rounded-2xl bg-surface-dark border border-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors relative overflow-hidden"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="wait" initial={false}>
            {theme === 'dark' ? (
              <motion.span
                key="moon"
                initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.28 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Moon size={20} />
              </motion.span>
            ) : (
              <motion.span
                key="sun"
                initial={{ rotate: 90, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -90, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.28 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Sun size={20} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-12 h-12 rounded-2xl bg-surface-dark border border-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors relative"
          >
            <Bell size={20} />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-orange text-bg-dark text-[10px] font-black rounded-full flex items-center justify-center border-2 border-bg-dark">
                {unreadNotificationCount}
              </span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-16 right-0 w-80 max-w-[calc(100vw-2rem)] bg-surface-dark border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-white/5 flex justify-between items-center gap-3">
                  <h3 className="font-black text-sm uppercase tracking-widest">Thông báo</h3>
                  <div className="flex items-center gap-2">
                    {unreadNotificationCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[10px] font-bold uppercase tracking-widest text-brand-orange hover:text-brand-orange/80"
                      >
                        Đã đọc hết
                      </button>
                    )}
                    <button onClick={() => setShowNotifications(false)} className="text-text-muted hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center text-text-muted">
                      <Bell size={32} className="mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-medium">Chưa có thông báo</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (isWeightCheckinNotification(n.data)) {
                            setActiveTab('settings');
                            setShowNotifications(false);
                          }
                        }}
                        className={`p-6 border-b border-white/5 hover:bg-white/5 transition-colors relative group ${isWeightCheckinNotification(n.data) ? 'cursor-pointer' : ''} ${n.isRead ? 'opacity-60' : ''}`}
                      >
                        {!n.isRead && (
                          <span className="absolute top-7 left-2 w-1.5 h-1.5 rounded-full bg-brand-orange" aria-hidden />
                        )}
                        <p className="text-sm font-bold pr-6">{n.title}</p>
                        <p className="text-xs text-text-muted mt-1 pr-6">{n.message}</p>
                        <p className="text-[10px] text-text-muted mt-2 font-bold uppercase tracking-widest">
                          {formatNotificationTime(n.sentAt)}
                        </p>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            removeNotification(n.id);
                          }}
                          className="absolute top-6 right-6 text-text-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Đánh dấu đã đọc"
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

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('settings')}
          className="w-12 h-12 rounded-2xl border border-white/10 overflow-hidden shadow-lg shadow-brand-orange/5 hover:border-brand-orange/50 transition-colors"
          title="Open settings"
          aria-label="Open settings"
        >
          <img
            src={profile.avatar}
            alt={profile.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </motion.button>
      </div>

      <div className="fixed bottom-6 right-6 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col-reverse gap-3 pointer-events-none">
        <AnimatePresence initial={false}>
          {dietToasts.map(toast => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 42, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 42, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }}
              className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl ${
                toast.kind === 'success'
                  ? 'bg-[#101714]/95 border-emerald-400/25 shadow-emerald-950/30'
                  : 'bg-[#1d1111]/95 border-red-400/25 shadow-red-950/30'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    toast.kind === 'success'
                      ? 'bg-emerald-400/10 border-emerald-400/25 text-emerald-300'
                      : 'bg-red-400/10 border-red-400/25 text-red-300'
                  }`}>
                    {toast.kind === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-black text-white">{toast.title}</p>
                      {toast.count > 1 && (
                        <span className="shrink-0 rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-black text-bg-dark">
                          x{toast.count}
                        </span>
                      )}
                    </div>
                    {toast.itemName && (
                      <p className="mt-1 truncate text-sm font-bold text-white/85">{toast.itemName}</p>
                    )}
                    <p className="mt-1 truncate text-xs font-medium text-text-muted">{toast.message}</p>
                  </div>

                  <button
                    onClick={() => dismissDietToast(toast.id)}
                    className="shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-white/10 hover:text-white transition-colors"
                    aria-label="Dismiss notification"
                  >
                    <X size={14} />
                  </button>
                </div>

                {toast.kind === 'success' && (
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300/80">
                      Diet log updated
                    </span>
                    <button
                      onClick={() => {
                        setActiveTab('goals');
                        dismissDietToast(toast.id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-brand-orange hover:text-bg-dark transition-colors"
                    >
                      View <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
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
        {activeTab === 'goals' && (
          <DietGoals
            myDiets={myDiets}
            onAddToMyDiet={handleAddToMyDiet}
            onRemoveFromMyDiet={handleRemoveFromMyDiet}
            profile={profile}
            setProfile={handleProfileChange}
            dailyTarget={dailyTarget}
            baseTarget={baseTarget}
            carryOver={carryOver}
            schedules={schedules}
            onUpdateSchedule={updateScheduleHandler}
            onDeleteSchedule={deleteScheduleHandler}
            onCreateSchedule={createScheduleFromPlan}
          />
        )}
        {activeTab === 'scan' && (
          <FoodScan
            onSavedToDiet={() => {
              loadMeals().catch(err => console.error('meals reload failed:', err));
              showDietToast({
                kind: 'success',
                title: 'Added to Diet Goals',
                message: 'Your scanned meal was saved to today\'s diet log.',
              });
            }}
          />
        )}
        {activeTab === 'meals' && <MealPlans onAddToMyDiet={handleAddToMyDiet} />}
        {activeTab === 'chat' && (
          <Chatbox
            onSavePlanToSchedule={createScheduleFromPlan}
            pendingChatId={pendingChatId}
            onPendingChatResolved={() => setPendingChatId(null)}
            onConversationsChange={setChatSummaries}
            onActiveChatChange={setActiveSidebarChatId}
            pendingDeleteChatId={pendingDeleteChatId}
            onPendingDeleteChatResolved={() => setPendingDeleteChatId(null)}
            pendingNewChat={pendingNewChat}
          />
        )}
        {activeTab === 'settings' && (
          <Settings 
            profile={profile}
            setProfile={handleProfileChange}
          />
        )}
        {activeTab !== 'home' && activeTab !== 'goals' && activeTab !== 'meals' && activeTab !== 'dashboard' && activeTab !== 'chat' && activeTab !== 'settings' && activeTab !== 'scan' && (
          <div className="flex-1 lg:ml-64 px-4 pt-20 pb-10 sm:px-6 sm:pt-24 lg:p-10 flex items-center justify-center text-text-muted">
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
