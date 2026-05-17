import { RowDataPacket } from 'mysql2';
import pool from '../../shared/database/db';
import {
  beginJobRun,
  createNotification,
  finishJobRun,
} from '../services/notification.service';

export const JOB_NAME = 'meal_reminder';

interface DueMealRow extends RowDataPacket {
  user_id: number;
  item_id: number;
  name: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  scheduled_time: string; // "HH:MM:SS"
  schedule_name: string;
  fire_date: string; // "YYYY-MM-DD"
}

const MEAL_LABEL_VI: Record<DueMealRow['meal_type'], string> = {
  breakfast: 'bữa sáng',
  lunch: 'bữa trưa',
  dinner: 'bữa tối',
  snack: 'bữa phụ',
};

const MEAL_EMOJI: Record<DueMealRow['meal_type'], string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
};

// Pulls every meal-schedule item whose computed fire-day equals today AND
// whose scheduled_time falls within the last 60 seconds. Joining mealschedules
// gives us the schedule start_date used to compute the fire-day from day_offset.
const SELECT_DUE_MEALS = `
  SELECT
    ms.user_id,
    msi.item_id,
    msi.name,
    msi.meal_type,
    msi.scheduled_time,
    ms.name AS schedule_name,
    DATE_FORMAT(DATE_ADD(ms.start_date, INTERVAL msi.day_offset DAY), '%Y-%m-%d') AS fire_date
  FROM mealscheduleitems msi
  JOIN mealschedules ms ON ms.schedule_id = msi.schedule_id
  WHERE msi.scheduled_time IS NOT NULL
    AND DATE_ADD(ms.start_date, INTERVAL msi.day_offset DAY) = CURDATE()
    AND TIME_TO_SEC(TIMEDIFF(CURTIME(), msi.scheduled_time)) BETWEEN 0 AND 60
`;

export const runMealReminderJob = async (): Promise<void> => {
  const runId = await beginJobRun(JOB_NAME);
  let created = 0;
  try {
    const [rows] = await pool.query<DueMealRow[]>(SELECT_DUE_MEALS);

    for (const row of rows) {
      const emoji = MEAL_EMOJI[row.meal_type] ?? '🔔';
      const label = MEAL_LABEL_VI[row.meal_type] ?? 'bữa ăn';
      const timeLabel = row.scheduled_time.slice(0, 5); // "HH:MM"
      const title = `${emoji} Đến giờ ${label}`;
      const message = `${row.name} • ${timeLabel} • ${row.schedule_name}`;

      const id = await createNotification({
        userId: row.user_id,
        type: 'meal_reminder',
        title,
        message,
        data: {
          itemId: row.item_id,
          mealType: row.meal_type,
          scheduledTime: timeLabel,
          scheduleName: row.schedule_name,
        },
        dedupeKey: `meal:${row.item_id}:${row.fire_date}`,
      });
      if (id) created += 1;
    }

    if (created > 0) {
      console.log(
        `[job:${JOB_NAME}] created ${created} notification(s) from ${rows.length} due item(s)`
      );
    }
    await finishJobRun(runId, 'success', created);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[job:${JOB_NAME}] failed:`, message);
    await finishJobRun(runId, 'failed', created, message);
  }
};
