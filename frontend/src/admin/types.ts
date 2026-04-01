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

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar: string;
  status: 'active' | 'inactive';
  lastLogin: string;
}

export interface AdminProfile {
  name: string;
  avatar: string;
  role: string;
}
