import { RowDataPacket } from 'mysql2';
import pool from '../../shared/database/db';
import {
  beginJobRun,
  createNotification,
  finishJobRun,
} from '../services/notification.service';

export const JOB_NAME = 'daily_summary';

interface DailyRow extends RowDataPacket {
  user_id: number;
  log_date: string; // "YYYY-MM-DD"
  total_calories: string | null;
  total_protein: string | null;
  total_carbs: string | null;
  total_fat: string | null;
  target_calories: number | null;
  target_protein: number | null;
  target_carbs: number | null;
  target_fat: number | null;
  goal_type: string | null;
}

// Pull each user's nutrition log for today and join with the latest usergoals
// row per user (window function ranked by goal_id DESC).
const SELECT_TODAYS_LOGS = `
  WITH latest_goal AS (
    SELECT user_id, target_calories, target_protein, target_carbs, target_fat, goal_type,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY goal_id DESC) AS rn
    FROM usergoals
  )
  SELECT
    d.user_id,
    DATE_FORMAT(d.date, '%Y-%m-%d') AS log_date,
    d.total_calories,
    d.total_protein,
    d.total_carbs,
    d.total_fat,
    g.target_calories,
    g.target_protein,
    g.target_carbs,
    g.target_fat,
    g.goal_type
  FROM dailynutritionlogs d
  LEFT JOIN latest_goal g ON g.user_id = d.user_id AND g.rn = 1
  WHERE d.date = CURDATE()
`;

const num = (v: string | number | null): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
};

const round = (n: number): number => Math.round(n);

interface SummaryMessage {
  title: string;
  message: string;
  status: 'under' | 'on_target' | 'over' | 'no_target';
}

const buildSummary = (row: DailyRow): SummaryMessage => {
  const cals = round(num(row.total_calories));
  const protein = round(num(row.total_protein));
  const carbs = round(num(row.total_carbs));
  const fat = round(num(row.total_fat));
  const target = num(row.target_calories);

  const macroLine = `Protein ${protein}g · Carb ${carbs}g · Fat ${fat}g`;

  if (target <= 0) {
    return {
      status: 'no_target',
      title: '📊 Tổng kết dinh dưỡng hôm nay',
      message: `Bạn đã nạp ${cals} kcal. ${macroLine}. Hãy đặt mục tiêu để theo dõi tiến độ nhé!`,
    };
  }

  const pct = (cals / target) * 100;

  if (pct < 90) {
    const missing = round(target - cals);
    return {
      status: 'under',
      title: '📝 Bạn chưa đạt mục tiêu hôm nay',
      message: `Nạp ${cals}/${target} kcal (${round(pct)}%). Còn thiếu ${missing} kcal. ${macroLine}.`,
    };
  }

  if (pct <= 110) {
    return {
      status: 'on_target',
      title: '✅ Hoàn hảo! Đạt mục tiêu hôm nay',
      message: `Bạn ăn ${cals}/${target} kcal (${round(pct)}%). ${macroLine}. Giữ phong độ nhé!`,
    };
  }

  const excess = round(cals - target);
  return {
    status: 'over',
    title: '⚠️ Đã vượt mục tiêu hôm nay',
    message: `Nạp ${cals}/${target} kcal (${round(pct)}%), vượt ${excess} kcal. ${macroLine}. Cân nhắc giảm ngày mai.`,
  };
};

export const runDailySummaryJob = async (): Promise<void> => {
  const runId = await beginJobRun(JOB_NAME);
  let created = 0;
  try {
    const [rows] = await pool.query<DailyRow[]>(SELECT_TODAYS_LOGS);

    for (const row of rows) {
      const summary = buildSummary(row);
      const id = await createNotification({
        userId: row.user_id,
        type: 'daily_summary',
        title: summary.title,
        message: summary.message,
        data: {
          date: row.log_date,
          totalCalories: round(num(row.total_calories)),
          totalProtein: round(num(row.total_protein)),
          totalCarbs: round(num(row.total_carbs)),
          totalFat: round(num(row.total_fat)),
          targetCalories: row.target_calories,
          status: summary.status,
        },
        dedupeKey: `daily:${row.user_id}:${row.log_date}`,
      });
      if (id) created += 1;
    }

    if (created > 0) {
      console.log(
        `[job:${JOB_NAME}] created ${created} summary notification(s) for ${rows.length} user(s) with logs today`
      );
    }
    await finishJobRun(runId, 'success', created);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[job:${JOB_NAME}] failed:`, message);
    await finishJobRun(runId, 'failed', created, message);
  }
};
