import { RowDataPacket } from 'mysql2';
import pool from '../../shared/database/db';
import {
  beginJobRun,
  createNotification,
  finishJobRun,
} from '../services/notification.service';

export const JOB_NAME = 'weekly_weight_checkin';

interface WeightCheckInRow extends RowDataPacket {
  user_id: number;
  weight: string | number | null;
  target_weight: string | number | null;
  target_date: string | Date | null;
  latest_recorded_at: string | Date | null;
  week_key: string;
}

const SELECT_DUE_WEIGHT_CHECKINS = `
  WITH latest_weight AS (
    SELECT user_id, weight, recorded_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY recorded_at DESC, weight_history_id DESC) AS rn
    FROM weight_history
  ),
  latest_goal AS (
    SELECT user_id, target_weight, target_date,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY goal_id DESC) AS rn
    FROM usergoals
  )
  SELECT
    u.user_id,
    COALESCE(lw.weight, u.weight) AS weight,
    lg.target_weight,
    lg.target_date,
    lw.recorded_at AS latest_recorded_at,
    DATE_FORMAT(CURDATE(), '%x-%v') AS week_key
  FROM users u
  LEFT JOIN latest_weight lw ON lw.user_id = u.user_id AND lw.rn = 1
  LEFT JOIN latest_goal lg ON lg.user_id = u.user_id AND lg.rn = 1
  WHERE u.has_completed_setup = 1
    AND u.weight IS NOT NULL
    AND lg.target_weight IS NOT NULL
    AND (lw.recorded_at IS NULL OR lw.recorded_at <= DATE_SUB(NOW(), INTERVAL 7 DAY))
`;

const num = (value: string | number | null): number | null => {
  if (value == null) return null;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
};

const formatDate = (value: string | Date | null): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

export const runWeeklyWeightCheckInJob = async (): Promise<void> => {
  const runId = await beginJobRun(JOB_NAME);
  let created = 0;
  try {
    const [rows] = await pool.query<WeightCheckInRow[]>(SELECT_DUE_WEIGHT_CHECKINS);

    for (const row of rows) {
      const currentWeight = num(row.weight);
      const targetWeight = num(row.target_weight);
      const targetDate = formatDate(row.target_date);
      const id = await createNotification({
        userId: row.user_id,
        type: 'system',
        title: 'Nhập cân nặng hiện tại của bạn',
        message: 'Đã đến lịch cập nhật cân nặng hằng tuần. Hãy nhập cân nặng hiện tại để CalAI điều chỉnh meal plan theo mục tiêu của bạn.',
        data: {
          action: 'weight_checkin',
          currentWeight,
          targetWeight,
          targetDate,
          latestRecordedAt: formatDate(row.latest_recorded_at),
        },
        dedupeKey: `weight_checkin:${row.user_id}:${row.week_key}`,
      });
      if (id) created += 1;
    }

    if (created > 0) {
      console.log(`[job:${JOB_NAME}] created ${created} weekly weight check-in notification(s)`);
    }
    await finishJobRun(runId, 'success', created);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[job:${JOB_NAME}] failed:`, message);
    await finishJobRun(runId, 'failed', created, message);
  }
};
