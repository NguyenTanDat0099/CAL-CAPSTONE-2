import cron, { ScheduledTask } from 'node-cron';
import { runCleanupJob } from './cleanup.job';
import { runDailySummaryJob } from './daily-summary.job';
import { runGoalAchievementJob } from './goal-achievement.job';
import { runMealReminderJob } from './meal-reminder.job';
import { runWeeklyWeightCheckInJob } from './weekly-weight-checkin.job';

interface JobDefinition {
  name: string;
  cron: string;
  run: () => Promise<void>;
}

// Cron expressions are 5-field (min hour day month weekday). All times are
// server-local; deploy in Asia/Ho_Chi_Minh tz so 21:00 matches user expectation.
const JOBS: JobDefinition[] = [
  { name: 'meal_reminder', cron: '* * * * *', run: runMealReminderJob },
  { name: 'daily_summary', cron: '0 21 * * *', run: runDailySummaryJob },
  { name: 'weekly_weight_checkin', cron: '0 9 * * *', run: runWeeklyWeightCheckInJob },
  { name: 'goal_achievement', cron: '*/10 * * * *', run: runGoalAchievementJob },
  { name: 'cleanup', cron: '0 3 * * *', run: runCleanupJob },
];

const tasks: ScheduledTask[] = [];

export const startNotificationScheduler = (): void => {
  if (tasks.length > 0) {
    console.warn('[scheduler] already started, ignoring');
    return;
  }
  for (const job of JOBS) {
    if (!cron.validate(job.cron)) {
      console.error(`[scheduler] invalid cron for ${job.name}: ${job.cron}`);
      continue;
    }
    const task = cron.schedule(job.cron, () => {
      job.run().catch((err) => {
        console.error(`[scheduler] unhandled error in ${job.name}:`, err);
      });
    });
    tasks.push(task);
    console.log(`[scheduler] registered ${job.name} @ "${job.cron}"`);
  }
  console.log(`[scheduler] started ${tasks.length} job(s)`);
};

export const stopNotificationScheduler = (): void => {
  for (const task of tasks) {
    task.stop();
  }
  tasks.length = 0;
  console.log('[scheduler] stopped');
};

// Exposed so admins can trigger a job on-demand without waiting for cron.
export const triggerJobManually = async (jobName: string): Promise<void> => {
  const job = JOBS.find((j) => j.name === jobName);
  if (!job) {
    throw new Error(`UNKNOWN_JOB:${jobName}`);
  }
  await job.run();
};

export const listJobNames = (): string[] => JOBS.map((j) => j.name);
