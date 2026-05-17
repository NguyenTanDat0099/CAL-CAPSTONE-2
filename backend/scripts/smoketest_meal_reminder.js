// End-to-end smoke test for the meal_reminder job.
// Inserts a temporary meal schedule + item with scheduled_time = NOW,
// runs the job twice (verifies dedupe), then cleans up.
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { runMealReminderJob } = require('../dist/notifications/jobs/meal-reminder.job');
const pool = require('../dist/shared/database/db').default;

const TEST_TAG = 'SMOKE_MEAL_REMINDER';

(async () => {
  let scheduleId = null;
  let testUserId = null;

  try {
    // 1) Pick any existing user
    const [users] = await pool.query('SELECT user_id FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('[smoke] no users in DB — skipping (logic-only test)');
      await runMealReminderJob();
      return;
    }
    testUserId = users[0].user_id;
    console.log(`[smoke] using user_id=${testUserId}`);

    // 2) Insert schedule + item with scheduled_time = current minute
    const [scheduleResult] = await pool.query(
      `INSERT INTO mealschedules (user_id, name, description, start_date, end_date, source)
       VALUES (?, ?, ?, CURDATE(), CURDATE(), 'manual')`,
      [testUserId, TEST_TAG, 'auto-generated smoke test']
    );
    scheduleId = scheduleResult.insertId;

    // Round current time to nearest minute floor (HH:MM:00) so the job's
    // ±60s window definitely covers it
    await pool.query(
      `INSERT INTO mealscheduleitems
        (schedule_id, day_offset, meal_type, scheduled_time, name, sort_order)
       VALUES (?, 0, 'lunch',
               SEC_TO_TIME(TIME_TO_SEC(CURTIME()) DIV 60 * 60),
               ?, 0)`,
      [scheduleId, 'Smoke Test Pho Bo']
    );
    console.log(`[smoke] inserted schedule_id=${scheduleId} with 1 item due now`);

    // 3) Snapshot notification count before
    const [beforeRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND type = 'meal_reminder'`,
      [testUserId]
    );
    const before = Number(beforeRows[0].cnt);

    // 4) Run job (first time → should create 1)
    await runMealReminderJob();
    const [afterRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND type = 'meal_reminder'`,
      [testUserId]
    );
    const after = Number(afterRows[0].cnt);
    console.log(`[smoke] notifications before=${before}  after=${after}  delta=${after - before}`);

    // 5) Run job again (dedupe check → should NOT create another)
    await runMealReminderJob();
    const [afterAgainRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND type = 'meal_reminder'`,
      [testUserId]
    );
    const afterAgain = Number(afterAgainRows[0].cnt);
    console.log(`[smoke] after re-run=${afterAgain}  dedupe ${afterAgain === after ? 'OK' : 'FAILED'}`);

    // 6) Show the latest notification row
    const [latest] = await pool.query(
      `SELECT notification_id, type, title, message, data, dedupe_key, sent_at
       FROM notifications WHERE user_id = ? AND type = 'meal_reminder'
       ORDER BY sent_at DESC LIMIT 1`,
      [testUserId]
    );
    console.log('[smoke] latest notification:', latest[0]);
  } catch (err) {
    console.error('[smoke] FAILED:', err);
    process.exitCode = 1;
  } finally {
    // 7) Cleanup
    if (scheduleId) {
      await pool.query(`DELETE FROM mealschedules WHERE schedule_id = ?`, [scheduleId]);
      console.log(`[smoke] cleaned schedule_id=${scheduleId}`);
    }
    if (testUserId) {
      const [del] = await pool.query(
        `DELETE FROM notifications WHERE user_id = ? AND type = 'meal_reminder'
         AND dedupe_key LIKE 'meal:%' AND message LIKE '%Smoke Test Pho Bo%'`,
        [testUserId]
      );
      console.log(`[smoke] cleaned ${del.affectedRows} test notification(s)`);
    }
    await pool.end();
  }
})();
