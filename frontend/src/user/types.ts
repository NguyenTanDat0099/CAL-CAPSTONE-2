export type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Other';

export interface Meal {
  id: string;
  sourceFoodId?: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number | null;
  sugar?: number | null;
  image: string;
  category: MealCategory;
  displayCategory?: string;
  servingSize?: string | null;
  description: string;
  about: string;
}

export interface DietItem {
  id: string;
  foodId?: number;
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
  scheduledTime?: string | null;
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
