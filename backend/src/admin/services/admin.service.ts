import pool from '../../shared/database/db';
import { normalizeMealSlot } from '../../shared/foodCategory';
import { normalizeServingSize } from '../../shared/servingSize';

// ──────────────────────────────────────────────
// Error class
// ──────────────────────────────────────────────
export class AdminServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AdminServiceError';
  }
}

// ──────────────────────────────────────────────
// Interfaces
// ──────────────────────────────────────────────
export interface UserRow {
  user_id: number;
  account_id: number | null;
  full_name: string | null;
  gender: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  has_completed_setup: number;
  created_at: string | null;
  email: string | null;
  status: string | null;
  role_name: string | null;
  // Goal fields from usergoals
  goal_type: string | null;
  target_weight: number | null;
  target_calories: number | null;
  activity_level: string | null;
}

export interface AccountRow {
  account_id: number;
  email: string;
  status: string | null;
  email_verified: number | null;
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

export interface UpdateUserStatusPayload {
  status: 'active' | 'inactive' | 'suspended';
}

export interface UserFilters {
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedUsers {
  data: UserRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FoodRow {
  food_id: number;
  food_name: string;
  category_id: number | null;
  category_name: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  serving_size: string | null;
  image_path: string | null;
  created_at: string | null;
}

export interface FoodFilters {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface FoodPayload {
  name?: string;
  category?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
  imagePath?: string;
}

export interface AuditLogPayload {
  adminAccountId?: number | null;
  action: string;
  targetType: string;
  targetId?: number | null;
  detail?: string | null;
}

let adminSecuritySchemaInitPromise: Promise<void> | null = null;

const SEED_FOODS = [
  { name: 'Oatmeal with Banana', category: 'Breakfast', calories: 280, protein: 8, carbs: 52, fats: 4, servingSize: '1 bowl' },
  { name: 'Greek Yogurt Bowl', category: 'Breakfast', calories: 220, protein: 16, carbs: 24, fats: 6, servingSize: '1 bowl' },
  { name: 'Boiled Eggs', category: 'Breakfast', calories: 155, protein: 13, carbs: 1, fats: 11, servingSize: '2 eggs' },
  { name: 'Banh Mi Egg', category: 'Breakfast', calories: 390, protein: 17, carbs: 52, fats: 13, servingSize: '1 sandwich' },
  { name: 'Avocado Toast', category: 'Breakfast', calories: 310, protein: 8, carbs: 32, fats: 18, servingSize: '1 serving' },
  { name: 'Chicken Salad', category: 'Lunch', calories: 350, protein: 30, carbs: 18, fats: 14, servingSize: '1 bowl' },
  { name: 'Com Tam', category: 'Lunch', calories: 650, protein: 32, carbs: 78, fats: 24, servingSize: '1 plate' },
  { name: 'Pho Bo', category: 'Lunch', calories: 430, protein: 25, carbs: 55, fats: 12, servingSize: '1 bowl' },
  { name: 'Bun Thit Nuong', category: 'Lunch', calories: 520, protein: 28, carbs: 68, fats: 16, servingSize: '1 bowl' },
  { name: 'Grilled Chicken Rice', category: 'Lunch', calories: 560, protein: 42, carbs: 62, fats: 14, servingSize: '1 plate' },
  { name: 'Mediterranean Quinoa', category: 'Lunch', calories: 320, protein: 14, carbs: 45, fats: 8, servingSize: '1 bowl' },
  { name: 'Grilled Salmon', category: 'Dinner', calories: 500, protein: 38, carbs: 12, fats: 28, servingSize: '1 fillet' },
  { name: 'Chicken Rice', category: 'Dinner', calories: 620, protein: 36, carbs: 72, fats: 18, servingSize: '1 plate' },
  { name: 'Beef Stir Fry', category: 'Dinner', calories: 540, protein: 35, carbs: 38, fats: 26, servingSize: '1 plate' },
  { name: 'Tofu Stir Fry', category: 'Dinner', calories: 310, protein: 18, carbs: 42, fats: 12, servingSize: '1 plate' },
  { name: 'Salmon with Quinoa', category: 'Dinner', calories: 556, protein: 44, carbs: 46, fats: 28, servingSize: '1 plate' },
  { name: 'Turkey Wrap', category: 'Snack', calories: 280, protein: 24, carbs: 32, fats: 8, servingSize: '1 wrap' },
  { name: 'Apple', category: 'Snack', calories: 95, protein: 1, carbs: 25, fats: 0, servingSize: '1 medium apple' },
  { name: 'Banana', category: 'Snack', calories: 105, protein: 1, carbs: 27, fats: 0, servingSize: '1 medium banana' },
  { name: 'Protein Shake', category: 'Snack', calories: 180, protein: 25, carbs: 9, fats: 4, servingSize: '1 glass' },
  { name: 'Mixed Nuts', category: 'Snack', calories: 210, protein: 6, carbs: 8, fats: 18, servingSize: '30g' },
];

// ──────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────
const VALID_STATUSES = ['active', 'inactive', 'suspended'];
const VALID_GENDERS = ['male', 'female', 'other'];

// Map goal_type from database to app goal format
const mapGoalTypeToAppGoal = (value?: string | null) => {
  if (value === 'muscle_gain' || value === 'gain') return 'gain';
  if (value === 'maintenance' || value === 'maintain') return 'maintain';
  if (value === 'weight_loss' || value === 'lose') return 'lose';
  return null;
};

const mapDbToUser = (row: UserRow) => ({
  id: row.user_id,
  accountId: row.account_id,
  name: row.full_name ?? `User ${row.user_id}`,
  email: row.email ?? null,
  role: row.role_name ?? 'user',
  status: row.status ?? 'active',
  gender: row.gender ?? null,
  age: row.age ?? null,
  height: row.height ?? null,
  weight: row.weight ?? null,
  hasCompletedSetup: Boolean(row.has_completed_setup),
  createdAt: row.created_at ?? null,
  goal: mapGoalTypeToAppGoal(row.goal_type),
  activityLevel: row.activity_level ?? null,
  targetWeight: row.target_weight ?? null,
  targetCalories: row.target_calories ?? null,
});

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AdminServiceError('Invalid email format', 'INVALID_EMAIL', 400);
  }
};

const ensureAdminSecuritySchema = async () => {
  if (!adminSecuritySchemaInitPromise) {
    adminSecuritySchemaInitPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS adminauditlogs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        admin_account_id INT NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(100) NOT NULL,
        target_id INT NULL,
        detail TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_account_id) REFERENCES accounts(account_id) ON DELETE SET NULL,
        INDEX idx_adminauditlogs_admin (admin_account_id),
        INDEX idx_adminauditlogs_target (target_type, target_id),
        INDEX idx_adminauditlogs_created (created_at)
      )
    `).then(() => undefined);
  }

  await adminSecuritySchemaInitPromise;
};

const mapDbToFood = (row: FoodRow) => ({
  id: row.food_id,
  name: row.food_name,
  category: row.category_name,
  calories: Math.round(Number(row.calories ?? 0)),
  protein: Math.round(Number(row.protein ?? 0)),
  carbs: Math.round(Number(row.carbs ?? 0)),
  fats: Math.round(Number(row.fat ?? 0)),
  fiber: row.fiber === null ? null : Number(row.fiber),
  sugar: row.sugar === null ? null : Number(row.sugar),
  sodium: row.sodium === null ? null : Number(row.sodium),
  servingSize: row.serving_size,
  imagePath: row.image_path,
  createdAt: row.created_at,
});

const ensureFoodCategory = async (
  categoryName: string | null | undefined,
  foodName?: string | null
) => {
  const normalized = normalizeMealSlot(categoryName, foodName);
  const [rows] = await pool.query(
    `SELECT category_id FROM foodcategories WHERE LOWER(category_name) = LOWER(?) LIMIT 1`,
    [normalized]
  );
  const existing = (rows as Array<{ category_id: number }>)[0];
  if (existing) {
    return existing.category_id;
  }

  const [insertResult] = await pool.query(
    `INSERT INTO foodcategories (category_name) VALUES (?)`,
    [normalized]
  );
  return (insertResult as { insertId: number }).insertId;
};

const validateFoodPayload = (payload: FoodPayload, requireName = true) => {
  if (requireName && !payload.name?.trim()) {
    throw new AdminServiceError('Food name is required', 'MISSING_FOOD_NAME', 400);
  }

  const numericFields: Array<keyof FoodPayload> = ['calories', 'protein', 'carbs', 'fats', 'fiber', 'sugar', 'sodium'];
  for (const field of numericFields) {
    const value = payload[field];
    if (value !== undefined && (typeof value !== 'number' || Number.isNaN(value) || value < 0)) {
      throw new AdminServiceError(`${String(field)} must be a non-negative number`, 'INVALID_FOOD_NUTRITION', 400);
    }
  }
};

const ensureSeedFoods = async () => {
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM foods`);
  const total = Number((rows as Array<{ total: number }>)[0]?.total ?? 0);
  if (total > 0) {
    return;
  }

  for (const food of SEED_FOODS) {
    const categoryId = await ensureFoodCategory(food.category, food.name);
    await pool.query(
      `
        INSERT INTO foods (food_name, category_id, calories, protein, carbs, fat, fiber, sugar, serving_size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        food.name,
        categoryId,
        food.calories,
        food.protein,
        food.carbs,
        food.fats,
        Math.max(1, Math.round(food.carbs * 0.08)),
        Math.max(0, Math.round(food.carbs * 0.05)),
        food.servingSize,
      ]
    );
  }
};

// ──────────────────────────────────────────────
// Admin Profile
// ──────────────────────────────────────────────
export const getAdminProfileService = async (accountId?: number) => {
  let query: string;
  let params: (string | number)[];

  if (accountId && accountId > 0) {
    query = `
      SELECT a.account_id, a.email, a.status
      FROM accounts a
      INNER JOIN accountroles ar ON ar.account_id = a.account_id
      INNER JOIN roles r ON r.role_id = ar.role_id
      WHERE a.account_id = ? AND LOWER(r.role_name) = 'admin'
      LIMIT 1
    `;
    params = [accountId];
  } else {
    query = `
      SELECT a.account_id, a.email, a.status
      FROM accounts a
      INNER JOIN accountroles ar ON ar.account_id = a.account_id
      INNER JOIN roles r ON r.role_id = ar.role_id
      WHERE LOWER(r.role_name) = 'admin'
      ORDER BY a.account_id
      LIMIT 1
    `;
    params = [];
  }

  const [rows] = await pool.query(query, params);
  const admin = (rows as AdminProfileRow[])[0];

  if (!admin) {
    throw new AdminServiceError('Admin account not found', 'ADMIN_NOT_FOUND', 404);
  }

  return {
    id: admin.account_id,
    email: admin.email,
    role: 'admin',
    status: admin.status ?? 'active',
  };
};

// ──────────────────────────────────────────────
// Admin Stats
// ──────────────────────────────────────────────
export const getAdminStatsService = async () => {
  const [userRows] = await pool.query(`SELECT COUNT(*) AS totalUsers FROM users`);
  const [activeRows] = await pool.query(
    `SELECT COUNT(*) AS activeUsers FROM accounts WHERE status = 'active'`
  );
  const [inactiveRows] = await pool.query(
    `SELECT COUNT(*) AS inactiveUsers FROM accounts WHERE status != 'active'`
  );
  const [mealRows] = await pool.query(
    `SELECT COUNT(*) AS mealsLoggedToday FROM meals WHERE DATE(created_at) = CURDATE()`
  );
  const [totalMealRows] = await pool.query(
    `SELECT COUNT(*) AS totalMealsLogged FROM meals`
  );
  const [todayRegRows] = await pool.query(
    `SELECT COUNT(*) AS newUsersToday FROM users WHERE DATE(created_at) = CURDATE()`
  );
  const [chatRows] = await pool.query(
    `SELECT COUNT(*) AS totalChats FROM chatsessions`
  );

  return {
    totalUsers: Number((userRows as Array<{ totalUsers: number }>)[0]?.totalUsers ?? 0),
    activeUsers: Number((activeRows as Array<{ activeUsers: number }>)[0]?.activeUsers ?? 0),
    inactiveUsers: Number((inactiveRows as Array<{ inactiveUsers: number }>)[0]?.inactiveUsers ?? 0),
    newUsersToday: Number((todayRegRows as Array<{ newUsersToday: number }>)[0]?.newUsersToday ?? 0),
    totalMealsLogged: Number((totalMealRows as Array<{ totalMealsLogged: number }>)[0]?.totalMealsLogged ?? 0),
    mealsLoggedToday: Number((mealRows as Array<{ mealsLoggedToday: number }>)[0]?.mealsLoggedToday ?? 0),
    totalChats: Number((chatRows as Array<{ totalChats: number }>)[0]?.totalChats ?? 0),
    systemStatus: 'running',
  };
};

export const getAdminAnalyticsService = async () => {
  const [overviewRows] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM meals) AS totalMeals,
      (SELECT COUNT(*) FROM foods) AS totalFoods,
      (SELECT COUNT(*) FROM users) AS totalUsers,
      (SELECT COUNT(*) FROM users WHERE has_completed_setup = 1) AS completedSetupUsers,
      (
        SELECT COALESCE(AVG(daily.total_calories), 0)
        FROM (
          SELECT m.user_id, m.meal_date, SUM(f.calories * mi.quantity) AS total_calories
          FROM meals m
          INNER JOIN mealitems mi ON mi.meal_id = m.meal_id
          INNER JOIN foods f ON f.food_id = mi.food_id
          GROUP BY m.user_id, m.meal_date
        ) daily
      ) AS averageCalories
  `);

  const overview = (overviewRows as Array<{
    totalMeals: number;
    totalFoods: number;
    totalUsers: number;
    completedSetupUsers: number;
    averageCalories: number;
  }>)[0];

  const [macroRows] = await pool.query(`
    SELECT
      COALESCE(AVG(f.calories * mi.quantity), 0) AS calories,
      COALESCE(AVG(f.protein * mi.quantity), 0) AS protein,
      COALESCE(AVG(f.carbs * mi.quantity), 0) AS carbs,
      COALESCE(AVG(f.fat * mi.quantity), 0) AS fats
    FROM mealitems mi
    INNER JOIN foods f ON f.food_id = mi.food_id
  `);
  const macros = (macroRows as Array<{
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }>)[0];

  const [trendRows] = await pool.query(`
    SELECT
      DATE(m.meal_date) AS date,
      COUNT(*) AS meals
    FROM meals m
    WHERE m.meal_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(m.meal_date)
    ORDER BY DATE(m.meal_date) ASC
  `);

  const trendMap = new Map(
    (trendRows as Array<{ date: string; meals: number }>).map(row => [
      new Date(row.date).toISOString().slice(0, 10),
      Number(row.meals),
    ])
  );

  const mealTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      meals: trendMap.get(key) ?? 0,
    };
  });

  const [topFoodRows] = await pool.query(`
    SELECT
      f.food_id,
      f.food_name,
      f.calories,
      COUNT(mi.mealitem_id) AS count
    FROM mealitems mi
    INNER JOIN foods f ON f.food_id = mi.food_id
    GROUP BY f.food_id, f.food_name, f.calories
    ORDER BY count DESC, f.food_name ASC
    LIMIT 5
  `);

  const [categoryRows] = await pool.query(`
    SELECT
      COALESCE(fc.category_name, 'General') AS name,
      COUNT(f.food_id) AS value
    FROM foods f
    LEFT JOIN foodcategories fc ON fc.category_id = f.category_id
    GROUP BY COALESCE(fc.category_name, 'General')
    ORDER BY value DESC, name ASC
  `);

  const totalUsers = Number(overview?.totalUsers ?? 0);
  const completedSetupUsers = Number(overview?.completedSetupUsers ?? 0);

  return {
    overview: {
      totalMeals: Number(overview?.totalMeals ?? 0),
      totalFoods: Number(overview?.totalFoods ?? 0),
      totalUsers,
      averageCalories: Math.round(Number(overview?.averageCalories ?? 0)),
      setupCompletionRate: totalUsers > 0 ? Math.round((completedSetupUsers / totalUsers) * 100) : 0,
    },
    macroAverages: [
      { name: 'Calories', average: Math.round(Number(macros?.calories ?? 0)), target: 2200 },
      { name: 'Protein', average: Math.round(Number(macros?.protein ?? 0)), target: 120 },
      { name: 'Carbs', average: Math.round(Number(macros?.carbs ?? 0)), target: 250 },
      { name: 'Fats', average: Math.round(Number(macros?.fats ?? 0)), target: 70 },
    ],
    mealTrend,
    topFoods: (topFoodRows as Array<{
      food_id: number;
      food_name: string;
      calories: number;
      count: number;
    }>).map(row => ({
      id: row.food_id,
      name: row.food_name,
      calories: Math.round(Number(row.calories ?? 0)),
      count: Number(row.count ?? 0),
    })),
    foodsByCategory: (categoryRows as Array<{ name: string; value: number }>).map(row => ({
      name: row.name,
      value: Number(row.value ?? 0),
    })),
  };
};

// ──────────────────────────────────────────────
// User Management - Get All Users (Paginated)
// ──────────────────────────────────────────────
export const getAllUsersService = async (filters: UserFilters = {}) => {
  const {
    status,
    search,
    sortBy = 'user_id',
    sortOrder = 'asc',
    page = 1,
    limit = 10,
  } = filters;

  const validSortColumns = ['user_id', 'full_name', 'created_at'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'user_id';
  const safeSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';
  const safePage = Math.max(1, Number(page));
  const safeLimit = Math.min(100, Math.max(1, Number(limit)));
  const offset = (safePage - 1) * safeLimit;

  const conditions: string[] = [`LOWER(r.role_name) = 'user'`];
  const params: (string | number)[] = [];

  if (status && VALID_STATUSES.includes(status)) {
    conditions.push(`a.status = ?`);
    params.push(status);
  }

  if (search && search.trim()) {
    conditions.push(`(u.full_name LIKE ? OR a.email LIKE ?)`);
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM users u
    LEFT JOIN accounts a ON a.account_id = u.account_id
    LEFT JOIN accountroles ar ON ar.account_id = u.account_id
    LEFT JOIN roles r ON r.role_id = ar.role_id
    ${whereClause}
  `;

  const dataQuery = `
    SELECT
      u.user_id,
      u.account_id,
      u.full_name,
      u.gender,
      u.age,
      u.height,
      u.weight,
      u.has_completed_setup,
      u.created_at,
      a.email,
      a.status,
      r.role_name,
      g.goal_type,
      g.target_weight,
      g.target_calories,
      g.activity_level
    FROM users u
    LEFT JOIN accounts a ON a.account_id = u.account_id
    LEFT JOIN accountroles ar ON ar.account_id = u.account_id
    LEFT JOIN roles r ON r.role_id = ar.role_id
    LEFT JOIN usergoals g ON g.user_id = u.user_id
    ${whereClause}
    ORDER BY ${safeSortBy === 'full_name' ? 'u.full_name' : safeSortBy === 'created_at' ? 'u.created_at' : 'u.user_id'} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;

  const [countRows] = await pool.query(countQuery, params);
  const total = Number((countRows as Array<{ total: number }>)[0]?.total ?? 0);

  const [rows] = await pool.query(dataQuery, [...params, safeLimit, offset]);

  return {
    data: (rows as UserRow[]).map(mapDbToUser),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

// ──────────────────────────────────────────────
// User Management - Get User By ID
// ──────────────────────────────────────────────
export const getUserByIdService = async (userId: number) => {
  if (!userId || userId <= 0) {
    throw new AdminServiceError('Invalid user ID', 'INVALID_USER_ID', 400);
  }

  const [rows] = await pool.query(
    `
    SELECT
      u.user_id,
      u.account_id,
      u.full_name,
      u.gender,
      u.age,
      u.height,
      u.weight,
      u.has_completed_setup,
      u.created_at,
      a.email,
      a.status,
      a.email_verified,
      r.role_name,
      g.goal_type,
      g.target_weight,
      g.target_calories,
      g.activity_level
    FROM users u
    LEFT JOIN accounts a ON a.account_id = u.account_id
    LEFT JOIN accountroles ar ON ar.account_id = u.account_id
    LEFT JOIN roles r ON r.role_id = ar.role_id
    LEFT JOIN usergoals g ON g.user_id = u.user_id
    WHERE u.user_id = ?
    LIMIT 1
    `,
    [userId]
  );

  const user = (rows as UserRow[])[0];

  if (!user) {
    throw new AdminServiceError('User not found', 'USER_NOT_FOUND', 404);
  }

  console.log('DEBUG getUserByIdService - user row:', user);
  const mappedUser = mapDbToUser(user);
  console.log('DEBUG getUserByIdService - mapped user:', mappedUser);
  return mappedUser;
};

// ──────────────────────────────────────────────
// User Management - Create User
// ──────────────────────────────────────────────
export const createUserService = async (payload: CreateUserPayload) => {
  const { email, fullName, gender, age, height, weight } = payload;

  if (!email || !fullName) {
    throw new AdminServiceError('Email and full name are required', 'MISSING_FIELDS', 400);
  }

  validateEmail(email);

  if (fullName.trim().length < 2) {
    throw new AdminServiceError('Full name must be at least 2 characters', 'INVALID_NAME', 400);
  }

  if (gender && !VALID_GENDERS.includes(gender)) {
    throw new AdminServiceError('Gender must be male, female, or other', 'INVALID_GENDER', 400);
  }

  if (height !== undefined && (height <= 0 || height > 300)) {
    throw new AdminServiceError('Height must be between 0 and 300 cm', 'INVALID_HEIGHT', 400);
  }

  if (weight !== undefined && (weight <= 0 || weight > 500)) {
    throw new AdminServiceError('Weight must be between 0 and 500 kg', 'INVALID_WEIGHT', 400);
  }

  const [existing] = await pool.query(
    `SELECT account_id FROM accounts WHERE LOWER(email) = LOWER(?) LIMIT 1`,
    [email]
  );

  if ((existing as AccountRow[]).length > 0) {
    throw new AdminServiceError('Email already exists', 'EMAIL_EXISTS', 409);
  }

  const tempPassword = generateTempPassword();
  const passwordHash = hashPassword(tempPassword);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [accountResult] = await connection.query(
      `INSERT INTO accounts (email, password_hash, email_verified, status)
       VALUES (?, ?, 1, 'active')`,
      [email.toLowerCase().trim(), passwordHash]
    );
    const accountId = (accountResult as { insertId: number }).insertId;

    const [userResult] = await connection.query(
      `INSERT INTO users (account_id, full_name, gender, age, height, weight, has_completed_setup)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [accountId, fullName.trim(), gender ?? null, age ?? null, height ?? null, weight ?? null]
    );
    const userId = (userResult as { insertId: number }).insertId;

    const [roleRows] = await connection.query(
      `SELECT role_id FROM roles WHERE LOWER(role_name) = 'user' LIMIT 1`
    );
    const userRoleId = (roleRows as Array<{ role_id: number }>)[0]?.role_id;

    if (userRoleId) {
      await connection.query(
        `INSERT INTO accountroles (account_id, role_id) VALUES (?, ?)`,
        [accountId, userRoleId]
      );
    }

    await connection.commit();

    const newUser = await getUserByIdService(userId);
    return {
      user: newUser,
      tempPassword,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ──────────────────────────────────────────────
// User Management - Update User Profile
// ──────────────────────────────────────────────
export const updateUserService = async (userId: number, payload: UpdateUserPayload) => {
  if (!userId || userId <= 0) {
    throw new AdminServiceError('Invalid user ID', 'INVALID_USER_ID', 400);
  }

  const { fullName, gender, age, height, weight } = payload;

  const [existingRows] = await pool.query(
    `SELECT user_id FROM users WHERE user_id = ? LIMIT 1`,
    [userId]
  );

  if (!(existingRows as Array<{ user_id: number }>).length) {
    throw new AdminServiceError('User not found', 'USER_NOT_FOUND', 404);
  }

  if (fullName !== undefined && fullName.trim().length < 2) {
    throw new AdminServiceError('Full name must be at least 2 characters', 'INVALID_NAME', 400);
  }

  if (gender !== undefined && !VALID_GENDERS.includes(gender)) {
    throw new AdminServiceError('Gender must be male, female, or other', 'INVALID_GENDER', 400);
  }

  if (age !== undefined && (age <= 0 || age > 200)) {
    throw new AdminServiceError('Age must be between 0 and 200', 'INVALID_AGE', 400);
  }

  if (height !== undefined && (height <= 0 || height > 300)) {
    throw new AdminServiceError('Height must be between 0 and 300 cm', 'INVALID_HEIGHT', 400);
  }

  if (weight !== undefined && (weight <= 0 || weight > 500)) {
    throw new AdminServiceError('Weight must be between 0 and 500 kg', 'INVALID_WEIGHT', 400);
  }

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (fullName !== undefined) {
    updates.push(`full_name = ?`);
    params.push(fullName.trim());
  }
  if (gender !== undefined) {
    updates.push(`gender = ?`);
    params.push(gender);
  }
  if (age !== undefined) {
    updates.push(`age = ?`);
    params.push(age || null);
  }
  if (height !== undefined) {
    updates.push(`height = ?`);
    params.push(height || null);
  }
  if (weight !== undefined) {
    updates.push(`weight = ?`);
    params.push(weight || null);
  }

  if (updates.length === 0) {
    throw new AdminServiceError('No fields to update', 'NO_UPDATES', 400);
  }

  console.log('[AdminService] UPDATE users SET', updates, 'WHERE user_id =', userId, params);
  await pool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
    [...params, userId]
  );

  return getUserByIdService(userId);
};

// ──────────────────────────────────────────────
// User Management - Update User Status
// ──────────────────────────────────────────────
export const updateUserStatusService = async (userId: number, payload: UpdateUserStatusPayload) => {
  if (!userId || userId <= 0) {
    throw new AdminServiceError('Invalid user ID', 'INVALID_USER_ID', 400);
  }

  const { status } = payload;

  if (!VALID_STATUSES.includes(status)) {
    throw new AdminServiceError(
      `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      'INVALID_STATUS',
      400
    );
  }

  const [userRows] = await pool.query(
    `SELECT account_id FROM users WHERE user_id = ? LIMIT 1`,
    [userId]
  );

  const user = (userRows as Array<{ account_id: number }>)[0];

  if (!user) {
    throw new AdminServiceError('User not found', 'USER_NOT_FOUND', 404);
  }

  await pool.query(
    `UPDATE accounts SET status = ? WHERE account_id = ?`,
    [status, user.account_id]
  );

  return getUserByIdService(userId);
};

// ──────────────────────────────────────────────
// User Management - Delete User
// ──────────────────────────────────────────────
export const deleteUserService = async (userId: number) => {
  if (!userId || userId <= 0) {
    throw new AdminServiceError('Invalid user ID', 'INVALID_USER_ID', 400);
  }

  const [userRows] = await pool.query(
    `SELECT account_id, user_id FROM users WHERE user_id = ? LIMIT 1`,
    [userId]
  );

  const user = (userRows as Array<{ account_id: number; user_id: number }>)[0];

  if (!user) {
    throw new AdminServiceError('User not found', 'USER_NOT_FOUND', 404);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(`DELETE FROM dailynutritionlogs WHERE user_id = ?`, [userId]);
    await connection.query(`DELETE FROM mealitems WHERE meal_id IN (SELECT meal_id FROM meals WHERE user_id = ?)`, [userId]);
    await connection.query(`DELETE FROM meals WHERE user_id = ?`, [userId]);
    await connection.query(`DELETE FROM foodrecognitionresults WHERE image_id IN (SELECT image_id FROM foodimages WHERE user_id = ?)`, [userId]);
    await connection.query(`DELETE FROM foodimages WHERE user_id = ?`, [userId]);
    await connection.query(`DELETE FROM chatmessages WHERE session_id IN (SELECT session_id FROM chatsessions WHERE user_id = ?)`, [userId]);
    await connection.query(`DELETE FROM chatsessions WHERE user_id = ?`, [userId]);
    await connection.query(`DELETE FROM usergoals WHERE user_id = ?`, [userId]);
    await connection.query(`DELETE FROM accountroles WHERE account_id = ?`, [user.account_id]);
    await connection.query(`DELETE FROM users WHERE user_id = ?`, [userId]);
    await connection.query(`DELETE FROM accounts WHERE account_id = ?`, [user.account_id]);

    await connection.commit();
    return { deleted: true, userId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ──────────────────────────────────────────────
// User Management - Bulk Update Status
// ──────────────────────────────────────────────
export const bulkUpdateUserStatusService = async (userIds: number[], status: string) => {
  if (!userIds || userIds.length === 0) {
    throw new AdminServiceError('User IDs are required', 'MISSING_USER_IDS', 400);
  }

  if (!VALID_STATUSES.includes(status)) {
    throw new AdminServiceError(
      `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      'INVALID_STATUS',
      400
    );
  }

  if (userIds.length > 100) {
    throw new AdminServiceError('Cannot update more than 100 users at once', 'TOO_MANY_USERS', 400);
  }

  const placeholders = userIds.map(() => '?').join(', ');
  await pool.query(
    `UPDATE accounts
     SET status = ?
     WHERE account_id IN (
       SELECT account_id FROM users WHERE user_id IN (${placeholders})
     )`,
    [status, ...userIds]
  );

  return { updated: userIds.length, status };
};

// ──────────────────────────────────────────────
// User Management - Get User Statistics
// ──────────────────────────────────────────────
export const getUserStatisticsService = async (userId: number) => {
  if (!userId || userId <= 0) {
    throw new AdminServiceError('Invalid user ID', 'INVALID_USER_ID', 400);
  }

  const [userRows] = await pool.query(
    `SELECT user_id FROM users WHERE user_id = ? LIMIT 1`,
    [userId]
  );

  if (!(userRows as Array<{ user_id: number }>).length) {
    throw new AdminServiceError('User not found', 'USER_NOT_FOUND', 404);
  }

  const [mealCountRows] = await pool.query(
    `SELECT COUNT(*) AS totalMeals FROM meals WHERE user_id = ?`,
    [userId]
  );
  const [caloriesRows] = await pool.query(
    `SELECT COALESCE(SUM(mi.calories), 0) AS totalCalories
     FROM mealitems mi
     INNER JOIN meals m ON m.meal_id = mi.meal_id
     WHERE m.user_id = ? AND m.meal_date = CURDATE()`,
    [userId]
  );
  const [chatCountRows] = await pool.query(
    `SELECT COUNT(*) AS totalChats FROM chatsessions WHERE user_id = ?`,
    [userId]
  );

  return {
    totalMeals: Number((mealCountRows as Array<{ totalMeals: number }>)[0]?.totalMeals ?? 0),
    todayCalories: Number((caloriesRows as Array<{ totalCalories: number }>)[0]?.totalCalories ?? 0),
    totalChats: Number((chatCountRows as Array<{ totalChats: number }>)[0]?.totalChats ?? 0),
  };
};

// ──────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────
// Food Library
export const getAdminFoodsService = async (filters: FoodFilters = {}) => {
  const {
    search,
    category,
    page = 1,
    limit = 20,
  } = filters;

  const safePage = Math.max(1, Number(page));
  const safeLimit = Math.min(100, Math.max(1, Number(limit)));
  const offset = (safePage - 1) * safeLimit;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search?.trim()) {
    conditions.push(`f.food_name LIKE ?`);
    params.push(`%${search.trim()}%`);
  }

  if (category?.trim()) {
    conditions.push(`LOWER(fc.category_name) = LOWER(?)`);
    params.push(category.trim());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM foods f
      LEFT JOIN foodcategories fc ON fc.category_id = f.category_id
      ${whereClause}
    `,
    params
  );
  const total = Number((countRows as Array<{ total: number }>)[0]?.total ?? 0);

  const [rows] = await pool.query(
    `
      SELECT
        f.food_id,
        f.food_name,
        f.category_id,
        fc.category_name,
        f.calories,
        f.protein,
        f.carbs,
        f.fat,
        f.fiber,
        f.sugar,
        f.sodium,
        f.serving_size,
        f.image_path,
        f.created_at
      FROM foods f
      LEFT JOIN foodcategories fc ON fc.category_id = f.category_id
      ${whereClause}
      ORDER BY f.food_name ASC
      LIMIT ? OFFSET ?
    `,
    [...params, safeLimit, offset]
  );

  return {
    data: (rows as FoodRow[]).map(mapDbToFood),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const getAdminFoodByIdService = async (foodId: number) => {
  if (!foodId || foodId <= 0) {
    throw new AdminServiceError('Invalid food ID', 'INVALID_FOOD_ID', 400);
  }

  const [rows] = await pool.query(
    `
      SELECT
        f.food_id,
        f.food_name,
        f.category_id,
        fc.category_name,
        f.calories,
        f.protein,
        f.carbs,
        f.fat,
        f.fiber,
        f.sugar,
        f.sodium,
        f.serving_size,
        f.image_path,
        f.created_at
      FROM foods f
      LEFT JOIN foodcategories fc ON fc.category_id = f.category_id
      WHERE f.food_id = ?
      LIMIT 1
    `,
    [foodId]
  );

  const food = (rows as FoodRow[])[0];
  if (!food) {
    throw new AdminServiceError('Food not found', 'FOOD_NOT_FOUND', 404);
  }

  return mapDbToFood(food);
};

export const createAdminFoodService = async (payload: FoodPayload) => {
  validateFoodPayload(payload, true);

  const categoryId = await ensureFoodCategory(payload.category ?? null, payload.name);
  const [insertResult] = await pool.query(
    `
      INSERT INTO foods
        (food_name, category_id, calories, protein, carbs, fat, fiber, sugar, sodium, serving_size, image_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.name?.trim(),
      categoryId,
      payload.calories ?? 0,
      payload.protein ?? 0,
      payload.carbs ?? 0,
      payload.fats ?? 0,
      payload.fiber ?? null,
      payload.sugar ?? null,
      payload.sodium ?? null,
      normalizeServingSize(payload.servingSize, payload.name),
      payload.imagePath?.trim() || null,
    ]
  );

  return getAdminFoodByIdService((insertResult as { insertId: number }).insertId);
};

export interface BulkImportFoodResult {
  total: number;
  inserted: number;
  failed: Array<{ index: number; name: string | null; error: string }>;
}

/**
 * Bulk-insert nhiều food trong một lần admin upload dataset. Mỗi row đi qua
 * cùng validation như createAdminFoodService nhưng KHÔNG dừng cả batch khi
 * 1 row lỗi — trả về danh sách lỗi để admin sửa và import lại.
 */
export const bulkImportAdminFoodsService = async (
  rows: FoodPayload[]
): Promise<BulkImportFoodResult> => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AdminServiceError('No rows provided', 'EMPTY_IMPORT', 400);
  }
  if (rows.length > 5000) {
    throw new AdminServiceError(
      'Tối đa 5000 dòng / lần import',
      'IMPORT_TOO_LARGE',
      400
    );
  }

  const result: BulkImportFoodResult = {
    total: rows.length,
    inserted: 0,
    failed: [],
  };

  for (let i = 0; i < rows.length; i += 1) {
    const payload = rows[i];
    try {
      validateFoodPayload(payload, true);
      const categoryId = await ensureFoodCategory(payload.category ?? null, payload.name);
      await pool.query(
        `
          INSERT INTO foods
            (food_name, category_id, calories, protein, carbs, fat, fiber, sugar, sodium, serving_size, image_path)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          payload.name?.trim(),
          categoryId,
          payload.calories ?? 0,
          payload.protein ?? 0,
          payload.carbs ?? 0,
          payload.fats ?? 0,
          payload.fiber ?? null,
          payload.sugar ?? null,
          payload.sodium ?? null,
          normalizeServingSize(payload.servingSize, payload.name),
          payload.imagePath?.trim() || null,
        ]
      );
      result.inserted += 1;
    } catch (err) {
      const message =
        err instanceof AdminServiceError ? err.message :
        err instanceof Error ? err.message : 'Unknown error';
      result.failed.push({
        index: i,
        name: payload.name ?? null,
        error: message,
      });
    }
  }

  return result;
};

export const updateAdminFoodService = async (foodId: number, payload: FoodPayload) => {
  if (!foodId || foodId <= 0) {
    throw new AdminServiceError('Invalid food ID', 'INVALID_FOOD_ID', 400);
  }
  validateFoodPayload(payload, false);

  await getAdminFoodByIdService(foodId);

  const updates: string[] = [];
  const params: Array<string | number | null> = [];

  if (payload.name !== undefined) {
    if (!payload.name.trim()) {
      throw new AdminServiceError('Food name is required', 'MISSING_FOOD_NAME', 400);
    }
    updates.push(`food_name = ?`);
    params.push(payload.name.trim());
  }

  if (payload.category !== undefined) {
    updates.push(`category_id = ?`);
    params.push(await ensureFoodCategory(payload.category, payload.name));
  }

  if (payload.calories !== undefined) {
    updates.push(`calories = ?`);
    params.push(payload.calories);
  }
  if (payload.protein !== undefined) {
    updates.push(`protein = ?`);
    params.push(payload.protein);
  }
  if (payload.carbs !== undefined) {
    updates.push(`carbs = ?`);
    params.push(payload.carbs);
  }
  if (payload.fats !== undefined) {
    updates.push(`fat = ?`);
    params.push(payload.fats);
  }
  if (payload.fiber !== undefined) {
    updates.push(`fiber = ?`);
    params.push(payload.fiber);
  }
  if (payload.sugar !== undefined) {
    updates.push(`sugar = ?`);
    params.push(payload.sugar);
  }
  if (payload.sodium !== undefined) {
    updates.push(`sodium = ?`);
    params.push(payload.sodium);
  }
  if (payload.servingSize !== undefined) {
    updates.push(`serving_size = ?`);
    params.push(normalizeServingSize(payload.servingSize, payload.name));
  }
  if (payload.imagePath !== undefined) {
    updates.push(`image_path = ?`);
    params.push(payload.imagePath.trim() || null);
  }

  if (updates.length === 0) {
    throw new AdminServiceError('No fields to update', 'NO_UPDATES', 400);
  }

  await pool.query(`UPDATE foods SET ${updates.join(', ')} WHERE food_id = ?`, [...params, foodId]);
  return getAdminFoodByIdService(foodId);
};

export const deleteAdminFoodService = async (foodId: number) => {
  if (!foodId || foodId <= 0) {
    throw new AdminServiceError('Invalid food ID', 'INVALID_FOOD_ID', 400);
  }

  await getAdminFoodByIdService(foodId);
  await pool.query(`DELETE FROM foods WHERE food_id = ?`, [foodId]);
  return { deleted: true, foodId };
};

export const getFoodCategoriesService = async () => {
  const [rows] = await pool.query(
    `SELECT category_id, category_name FROM foodcategories ORDER BY category_name ASC`
  );

  return (rows as Array<{ category_id: number; category_name: string }>).map(row => ({
    id: row.category_id,
    name: row.category_name,
  }));
};

export const createAdminAuditLogService = async ({
  adminAccountId,
  action,
  targetType,
  targetId,
  detail,
}: AuditLogPayload) => {
  await ensureAdminSecuritySchema();
  await pool.query(
    `
      INSERT INTO adminauditlogs (admin_account_id, action, target_type, target_id, detail)
      VALUES (?, ?, ?, ?, ?)
    `,
    [adminAccountId ?? null, action, targetType, targetId ?? null, detail ?? null]
  );
};

export const getAdminSecurityOverviewService = async () => {
  await ensureAdminSecuritySchema();

  const [rows] = await pool.query(`
    SELECT
      (SELECT COUNT(*)
       FROM accounts a
       INNER JOIN accountroles ar ON ar.account_id = a.account_id
       INNER JOIN roles r ON r.role_id = ar.role_id
       WHERE LOWER(r.role_name) = 'admin') AS adminAccounts,
      (SELECT COUNT(*) FROM accounts WHERE LOWER(status) = 'active') AS activeAccounts,
      (SELECT COUNT(*) FROM accounts WHERE LOWER(status) = 'suspended') AS suspendedAccounts,
      (SELECT COUNT(*) FROM accounts WHERE COALESCE(email_verified, 0) = 0) AS unverifiedAccounts,
      (SELECT COUNT(*) FROM adminauditlogs) AS auditEvents
  `);

  const overview = (rows as Array<{
    adminAccounts: number;
    activeAccounts: number;
    suspendedAccounts: number;
    unverifiedAccounts: number;
    auditEvents: number;
  }>)[0];

  return {
    adminAccounts: Number(overview?.adminAccounts ?? 0),
    activeAccounts: Number(overview?.activeAccounts ?? 0),
    suspendedAccounts: Number(overview?.suspendedAccounts ?? 0),
    unverifiedAccounts: Number(overview?.unverifiedAccounts ?? 0),
    auditEvents: Number(overview?.auditEvents ?? 0),
  };
};

export const getRoleAccountsService = async () => {
  const [rows] = await pool.query(`
    SELECT
      a.account_id,
      a.email,
      a.status,
      a.email_verified,
      u.user_id,
      u.full_name,
      r.role_name
    FROM accounts a
    LEFT JOIN users u ON u.account_id = a.account_id
    LEFT JOIN accountroles ar ON ar.account_id = a.account_id
    LEFT JOIN roles r ON r.role_id = ar.role_id
    ORDER BY a.account_id ASC
  `);

  return (rows as Array<{
    account_id: number;
    email: string;
    status: string | null;
    email_verified: number | null;
    user_id: number | null;
    full_name: string | null;
    role_name: string | null;
  }>).map(row => ({
    accountId: row.account_id,
    userId: row.user_id,
    name: row.full_name ?? row.email,
    email: row.email,
    role: (row.role_name ?? 'user').toLowerCase(),
    status: row.status ?? 'active',
    emailVerified: Boolean(row.email_verified),
  }));
};

export const updateAccountRoleService = async (accountId: number, role: 'admin' | 'user') => {
  if (!accountId || accountId <= 0) {
    throw new AdminServiceError('Invalid account ID', 'INVALID_ACCOUNT_ID', 400);
  }

  const [accountRows] = await pool.query(`SELECT account_id, email FROM accounts WHERE account_id = ? LIMIT 1`, [accountId]);
  const account = (accountRows as Array<{ account_id: number; email: string }>)[0];
  if (!account) {
    throw new AdminServiceError('Account not found', 'ACCOUNT_NOT_FOUND', 404);
  }

  if (role !== 'admin' && role !== 'user') {
    throw new AdminServiceError('Invalid role', 'INVALID_ROLE', 400);
  }

  const [currentRoleRows] = await pool.query(
    `
      SELECT r.role_name
      FROM accountroles ar
      INNER JOIN roles r ON r.role_id = ar.role_id
      WHERE ar.account_id = ?
      LIMIT 1
    `,
    [accountId]
  );
  const currentRole = ((currentRoleRows as Array<{ role_name: string }>)[0]?.role_name ?? 'user').toLowerCase();

  if (currentRole === 'admin' && role === 'user') {
    const [adminCountRows] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM accountroles ar
      INNER JOIN roles r ON r.role_id = ar.role_id
      WHERE LOWER(r.role_name) = 'admin'
    `);
    const adminCount = Number((adminCountRows as Array<{ total: number }>)[0]?.total ?? 0);
    if (adminCount <= 1) {
      throw new AdminServiceError('Cannot demote the last admin account', 'LAST_ADMIN_REQUIRED', 400);
    }
  }

  const [roleRows] = await pool.query(`SELECT role_id FROM roles WHERE LOWER(role_name) = ? LIMIT 1`, [role]);
  let roleId = (roleRows as Array<{ role_id: number }>)[0]?.role_id;
  if (!roleId) {
    const [insertRole] = await pool.query(`INSERT INTO roles (role_name) VALUES (?)`, [role]);
    roleId = (insertRole as { insertId: number }).insertId;
  }

  await pool.query(`DELETE FROM accountroles WHERE account_id = ?`, [accountId]);
  await pool.query(`INSERT INTO accountroles (account_id, role_id) VALUES (?, ?)`, [accountId, roleId]);

  const accounts = await getRoleAccountsService();
  return accounts.find(item => item.accountId === accountId) ?? null;
};

export const getAdminAuditLogsService = async (limit = 50) => {
  await ensureAdminSecuritySchema();
  const safeLimit = Math.min(100, Math.max(1, Number(limit)));
  const [rows] = await pool.query(
    `
      SELECT
        l.log_id,
        l.admin_account_id,
        a.email AS admin_email,
        l.action,
        l.target_type,
        l.target_id,
        l.detail,
        l.created_at
      FROM adminauditlogs l
      LEFT JOIN accounts a ON a.account_id = l.admin_account_id
      ORDER BY l.created_at DESC, l.log_id DESC
      LIMIT ?
    `,
    [safeLimit]
  );

  return (rows as Array<{
    log_id: number;
    admin_account_id: number | null;
    admin_email: string | null;
    action: string;
    target_type: string;
    target_id: number | null;
    detail: string | null;
    created_at: string;
  }>).map(row => ({
    id: row.log_id,
    adminAccountId: row.admin_account_id,
    adminEmail: row.admin_email ?? 'system',
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    detail: row.detail,
    createdAt: row.created_at,
  }));
};

interface AdminProfileRow {
  account_id: number;
  email: string;
  status: string | null;
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password + '!1A';
}

function hashPassword(password: string): string {
  const crypto = require('crypto') as typeof import('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}
