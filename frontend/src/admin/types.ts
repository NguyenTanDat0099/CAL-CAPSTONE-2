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

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'premium';
  avatar: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  gender?: 'male' | 'female';
  age?: number;
  height?: number;
  weight?: number;
  targetWeight?: number;
  goal?: 'lose' | 'maintain' | 'gain';
}

export interface AdminProfile {
  name: string;
  avatar: string;
  role: string;
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
