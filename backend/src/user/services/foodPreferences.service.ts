import pool from '../../shared/database/db';

export type PreferenceType = 'favorite' | 'avoided' | 'disliked' | 'allergy';
export type PreferenceMealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'beverage' | 'any';

export interface FoodPreferenceRow {
  preference_id: number;
  user_id: number;
  food_name: string;
  preference_type: PreferenceType;
  meal_slot: PreferenceMealSlot;
  note: string | null;
  weight: number;
  source: 'user' | 'inferred';
  created_at: string;
  updated_at: string;
}

export interface FoodPreference {
  id: number;
  foodName: string;
  type: PreferenceType;
  mealSlot: PreferenceMealSlot;
  note: string | null;
  weight: number;
  source: 'user' | 'inferred';
  createdAt: string;
  updatedAt: string;
}

let initPromise: Promise<void> | null = null;

const initializeSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS userfoodpreferences (
      preference_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      food_name VARCHAR(255) NOT NULL,
      preference_type ENUM('favorite','avoided','disliked','allergy') NOT NULL DEFAULT 'favorite',
      meal_slot ENUM('breakfast','lunch','dinner','snack','beverage','any') DEFAULT 'any',
      note VARCHAR(500),
      weight DECIMAL(4,2) DEFAULT 1.00,
      source ENUM('user','inferred') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      UNIQUE KEY uk_user_food_type (user_id, food_name, preference_type),
      INDEX idx_userfoodprefs_user (user_id),
      INDEX idx_userfoodprefs_type (user_id, preference_type)
    )
  `);
};

const ensureSchema = () => {
  if (!initPromise) initPromise = initializeSchema();
  return initPromise;
};

const mapRow = (row: FoodPreferenceRow): FoodPreference => ({
  id: row.preference_id,
  foodName: row.food_name,
  type: row.preference_type,
  mealSlot: row.meal_slot,
  note: row.note,
  weight: Number(row.weight),
  source: row.source,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const resolveUserId = async (accountId: number | null | undefined): Promise<number | null> => {
  if (!accountId) return null;
  const [rows] = await pool.query(`SELECT user_id FROM users WHERE account_id = ? LIMIT 1`, [accountId]);
  const list = rows as Array<{ user_id: number }>;
  return list.length > 0 ? list[0].user_id : null;
};

export const listFoodPreferencesService = async (accountId?: number | null): Promise<FoodPreference[]> => {
  await ensureSchema();
  const userId = await resolveUserId(accountId);
  if (!userId) return [];
  const [rows] = await pool.query(
    `SELECT preference_id, user_id, food_name, preference_type, meal_slot, note, weight, source, created_at, updated_at
       FROM userfoodpreferences
      WHERE user_id = ?
      ORDER BY preference_type ASC, weight DESC, updated_at DESC`,
    [userId]
  );
  return (rows as FoodPreferenceRow[]).map(mapRow);
};

interface UpsertPayload {
  foodName: string;
  type: PreferenceType;
  mealSlot?: PreferenceMealSlot;
  note?: string | null;
  weight?: number;
  source?: 'user' | 'inferred';
}

export const upsertFoodPreferenceService = async (
  accountId: number | null | undefined,
  payload: UpsertPayload
): Promise<FoodPreference | null> => {
  await ensureSchema();
  const userId = await resolveUserId(accountId);
  if (!userId) return null;

  const foodName = payload.foodName?.trim();
  if (!foodName) return null;

  const mealSlot: PreferenceMealSlot = payload.mealSlot ?? 'any';
  const note = payload.note ?? null;
  const weight = payload.weight ?? 1.0;
  const source = payload.source ?? 'user';

  await pool.query(
    `INSERT INTO userfoodpreferences (user_id, food_name, preference_type, meal_slot, note, weight, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
        meal_slot = VALUES(meal_slot),
        note = VALUES(note),
        weight = VALUES(weight),
        source = VALUES(source),
        updated_at = CURRENT_TIMESTAMP`,
    [userId, foodName, payload.type, mealSlot, note, weight, source]
  );

  const [rows] = await pool.query(
    `SELECT preference_id, user_id, food_name, preference_type, meal_slot, note, weight, source, created_at, updated_at
       FROM userfoodpreferences
      WHERE user_id = ? AND food_name = ? AND preference_type = ?
      LIMIT 1`,
    [userId, foodName, payload.type]
  );
  const list = rows as FoodPreferenceRow[];
  return list.length > 0 ? mapRow(list[0]) : null;
};

export const deleteFoodPreferenceService = async (
  accountId: number | null | undefined,
  preferenceId: number
): Promise<boolean> => {
  await ensureSchema();
  const userId = await resolveUserId(accountId);
  if (!userId) return false;
  const [result] = await pool.query(
    `DELETE FROM userfoodpreferences WHERE preference_id = ? AND user_id = ?`,
    [preferenceId, userId]
  );
  return (result as { affectedRows: number }).affectedRows > 0;
};

/** Build a short text block summarizing the user's preferences for the LLM prompt. */
export const buildPreferenceSummary = (preferences: FoodPreference[]): string | null => {
  if (!preferences.length) return null;
  const grouped: Record<PreferenceType, string[]> = {
    favorite: [],
    avoided: [],
    disliked: [],
    allergy: [],
  };
  for (const pref of preferences) {
    if (grouped[pref.type].length >= 8) continue; // cap to keep prompt small
    grouped[pref.type].push(pref.foodName);
  }
  const parts: string[] = [];
  if (grouped.favorite.length) parts.push(`Món yêu thích: ${grouped.favorite.join(', ')}`);
  if (grouped.avoided.length) parts.push(`Né: ${grouped.avoided.join(', ')}`);
  if (grouped.disliked.length) parts.push(`Không thích: ${grouped.disliked.join(', ')}`);
  if (grouped.allergy.length) parts.push(`Dị ứng: ${grouped.allergy.join(', ')}`);
  return parts.join('\n');
};
