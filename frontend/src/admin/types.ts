export interface User {
  id: number;
  accountId: number | null;
  name: string;
  email: string;
  role: string;
  status: string;
  gender: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  hasCompletedSetup: boolean;
  createdAt: string | null;
  // Profile Setup fields
  goal?: string | null;
  activityLevel?: string | null;
  targetWeight?: number | null;
  targetCalories?: number | null;
}

export interface AdminProfile {
  id: number;
  email: string;
  role: string;
  status: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersToday: number;
  totalMealsLogged: number;
  mealsLoggedToday: number;
  totalChats: number;
  systemStatus: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedUsers {
  data: User[];
  pagination: PaginationInfo;
}

export interface UserStatistics {
  totalMeals: number;
  todayCalories: number;
  totalChats: number;
}

export interface CreateUserPayload {
  email: string;
  fullName: string;
  gender?: 'male' | 'female' | 'other';
  age?: number;
  height?: number;
  weight?: number;
}

export interface UpdateUserPayload {
  fullName?: string;
  gender?: 'male' | 'female' | 'other';
  age?: number;
  height?: number;
  weight?: number;
}

export interface FoodItem {
  id: number;
  name: string;
  category: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  servingSize: string | null;
  imagePath: string | null;
  createdAt: string | null;
}

export interface PaginatedFoods {
  data: FoodItem[];
  pagination: PaginationInfo;
}

export interface FoodCategory {
  id: number;
  name: string;
}

export interface FoodPayload {
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize?: string;
  imagePath?: string;
}

export interface AdminAnalytics {
  overview: {
    totalMeals: number;
    totalFoods: number;
    totalUsers: number;
    averageCalories: number;
    setupCompletionRate: number;
  };
  macroAverages: Array<{
    name: string;
    average: number;
    target: number;
  }>;
  mealTrend: Array<{
    date: string;
    label: string;
    meals: number;
  }>;
  topFoods: Array<{
    id: number;
    name: string;
    calories: number;
    count: number;
  }>;
  foodsByCategory: Array<{
    name: string;
    value: number;
  }>;
}

export interface SecurityOverview {
  adminAccounts: number;
  activeAccounts: number;
  suspendedAccounts: number;
  unverifiedAccounts: number;
  auditEvents: number;
}

export interface RoleAccount {
  accountId: number;
  userId: number | null;
  name: string;
  email: string;
  role: 'admin' | 'user' | string;
  status: string;
  emailVerified: boolean;
}

export interface AuditLog {
  id: number;
  adminAccountId: number | null;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: number | null;
  detail: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  sugar?: number;
  image: string;
  category: MealCategory;
  description: string;
  about: string;
}

export interface ScanResult {
  id: string;
  userName: string;
  foodName: string;
  confidence: number;
  timestamp: string;
  imageUrl: string;
  status: 'verified' | 'unverified' | 'flagged';
}
