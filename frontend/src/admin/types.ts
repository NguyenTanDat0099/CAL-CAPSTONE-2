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
  mealsLoggedToday: number;
  totalAnalyses: number;
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
  totalAnalyses: number;
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
