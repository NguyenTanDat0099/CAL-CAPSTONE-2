import pool from '../../shared/database/db';

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

const normalizeStatus = (status?: string | null) => (status || 'active').toLowerCase();

const mapDbToUser = (row: UserRow) => ({
  id: row.user_id,
  accountId: row.account_id,
  name: row.full_name ?? `User ${row.user_id}`,
  email: row.email ?? null,
  role: row.role_name ?? 'user',
  status: normalizeStatus(row.status),
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
    status: normalizeStatus(admin.status),
  };
};

// ──────────────────────────────────────────────
// Admin Stats
// ──────────────────────────────────────────────
export const getAdminStatsService = async () => {
  const [userRows] = await pool.query(`SELECT COUNT(*) AS totalUsers FROM users`);
  const [activeRows] = await pool.query(
    `SELECT COUNT(*) AS activeUsers FROM accounts WHERE LOWER(status) = 'active'`
  );
  const [inactiveRows] = await pool.query(
    `SELECT COUNT(*) AS inactiveUsers FROM accounts WHERE LOWER(status) != 'active'`
  );
  const [mealRows] = await pool.query(
    `SELECT COUNT(*) AS mealsLoggedToday FROM meals WHERE DATE(created_at) = CURDATE()`
  );
  const [analysisRows] = await pool.query(
    `SELECT COUNT(*) AS totalAnalyses FROM foodrecognitionresults`
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
    mealsLoggedToday: Number((mealRows as Array<{ mealsLoggedToday: number }>)[0]?.mealsLoggedToday ?? 0),
    totalAnalyses: Number((analysisRows as Array<{ totalAnalyses: number }>)[0]?.totalAnalyses ?? 0),
    totalChats: Number((chatRows as Array<{ totalChats: number }>)[0]?.totalChats ?? 0),
    systemStatus: 'running',
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

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (status && VALID_STATUSES.includes(status)) {
    conditions.push(`LOWER(a.status) = ?`);
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
  const [analysisCountRows] = await pool.query(
    `SELECT COUNT(*) AS totalAnalyses
     FROM foodrecognitionresults fr
     INNER JOIN foodimages fi ON fi.image_id = fr.image_id
     WHERE fi.user_id = ?`,
    [userId]
  );
  const [chatCountRows] = await pool.query(
    `SELECT COUNT(*) AS totalChats FROM chatsessions WHERE user_id = ?`,
    [userId]
  );

  return {
    totalMeals: Number((mealCountRows as Array<{ totalMeals: number }>)[0]?.totalMeals ?? 0),
    todayCalories: Number((caloriesRows as Array<{ totalCalories: number }>)[0]?.totalCalories ?? 0),
    totalAnalyses: Number((analysisCountRows as Array<{ totalAnalyses: number }>)[0]?.totalAnalyses ?? 0),
    totalChats: Number((chatCountRows as Array<{ totalChats: number }>)[0]?.totalChats ?? 0),
  };
};

// ──────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────
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
