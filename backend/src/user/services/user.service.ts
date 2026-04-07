export const getUserProfileService = () => {
  return {
    id: 1,
    name: 'Nguyen Tan Dat',
    email: 'tandat@example.com',
    role: 'user',
    age: 22,
    height: 175,
    weight: 70,
    goal: 'lose weight',
  };
};

export const getUserGoalsService = () => {
  return {
    dailyCalories: 2200,
    targetWeight: 65,
    currentWeight: 70,
    goal: 'lose weight',
    activityLevel: 'moderate',
  };
};

export const getUserMealsService = () => {
  return [
    {
      id: 1,
      mealName: 'Chicken Salad',
      calories: 350,
      mealTime: 'Lunch',
    },
    {
      id: 2,
      mealName: 'Oatmeal with Banana',
      calories: 280,
      mealTime: 'Breakfast',
    },
    {
      id: 3,
      mealName: 'Grilled Salmon',
      calories: 500,
      mealTime: 'Dinner',
    },
  ];
};

type AnalysisSource = 'upload' | 'camera';

interface AnalyzeFoodImagePayload {
  imageUrl: string;
  source: AnalysisSource;
}

interface FoodIngredient {
  name: string;
  amount: string;
  category: string;
  calories: number;
}

export interface FoodAnalysisResult {
  id: string;
  name: string;
  image: string;
  source: AnalysisSource;
  status: 'analyzed' | 'confirmed' | 'saved';
  detectedDish: string;
  detectedItems: string[];
  estimatedPortion: string;
  confidence: number;
  needsReview: boolean;
  totalKcal: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: FoodIngredient[];
  healthScore: number;
  sodium: 'LOW' | 'MEDIUM' | 'HIGH';
  dailyProgress: {
    current: number;
    target: number;
  };
  createdAt: string;
}

interface ConfirmFoodAnalysisPayload {
  name?: string;
  totalKcal?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  estimatedPortion?: string;
}

const createAnalysisId = () => `analysis_${Math.random().toString(36).slice(2, 10)}`;

const baseDate = new Date();
const analysisHistory: FoodAnalysisResult[] = [
  {
    id: createAnalysisId(),
    name: 'Tonkotsu Ramen',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=100&h=100&fit=crop',
    source: 'upload',
    status: 'saved',
    detectedDish: 'Japanese ramen bowl',
    detectedItems: ['ramen noodles', 'chashu pork', 'egg', 'broth'],
    estimatedPortion: '1 large bowl',
    confidence: 0.91,
    needsReview: false,
    totalKcal: 740,
    protein: 25,
    carbs: 85,
    fats: 32,
    ingredients: [
      { name: 'Ramen Noodles', amount: '180g', category: 'Complex Carb', calories: 290 },
      { name: 'Chashu Pork', amount: '120g', category: 'Protein', calories: 260 },
      { name: 'Soft Egg', amount: '1 piece', category: 'Protein', calories: 80 },
      { name: 'Broth', amount: '350ml', category: 'Soup Base', calories: 110 },
    ],
    healthScore: 6.5,
    sodium: 'HIGH',
    dailyProgress: { current: 1500, target: 2230 },
    createdAt: new Date(baseDate.getTime() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: createAnalysisId(),
    name: 'Avocado Salad',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=100&h=100&fit=crop',
    source: 'camera',
    status: 'saved',
    detectedDish: 'Fresh salad bowl',
    detectedItems: ['avocado', 'greens', 'tomato', 'olive oil'],
    estimatedPortion: '1 medium bowl',
    confidence: 0.95,
    needsReview: false,
    totalKcal: 320,
    protein: 8,
    carbs: 12,
    fats: 28,
    ingredients: [
      { name: 'Avocado', amount: '1/2 fruit', category: 'Healthy Fat', calories: 120 },
      { name: 'Mixed Greens', amount: '90g', category: 'Vegetable', calories: 25 },
      { name: 'Tomatoes', amount: '60g', category: 'Vegetable', calories: 20 },
      { name: 'Olive Oil', amount: '1 tbsp', category: 'Healthy Fat', calories: 155 },
    ],
    healthScore: 9.2,
    sodium: 'LOW',
    dailyProgress: { current: 1200, target: 2230 },
    createdAt: new Date(baseDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

const savedMealLog: FoodAnalysisResult[] = analysisHistory.filter(item => item.status === 'saved');

const scanTemplates = [
  {
    name: 'Chicken Hummus Bowl',
    detectedDish: 'Mediterranean grain bowl',
    detectedItems: ['grilled chicken', 'naan', 'bell peppers', 'hummus'],
    estimatedPortion: '1 serving bowl',
    totalKcal: 575,
    protein: 42,
    carbs: 68,
    fats: 14,
    ingredients: [
      { name: 'Grilled Chicken Strips', amount: '150g', category: 'Lean Protein', calories: 220 },
      { name: 'Whole Grain Naan', amount: '1 piece', category: 'Complex Carb', calories: 260 },
      { name: 'Bell Peppers', amount: '80g', category: 'Vegetable', calories: 45 },
      { name: 'Hummus', amount: '45g', category: 'Healthy Fat', calories: 50 },
    ],
    healthScore: 8.4,
    sodium: 'LOW' as const,
    confidence: 0.93,
  },
  {
    name: 'Fried Chicken Rice',
    detectedDish: 'Fried chicken with rice',
    detectedItems: ['fried chicken', 'white rice', 'pickled vegetables'],
    estimatedPortion: '1 large plate',
    totalKcal: 860,
    protein: 34,
    carbs: 92,
    fats: 38,
    ingredients: [
      { name: 'Fried Chicken', amount: '180g', category: 'Protein', calories: 420 },
      { name: 'White Rice', amount: '200g', category: 'Carb', calories: 260 },
      { name: 'Pickled Vegetables', amount: '40g', category: 'Vegetable', calories: 30 },
      { name: 'Sauce', amount: '35g', category: 'Sauce', calories: 150 },
    ],
    healthScore: 5.8,
    sodium: 'HIGH' as const,
    confidence: 0.62,
  },
];

const getRandomTemplate = () => {
  const index = Math.floor(Math.random() * scanTemplates.length);
  return scanTemplates[index];
};

const getCurrentProgress = () => {
  const totalSavedCalories = savedMealLog.reduce((sum, item) => sum + item.totalKcal, 0);
  return {
    current: 1200 + totalSavedCalories,
    target: 2230,
  };
};

export const analyzeFoodImageService = ({ imageUrl, source }: AnalyzeFoodImagePayload) => {
  const template = getRandomTemplate();
  const result: FoodAnalysisResult = {
    id: createAnalysisId(),
    name: template.name,
    image: imageUrl,
    source,
    status: 'analyzed',
    detectedDish: template.detectedDish,
    detectedItems: template.detectedItems,
    estimatedPortion: template.estimatedPortion,
    confidence: template.confidence,
    needsReview: template.confidence < 0.75,
    totalKcal: template.totalKcal,
    protein: template.protein,
    carbs: template.carbs,
    fats: template.fats,
    ingredients: template.ingredients,
    healthScore: template.healthScore,
    sodium: template.sodium,
    dailyProgress: getCurrentProgress(),
    createdAt: new Date().toISOString(),
  };

  analysisHistory.unshift(result);
  return result;
};

export const getFoodAnalysisHistoryService = () => {
  return analysisHistory;
};

export const getFoodAnalysisByIdService = (analysisId: string) => {
  return analysisHistory.find(item => item.id === analysisId) || null;
};

export const confirmFoodAnalysisService = (analysisId: string, payload: ConfirmFoodAnalysisPayload) => {
  const analysis = analysisHistory.find(item => item.id === analysisId);

  if (!analysis) {
    return null;
  }

  if (payload.name) analysis.name = payload.name;
  if (typeof payload.totalKcal === 'number') analysis.totalKcal = payload.totalKcal;
  if (typeof payload.protein === 'number') analysis.protein = payload.protein;
  if (typeof payload.carbs === 'number') analysis.carbs = payload.carbs;
  if (typeof payload.fats === 'number') analysis.fats = payload.fats;
  if (payload.estimatedPortion) analysis.estimatedPortion = payload.estimatedPortion;

  analysis.status = 'confirmed';
  analysis.needsReview = false;
  analysis.confidence = Math.max(analysis.confidence, 0.82);
  analysis.dailyProgress = getCurrentProgress();

  return analysis;
};

export const saveFoodAnalysisToMealLogService = (analysisId: string) => {
  const analysis = analysisHistory.find(item => item.id === analysisId);

  if (!analysis) {
    return null;
  }

  analysis.status = 'saved';
  analysis.dailyProgress = {
    current: getCurrentProgress().current + analysis.totalKcal,
    target: 2230,
  };

  const alreadySaved = savedMealLog.some(item => item.id === analysisId);
  if (!alreadySaved) {
    savedMealLog.unshift({ ...analysis });
  }

  return analysis;
};

export const reanalyzeFoodImageService = (analysisId: string) => {
  const analysis = analysisHistory.find(item => item.id === analysisId);

  if (!analysis) {
    return null;
  }

  analysis.confidence = 0.89;
  analysis.needsReview = false;
  analysis.estimatedPortion = '1 verified serving';
  analysis.totalKcal = Math.round(analysis.totalKcal * 0.96);
  analysis.protein = Math.max(analysis.protein, 28);
  analysis.carbs = Math.max(analysis.carbs - 4, 10);
  analysis.status = 'analyzed';

  return analysis;
};

export const deleteFoodAnalysisService = (analysisId: string) => {
  const historyIndex = analysisHistory.findIndex(item => item.id === analysisId);

  if (historyIndex === -1) {
    return false;
  }

  analysisHistory.splice(historyIndex, 1);

  const savedIndex = savedMealLog.findIndex(item => item.id === analysisId);
  if (savedIndex !== -1) {
    savedMealLog.splice(savedIndex, 1);
  }

  return true;
};
