import pool from '../../shared/database/db';
import { generateAiReply } from './ai-provider.service';

interface SessionRow {
  session_id: number;
  user_id: number | null;
  started_at: string;
}

interface MessageRow {
  message_id: number;
  session_id: number | null;
  sender: string | null;
  message_text: string | null;
  created_at: string;
}

const ensureSession = async (userId: number, sessionId?: number) => {
  if (sessionId) {
    const [rows] = await pool.query(
      'SELECT session_id, user_id, started_at FROM chatsessions WHERE session_id = ? AND user_id = ? LIMIT 1',
      [sessionId, userId]
    );
    const existing = (rows as SessionRow[])[0];
    if (existing) {
      return existing.session_id;
    }
  }

  const [insertResult] = await pool.query('INSERT INTO chatsessions (user_id) VALUES (?)', [userId]);
  return (insertResult as { insertId: number }).insertId;
};

const getUserContext = async (userId: number) => {
  const [userRows] = await pool.query(
    'SELECT full_name, gender, height, weight FROM users WHERE user_id = ? LIMIT 1',
    [userId]
  );
  const [goalRows] = await pool.query(
    `
      SELECT target_calories, target_weight
      FROM usergoals
      WHERE user_id = ?
      ORDER BY goal_id DESC
      LIMIT 1
    `,
    [userId]
  );
  const [summaryRows] = await pool.query(
    `
      SELECT total_calories, total_protein, total_carbs, total_fat
      FROM dailynutritionlogs
      WHERE user_id = ? AND date = CURDATE()
      LIMIT 1
    `,
    [userId]
  );
  const [mealRows] = await pool.query(
    `
      SELECT m.meal_type, f.food_name, ROUND(mi.calories) AS calories
      FROM meals m
      INNER JOIN mealitems mi ON mi.meal_id = m.meal_id
      INNER JOIN foods f ON f.food_id = mi.food_id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
      LIMIT 5
    `,
    [userId]
  );

  return {
    profile: ((userRows as Array<{
      full_name: string | null;
      gender: string | null;
      height: number | null;
      weight: number | null;
    }>)[0] ?? { full_name: null, gender: null, height: null, weight: null }) && {
      fullName:
        ((userRows as Array<{
          full_name: string | null;
          gender: string | null;
          height: number | null;
          weight: number | null;
        }>)[0]?.full_name) ?? null,
      gender:
        ((userRows as Array<{
          full_name: string | null;
          gender: string | null;
          height: number | null;
          weight: number | null;
        }>)[0]?.gender) ?? null,
      height:
        ((userRows as Array<{
          full_name: string | null;
          gender: string | null;
          height: number | null;
          weight: number | null;
        }>)[0]?.height) ?? null,
      weight:
        ((userRows as Array<{
          full_name: string | null;
          gender: string | null;
          height: number | null;
          weight: number | null;
        }>)[0]?.weight) ?? null,
    },
    goals: (goalRows as Array<{ target_calories: number | null; target_weight: number | null }>)[0]
      ? {
          targetCalories:
            (goalRows as Array<{ target_calories: number | null; target_weight: number | null }>)[0].target_calories,
          targetWeight:
            (goalRows as Array<{ target_calories: number | null; target_weight: number | null }>)[0].target_weight,
        }
      : null,
    dailySummary: (summaryRows as Array<{
      total_calories: number;
      total_protein: number;
      total_carbs: number;
      total_fat: number;
    }>)[0]
      ? {
          totalCalories:
            (summaryRows as Array<{
              total_calories: number;
              total_protein: number;
              total_carbs: number;
              total_fat: number;
            }>)[0].total_calories,
          totalProtein:
            (summaryRows as Array<{
              total_calories: number;
              total_protein: number;
              total_carbs: number;
              total_fat: number;
            }>)[0].total_protein,
          totalCarbs:
            (summaryRows as Array<{
              total_calories: number;
              total_protein: number;
              total_carbs: number;
              total_fat: number;
            }>)[0].total_carbs,
          totalFat:
            (summaryRows as Array<{
              total_calories: number;
              total_protein: number;
              total_carbs: number;
              total_fat: number;
            }>)[0].total_fat,
        }
      : null,
    recentMeals: (mealRows as Array<{ meal_type: string; food_name: string; calories: number }>).map(row => ({
      mealType: row.meal_type,
      foodName: row.food_name,
      calories: row.calories,
    })),
  };
};

const insertMessage = async (sessionId: number, sender: 'user' | 'ai', message: string) => {
  const [insertResult] = await pool.query(
    'INSERT INTO chatmessages (session_id, sender, message_text) VALUES (?, ?, ?)',
    [sessionId, sender, message]
  );
  return (insertResult as { insertId: number }).insertId;
};

export const sendChatMessage = async (userId: number, message: string, sessionId?: number) => {
  const activeSessionId = await ensureSession(userId, sessionId);
  await insertMessage(activeSessionId, 'user', message);

  const context = await getUserContext(userId);
  const aiReply = await generateAiReply(message, context);

  await insertMessage(activeSessionId, 'ai', aiReply);

  const messages = await getChatMessages(userId, activeSessionId);
  return {
    sessionId: activeSessionId,
    reply: aiReply,
    messages,
  };
};

export const getChatSessions = async (userId: number) => {
  const [rows] = await pool.query(
    `
      SELECT
        cs.session_id,
        cs.started_at,
        (
          SELECT cm.message_text
          FROM chatmessages cm
          WHERE cm.session_id = cs.session_id
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) AS last_message
      FROM chatsessions cs
      WHERE cs.user_id = ?
      ORDER BY cs.started_at DESC
    `,
    [userId]
  );

  return (rows as Array<{ session_id: number; started_at: string; last_message: string | null }>).map(row => ({
    sessionId: row.session_id,
    startedAt: row.started_at,
    lastMessage: row.last_message ?? 'No messages yet',
  }));
};

export const getChatMessages = async (userId: number, sessionId: number) => {
  const [sessionRows] = await pool.query(
    'SELECT session_id FROM chatsessions WHERE session_id = ? AND user_id = ? LIMIT 1',
    [sessionId, userId]
  );

  if ((sessionRows as SessionRow[]).length === 0) {
    return [];
  }

  const [rows] = await pool.query(
    `
      SELECT message_id, session_id, sender, message_text, created_at
      FROM chatmessages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `,
    [sessionId]
  );

  return (rows as MessageRow[]).map(row => ({
    messageId: row.message_id,
    sessionId: row.session_id,
    sender: row.sender ?? 'ai',
    message: row.message_text ?? '',
    createdAt: row.created_at,
  }));
};

export const deleteChatSession = async (userId: number, sessionId: number) => {
  const [sessionRows] = await pool.query(
    'SELECT session_id FROM chatsessions WHERE session_id = ? AND user_id = ? LIMIT 1',
    [sessionId, userId]
  );

  if ((sessionRows as SessionRow[]).length === 0) {
    return { deleted: false };
  }

  await pool.query('DELETE FROM chatmessages WHERE session_id = ?', [sessionId]);
  await pool.query('DELETE FROM chatsessions WHERE session_id = ? AND user_id = ?', [sessionId, userId]);

  return { deleted: true };
};
