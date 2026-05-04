export type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  image: string;
  category: MealCategory;
  description: string;
  about: string;
}

export interface DietItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  date: string;
  image: string;
  description?: string;
  about?: string;
}

export type ScheduleSource = 'manual' | 'chat' | 'shared';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface ScheduleItem {
  itemId?: number;
  dayOffset?: number;
  mealType: MealType;
  name: string;
  serving?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  notes?: string | null;
  sortOrder?: number;
}

export interface MealSchedule {
  scheduleId: number;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  color: string;
  targetCalories?: number | null;
  source: ScheduleSource;
  isPublished: boolean;
  publishedAt?: string | null;
  achieved: boolean;
  planPayload?: unknown;
  createdAt?: string;
  updatedAt?: string;
  items: ScheduleItem[];
  authorName?: string;
}
