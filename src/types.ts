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
