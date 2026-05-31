import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../../shared/database/db';

export type NotificationType =
  | 'meal_reminder'
  | 'daily_summary'
  | 'goal_achievement'
  | 'system';

export type JobRunStatus = 'running' | 'success' | 'failed';

export interface NotificationRow extends RowDataPacket {
  notification_id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data: any;
  is_read: number;
  sent_at: Date;
  read_at: Date | null;
}

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  // When set, a UNIQUE(user_id, dedupe_key) prevents duplicate inserts so
  // a job that fires twice in the same window won't create two rows.
  dedupeKey?: string | null;
}

// Returns the new notification_id, or null if a row with the same
// (user_id, dedupe_key) already existed (INSERT IGNORE swallowed the dup).
export const createNotification = async (
  input: CreateNotificationInput
): Promise<number | null> => {
  const sql = input.dedupeKey
    ? `INSERT IGNORE INTO notifications (user_id, type, title, message, data, dedupe_key)
       VALUES (?, ?, ?, ?, ?, ?)`
    : `INSERT INTO notifications (user_id, type, title, message, data, dedupe_key)
       VALUES (?, ?, ?, ?, ?, ?)`;
  const [result] = await pool.query<ResultSetHeader>(sql, [
    input.userId,
    input.type,
    input.title,
    input.message,
    input.data ? JSON.stringify(input.data) : null,
    input.dedupeKey ?? null,
  ]);
  if (input.dedupeKey && result.affectedRows === 0) return null;
  return result.insertId;
};

export const createAdminNotifications = async (
  input: Omit<CreateNotificationInput, 'userId' | 'dedupeKey'> & { dedupeKey?: string | null }
): Promise<number> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT u.user_id
      FROM users u
      INNER JOIN accountroles ar ON ar.account_id = u.account_id
      INNER JOIN roles r ON r.role_id = ar.role_id
      INNER JOIN accounts a ON a.account_id = u.account_id
      WHERE LOWER(r.role_name) = 'admin'
        AND COALESCE(a.status, 'active') = 'active'
    `
  );

  let created = 0;
  for (const row of rows) {
    const id = await createNotification({
      userId: Number(row.user_id),
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data,
      dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${row.user_id}` : null,
    });
    if (id) created += 1;
  }
  return created;
};

export interface ListNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

export const listUserNotifications = async (
  userId: number,
  options: ListNotificationsOptions = {}
): Promise<NotificationRow[]> => {
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const params: any[] = [userId];
  let where = 'user_id = ?';
  if (options.unreadOnly) {
    where += ' AND is_read = 0';
  }
  const [rows] = await pool.query<NotificationRow[]>(
    `SELECT notification_id, user_id, type, title, message, data,
            is_read, sent_at, read_at
     FROM notifications
     WHERE ${where}
     ORDER BY sent_at DESC
     LIMIT ${limit}`,
    params
  );
  return rows;
};

export const countUnread = async (userId: number): Promise<number> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return Number(rows[0]?.cnt ?? 0);
};

export const markAsRead = async (
  notificationId: number,
  userId: number
): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE notifications
     SET is_read = 1, read_at = CURRENT_TIMESTAMP
     WHERE notification_id = ? AND user_id = ? AND is_read = 0`,
    [notificationId, userId]
  );
  return result.affectedRows > 0;
};

// Hard-delete a single notification for the given user. Used by the bell
// dropdown's X button so a dismissed item stays dismissed across polls
// (vs. mark-read which leaves the row and lets it reappear).
export const deleteUserNotification = async (
  notificationId: number,
  userId: number
): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM notifications WHERE notification_id = ? AND user_id = ?`,
    [notificationId, userId]
  );
  return result.affectedRows > 0;
};

export const markAllAsRead = async (userId: number): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE notifications
     SET is_read = 1, read_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return result.affectedRows;
};

export const deleteOldNotifications = async (
  olderThanDays: number
): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM notifications
     WHERE sent_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY)`,
    [olderThanDays]
  );
  return result.affectedRows;
};

// ─── Job run tracking ────────────────────────────────────────────

export const beginJobRun = async (jobName: string): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO notificationjobruns (job_name, status) VALUES (?, 'running')`,
    [jobName]
  );
  return result.insertId;
};

export const finishJobRun = async (
  runId: number,
  status: JobRunStatus,
  notificationsCreated: number,
  errorMessage?: string
): Promise<void> => {
  await pool.query(
    `UPDATE notificationjobruns
     SET finished_at = CURRENT_TIMESTAMP,
         status = ?,
         notifications_created = ?,
         error_message = ?
     WHERE run_id = ?`,
    [status, notificationsCreated, errorMessage ?? null, runId]
  );
};

export interface JobRunRow extends RowDataPacket {
  run_id: number;
  job_name: string;
  started_at: Date;
  finished_at: Date | null;
  status: JobRunStatus;
  notifications_created: number;
  error_message: string | null;
}

export const listRecentJobRuns = async (limit = 20): Promise<JobRunRow[]> => {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const [rows] = await pool.query<JobRunRow[]>(
    `SELECT run_id, job_name, started_at, finished_at, status,
            notifications_created, error_message
     FROM notificationjobruns
     ORDER BY started_at DESC
     LIMIT ${safeLimit}`
  );
  return rows;
};

// ─── User lookup ────────────────────────────────────────────────

export const getUserIdByAccountId = async (
  accountId: number
): Promise<number | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM users WHERE account_id = ? LIMIT 1`,
    [accountId]
  );
  const row = rows[0];
  return row ? Number(row.user_id) : null;
};
