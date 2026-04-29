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
  goal?: 'lose' | 'maintain' | 'gain';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active';
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
  account_id: number | null;
  full_name: string | null;
  gender: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  created_at: string | null;
  has_completed_setup: number;
}

interface GoalRow {
  goal_id: number;
  user_id: number;
  target_calories: number | null;
  target_weight: number | null;
  goal_type: string | null;
  activity_level: string | null;
}

let userModuleSchemaInitPromise: Promise<void> | null = null;

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

const DEMO_USER: null = null;

const mapGoalTypeToAppGoal = (value?: string | null) => {
  if (value === 'muscle_gain' || value === 'gain') return 'gain';
  if (value === 'maintenance' || value === 'maintain') return 'maintain';
  if (value === 'weight_loss' || value === 'lose') return 'lose';
  return null;
};

const mapAppGoalToGoalType = (value?: string | null) => {
  if (value === 'gain') return 'muscle_gain';
  if (value === 'maintain') return 'maintenance';
  return 'weight_loss';
};

const normalizeActivityLevel = (value?: string | null) => {
  if (value === 'sedentary' || value === 'light' || value === 'moderate' || value === 'active') {
    return value;
  }
  return null;
};

const hasColumn = async (tableName: string, columnName: string) => {
  const [rows] = await pool.query(
    `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [tableName, columnName]
  );

  return (rows as Array<{ 1: number }>).length > 0;
};

const hasIndex = async (tableName: string, indexName: string) => {
  const [rows] = await pool.query(
    `
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [tableName, indexName]
  );

  return (rows as Array<{ 1: number }>).length > 0;
};

const hasForeignKey = async (tableName: string, constraintName: string) => {
  const [rows] = await pool.query(
    `
      SELECT 1
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      LIMIT 1
    `,
    [tableName, constraintName]
  );

  return (rows as Array<{ 1: number }>).length > 0;
};

const initializeUserModuleSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS foodcategories (
      category_id INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS foodimages (
      image_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      image_url LONGTEXT NOT NULL,
      source ENUM('upload', 'camera') NOT NULL DEFAULT 'upload',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_foodimages_user (user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS foodrecognitionresults (
      result_id INT AUTO_INCREMENT PRIMARY KEY,
      image_id INT NOT NULL,
      food_id INT NOT NULL,
      portion_size DECIMAL(10,2) DEFAULT 1,
      confidence_score DECIMAL(5,2) DEFAULT 0.80,
      detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (image_id) REFERENCES foodimages(image_id) ON DELETE CASCADE,
      FOREIGN KEY (food_id) REFERENCES foods(food_id) ON DELETE CASCADE,
      INDEX idx_foodresults_image (image_id),
      INDEX idx_foodresults_food (food_id)
    )
  `);

  if (!(await hasColumn('foods', 'category_id'))) {
    await pool.query(`
      ALTER TABLE foods
      ADD COLUMN category_id INT NULL
    `);
  }

  if (!(await hasIndex('foods', 'idx_foods_category'))) {
    await pool.query(`
      ALTER TABLE foods
      ADD INDEX idx_foods_category (category_id)
    `);
  }

  if (!(await hasForeignKey('foods', 'fk_foods_category'))) {
    await pool.query(`
      ALTER TABLE foods
      ADD CONSTRAINT fk_foods_category
      FOREIGN KEY (category_id) REFERENCES foodcategories(category_id)
    `);
  }

  if (!(await hasColumn('foodimages', 'source'))) {
    await pool.query(`
      ALTER TABLE foodimages
      ADD COLUMN source ENUM('upload', 'camera') NOT NULL DEFAULT 'upload'
    `);
  }

  if (!(await hasColumn('usergoals', 'goal_type'))) {
    await pool.query(`
      ALTER TABLE usergoals
      ADD COLUMN goal_type VARCHAR(50) NULL DEFAULT 'weight_loss'
    `);
  }

  if (!(await hasColumn('usergoals', 'activity_level'))) {
    await pool.query(`
      ALTER TABLE usergoals
      ADD COLUMN activity_level VARCHAR(50) NULL DEFAULT 'moderate'
    `);
  }

  if (!(await hasColumn('users', 'has_completed_setup'))) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN has_completed_setup TINYINT DEFAULT 0
    `);
  }

  // Migration: add age column if not exists, drop date_of_birth if exists
  if (!(await hasColumn('users', 'age'))) {
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN age INT`);
    } catch {
      // ignore
    }
  }
  try {
    await pool.query(`ALTER TABLE users DROP COLUMN date_of_birth`);
  } catch {
    // ignore if column doesn't exist
  }
};

const ensureUserModuleSchema = async () => {
  if (!userModuleSchemaInitPromise) {
    userModuleSchemaInitPromise = initializeUserModuleSchema();
  }

  await userModuleSchemaInitPromise;
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
  { name: 'Boiled Eggs', category: 'Breakfast', calories: 155, protein: 13, carbs: 1, fats: 11 },
  { name: 'Banh Mi Egg', category: 'Breakfast', calories: 390, protein: 17, carbs: 52, fats: 13 },
  { name: 'Avocado Toast', category: 'Breakfast', calories: 310, protein: 8, carbs: 32, fats: 18 },
  { name: 'Com Tam', category: 'Lunch', calories: 650, protein: 32, carbs: 78, fats: 24 },
  { name: 'Pho Bo', category: 'Lunch', calories: 430, protein: 25, carbs: 55, fats: 12 },
  { name: 'Bun Thit Nuong', category: 'Lunch', calories: 520, protein: 28, carbs: 68, fats: 16 },
  { name: 'Grilled Chicken Rice', category: 'Lunch', calories: 560, protein: 42, carbs: 62, fats: 14 },
  { name: 'Mediterranean Quinoa', category: 'Lunch', calories: 320, protein: 14, carbs: 45, fats: 8 },
  { name: 'Chicken Rice', category: 'Dinner', calories: 620, protein: 36, carbs: 72, fats: 18 },
  { name: 'Beef Stir Fry', category: 'Dinner', calories: 540, protein: 35, carbs: 38, fats: 26 },
  { name: 'Tofu Stir Fry', category: 'Dinner', calories: 310, protein: 18, carbs: 42, fats: 12 },
  { name: 'Salmon with Quinoa', category: 'Dinner', calories: 556, protein: 44, carbs: 46, fats: 28 },
  { name: 'Turkey Wrap', category: 'Snack', calories: 280, protein: 24, carbs: 32, fats: 8 },
  { name: 'Apple', category: 'Snack', calories: 95, protein: 1, carbs: 25, fats: 0 },
  { name: 'Banana', category: 'Snack', calories: 105, protein: 1, carbs: 27, fats: 0 },
  { name: 'Protein Shake', category: 'Snack', calories: 180, protein: 25, carbs: 9, fats: 4 },
  { name: 'Mixed Nuts', category: 'Snack', calories: 210, protein: 6, carbs: 8, fats: 18 },
];

const getRandomTemplate = () => {
  const index = Math.floor(Math.random() * FOOD_TEMPLATES.length);
  return FOOD_TEMPLATES[index];
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

const normalizeMealType = (value?: string | null) => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'breakfast' || normalized === 'lunch' || normalized === 'dinner' || normalized === 'snack') {
    return normalized;
  }
  return 'dinner';
};

const getUserByAccountId = async (accountId?: number | null): Promise<UserRow | null> => {
  if (!accountId) {
    return null;
  }

  const [rows] = await pool.query(
    `
      SELECT user_id, account_id, full_name, gender, age, height, weight, created_at, has_completed_setup
      FROM users
      WHERE account_id = ?
      LIMIT 1
    `,
    [accountId]
  );

  return (rows as UserRow[])[0] ?? null;
};

const getFallbackUser = async (): Promise<UserRow> => {
  const [users] = await pool.query(
    `
      SELECT user_id, account_id, full_name, gender, age, height, weight, created_at, has_completed_setup
      FROM users
      ORDER BY user_id
      LIMIT 1
    `
  );
  const existing = (users as UserRow[])[0];

  if (!existing) {
    throw new Error('USER_NOT_FOUND');
  }

  return existing;
};

const resolveUser = async (accountId?: number | null): Promise<UserRow> => {
  await ensureUserModuleSchema();
  const user = await getUserByAccountId(accountId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  return user;
};

const ensureUserGoal = async (userId: number): Promise<GoalRow | null> => {
  const [goals] = await pool.query(
    `
      SELECT goal_id, user_id, target_calories, target_weight, goal_type, activity_level
      FROM usergoals
      WHERE user_id = ?
      ORDER BY goal_id DESC
      LIMIT 1
    `,
    [userId]
  );

  const goalRows = goals as GoalRow[];
  return goalRows[0] ?? null;
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

const getMealType = (source: AnalysisSource) => (source === 'camera' ? 'lunch' : 'dinner');

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
      WHERE m.user_id = ? AND m.meal_date = CURDATE()
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
  await ensureUserModuleSchema();
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
        fi.source AS image_source,
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
    image_source: AnalysisSource;
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
    source: row.image_source,
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

export const initializeUserServices = async () => {
  await ensureUserModuleSchema();
};

export const getUserProfileService = async (accountId?: number | null) => {
  try {
    const user = await resolveUser(accountId);
    return {
      id: user.user_id,
      name: user.full_name || null,
      email: null,
      role: 'user',
      gender: user.gender || null,
      age: user.age ?? null,
      height: user.height || null,
      weight: user.weight || null,
      goal: null,
      avatar: null,
      hasCompletedSetup: Boolean(user.has_completed_setup),
    };
  } catch {
    return null;
  }
};

export const getUserGoalsService = async (accountId?: number | null) => {
  try {
    const user = await resolveUser(accountId);
    const goal = await ensureUserGoal(user.user_id);
    if (!goal) return null;

    return {
      dailyCalories: goal.target_calories || null,
      targetWeight: goal.target_weight || null,
      currentWeight: user.weight || null,
      goal: mapGoalTypeToAppGoal(goal.goal_type),
      activityLevel: normalizeActivityLevel(goal.activity_level),
    };
  } catch {
    return null;
  }
};

export const getUserMealsService = async (accountId?: number | null) => {
  try {
    const user = await resolveUser(accountId);
    const [rows] = await pool.query(
      `
        SELECT
          m.meal_id,
          m.meal_type,
          m.created_at,
          f.food_name,
          mi.quantity,
          f.calories,
          f.protein,
          f.carbs,
          f.fat
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
      protein: number;
      carbs: number;
      fat: number;
    }>).map(row => ({
      id: row.meal_id,
      mealName: row.food_name,
      calories: Math.round(row.calories * row.quantity),
      mealTime: row.meal_type || 'Meal',
      protein: Math.round((row.protein ?? 0) * row.quantity),
      carbs: Math.round((row.carbs ?? 0) * row.quantity),
      fats: Math.round((row.fat ?? 0) * row.quantity),
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
};

export const getUserMealHistoryService = async (accountId?: number | null) => {
  return getUserMealsService(accountId);
};

export const getUserDashboardService = async (accountId?: number | null) => {
  try {
    const user = await resolveUser(accountId);
    const goal = await ensureUserGoal(user.user_id);
    const totals = await updateDailyNutritionLog(user.user_id);

    return {
      overview: {
        currentCalories: totals.current,
        targetCalories: goal?.target_calories ?? null,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFats: totals.fats,
      },
      profile: {
        currentWeight: user.weight ?? null,
        targetWeight: goal?.target_weight ?? null,
      },
    };
  } catch {
    return {
      overview: {
        currentCalories: 0,
        targetCalories: null,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
      },
      profile: {
        currentWeight: null,
        targetWeight: null,
      },
    };
  }
};

export const updateUserProfileService = async (accountId: number | null | undefined, payload: UpsertUserProfilePayload) => {
  const user = await resolveUser(accountId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const nextName = payload.name ?? user.full_name ?? '';
  const nextGender = payload.gender ?? user.gender ?? '';
  const nextHeight = payload.height ?? user.height ?? 0;
  const nextWeight = payload.weight ?? user.weight ?? 0;
  const nextAge = payload.age ?? user.age ?? null;

  await pool.query(
    `
      UPDATE users
      SET full_name = ?, gender = ?, age = ?, height = ?, weight = ?, has_completed_setup = 1
      WHERE user_id = ?
    `,
    [nextName, nextGender, nextAge, nextHeight, nextWeight, user.user_id]
  );

  return getUserProfileService(accountId);
};

export const updateUserGoalsService = async (accountId: number | null | undefined, payload: UpdateUserGoalsPayload) => {
  const user = await resolveUser(accountId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  let goal = await ensureUserGoal(user.user_id);
  if (!goal) {
    const [insertResult] = await pool.query(
      `INSERT INTO usergoals (user_id, target_calories, target_weight, goal_type, activity_level) VALUES (?, ?, ?, ?, ?)`,
      [
        user.user_id,
        payload.dailyCalories ?? null,
        payload.targetWeight ?? null,
        payload.goal ? mapAppGoalToGoalType(payload.goal) : null,
        payload.activityLevel ?? null,
      ]
    );
    goal = {
      goal_id: (insertResult as { insertId: number }).insertId,
      user_id: user.user_id,
      target_calories: payload.dailyCalories ?? null,
      target_weight: payload.targetWeight ?? null,
      goal_type: payload.goal ? mapAppGoalToGoalType(payload.goal) : null,
      activity_level: payload.activityLevel ?? null,
    };
  } else {
    await pool.query(
      `
        UPDATE usergoals
        SET target_calories = ?, target_weight = ?, goal_type = ?, activity_level = ?
        WHERE goal_id = ?
      `,
      [
        payload.dailyCalories ?? goal.target_calories,
        payload.targetWeight ?? goal.target_weight,
        payload.goal ? mapAppGoalToGoalType(payload.goal) : goal.goal_type,
        payload.activityLevel ?? goal.activity_level,
        goal.goal_id,
      ]
    );
  }

  return getUserGoalsService(accountId);
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

export const createMealService = async (accountId: number | null | undefined, payload: CreateMealPayload) => {
  const user = await resolveUser(accountId);
  const normalizedMealType = normalizeMealType(payload.mealType);
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
    'INSERT INTO meals (user_id, meal_type, meal_date) VALUES (?, ?, CURDATE())',
    [user.user_id, normalizedMealType]
  );
  const mealId = (mealInsert as { insertId: number }).insertId;

  await pool.query(
    'INSERT INTO mealitems (meal_id, food_id, quantity, calories) VALUES (?, ?, ?, ?)',
    [mealId, foodId, payload.quantity ?? 1, payload.calories]
  );

  await updateDailyNutritionLog(user.user_id);

  const [rows] = await pool.query(
    `
      SELECT m.meal_id, m.meal_type, m.created_at, f.food_name, mi.quantity, f.calories, f.protein, f.carbs, f.fat
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
    protein: number;
    carbs: number;
    fat: number;
  }>)[0];

  return {
    id: row.meal_id,
    mealName: row.food_name,
    calories: Math.round(row.calories * row.quantity),
    mealTime: row.meal_type,
    protein: Math.round((row.protein ?? 0) * row.quantity),
    carbs: Math.round((row.carbs ?? 0) * row.quantity),
    fats: Math.round((row.fat ?? 0) * row.quantity),
    createdAt: row.created_at,
  };
};

export const updateMealService = async (accountId: number | null | undefined, mealId: number, payload: UpdateMealPayload) => {
  const user = await resolveUser(accountId);
  const [rows] = await pool.query(
    `
      SELECT mi.mealitem_id, mi.food_id
      FROM mealitems mi
      INNER JOIN meals m ON m.meal_id = mi.meal_id
      WHERE mi.meal_id = ? AND m.user_id = ?
      LIMIT 1
    `,
    [mealId, user.user_id]
  );

  const item = (rows as Array<{ mealitem_id: number; food_id: number }>)[0];
  if (!item) {
    return null;
  }

  if (payload.mealType) {
    await pool.query('UPDATE meals SET meal_type = ? WHERE meal_id = ?', [normalizeMealType(payload.mealType), mealId]);
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
      'UPDATE mealitems SET quantity = COALESCE(?, quantity), calories = COALESCE(?, calories) WHERE mealitem_id = ?',
      [payload.quantity ?? null, payload.calories ?? null, item.mealitem_id]
    );
  }

  await updateDailyNutritionLog(user.user_id);

  const meals = await getUserMealsService(accountId);
  return meals.find(meal => Number(meal.id) === mealId) ?? null;
};

export const deleteMealService = async (accountId: number | null | undefined, mealId: number) => {
  const user = await resolveUser(accountId);

  const [rows] = await pool.query(
    `
      SELECT mi.food_id
      FROM mealitems mi
      INNER JOIN meals m ON m.meal_id = mi.meal_id
      WHERE mi.meal_id = ? AND m.user_id = ?
    `,
    [mealId, user.user_id]
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

export const analyzeFoodImageService = async (
  accountId: number | null | undefined,
  { imageUrl, source }: AnalyzeFoodImagePayload
) => {
  const user = await resolveUser(accountId);
  await ensureUserGoal(user.user_id);

  // Save image record
  const [imageResult] = await pool.query(
    'INSERT INTO foodimages (user_id, image_url, source) VALUES (?, ?, ?)',
    [user.user_id, imageUrl, source]
  );
  const imageId = (imageResult as { insertId: number }).insertId;

  // Try Python AI first, fallback to templates
  let template = source === 'camera'
    ? FOOD_TEMPLATES.find(item => item.source === 'camera') || getRandomTemplate()
    : FOOD_TEMPLATES.find(item => item.source === 'upload') || getRandomTemplate();

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

export const getFoodAnalysisHistoryService = async (accountId?: number | null) => {
  const user = await resolveUser(accountId);
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

export const getFoodAnalysisByIdService = async (accountId: number | null | undefined, analysisId: string) => {
  const resultId = Number(analysisId.replace('analysis_', ''));
  if (Number.isNaN(resultId)) {
    return null;
  }

  const analysis = await buildAnalysisResult(resultId);
  const user = await resolveUser(accountId);
  if (!analysis || analysis.imageId <= 0) {
    return null;
  }

  const [rows] = await pool.query('SELECT user_id FROM foodimages WHERE image_id = ? LIMIT 1', [analysis.imageId]);
  const owner = (rows as Array<{ user_id: number }>)[0];
  if (!owner || owner.user_id !== user.user_id) {
    return null;
  }

  return analysis;
};

export const confirmFoodAnalysisService = async (
  accountId: number | null | undefined,
  analysisId: string,
  payload: ConfirmFoodAnalysisPayload
) => {
  const analysis = await getFoodAnalysisByIdService(accountId, analysisId);
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

export const saveFoodAnalysisToMealLogService = async (accountId: number | null | undefined, analysisId: string) => {
  const analysis = await getFoodAnalysisByIdService(accountId, analysisId);
  if (!analysis) {
    return null;
  }

  const user = await resolveUser(accountId);

  const [existingRows] = await pool.query(
    `
      SELECT mi.mealitem_id
      FROM mealitems mi
      INNER JOIN meals m ON m.meal_id = mi.meal_id
      WHERE m.user_id = ? AND mi.food_id = ?
      LIMIT 1
    `,
    [user.user_id, analysis.foodId]
  );

  if ((existingRows as Array<{ mealitem_id: number }>).length === 0) {
    const [mealInsert] = await pool.query(
      'INSERT INTO meals (user_id, meal_type, meal_date) VALUES (?, ?, CURDATE())',
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

export const reanalyzeFoodImageService = async (accountId: number | null | undefined, analysisId: string) => {
  const analysis = await getFoodAnalysisByIdService(accountId, analysisId);
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

export const deleteFoodAnalysisService = async (accountId: number | null | undefined, analysisId: string) => {
  const analysis = await getFoodAnalysisByIdService(accountId, analysisId);
  if (!analysis) {
    return false;
  }

  const user = await resolveUser(accountId);

  const [mealRows] = await pool.query(
    `
      SELECT m.meal_id, mi.mealitem_id
      FROM meals m
      INNER JOIN mealitems mi ON mi.meal_id = m.meal_id
      WHERE m.user_id = ? AND mi.food_id = ?
    `,
    [user.user_id, analysis.foodId]
  );

  for (const row of mealRows as Array<{ meal_id: number; mealitem_id: number }>) {
    await pool.query('DELETE FROM mealitems WHERE mealitem_id = ?', [row.mealitem_id]);
    await pool.query('DELETE FROM meals WHERE meal_id = ?', [row.meal_id]);
  }

  await pool.query('DELETE FROM foodrecognitionresults WHERE result_id = ?', [analysis.resultId]);
  await pool.query('DELETE FROM foodimages WHERE image_id = ?', [analysis.imageId]);
  await pool.query('DELETE FROM foods WHERE food_id = ?', [analysis.foodId]);

  await updateDailyNutritionLog(user.user_id);
  return true;
};
