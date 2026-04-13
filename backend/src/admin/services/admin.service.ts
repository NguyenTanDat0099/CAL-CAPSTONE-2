import pool from '../../shared/database/db';

interface AdminProfileRow {
  account_id: number | null;
  email: string | null;
  status: string | null;
}

export const getAdminProfileService = async () => {
  const [rows] = await pool.query(
    `
      SELECT a.account_id, a.email, a.status
      FROM accounts a
      INNER JOIN accountroles ar ON ar.account_id = a.account_id
      INNER JOIN roles r ON r.role_id = ar.role_id
      WHERE LOWER(r.role_name) = 'admin'
      ORDER BY a.account_id
      LIMIT 1
    `
  );

  const admin = (rows as AdminProfileRow[])[0];

  if (!admin) {
    return {
      id: 0,
      name: 'Admin CalAI',
      email: 'admin@calai.local',
      role: 'admin',
      status: 'active',
    };
  }

  return {
    id: admin.account_id ?? 0,
    name: 'Admin CalAI',
    email: admin.email ?? 'admin@calai.local',
    role: 'admin',
    status: admin.status ?? 'active',
  };
};

export const getAdminStatsService = async () => {
  const [userRows] = await pool.query(
    `
      SELECT COUNT(*) AS totalUsers
      FROM users
    `
  );
  const [activeRows] = await pool.query(
    `
      SELECT COUNT(*) AS activeUsers
      FROM accounts
      WHERE status = 'active'
    `
  );
  const [mealRows] = await pool.query(
    `
      SELECT COUNT(*) AS mealsLoggedToday
      FROM meals
      WHERE DATE(created_at) = CURDATE()
    `
  );
  const [analysisRows] = await pool.query(
    `
      SELECT COUNT(*) AS totalAnalyses
      FROM foodrecognitionresults
    `
  );

  return {
    totalUsers: Number((userRows as Array<{ totalUsers: number }>)[0]?.totalUsers ?? 0),
    activeUsers: Number((activeRows as Array<{ activeUsers: number }>)[0]?.activeUsers ?? 0),
    mealsLoggedToday: Number((mealRows as Array<{ mealsLoggedToday: number }>)[0]?.mealsLoggedToday ?? 0),
    totalAnalyses: Number((analysisRows as Array<{ totalAnalyses: number }>)[0]?.totalAnalyses ?? 0),
    systemStatus: 'running',
  };
};

export const getAllUsersService = async () => {
  const [rows] = await pool.query(
    `
      SELECT
        u.user_id,
        u.full_name,
        u.gender,
        u.height,
        u.weight,
        a.email,
        a.status
      FROM users u
      LEFT JOIN accounts a ON a.account_id = u.account_id
      ORDER BY u.user_id ASC
    `
  );

  return (rows as Array<{
    user_id: number;
    full_name: string | null;
    gender: string | null;
    height: number | null;
    weight: number | null;
    email: string | null;
    status: string | null;
  }>).map(row => ({
    id: row.user_id,
    name: row.full_name ?? `User ${row.user_id}`,
    email: row.email ?? `user${row.user_id}@calai.local`,
    role: 'user',
    status: row.status ?? 'active',
    gender: row.gender,
    height: row.height,
    weight: row.weight,
  }));
};
