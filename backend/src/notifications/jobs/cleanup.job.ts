import {
  beginJobRun,
  deleteOldNotifications,
  finishJobRun,
} from '../services/notification.service';

export const JOB_NAME = 'cleanup';
const RETENTION_DAYS = 30;

// Housekeeping: delete notifications older than RETENTION_DAYS so the bell
// stays fast and the table doesn't grow unbounded.
export const runCleanupJob = async (): Promise<void> => {
  const runId = await beginJobRun(JOB_NAME);
  try {
    const removed = await deleteOldNotifications(RETENTION_DAYS);
    console.log(`[job:${JOB_NAME}] removed ${removed} old notifications`);
    await finishJobRun(runId, 'success', removed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[job:${JOB_NAME}] failed:`, message);
    await finishJobRun(runId, 'failed', 0, message);
  }
};
