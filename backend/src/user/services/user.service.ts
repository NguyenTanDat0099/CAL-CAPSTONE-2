import pool from '../../shared/database/db';

type AnalysisSource = 'upload' | 'camera';

interface AnalyzeFoodImagePayload {
  imageUrl: string;
  source: AnalysisSource;
}

interface ConfirmFoodAnalysisPayload {
  name?: string;
  totalKcal?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  estimatedPortion?: string;
}

interface UpsertUserProfilePayload {
  name?: string;
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
}

interface UpdateUserGoalsPayload {
  dailyCalories?: number;
  targetWeight?: number;
}

interface CreateMealPayload {
  foodName: string;
  calories: number;
  mealType: string;
  quantity?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

interface UpdateMealPayload {
  foodName?: string;
  calories?: number;
  mealType?: string;
  quantity?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

interface FoodIngredient {
  name: string;
  amount: string;
  category: string;
  calories: number;
}

export interface FoodAnalysisResult {
  id: string;
  imageId: number;
  resultId: number;
  foodId: number;
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

interface UserRow {
  user_id: number;
  full_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  height: number | null;
  weight: number | null;
  created_at: string | null;
}

interface GoalRow {
  goal_id: number;
  user_id: number;
  target_calories: number | null;
  target_weight: number | null;
  start_date: string | null;
  end_date: string | null;
}

interface FoodTemplate {
  name: string;
  source: AnalysisSource;
  categoryName: string;
  estimatedPortion: string;
  confidence: number;
  totalKcal: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: FoodIngredient[];
  healthScore: number;
  sodium: 'LOW' | 'MEDIUM' | 'HIGH';
}

const DEMO_USER = {
  fullName: 'Nguyen Tan Dat',
  gender: 'male',
  dateOfBirth: '2003-09-09',
  height: 175,
  weight: 70,
};

const FOOD_TEMPLATES: FoodTemplate[] = [
  {
    name: 'Chicken Hummus Bowl',
    source: 'upload',
    categoryName: 'Balanced Bowl',
    estimatedPortion: '1 serving bowl',
    confidence: 0.93,
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
    sodium: 'LOW',
  },
  {
    name: 'Fried Chicken Rice',
    source: 'camera',
    categoryName: 'Comfort Meal',
    estimatedPortion: '1 large plate',
    confidence: 0.62,
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
    sodium: 'HIGH',
  },
];

const SEED_FOODS = [
  { name: 'Chicken Salad', category: 'Healthy Meal', calories: 350, protein: 30, carbs: 18, fats: 14 },
  { name: 'Oatmeal with Banana', category: 'Breakfast', calories: 280, protein: 8, carbs: 52, fats: 4 },
  { name: 'Grilled Salmon', category: 'Dinner', calories: 500, protein: 38, carbs: 12, fats: 28 },
  { name: 'Greek Yogurt Bowl', category: 'Snack', calories: 220, protein: 16, carbs: 24, fats: 6 },
];

const getRandomTemplate = () => {
  const index = Math.floor(Math.random() * FOOD_TEMPLATES.length);
  return FOOD_TEMPLATES[index];
};

const ageToBirthDate = (age: number) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  return date.toISOString().slice(0, 10);
};

const getAge = (birthDate: string | null) => {
  if (!birthDate) return 22;
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
};

const getDemoAvatar = () =>
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop';

const computeHealthScore = (calories: number, protein: number, sodium: 'LOW' | 'MEDIUM' | 'HIGH') => {
  let score = 8;
  if (calories > 800) score -= 1.5;
  if (protein >= 30) score += 0.8;
  if (sodium === 'HIGH') score -= 1.2;
  if (sodium === 'LOW') score += 0.5;
  return Math.max(4.5, Math.min(9.5, Number(score.toFixed(1))));
};

const getSodiumLevel = (calories: number) => {
  if (calories >= 750) return 'HIGH' as const;
  if (calories >= 500) return 'MEDIUM' as const;
  return 'LOW' as const;
};

const ensureDemoUser = async (): Promise<UserRow> => {
  const [users] = await pool.query(
    'SELECT user_id, full_name, gender, date_of_birth, height, weight, created_at FROM users ORDER BY user_id LIMIT 1'
  );
  const userRows = users as UserRow[];

  if (userRows.length > 0) {
    return userRows[0];
  }

  const [insertResult] = await pool.query(
    `
      INSERT INTO users (account_id, full_name, gender, date_of_birth, height, weight)
      VALUES (NULL, ?, ?, ?, ?, ?)
    `,
    [DEMO_USER.fullName, DEMO_USER.gender, DEMO_USER.dateOfBirth, DEMO_USER.height, DEMO_USER.weight]
  );

  const userId = (insertResult as { insertId: number }).insertId;

  const [createdUsers] = await pool.query(
    'SELECT user_id, full_name, gender, date_of_birth, height, weight, created_at FROM users WHERE user_id = ?',
    [userId]
  );

  return (createdUsers as UserRow[])[0];
};

const ensureUserGoal = async (userId: number): Promise<GoalRow> => {
  const [goals] = await pool.query(
    `
      SELECT goal_id, user_id, target_calories, target_weight, start_date, end_date
      FROM usergoals
      WHERE user_id = ?
      ORDER BY goal_id DESC
      LIMIT 1
    `,
    [userId]
  );

  const goalRows = goals as GoalRow[];
  if (goalRows.length > 0) {
    return goalRows[0];
  }

  const [insertResult] = await pool.query(
    `
      INSERT INTO usergoals (user_id, target_calories, target_weight, start_date, end_date)
      VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 90 DAY))
    `,
    [userId, 2200, 65]
  );

  const goalId = (insertResult as { insertId: number }).insertId;
  const [createdGoals] = await pool.query(
    `
      SELECT goal_id, user_id, target_calories, target_weight, start_date, end_date
      FROM usergoals
      WHERE goal_id = ?
    `,
    [goalId]
  );

  return (createdGoals as GoalRow[])[0];
};

const ensureFoodCategory = async (categoryName: string) => {
  const [categories] = await pool.query(
    'SELECT category_id FROM foodcategories WHERE category_name = ? LIMIT 1',
    [categoryName]
  );
  const rows = categories as Array<{ category_id: number }>;
  if (rows.length > 0) {
    return rows[0].category_id;
  }

  const [insertResult] = await pool.query(
    'INSERT INTO foodcategories (category_name) VALUES (?)',
    [categoryName]
  );

  return (insertResult as { insertId: number }).insertId;
};

const ensureSeedFoods = async () => {
  const [rows] = await pool.query('SELECT COUNT(*) as total FROM foods');
  const total = Number((rows as Array<{ total: number }>)[0]?.total ?? 0);

  if (total > 0) {
    return;
  }

  for (const food of SEED_FOODS) {
    const categoryId = await ensureFoodCategory(food.category);
    await pool.query(
      `
        INSERT INTO foods (food_name, category_id, calories, protein, carbs, fat, fiber, sugar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        food.name,
        categoryId,
        food.calories,
        food.protein,
        food.carbs,
        food.fats,
        Math.max(3, Math.round(food.carbs * 0.1)),
        Math.max(2, Math.round(food.carbs * 0.08)),
      ]
    );
  }
};

const createFoodRecord = async (template: FoodTemplate) => {
  const categoryId = await ensureFoodCategory(template.categoryName);
  const [insertResult] = await pool.query(
    `
      INSERT INTO foods (food_name, category_id, calories, protein, carbs, fat, fiber, sugar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      template.name,
      categoryId,
      template.totalKcal,
      template.protein,
      template.carbs,
      template.fats,
      Math.max(4, Math.round(template.carbs * 0.12)),
      Math.max(3, Math.round(template.carbs * 0.08)),
    ]
  );

  return (insertResult as { insertId: number }).insertId;
};

const getMealType = (source: AnalysisSource) => (source === 'camera' ? 'Lunch' : 'Dinner');

const updateDailyNutritionLog = async (userId: number) => {
  const [mealRows] = await pool.query(
    `
      SELECT
        COALESCE(SUM(f.calories * mi.quantity), 0) AS total_calories,
        COALESCE(SUM(f.protein * mi.quantity), 0) AS total_protein,
        COALESCE(SUM(f.carbs * mi.quantity), 0) AS total_carbs,
        COALESCE(SUM(f.fat * mi.quantity), 0) AS total_fat
      FROM meals m
      LEFT JOIN mealitems mi ON mi.meal_id = m.meal_id
      LEFT JOIN foods f ON f.food_id = mi.food_id
      WHERE m.user_id = ? AND DATE(m.created_at) = CURDATE()
    `,
    [userId]
  );

  const totals = (mealRows as Array<{
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
  }>)[0];

  const [logs] = await pool.query(
    'SELECT log_id FROM dailynutritionlogs WHERE user_id = ? AND date = CURDATE() LIMIT 1',
    [userId]
  );

  const logRows = logs as Array<{ log_id: number }>;

  if (logRows.length > 0) {
    await pool.query(
      `
        UPDATE dailynutritionlogs
        SET total_calories = ?, total_protein = ?, total_carbs = ?, total_fat = ?
        WHERE log_id = ?
      `,
      [
        totals.total_calories,
        totals.total_protein,
        totals.total_carbs,
        totals.total_fat,
        logRows[0].log_id,
      ]
    );
  } else {
    await pool.query(
      `
        INSERT INTO dailynutritionlogs (user_id, date, total_calories, total_protein, total_carbs, total_fat)
        VALUES (?, CURDATE(), ?, ?, ?, ?)
      `,
      [
        userId,
        totals.total_calories,
        totals.total_protein,
        totals.total_carbs,
        totals.total_fat,
      ]
    );
  }

  return {
    current: Math.round(totals.total_calories),
    protein: Math.round(totals.total_protein),
    carbs: Math.round(totals.total_carbs),
    fats: Math.round(totals.total_fat),
  };
};

const buildAnalysisResult = async (resultId: number): Promise<FoodAnalysisResult | null> => {
  const [rows] = await pool.query(
    `
      SELECT
        fr.result_id,
        fr.image_id,
        fr.food_id,
        fr.portion_size,
        fr.confidence_score,
        fr.detected_at,
        fi.image_url,
        fi.user_id,
        f.food_name,
        f.calories,
        f.protein,
        f.carbs,
        f.fat,
        fc.category_name
      FROM foodrecognitionresults fr
      INNER JOIN foodimages fi ON fi.image_id = fr.image_id
      INNER JOIN foods f ON f.food_id = fr.food_id
      LEFT JOIN foodcategories fc ON fc.category_id = f.category_id
      WHERE fr.result_id = ?
      LIMIT 1
    `,
    [resultId]
  );

  const row = (rows as Array<{
    result_id: number;
    image_id: number;
    food_id: number;
    portion_size: number;
    confidence_score: number;
    detected_at: string;
    image_url: string;
    user_id: number;
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    category_name: string | null;
  }>)[0];

  if (!row) {
    return null;
  }

  const [mealRows] = await pool.query(
    `
      SELECT m.meal_id
      FROM meals m
      INNER JOIN mealitems mi ON mi.meal_id = m.meal_id
      WHERE m.user_id = ? AND mi.food_id = ?
      ORDER BY m.created_at DESC
      LIMIT 1
    `,
    [row.user_id, row.food_id]
  );
  const isSaved = (mealRows as Array<{ meal_id: number }>).length > 0;

  const [goalRows] = await pool.query(
    'SELECT target_calories FROM usergoals WHERE user_id = ? ORDER BY goal_id DESC LIMIT 1',
    [row.user_id]
  );
  const targetCalories = ((goalRows as Array<{ target_calories: number | null }>)[0]?.target_calories) ?? 2200;

  const dailyTotals = await updateDailyNutritionLog(row.user_id);
  const sodium = getSodiumLevel(row.calories);

  const ingredients: FoodIngredient[] = [
    {
      name: row.food_name,
      amount: `${Number(row.portion_size || 1).toFixed(1)} serving`,
      category: row.category_name || 'Food',
      calories: Math.round(row.calories),
    },
  ];

  return {
    id: `analysis_${row.result_id}`,
    imageId: row.image_id,
    resultId: row.result_id,
    foodId: row.food_id,
    name: row.food_name,
    image: row.image_url,
    source: row.image_url.startsWith('data:image') ? 'camera' : 'upload',
    status: isSaved ? 'saved' : 'analyzed',
    detectedDish: row.food_name,
    detectedItems: [row.food_name],
    estimatedPortion: `${Number(row.portion_size || 1).toFixed(1)} serving`,
    confidence: Number(row.confidence_score || 0.8),
    needsReview: Number(row.confidence_score || 0.8) < 0.75,
    totalKcal: Math.round(row.calories),
    protein: Math.round(row.protein),
    carbs: Math.round(row.carbs),
    fats: Math.round(row.fat),
    ingredients,
    healthScore: computeHealthScore(row.calories, row.protein, sodium),
    sodium,
    dailyProgress: {
      current: dailyTotals.current,
      target: Math.round(targetCalories),
    },
    createdAt: new Date(row.detected_at).toISOString(),
  };
};

export const getUserProfileService = async () => {
  const user = await ensureDemoUser();

  return {
    id: user.user_id,
    name: user.full_name || DEMO_USER.fullName,
    email: `user${user.user_id}@calai.local`,
    role: 'user',
    age: getAge(user.date_of_birth),
    height: user.height ?? DEMO_USER.height,
    weight: user.weight ?? DEMO_USER.weight,
    goal: 'lose weight',
    avatar: getDemoAvatar(),
  };
};

export const getUserGoalsService = async () => {
  const user = await ensureDemoUser();
  const goal = await ensureUserGoal(user.user_id);

  return {
    dailyCalories: Math.round(goal.target_calories ?? 2200),
    targetWeight: goal.target_weight ?? 65,
    currentWeight: user.weight ?? DEMO_USER.weight,
    goal: 'lose weight',
    activityLevel: 'moderate',
  };
};

export const getUserMealsService = async () => {
  const user = await ensureDemoUser();
  const [rows] = await pool.query(
    `
      SELECT
        m.meal_id,
        m.meal_type,
        m.created_at,
        f.food_name,
        mi.quantity,
        f.calories
      FROM meals m
      INNER JOIN mealitems mi ON mi.meal_id = m.meal_id
      INNER JOIN foods f ON f.food_id = mi.food_id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
      LIMIT 10
    `,
    [user.user_id]
  );

  return (rows as Array<{
    meal_id: number;
    meal_type: string;
    created_at: string;
    food_name: string;
    quantity: number;
    calories: number;
  }>).map(row => ({
    id: row.meal_id,
    mealName: row.food_name,
    calories: Math.round(row.calories * row.quantity),
    mealTime: row.meal_type || 'Meal',
    createdAt: row.created_at,
  }));
};

export const getUserMealHistoryService = async () => {
  return getUserMealsService();
};

export const getUserDashboardService = async () => {
  const user = await ensureDemoUser();
  const goal = await ensureUserGoal(user.user_id);
  const totals = await updateDailyNutritionLog(user.user_id);

  return {
    overview: {
      currentCalories: totals.current,
      targetCalories: Math.round(goal.target_calories ?? 2200),
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFats: totals.fats,
    },
    profile: {
      currentWeight: user.weight ?? DEMO_USER.weight,
      targetWeight: goal.target_weight ?? 65,
    },
  };
};

export const updateUserProfileService = async (payload: UpsertUserProfilePayload) => {
  const user = await ensureDemoUser();

  const nextName = payload.name ?? user.full_name ?? DEMO_USER.fullName;
  const nextGender = payload.gender ?? user.gender ?? DEMO_USER.gender;
  const nextHeight = payload.height ?? user.height ?? DEMO_USER.height;
  const nextWeight = payload.weight ?? user.weight ?? DEMO_USER.weight;
  const nextBirthDate = payload.age ? ageToBirthDate(payload.age) : user.date_of_birth ?? DEMO_USER.dateOfBirth;

  await pool.query(
    `
      UPDATE users
      SET full_name = ?, gender = ?, date_of_birth = ?, height = ?, weight = ?
      WHERE user_id = ?
    `,
    [nextName, nextGender, nextBirthDate, nextHeight, nextWeight, user.user_id]
  );

  return getUserProfileService();
};

export const updateUserGoalsService = async (payload: UpdateUserGoalsPayload) => {
  const user = await ensureDemoUser();
  const goal = await ensureUserGoal(user.user_id);

  await pool.query(
    `
      UPDATE usergoals
      SET target_calories = ?, target_weight = ?
      WHERE goal_id = ?
    `,
    [
      payload.dailyCalories ?? goal.target_calories ?? 2200,
      payload.targetWeight ?? goal.target_weight ?? 65,
      goal.goal_id,
    ]
  );

  return getUserGoalsService();
};

export const searchFoodsService = async (query: string) => {
  await ensureSeedFoods();

  const searchTerm = `%${query || ''}%`;
  const [rows] = await pool.query(
    `
      SELECT
        f.food_id,
        f.food_name,
        f.calories,
        f.protein,
        f.carbs,
        f.fat,
        fc.category_name
      FROM foods f
      LEFT JOIN foodcategories fc ON fc.category_id = f.category_id
      WHERE f.food_name LIKE ?
      ORDER BY f.food_name ASC
      LIMIT 20
    `,
    [searchTerm]
  );

  return (rows as Array<{
    food_id: number;
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    category_name: string | null;
  }>).map(row => ({
    id: row.food_id,
    name: row.food_name,
    calories: Math.round(row.calories),
    protein: Math.round(row.protein),
    carbs: Math.round(row.carbs),
    fats: Math.round(row.fat),
    category: row.category_name ?? 'Food',
  }));
};

export const createMealService = async (payload: CreateMealPayload) => {
  const user = await ensureDemoUser();
  const categoryId = await ensureFoodCategory(payload.mealType || 'Meal');

  const [foodInsert] = await pool.query(
    `
      INSERT INTO foods (food_name, category_id, calories, protein, carbs, fat, fiber, sugar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.foodName,
      categoryId,
      payload.calories,
      payload.protein ?? 0,
      payload.carbs ?? 0,
      payload.fats ?? 0,
      0,
      0,
    ]
  );

  const foodId = (foodInsert as { insertId: number }).insertId;

  const [mealInsert] = await pool.query(
    'INSERT INTO meals (user_id, meal_type) VALUES (?, ?)',
    [user.user_id, payload.mealType]
  );
  const mealId = (mealInsert as { insertId: number }).insertId;

  await pool.query(
    'INSERT INTO mealitems (meal_id, food_id, quantity, calories) VALUES (?, ?, ?, ?)',
    [mealId, foodId, payload.quantity ?? 1, payload.calories]
  );

  await updateDailyNutritionLog(user.user_id);

  const [rows] = await pool.query(
    `
      SELECT m.meal_id, m.meal_type, m.created_at, f.food_name, mi.quantity, f.calories
      FROM meals m
      INNER JOIN mealitems mi ON mi.meal_id = m.meal_id
      INNER JOIN foods f ON f.food_id = mi.food_id
      WHERE m.meal_id = ?
      LIMIT 1
    `,
    [mealId]
  );

  const row = (rows as Array<{
    meal_id: number;
    meal_type: string;
    created_at: string;
    food_name: string;
    quantity: number;
    calories: number;
  }>)[0];

  return {
    id: row.meal_id,
    mealName: row.food_name,
    calories: Math.round(row.calories * row.quantity),
    mealTime: row.meal_type,
    createdAt: row.created_at,
  };
};

export const updateMealService = async (mealId: number, payload: UpdateMealPayload) => {
  const [rows] = await pool.query(
    `
      SELECT mi.meal_item_id, mi.food_id
      FROM mealitems mi
      WHERE mi.meal_id = ?
      LIMIT 1
    `,
    [mealId]
  );

  const item = (rows as Array<{ meal_item_id: number; food_id: number }>)[0];
  if (!item) {
    return null;
  }

  if (payload.mealType) {
    await pool.query('UPDATE meals SET meal_type = ? WHERE meal_id = ?', [payload.mealType, mealId]);
  }

  await pool.query(
    `
      UPDATE foods
      SET
        food_name = COALESCE(?, food_name),
        calories = COALESCE(?, calories),
        protein = COALESCE(?, protein),
        carbs = COALESCE(?, carbs),
        fat = COALESCE(?, fat)
      WHERE food_id = ?
    `,
    [
      payload.foodName ?? null,
      payload.calories ?? null,
      payload.protein ?? null,
      payload.carbs ?? null,
      payload.fats ?? null,
      item.food_id,
    ]
  );

  if (payload.quantity || payload.calories) {
    await pool.query(
      'UPDATE mealitems SET quantity = COALESCE(?, quantity), calories = COALESCE(?, calories) WHERE meal_item_id = ?',
      [payload.quantity ?? null, payload.calories ?? null, item.meal_item_id]
    );
  }

  const user = await ensureDemoUser();
  await updateDailyNutritionLog(user.user_id);

  const meals = await getUserMealsService();
  return meals.find(meal => Number(meal.id) === mealId) ?? null;
};

export const deleteMealService = async (mealId: number) => {
  const user = await ensureDemoUser();

  const [rows] = await pool.query(
    'SELECT food_id FROM mealitems WHERE meal_id = ?',
    [mealId]
  );

  const mealRows = rows as Array<{ food_id: number }>;
  if (mealRows.length === 0) {
    return false;
  }

  for (const row of mealRows) {
    await pool.query('DELETE FROM foods WHERE food_id = ?', [row.food_id]);
  }

  await pool.query('DELETE FROM mealitems WHERE meal_id = ?', [mealId]);
  await pool.query('DELETE FROM meals WHERE meal_id = ?', [mealId]);

  await updateDailyNutritionLog(user.user_id);
  return true;
};

export const analyzeFoodImageService = async ({ imageUrl, source }: AnalyzeFoodImagePayload) => {
  const user = await ensureDemoUser();
  await ensureUserGoal(user.user_id);

  const template = source === 'camera'
    ? FOOD_TEMPLATES.find(item => item.source === 'camera') || getRandomTemplate()
    : FOOD_TEMPLATES.find(item => item.source === 'upload') || getRandomTemplate();

  const [imageResult] = await pool.query(
    'INSERT INTO foodimages (user_id, image_url) VALUES (?, ?)',
    [user.user_id, imageUrl]
  );
  const imageId = (imageResult as { insertId: number }).insertId;

  const foodId = await createFoodRecord(template);

  const [resultInsert] = await pool.query(
    `
      INSERT INTO foodrecognitionresults (image_id, food_id, portion_size, confidence_score)
      VALUES (?, ?, ?, ?)
    `,
    [imageId, foodId, 1, template.confidence]
  );

  return buildAnalysisResult((resultInsert as { insertId: number }).insertId);
};

export const getFoodAnalysisHistoryService = async () => {
  const user = await ensureDemoUser();
  const [rows] = await pool.query(
    `
      SELECT fr.result_id
      FROM foodrecognitionresults fr
      INNER JOIN foodimages fi ON fi.image_id = fr.image_id
      WHERE fi.user_id = ?
      ORDER BY fr.detected_at DESC
    `,
    [user.user_id]
  );

  const resultIds = (rows as Array<{ result_id: number }>).map(row => row.result_id);
  const results = await Promise.all(resultIds.map(resultId => buildAnalysisResult(resultId)));
  return results.filter((item): item is FoodAnalysisResult => item !== null);
};

export const getFoodAnalysisByIdService = async (analysisId: string) => {
  const resultId = Number(analysisId.replace('analysis_', ''));
  if (Number.isNaN(resultId)) {
    return null;
  }

  return buildAnalysisResult(resultId);
};

export const confirmFoodAnalysisService = async (analysisId: string, payload: ConfirmFoodAnalysisPayload) => {
  const analysis = await getFoodAnalysisByIdService(analysisId);
  if (!analysis) {
    return null;
  }

  const calories = typeof payload.totalKcal === 'number' ? payload.totalKcal : analysis.totalKcal;
  const protein = typeof payload.protein === 'number' ? payload.protein : analysis.protein;
  const carbs = typeof payload.carbs === 'number' ? payload.carbs : analysis.carbs;
  const fats = typeof payload.fats === 'number' ? payload.fats : analysis.fats;
  const portion = payload.estimatedPortion ? parseFloat(payload.estimatedPortion) || 1 : 1;

  await pool.query(
    `
      UPDATE foods
      SET food_name = ?, calories = ?, protein = ?, carbs = ?, fat = ?
      WHERE food_id = ?
    `,
    [payload.name || analysis.name, calories, protein, carbs, fats, analysis.foodId]
  );

  await pool.query(
    `
      UPDATE foodrecognitionresults
      SET portion_size = ?, confidence_score = ?
      WHERE result_id = ?
    `,
    [portion, Math.max(analysis.confidence, 0.82), analysis.resultId]
  );

  return buildAnalysisResult(analysis.resultId);
};

export const saveFoodAnalysisToMealLogService = async (analysisId: string) => {
  const analysis = await getFoodAnalysisByIdService(analysisId);
  if (!analysis) {
    return null;
  }

  const user = await ensureDemoUser();

  const [existingRows] = await pool.query(
    `
      SELECT mi.meal_item_id
      FROM mealitems mi
      INNER JOIN meals m ON m.meal_id = mi.meal_id
      WHERE m.user_id = ? AND mi.food_id = ?
      LIMIT 1
    `,
    [user.user_id, analysis.foodId]
  );

  if ((existingRows as Array<{ meal_item_id: number }>).length === 0) {
    const [mealInsert] = await pool.query(
      'INSERT INTO meals (user_id, meal_type) VALUES (?, ?)',
      [user.user_id, getMealType(analysis.source)]
    );
    const mealId = (mealInsert as { insertId: number }).insertId;

    await pool.query(
      'INSERT INTO mealitems (meal_id, food_id, quantity, calories) VALUES (?, ?, ?, ?)',
      [mealId, analysis.foodId, 1, analysis.totalKcal]
    );
  }

  await updateDailyNutritionLog(user.user_id);
  return buildAnalysisResult(analysis.resultId);
};

export const reanalyzeFoodImageService = async (analysisId: string) => {
  const analysis = await getFoodAnalysisByIdService(analysisId);
  if (!analysis) {
    return null;
  }

  const improvedCalories = Math.max(120, Math.round(analysis.totalKcal * 0.96));
  const improvedProtein = Math.max(analysis.protein, 28);
  const improvedCarbs = Math.max(analysis.carbs - 4, 10);
  const improvedFats = Math.max(analysis.fats - 2, 6);

  await pool.query(
    `
      UPDATE foods
      SET calories = ?, protein = ?, carbs = ?, fat = ?
      WHERE food_id = ?
    `,
    [improvedCalories, improvedProtein, improvedCarbs, improvedFats, analysis.foodId]
  );

  await pool.query(
    `
      UPDATE foodrecognitionresults
      SET confidence_score = ?, portion_size = ?
      WHERE result_id = ?
    `,
    [0.89, 1, analysis.resultId]
  );

  return buildAnalysisResult(analysis.resultId);
};

export const deleteFoodAnalysisService = async (analysisId: string) => {
  const analysis = await getFoodAnalysisByIdService(analysisId);
  if (!analysis) {
    return false;
  }

  const user = await ensureDemoUser();

  const [mealRows] = await pool.query(
    `
      SELECT m.meal_id, mi.meal_item_id
      FROM meals m
      INNER JOIN mealitems mi ON mi.meal_id = m.meal_id
      WHERE m.user_id = ? AND mi.food_id = ?
    `,
    [user.user_id, analysis.foodId]
  );

  for (const row of mealRows as Array<{ meal_id: number; meal_item_id: number }>) {
    await pool.query('DELETE FROM mealitems WHERE meal_item_id = ?', [row.meal_item_id]);
    await pool.query('DELETE FROM meals WHERE meal_id = ?', [row.meal_id]);
  }

  await pool.query('DELETE FROM foodrecognitionresults WHERE result_id = ?', [analysis.resultId]);
  await pool.query('DELETE FROM foodimages WHERE image_id = ?', [analysis.imageId]);
  await pool.query('DELETE FROM foods WHERE food_id = ?', [analysis.foodId]);

  await updateDailyNutritionLog(user.user_id);
  return true;
};
