import { RowDataPacket } from 'mysql2';
import pool from '../../shared/database/db';
import {
  beginJobRun,
  createNotification,
  finishJobRun,
  type NotificationType,
} from '../services/notification.service';

export const JOB_NAME = 'goal_achievement';

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

interface PendingNotification {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  dedupeKey: string;
}

// ─── 1. Daily calorie target hit ─────────────────────────────────
interface CalorieHitRow extends RowDataPacket {
  user_id: number;
  total_calories: string;
  target_calories: number;
  log_date: string;
}

const detectCalorieGoals = async (): Promise<PendingNotification[]> => {
  const [rows] = await pool.query<CalorieHitRow[]>(`
    WITH latest_goal AS (
      SELECT user_id, target_calories,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY goal_id DESC) AS rn
      FROM usergoals
    )
    SELECT d.user_id, d.total_calories, g.target_calories,
           DATE_FORMAT(d.date, '%Y-%m-%d') AS log_date
    FROM dailynutritionlogs d
    JOIN latest_goal g ON g.user_id = d.user_id AND g.rn = 1
    WHERE d.date = CURDATE()
      AND g.target_calories > 0
      AND d.total_calories >= g.target_calories * 0.9
  `);

  return rows.map((row) => {
    const total = Math.round(Number(row.total_calories));
    const pct = Math.round((total / row.target_calories) * 100);
    return {
      userId: row.user_id,
      type: 'goal_achievement',
      title: '🎯 Đạt mục tiêu calo hôm nay!',
      message: `Bạn đã nạp ${total}/${row.target_calories} kcal (${pct}%). Tuyệt vời!`,
      data: { goalType: 'calorie_daily', date: row.log_date, totalCalories: total, targetCalories: row.target_calories },
      dedupeKey: `goal:cal_target:${row.user_id}:${row.log_date}`,
    };
  });
};

// ─── 2. Weight goal reached ──────────────────────────────────────
interface WeightHitRow extends RowDataPacket {
  user_id: number;
  weight: string;
  target_weight: string;
  goal_type: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'general';
}

const detectWeightGoals = async (): Promise<PendingNotification[]> => {
  const [rows] = await pool.query<WeightHitRow[]>(`
    WITH latest_goal AS (
      SELECT user_id, target_weight, goal_type,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY goal_id DESC) AS rn
      FROM usergoals
      WHERE target_weight IS NOT NULL
    ),
    latest_weight AS (
      SELECT user_id, weight,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY recorded_at DESC) AS rn
      FROM weight_history
    )
    SELECT g.user_id, w.weight, g.target_weight, g.goal_type
    FROM latest_goal g
    JOIN latest_weight w ON w.user_id = g.user_id AND w.rn = 1
    WHERE g.rn = 1
      AND (
        (g.goal_type = 'weight_loss'  AND w.weight <= g.target_weight + 0.5)
        OR (g.goal_type = 'muscle_gain' AND w.weight >= g.target_weight - 0.5)
        OR (g.goal_type IN ('maintenance','general') AND ABS(w.weight - g.target_weight) <= 0.5)
      )
  `);

  return rows.map((row) => {
    const current = Number(row.weight);
    const target = Number(row.target_weight);
    return {
      userId: row.user_id,
      type: 'goal_achievement',
      title: '🏆 Đạt cân nặng mục tiêu!',
      message: `Bạn đã chạm mốc ${target.toFixed(1)}kg (hiện tại ${current.toFixed(1)}kg). Chúc mừng!`,
      data: { goalType: 'weight_target', currentWeight: current, targetWeight: target, originalGoalType: row.goal_type },
      dedupeKey: `goal:weight_target:${row.user_id}:${target.toFixed(1)}`,
    };
  });
};

// ─── 3. Logging streak milestones ────────────────────────────────
interface LogDateRow extends RowDataPacket {
  user_id: number;
  log_date: string;
}

const detectStreaks = async (): Promise<PendingNotification[]> => {
  const [rows] = await pool.query<LogDateRow[]>(`
    SELECT user_id, DATE_FORMAT(date, '%Y-%m-%d') AS log_date
    FROM dailynutritionlogs
    WHERE date >= DATE_SUB(CURDATE(), INTERVAL 110 DAY)
    ORDER BY user_id, date DESC
  `);

  // Group dates per user, then count consecutive days ending today.
  // Format using local-date components (NOT toISOString — that returns UTC
  // and would be off by one day for any non-UTC server timezone).
  const fmtLocal = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const byUser = new Map<number, string[]>();
  for (const row of rows) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row.log_date);
    byUser.set(row.user_id, list);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = fmtLocal(today);
  const results: PendingNotification[] = [];

  for (const [userId, dates] of byUser) {
    if (dates[0] !== todayIso) continue; // streak only counts if today is logged
    let streak = 0;
    const cursor = new Date(today);
    for (const d of dates) {
      const expected = fmtLocal(cursor);
      if (d !== expected) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Fire on the exact milestone day (dedupe makes it idempotent if it ran late)
    if (!STREAK_MILESTONES.includes(streak)) continue;

    results.push({
      userId,
      type: 'goal_achievement',
      title: `🔥 ${streak} ngày liên tiếp log meal!`,
      message: `Bạn đã ghi nhật ký ăn uống ${streak} ngày liền. Giữ đà nhé!`,
      data: { goalType: 'streak', streakDays: streak },
      dedupeKey: `goal:streak:${userId}:${streak}`,
    });
  }

  return results;
};

// ─── Main job ────────────────────────────────────────────────────
export const runGoalAchievementJob = async (): Promise<void> => {
  const runId = await beginJobRun(JOB_NAME);
  let created = 0;
  try {
    const pending = [
      ...(await detectCalorieGoals()),
      ...(await detectWeightGoals()),
      ...(await detectStreaks()),
    ];

    for (const p of pending) {
      const id = await createNotification({
        userId: p.userId,
        type: p.type,
        title: p.title,
        message: p.message,
        data: p.data,
        dedupeKey: p.dedupeKey,
      });
      if (id) created += 1;
    }

    if (created > 0) {
      console.log(
        `[job:${JOB_NAME}] created ${created} achievement notification(s) from ${pending.length} candidate(s)`
      );
    }
    await finishJobRun(runId, 'success', created);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[job:${JOB_NAME}] failed:`, message);
    await finishJobRun(runId, 'failed', created, message);
  }
};
