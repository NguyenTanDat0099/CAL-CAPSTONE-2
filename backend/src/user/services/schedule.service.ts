import pool from '../../shared/database/db';

interface UserRow {
  user_id: number;
}

interface ScheduleItemInput {
  dayOffset?: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  serving?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  notes?: string | null;
  sortOrder?: number;
}

interface CreateSchedulePayload {
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  color?: string | null;
  targetCalories?: number | null;
  source?: 'manual' | 'chat' | 'shared';
  planPayload?: unknown;
  items?: ScheduleItemInput[];
}

interface UpdateSchedulePayload {
  name?: string;
  description?: string | null;
  startDate?: string;
  endDate?: string;
  color?: string | null;
  targetCalories?: number | null;
  achieved?: boolean;
}

interface ScheduleRow {
  schedule_id: number;
  user_id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  color: string;
  target_calories: number | null;
  source: 'manual' | 'chat' | 'shared';
  is_published: number;
  published_at: string | null;
  achieved: number;
  plan_payload: string | null;
  created_at: string;
  updated_at: string;
}

interface ScheduleItemRow {
  item_id: number;
  schedule_id: number;
  day_offset: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  serving: string | null;
  calories: string | number | null;
  protein: string | number | null;
  carbs: string | number | null;
  fat: string | number | null;
  notes: string | null;
  sort_order: number;
}

const resolveUser = async (accountId?: number | null): Promise<UserRow> => {
  if (!accountId) throw new Error('USER_NOT_FOUND');
  const [rows] = await pool.query(
    'SELECT user_id FROM users WHERE account_id = ? LIMIT 1',
    [accountId]
  );
  const user = (rows as UserRow[])[0];
  if (!user) throw new Error('USER_NOT_FOUND');
  return user;
};

const verifyOwner = async (userId: number, scheduleId: number) => {
  const [rows] = await pool.query(
    'SELECT schedule_id FROM mealschedules WHERE schedule_id = ? AND user_id = ? LIMIT 1',
    [scheduleId, userId]
  );
  return (rows as Array<{ schedule_id: number }>)[0] ?? null;
};

const toNumberOrNull = (value: string | number | null) => {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

const parsePlanPayload = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const formatDate = (value: string | Date) => {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
};

const mapItem = (row: ScheduleItemRow) => ({
  itemId: row.item_id,
  dayOffset: row.day_offset,
  mealType: row.meal_type,
  name: row.name,
  serving: row.serving,
  calories: toNumberOrNull(row.calories),
  protein: toNumberOrNull(row.protein),
  carbs: toNumberOrNull(row.carbs),
  fat: toNumberOrNull(row.fat),
  notes: row.notes,
  sortOrder: row.sort_order,
});

const mapSchedule = (row: ScheduleRow, items: ScheduleItemRow[]) => ({
  scheduleId: row.schedule_id,
  name: row.name,
  description: row.description,
  startDate: formatDate(row.start_date),
  endDate: formatDate(row.end_date),
  color: row.color,
  targetCalories: row.target_calories,
  source: row.source,
  isPublished: row.is_published === 1,
  publishedAt: row.published_at,
  achieved: row.achieved === 1,
  planPayload: parsePlanPayload(row.plan_payload),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  items: items.map(mapItem),
});

const fetchItems = async (scheduleIds: number[]) => {
  if (scheduleIds.length === 0) return new Map<number, ScheduleItemRow[]>();
  const placeholders = scheduleIds.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT item_id, schedule_id, day_offset, meal_type, name, serving,
            calories, protein, carbs, fat, notes, sort_order
     FROM mealscheduleitems
     WHERE schedule_id IN (${placeholders})
     ORDER BY day_offset ASC, sort_order ASC, item_id ASC`,
    scheduleIds
  );
  const grouped = new Map<number, ScheduleItemRow[]>();
  for (const row of rows as ScheduleItemRow[]) {
    const list = grouped.get(row.schedule_id) ?? [];
    list.push(row);
    grouped.set(row.schedule_id, list);
  }
  return grouped;
};

export const listUserSchedulesService = async (accountId: number | null | undefined) => {
  const user = await resolveUser(accountId);
  const [rows] = await pool.query(
    `SELECT * FROM mealschedules WHERE user_id = ? ORDER BY start_date ASC, schedule_id ASC`,
    [user.user_id]
  );
  const schedules = rows as ScheduleRow[];
  const itemsByScheduleId = await fetchItems(schedules.map(s => s.schedule_id));
  return schedules.map(s => mapSchedule(s, itemsByScheduleId.get(s.schedule_id) ?? []));
};

export const createScheduleService = async (
  accountId: number | null | undefined,
  payload: CreateSchedulePayload
) => {
  const user = await resolveUser(accountId);
  const name = payload.name?.trim();
  if (!name) throw new Error('NAME_REQUIRED');
  if (!payload.startDate || !payload.endDate) throw new Error('DATES_REQUIRED');
  if (payload.startDate > payload.endDate) throw new Error('INVALID_DATE_RANGE');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [insertResult] = await conn.query(
      `INSERT INTO mealschedules
        (user_id, name, description, start_date, end_date, color, target_calories, source, plan_payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.user_id,
        name,
        payload.description ?? null,
        payload.startDate,
        payload.endDate,
        payload.color ?? '#FB923C',
        payload.targetCalories ?? null,
        payload.source ?? 'manual',
        payload.planPayload ? JSON.stringify(payload.planPayload) : null,
      ]
    );
    const scheduleId = (insertResult as { insertId: number }).insertId;

    if (payload.items?.length) {
      for (let i = 0; i < payload.items.length; i++) {
        const item = payload.items[i];
        await conn.query(
          `INSERT INTO mealscheduleitems
            (schedule_id, day_offset, meal_type, name, serving, calories, protein, carbs, fat, notes, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            scheduleId,
            item.dayOffset ?? 0,
            item.mealType,
            item.name,
            item.serving ?? null,
            item.calories ?? null,
            item.protein ?? null,
            item.carbs ?? null,
            item.fat ?? null,
            item.notes ?? null,
            item.sortOrder ?? i,
          ]
        );
      }
    }

    await conn.commit();
    const [scheduleRows] = await conn.query(
      'SELECT * FROM mealschedules WHERE schedule_id = ?',
      [scheduleId]
    );
    const schedule = (scheduleRows as ScheduleRow[])[0];
    const itemsByScheduleId = await fetchItems([scheduleId]);
    return mapSchedule(schedule, itemsByScheduleId.get(scheduleId) ?? []);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const updateScheduleService = async (
  accountId: number | null | undefined,
  scheduleId: number,
  payload: UpdateSchedulePayload
) => {
  const user = await resolveUser(accountId);
  const owned = await verifyOwner(user.user_id, scheduleId);
  if (!owned) throw new Error('SCHEDULE_NOT_FOUND');

  const fields: string[] = [];
  const values: unknown[] = [];
  if (payload.name !== undefined) { fields.push('name = ?'); values.push(payload.name); }
  if (payload.description !== undefined) { fields.push('description = ?'); values.push(payload.description); }
  if (payload.startDate !== undefined) { fields.push('start_date = ?'); values.push(payload.startDate); }
  if (payload.endDate !== undefined) { fields.push('end_date = ?'); values.push(payload.endDate); }
  if (payload.color !== undefined) { fields.push('color = ?'); values.push(payload.color); }
  if (payload.targetCalories !== undefined) { fields.push('target_calories = ?'); values.push(payload.targetCalories); }
  if (payload.achieved !== undefined) { fields.push('achieved = ?'); values.push(payload.achieved ? 1 : 0); }

  if (fields.length > 0) {
    values.push(scheduleId);
    await pool.query(`UPDATE mealschedules SET ${fields.join(', ')} WHERE schedule_id = ?`, values);
  }

  const [rows] = await pool.query('SELECT * FROM mealschedules WHERE schedule_id = ?', [scheduleId]);
  const schedule = (rows as ScheduleRow[])[0];
  const itemsByScheduleId = await fetchItems([scheduleId]);
  return mapSchedule(schedule, itemsByScheduleId.get(scheduleId) ?? []);
};

export const deleteScheduleService = async (
  accountId: number | null | undefined,
  scheduleId: number
) => {
  const user = await resolveUser(accountId);
  const owned = await verifyOwner(user.user_id, scheduleId);
  if (!owned) throw new Error('SCHEDULE_NOT_FOUND');
  await pool.query('DELETE FROM mealschedules WHERE schedule_id = ?', [scheduleId]);
  return { deleted: true, scheduleId };
};

export const publishScheduleService = async (
  accountId: number | null | undefined,
  scheduleId: number,
  publish: boolean
) => {
  const user = await resolveUser(accountId);
  const owned = await verifyOwner(user.user_id, scheduleId);
  if (!owned) throw new Error('SCHEDULE_NOT_FOUND');
  await pool.query(
    'UPDATE mealschedules SET is_published = ?, published_at = ? WHERE schedule_id = ?',
    [publish ? 1 : 0, publish ? new Date() : null, scheduleId]
  );
  const [rows] = await pool.query('SELECT * FROM mealschedules WHERE schedule_id = ?', [scheduleId]);
  const schedule = (rows as ScheduleRow[])[0];
  const itemsByScheduleId = await fetchItems([scheduleId]);
  return mapSchedule(schedule, itemsByScheduleId.get(scheduleId) ?? []);
};

export const listDiscoverMealsService = async () => {
  const [rows] = await pool.query(
    `SELECT ms.*, u.full_name AS author_name
     FROM mealschedules ms
     JOIN users u ON u.user_id = ms.user_id
     WHERE ms.is_published = 1
     ORDER BY ms.published_at DESC, ms.schedule_id DESC
     LIMIT 60`
  );
  const schedules = rows as Array<ScheduleRow & { author_name: string | null }>;
  const itemsByScheduleId = await fetchItems(schedules.map(s => s.schedule_id));
  return schedules.map(s => ({
    ...mapSchedule(s, itemsByScheduleId.get(s.schedule_id) ?? []),
    authorName: s.author_name ?? 'Anonymous user',
  }));
};
